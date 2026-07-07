// Validates all JSON data files. Run: node scripts/validate-data.js
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root      = join(__dirname, '..');

function read(rel) {
  return JSON.parse(readFileSync(join(root, rel), 'utf8'));
}

const VALID_POSITIONS = new Set(['GK', 'DF', 'MF', 'FW']);
const DOB_MIN = 1984;   // oldest plausible tournament player
const DOB_MAX = 2009;   // youngest plausible tournament player
const BROADCASTER_WARN_DAYS = 7; // flag an upcoming knockout match missing a broadcaster once this close to kickoff

function validateSquads(clubs) {
  const clubIds  = new Set(clubs.data.map(c => c.id));
  const allIds   = [];
  const errors   = [];
  const warnings = [];
  const flagged  = [];
  let   totalPlayers = 0;

  const playerFiles = readdirSync(join(root, 'data/players')).filter(f => f.endsWith('.json'));

  for (const file of playerFiles) {
    const country = file.replace('.json', '');
    const squad   = read(`data/players/${file}`).data;
    totalPlayers += squad.length;

    if (squad.length !== 26)
      errors.push(`${country}: player count = ${squad.length} (expected 26)`);

    const shirts = squad.map(p => p.shirt).sort((a, b) => a - b);
    const expectedShirts = [...Array(26)].map((_, i) => i + 1);
    if (JSON.stringify(shirts) !== JSON.stringify(expectedShirts))
      errors.push(`${country}: shirt numbers invalid — got ${JSON.stringify(shirts)}`);

    const captains = squad.filter(p => p.captain);
    if (captains.length !== 1)
      errors.push(`${country}: captain count = ${captains.length} (expected 1)`);

    for (const p of squad) {
      if (!VALID_POSITIONS.has(p.position))
        errors.push(`${country}: ${p.id} has invalid position "${p.position}"`);

      if (!clubIds.has(p.clubId))
        errors.push(`${country}: ${p.id} clubId "${p.clubId}" not in clubs.json`);

      const yr = parseInt(p.dob?.slice(0, 4) ?? '0');
      if (yr < DOB_MIN || yr > DOB_MAX)
        warnings.push(`${country}: ${p.id} dob ${p.dob} outside expected range`);

      allIds.push(p.id);

      if (p._verification)
        flagged.push({ squad: country, id: p.id, clubId: p.clubId, note: p._verification });
    }
  }

  // Cross-squad duplicate IDs
  const seen  = new Set();
  const dupes = [];
  for (const id of allIds) {
    if (seen.has(id)) dupes.push(id);
    seen.add(id);
  }
  if (dupes.length)
    errors.push(`Duplicate player IDs across squads: ${dupes.join(', ')}`);

  return { errors, warnings, flagged, totalPlayers, squadCount: playerFiles.length };
}

function validateFixtures() {
  const fixtures = read('data/fixtures.json').data;
  const errors   = [];

  for (const f of fixtures) {
    if (f.status === 'FT') {
      if (f.homeScore === null || f.awayScore === null)
        errors.push(`Fixture ${f.id}: status FT but scores are null`);
    }
    if (f.status === 'scheduled') {
      if (f.homeScore !== null || f.awayScore !== null)
        errors.push(`Fixture ${f.id}: status scheduled but scores set`);
    }
    if (!f.kickoff)
      errors.push(`Fixture ${f.id}: missing kickoff`);
  }

  return { errors, total: fixtures.length };
}

// Sprint 43 — no automated broadcaster source exists (see docs/ROADMAP.md
// Sprint 43 for the investigation), so this is detection, not acquisition:
// flag non-FT knockout matches with a confirmed matchup but no broadcaster,
// once close enough to kickoff to actually be researchable. Never flags a
// completed match (the badge never renders for FT — js/broadcasters.js) or
// a still-TBD pairing (nothing to research yet). Non-fatal — this rides
// along on every `npm run validate` call, which is already the last step
// of every Sprint 34 maintenance pass, so no new recurring script is needed.
function validateBroadcasters() {
  const knockout = read('data/knockout.json').data;
  const warnings = [];
  const now = Date.now();

  for (const round of knockout) {
    for (const m of round.matches ?? []) {
      if (m.status === 'FT') continue;
      if (!m.homeTeamId || !m.awayTeamId) continue;
      if (m.broadcaster) continue;

      const kickoffMs = m.kickoff ? new Date(m.kickoff).getTime() : null;
      const daysUntil = kickoffMs != null ? (kickoffMs - now) / 86_400_000 : null;
      if (daysUntil != null && daysUntil > BROADCASTER_WARN_DAYS) continue;

      warnings.push(`${m.id}: ${m.homeTeamId} v ${m.awayTeamId} (${m.kickoff ?? 'kickoff TBD'}) — no broadcaster set`);
    }
  }

  return { warnings };
}

// Sprint 39 — rankings are manually-entered for 4 of 5 components (see
// docs/plans/2026-07-06-ranking-system-design.md); this reports which
// in-scope players still need that research done, same non-fatal
// "detect and report" idiom as the broadcaster check above.
function validateRankings() {
  let scope;
  try { scope = read('data/ranking-scope.json').teams; } catch { return { warnings: [] }; }
  const rankings  = read('data/rankings.json').data;
  const byPlayer  = new Map(rankings.map(e => [e.playerId, e]));
  const warnings  = [];

  for (const teamId of scope) {
    let players;
    try { players = read(`data/players/${teamId}.json`).data; } catch { continue; }
    for (const p of players) {
      const entry = byPlayer.get(p.id);
      if (!entry) { warnings.push(`${p.id}: no rankings.json entry yet (run npm run generate-rankings)`); continue; }
      const missing = ['transfermarkt', 'ea', 'awards', 'media'].filter(k => entry[k] == null);
      if (missing.length) warnings.push(`${p.id}: provisional — missing ${missing.join(', ')}`);
    }
  }

  return { warnings };
}

function summaryStats(clubs) {
  const countries   = read('data/countries.json').data;
  const playerFiles = readdirSync(join(root, 'data/players')).filter(f => f.endsWith('.json'));
  const populated   = new Set(playerFiles.map(f => f.replace('.json', '')));
  const missing     = countries.map(c => c.id).filter(id => !populated.has(id));

  const allPlayers  = playerFiles.flatMap(f => read(`data/players/${f}`).data);
  const usedClubIds = new Set(allPlayers.map(p => p.clubId));
  const usedLeagues = new Set(
    clubs.data.filter(c => usedClubIds.has(c.id)).map(c => c.leagueId)
  );

  return {
    squadsComplete:  playerFiles.length,
    squadsTotal:     countries.length,
    squadsMissing:   missing,
    totalPlayers:    allPlayers.length,
    totalClubs:      usedClubIds.size,
    totalLeagues:    usedLeagues.size,
    coveragePct:     ((playerFiles.length / countries.length) * 100).toFixed(1),
  };
}

function main() {
  const clubs = read('data/clubs.json');

  console.log('=== validate-data.js ===\n');

  // ── Squads ─────────────────────────────────────────────────────────────
  const sq = validateSquads(clubs);
  console.log(`Squads validated: ${sq.squadCount}`);
  console.log(`Total players:    ${sq.totalPlayers}`);

  if (sq.errors.length) {
    console.log(`\nSQUAD ERRORS (${sq.errors.length}):`);
    sq.errors.forEach(e => console.log('  ✗', e));
  } else {
    console.log('\nSquad checks: ✓ all passed');
  }
  if (sq.warnings.length) {
    console.log(`\nSquad warnings (${sq.warnings.length}):`);
    sq.warnings.forEach(w => console.log('  ⚠', w));
  }
  if (sq.flagged.length) {
    console.log(`\nUncertain entries [_verification] (${sq.flagged.length}):`);
    sq.flagged.forEach(f => console.log(`  ${f.squad}  ${f.id}  club:${f.clubId}  — ${f.note}`));
  } else {
    console.log('Uncertain entries: none');
  }

  // ── Fixtures ────────────────────────────────────────────────────────────
  const fx = validateFixtures();
  console.log(`\nFixtures validated: ${fx.total}`);
  if (fx.errors.length) {
    console.log(`FIXTURE ERRORS (${fx.errors.length}):`);
    fx.errors.forEach(e => console.log('  ✗', e));
  } else {
    console.log('Fixture checks: ✓ all passed');
  }

  // ── Broadcaster schedule (Sprint 43 — detection, not acquisition) ──────
  const bc = validateBroadcasters();
  if (bc.warnings.length) {
    console.log(`\nBroadcaster gaps (${bc.warnings.length}) — non-fatal, see docs/DATA_ENTRY_GUIDE.md §19:`);
    bc.warnings.forEach(w => console.log('  ⚠', w));
  }

  // ── Rankings completeness (Sprint 39 — manual entry, not acquisition) ──
  const rk = validateRankings();
  if (rk.warnings.length) {
    console.log(`\nRanking gaps (${rk.warnings.length}) — non-fatal, see docs/plans/2026-07-06-ranking-system-design.md:`);
    rk.warnings.slice(0, 20).forEach(w => console.log('  ⚠', w));
    if (rk.warnings.length > 20) console.log(`  ... and ${rk.warnings.length - 20} more`);
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  const stats = summaryStats(clubs);
  console.log('\n=== Coverage Summary ===');
  console.log(`Squads populated:  ${stats.squadsComplete} / ${stats.squadsTotal} (${stats.coveragePct}%)`);
  console.log(`Total players:     ${stats.totalPlayers}`);
  console.log(`Unique clubs:      ${stats.totalClubs}`);
  console.log(`Unique leagues:    ${stats.totalLeagues}`);
  if (stats.squadsMissing.length) {
    console.log(`\nMissing squads (${stats.squadsMissing.length}):`);
    stats.squadsMissing.forEach(id => console.log(' ', id));
  }

  const hasErrors = sq.errors.length > 0 || fx.errors.length > 0;
  console.log(`\n${hasErrors ? '✗ VALIDATION FAILED' : '✓ VALIDATION PASSED'}`);
  process.exit(hasErrors ? 1 : 0);
}

main();
