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
