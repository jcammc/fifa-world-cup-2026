/**
 * Bulk-imports manually-researched raw ranking values into data/rankings.json,
 * one team at a time, from a simple CSV pasted via stdin -- so populating the
 * three components that were tested and confirmed NOT agent-fetchable
 * (Transfermarkt, EA, and the awardsRaw sub-fields Wikidata can't reach --
 * see docs/plans/2026-07-06-ranking-system-design.md §0/§0b/§3a) never means
 * hand-editing 286 players' worth of nested JSON.
 *
 * Usage:
 *   node scripts/import-ranking-raw.mjs --field transfermarkt --team argentina --source "<url>" < values.csv
 *   node scripts/import-ranking-raw.mjs --field ea            --team argentina --source "<url>" < values.csv
 *   node scripts/import-ranking-raw.mjs --field awards        --team argentina --source "manual research" < values.csv
 *
 * CSV has NO header row, one line per player, blank lines/`#`-comments ignored:
 *
 *   --field transfermarkt : playerId,valueEUR
 *   --field ea            : playerId,ratingRaw          (0-99, EA's own scale)
 *   --field awards        : playerId,ballonDorTier,fifaBestPlayer,uefaPoty,totyEaFc,clWins,domesticTitles
 *       ballonDorTier : blank | winner | top3 | top10
 *       fifaBestPlayer / uefaPoty / totyEaFc : blank | true | false
 *       clWins / domesticTitles : blank | integer
 *     (worldCupWinner, ballonDorTier[winner-only], uefaPoty, and wcGoldenBall
 *      are already auto-detected where Wikidata/Wikipedia reliably support
 *      it -- see scripts/gather-rankings-signals.mjs -- and don't need a
 *      manual entry unless correcting/supplementing an auto-detected value.
 *      fifaBestPlayer is fully manual: automating it via Wikidata's P166
 *      claims was tried and reverted 2026-07-08 after a confirmed false
 *      positive -- see design doc §0b.)
 *
 * A blank cell means "not researched/not applicable" and is left untouched
 * -- never coerced to 0/false. Appearing as a row in an --field awards CSV
 * at all still marks that player's awardsRaw as researched (a real object,
 * not null) even if every optional column is blank, so a player who was
 * checked and genuinely has none of these still correctly resolves to a
 * computed score of 0, not stays stuck on "not yet researched".
 *
 * Every value written this way gets a `rawProvenance` entry recording
 * --source and the entry date, added from the outset rather than retrofitted
 * (see design doc's "lightweight provenance" decision, 2026-07-08) --
 * source/date apply to the whole field group (transfermarktValueEUR /
 * eaRatingRaw / awardsRaw) per import run, not per individual sub-field.
 *
 * Never overwrites a raw field that's already non-null, unless --force is
 * passed (for corrections) -- same conservative default as this project's
 * other manually-edited fields (broadcaster, h2h overrides).
 *
 * Run npm run generate-rankings afterward to recompute derived scores.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');

function readJson(rel)       { return JSON.parse(readFileSync(resolve(ROOT, rel), 'utf8')); }
function writeJson(rel, obj) { writeFileSync(resolve(ROOT, rel), JSON.stringify(obj, null, 2) + '\n', 'utf8'); }

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      args[key] = (next && !next.startsWith('--')) ? argv[++i] : true;
    }
  }
  return args;
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

function parseCsvRows(text) {
  return text.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(l => l.split(',').map(c => c.trim()));
}

const BOOL_TRUE  = new Set(['true', '1', 'yes']);
const BOOL_FALSE = new Set(['false', '0', 'no']);

function parseBool(cell) {
  if (!cell) return undefined; // blank -- leave untouched
  const lower = cell.toLowerCase();
  if (BOOL_TRUE.has(lower)) return true;
  if (BOOL_FALSE.has(lower)) return false;
  return null; // malformed
}

const VALID_TIERS = new Set(['winner', 'top3', 'top10']);

// ── Per-field-group row processors ─────────────────────────────────────────

function applyTransfermarkt(entry, cells) {
  const [, valueStr] = cells;
  if (!valueStr) return { error: 'missing valueEUR' };
  const value = Number(valueStr);
  if (!Number.isFinite(value) || value < 0) return { error: `invalid valueEUR "${valueStr}"` };
  return { raw: value, provKey: 'transfermarktValueEUR' };
}

function applyEa(entry, cells) {
  const [, ratingStr] = cells;
  if (!ratingStr) return { error: 'missing ratingRaw' };
  const rating = Number(ratingStr);
  if (!Number.isInteger(rating) || rating < 0 || rating > 99) return { error: `invalid ratingRaw "${ratingStr}" (expected 0-99)` };
  return { raw: rating, provKey: 'eaRatingRaw' };
}

function applyAwards(entry, cells) {
  const [, ballonDorTierStr, fifaBestPlayerStr, uefaPotyStr, totyEaFcStr, clWinsStr, domesticTitlesStr] = cells;
  const patch = {};

  if (ballonDorTierStr) {
    if (!VALID_TIERS.has(ballonDorTierStr)) return { error: `invalid ballonDorTier "${ballonDorTierStr}" (expected winner/top3/top10)` };
    patch.ballonDorTier = ballonDorTierStr;
  }
  const fifaBestPlayer = parseBool(fifaBestPlayerStr);
  if (fifaBestPlayer === null) return { error: `invalid fifaBestPlayer "${fifaBestPlayerStr}"` };
  if (fifaBestPlayer !== undefined) patch.fifaBestPlayer = fifaBestPlayer;

  const uefaPoty = parseBool(uefaPotyStr);
  if (uefaPoty === null) return { error: `invalid uefaPoty "${uefaPotyStr}"` };
  if (uefaPoty !== undefined) patch.uefaPoty = uefaPoty;

  const totyEaFc = parseBool(totyEaFcStr);
  if (totyEaFc === null) return { error: `invalid totyEaFc "${totyEaFcStr}"` };
  if (totyEaFc !== undefined) patch.totyEaFc = totyEaFc;

  if (clWinsStr) {
    const n = Number(clWinsStr);
    if (!Number.isInteger(n) || n < 0) return { error: `invalid clWins "${clWinsStr}"` };
    patch.clWins = n;
  }
  if (domesticTitlesStr) {
    const n = Number(domesticTitlesStr);
    if (!Number.isInteger(n) || n < 0) return { error: `invalid domesticTitles "${domesticTitlesStr}"` };
    patch.domesticTitles = n;
  }

  // Appearing as a row at all marks this player's awardsRaw as researched,
  // even if every optional column was blank -- see header comment.
  return { rawPatch: patch, provKey: 'awardsRaw', touchesAwardsRaw: true };
}

const FIELD_HANDLERS = {
  transfermarkt: applyTransfermarkt,
  ea: applyEa,
  awards: applyAwards,
};

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { field, team, source } = args;
  const force = !!args.force;
  const enteredAt = args.date || new Date().toISOString().slice(0, 10);

  if (!field || !FIELD_HANDLERS[field]) {
    console.error(`--field must be one of: ${Object.keys(FIELD_HANDLERS).join(', ')}`);
    process.exit(1);
  }
  if (!team) { console.error('--team is required'); process.exit(1); }
  if (!source) { console.error('--source is required (URL or "manual research")'); process.exit(1); }

  const scope = readJson('data/ranking-scope.json').teams;
  if (!scope.includes(team)) { console.error(`"${team}" is not in data/ranking-scope.json`); process.exit(1); }

  const teamPlayerIds = new Set(readJson(`data/players/${team}.json`).data.map(p => p.id));
  const rankingsFile = readJson('data/rankings.json');
  const byPlayerId = new Map(rankingsFile.data.map(e => [e.playerId, e]));

  const rows = parseCsvRows(await readStdin());
  if (!rows.length) { console.error('No input rows read from stdin.'); process.exit(1); }

  const handler = FIELD_HANDLERS[field];
  let updated = 0, skippedExisting = 0, invalidPlayer = 0;
  const errors = [];

  for (const cells of rows) {
    const [playerId] = cells;

    if (!teamPlayerIds.has(playerId)) {
      invalidPlayer++;
      errors.push(`${playerId || '(blank)'}: not a player on team "${team}"`);
      continue;
    }
    const entry = byPlayerId.get(playerId);
    if (!entry) {
      invalidPlayer++;
      errors.push(`${playerId}: no rankings.json entry yet (run npm run generate-rankings first)`);
      continue;
    }

    const result = handler(entry, cells);
    if (result.error) {
      errors.push(`${playerId}: ${result.error}`);
      continue;
    }

    if (result.touchesAwardsRaw) {
      const existing = entry.awardsRaw ?? {};
      const conflicting = Object.keys(result.rawPatch).filter(k => existing[k] !== undefined && existing[k] !== result.rawPatch[k]);
      if (conflicting.length && !force) {
        skippedExisting++;
        errors.push(`${playerId}: awardsRaw.${conflicting.join(',')} already set — use --force to overwrite`);
        continue;
      }
      entry.awardsRaw = { ...existing, ...result.rawPatch };
    } else {
      if (entry[result.provKey] != null && !force) {
        skippedExisting++;
        errors.push(`${playerId}: ${result.provKey} already set to ${entry[result.provKey]} — use --force to overwrite`);
        continue;
      }
      entry[result.provKey] = result.raw;
    }

    entry.rawProvenance = entry.rawProvenance ?? {};
    entry.rawProvenance[result.provKey] = { source, enteredAt };
    updated++;
  }

  rankingsFile.lastUpdated = new Date().toISOString();
  writeJson('data/rankings.json', rankingsFile);

  console.log('────────────────────────────────────────────────────────────');
  console.log(`  IMPORT SUMMARY — field: ${field}, team: ${team}`);
  console.log('────────────────────────────────────────────────────────────');
  console.log(`  Rows processed     : ${rows.length}`);
  console.log(`  Updated            : ${updated}`);
  console.log(`  Skipped (existing) : ${skippedExisting} (use --force to overwrite)`);
  console.log(`  Invalid player IDs : ${invalidPlayer}`);
  if (errors.length) {
    console.log('\n  Details:');
    errors.slice(0, 30).forEach(e => console.log(`    • ${e}`));
    if (errors.length > 30) console.log(`    ... and ${errors.length - 30} more`);
  }
  console.log('────────────────────────────────────────────────────────────');
  console.log('\nRun npm run generate-rankings to recompute derived scores.');
}

main();
