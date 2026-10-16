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

CREATE TABLE IF NOT EXISTS dtc_causes (
  dtc_id   integer NOT NULL REFERENCES dtc_codes(id) ON DELETE CASCADE,
  position smallint NOT NULL,
  cause    text NOT NULL,
  PRIMARY KEY (dtc_id, position)
);

-- active = betroffenes Bauteil, context = zugehöriges System.
CREATE TABLE IF NOT EXISTS dtc_components (
  dtc_id       integer NOT NULL REFERENCES dtc_codes(id) ON DELETE CASCADE,
  component_id text NOT NULL REFERENCES vehicle_components(id),
  role         text NOT NULL CHECK (role IN ('active', 'context')),
  PRIMARY KEY (dtc_id, component_id)
);
