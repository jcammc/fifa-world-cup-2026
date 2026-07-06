// Smoke test: the data-integrity validator must exit clean. This doesn't
// re-check every rule scripts/validate-data.js enforces (that's its own
// job) — it just guards against the validator itself silently breaking
// or a future data change tripping it without anyone noticing in CI.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('npm run validate passes clean', () => {
  const output = execFileSync(process.execPath, ['scripts/validate-data.js'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.match(output, /VALIDATION PASSED/);
});
