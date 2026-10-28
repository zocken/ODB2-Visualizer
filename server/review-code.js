import { parseArgs } from 'node:util';
import { pool, migrate, withTransaction } from './db.js';
import { reviewCode } from './review-content.js';

// An operator records an actual human review; this command does not perform one.
try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    manufacturer: { type: 'string' }, reviewer: { type: 'string' }, hash: { type: 'string' }, approve: { type: 'boolean' },
  } });
  const code = positionals[0]?.toUpperCase();
  if (!/^[PBCU][0-9A-F]{4}$/.test(code || '')) throw new Error('Aufruf: npm run review-code -- P0520 [--manufacturer marke] [--approve --reviewer Name --hash Prüfwert]');
  await migrate();
  console.log(JSON.stringify(await withTransaction(db => reviewCode(db, {
    code, manufacturer: values.manufacturer || null, reviewer: values.reviewer,
    expectedHash: values.hash, approve: values.approve,
  })), null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await pool.end(); }
