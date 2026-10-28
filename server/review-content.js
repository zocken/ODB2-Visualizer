import { createHash } from 'node:crypto';

// Includes explanations, causes and component mapping; source revision is conservative too.
export function contentHash(c) {
  return createHash('sha256').update(JSON.stringify({
    code: c.code, manufacturer: c.manufacturer || null, title: c.title,
    titleEn: c.titleEn || null, system: c.system, urgency: c.urgency,
    explanation: c.explanation, location: c.location, source: c.source || 'redaktionell',
    labels: c.vehicle?.labels || c.labels || [], causes: c.causes || [],
    active: [...(c.vehicle?.active || c.active || [])].sort(),
    context: [...(c.vehicle?.context || c.context || [])].sort(),
  })).digest('hex');
}

export async function reviewCode(db, { code, manufacturer = null, reviewer, expectedHash, approve = false }) {
  const { rows: [entry] } = await db.query(`
    SELECT d.*, d.title_en AS "titleEn", m.slug AS manufacturer,
      d.vehicle_labels AS labels,
      ARRAY(SELECT cause FROM dtc_causes WHERE dtc_id=d.id ORDER BY position) AS causes,
      ARRAY(SELECT component_id FROM dtc_components WHERE dtc_id=d.id AND role='active' ORDER BY component_id) AS active,
      ARRAY(SELECT component_id FROM dtc_components WHERE dtc_id=d.id AND role='context' ORDER BY component_id) AS context
    FROM dtc_codes d LEFT JOIN manufacturers m ON m.id=d.manufacturer_id
    WHERE d.code=$1 AND m.slug IS NOT DISTINCT FROM $2 AND d.source_removed_at IS NULL FOR UPDATE OF d`, [code, manufacturer]);
  if (!entry) throw new Error('Eintrag nicht gefunden.');
  const hash = contentHash(entry);
  if (!approve) return { entry, hash };
  if (!reviewer?.trim() || !expectedHash || expectedHash !== hash) throw new Error('Prüfer und unveränderter Inhaltsprüfwert sind erforderlich.');
  await db.query(`UPDATE dtc_codes SET content_hash=$2, review_status='approved', reviewed_by=$3,
    reviewed_at=now(), reviewed_hash=$2 WHERE id=$1`, [entry.id, hash, reviewer.trim()]);
  await db.query(`INSERT INTO content_reviews(dtc_id, action, reviewer, content_hash, snapshot)
    VALUES ($1,'approved',$2,$3,$4::jsonb)`, [entry.id, reviewer.trim(), hash, JSON.stringify(entry)]);
  return { code, hash, approved: true };
}
