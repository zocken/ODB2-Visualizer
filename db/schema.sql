-- OBD2 Klartext – Datenbankschema (PostgreSQL 15+)
-- Idempotent: wird bei jedem Serverstart ausgeführt.

-- Hersteller für spätere herstellerspezifische Codes (z. B. P1xxx, B1xxx).
CREATE TABLE IF NOT EXISTS manufacturers (
  id    serial PRIMARY KEY,
  slug  text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  name  text NOT NULL
);

-- Schematische Bauteile der Pkw-Draufsicht (data-component im SVG).
CREATE TABLE IF NOT EXISTS vehicle_components (
  id    text PRIMARY KEY,
  label text NOT NULL
);

-- Ein Code kann einmal herstellerunabhängig (manufacturer_id NULL)
-- und zusätzlich je Hersteller mit eigener Bedeutung existieren.
CREATE TABLE IF NOT EXISTS dtc_codes (
  id              serial PRIMARY KEY,
  code            char(5) NOT NULL CHECK (code ~ '^[PBCU][0-3][0-9A-F]{3}$'),
  manufacturer_id integer REFERENCES manufacturers(id) ON DELETE CASCADE,
  title           text NOT NULL,
  system          text NOT NULL,
  urgency         text NOT NULL CHECK (urgency IN ('Grün', 'Gelb', 'Rot')),
  explanation     text NOT NULL,
  location        text NOT NULL,
  vehicle_labels  text[] NOT NULL DEFAULT '{}',
  source          text NOT NULL DEFAULT 'redaktionell',
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (code, manufacturer_id)
);

CREATE INDEX IF NOT EXISTS dtc_codes_code_idx ON dtc_codes (code);

-- Originalbezeichnung importierter Codes (englisch), Titel ist die deutsche Fassung.
ALTER TABLE dtc_codes ADD COLUMN IF NOT EXISTS title_en text;
-- Prüfwert des automatisch erzeugten Inhalts: Abweichung = Code wurde in der Quelle geändert.
ALTER TABLE dtc_codes ADD COLUMN IF NOT EXISTS content_hash text;
-- Gesetzt, wenn ein importierter Code nicht mehr in der Quelle steht (wird ausgeblendet, nicht gelöscht).
ALTER TABLE dtc_codes ADD COLUMN IF NOT EXISTS source_removed_at timestamptz;

-- No implicit approval of existing editorial or imported entries.
ALTER TABLE dtc_codes ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending'
  CHECK (review_status IN ('pending', 'approved'));
ALTER TABLE dtc_codes ADD COLUMN IF NOT EXISTS reviewed_by text;
ALTER TABLE dtc_codes ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE dtc_codes ADD COLUMN IF NOT EXISTS reviewed_hash text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='dtc_review_complete' AND conrelid='dtc_codes'::regclass) THEN
    ALTER TABLE dtc_codes ADD CONSTRAINT dtc_review_complete CHECK (
      review_status <> 'approved' OR (reviewed_by IS NOT NULL AND length(trim(reviewed_by))>0
        AND reviewed_at IS NOT NULL AND reviewed_hash IS NOT NULL
        AND content_hash IS NOT NULL AND reviewed_hash=content_hash)
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS content_reviews (
  id bigserial PRIMARY KEY,
  dtc_id integer REFERENCES dtc_codes(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('approved','invalidated')),
  reviewer text,
  content_hash text,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION invalidate_code_review() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW.code,NEW.manufacturer_id,NEW.title,NEW.title_en,NEW.system,NEW.urgency,
      NEW.explanation,NEW.location,NEW.vehicle_labels,NEW.source,NEW.source_removed_at)
    IS DISTINCT FROM ROW(OLD.code,OLD.manufacturer_id,OLD.title,OLD.title_en,OLD.system,OLD.urgency,
      OLD.explanation,OLD.location,OLD.vehicle_labels,OLD.source,OLD.source_removed_at) THEN
    NEW.review_status := 'pending'; NEW.reviewed_by := NULL; NEW.reviewed_at := NULL; NEW.reviewed_hash := NULL;
  END IF;
  IF OLD.review_status='approved' AND NEW.review_status <> 'approved' THEN
    INSERT INTO content_reviews(dtc_id,action,reviewer,content_hash,snapshot)
      VALUES(OLD.id,'invalidated',OLD.reviewed_by,OLD.reviewed_hash,to_jsonb(OLD));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS invalidate_code_review ON dtc_codes;
CREATE TRIGGER invalidate_code_review BEFORE UPDATE ON dtc_codes
  FOR EACH ROW EXECUTE FUNCTION invalidate_code_review();

CREATE TABLE IF NOT EXISTS dtc_causes (
  dtc_id   integer NOT NULL REFERENCES dtc_codes(id) ON DELETE CASCADE,
  position smallint NOT NULL,
  cause    text NOT NULL,
  PRIMARY KEY (dtc_id, position)
);

-- Protokoll der automatischen Code-Ergänzung (server/update-codes.js).
CREATE TABLE IF NOT EXISTS code_updates (
  id          serial PRIMARY KEY,
  status      text NOT NULL CHECK (status IN ('läuft', 'erfolgreich', 'fehlgeschlagen')),
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  source_sha  text,
  checked     integer,
  inserted    integer,
  message     text
);
ALTER TABLE code_updates ADD COLUMN IF NOT EXISTS updated integer;
ALTER TABLE code_updates ADD COLUMN IF NOT EXISTS removed integer;

-- Anonyme Nutzungsstatistik: nur Tageszähler, keine Kennungen (keine IP, kein Cookie, kein User-Agent).
-- metric: pageview | lookup | missing | manufacturer | device; key: z. B. Code, Hersteller-Slug, mobile/desktop.
CREATE TABLE IF NOT EXISTS usage_daily (
  day    date NOT NULL DEFAULT current_date,
  metric text NOT NULL,
  key    text NOT NULL DEFAULT '',
  count  integer NOT NULL DEFAULT 0,
  PRIMARY KEY (day, metric, key)
);

-- active = betroffenes Bauteil, context = zugehöriges System.
CREATE TABLE IF NOT EXISTS dtc_components (
  dtc_id       integer NOT NULL REFERENCES dtc_codes(id) ON DELETE CASCADE,
  component_id text NOT NULL REFERENCES vehicle_components(id),
  role         text NOT NULL CHECK (role IN ('active', 'context')),
  PRIMARY KEY (dtc_id, component_id)
);

-- Related facts are part of the reviewed content. Lock parent before changing a child.
CREATE OR REPLACE FUNCTION invalidate_related_review() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    UPDATE dtc_codes SET review_status='pending',reviewed_by=NULL,reviewed_at=NULL,reviewed_hash=NULL WHERE id=OLD.dtc_id;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    UPDATE dtc_codes SET review_status='pending',reviewed_by=NULL,reviewed_at=NULL,reviewed_hash=NULL WHERE id=NEW.dtc_id;
    RETURN NEW;
  END IF;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS invalidate_cause_review ON dtc_causes;
CREATE TRIGGER invalidate_cause_review BEFORE INSERT OR UPDATE OR DELETE ON dtc_causes
  FOR EACH ROW EXECUTE FUNCTION invalidate_related_review();
DROP TRIGGER IF EXISTS invalidate_component_review ON dtc_components;
CREATE TRIGGER invalidate_component_review BEFORE INSERT OR UPDATE OR DELETE ON dtc_components
  FOR EACH ROW EXECUTE FUNCTION invalidate_related_review();
