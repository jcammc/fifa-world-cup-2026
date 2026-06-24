/**
 * Syncs fixture results, standings, and knockout data from football-data.org.
 * Run: node scripts/sync-data.mjs
 * Env: FOOTBALL_DATA_API_KEY (falls back to value in source if unset)
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const API_KEY = process.env.FOOTBALL_DATA_API_KEY || '4a405675fdf84538959e59f7d2401b38';
const BASE    = 'https://api.football-data.org/v4';

const STATUS_MAP = {
  FINISHED:  'FT',
  IN_PLAY:   'live',
  PAUSED:    'live',
  TIMED:     'scheduled',
  SCHEDULED: 'scheduled',
};

function readJson(rel)       { return JSON.parse(readFileSync(resolve(ROOT, rel), 'utf8')); }
function writeJson(rel, obj) { writeFileSync(resolve(ROOT, rel), JSON.stringify(obj, null, 2) + '\n', 'utf8'); }

async function apiFetch(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { 'X-Auth-Token': API_KEY } });
  if (!res.ok) throw new Error(`API ${path} → HTTP ${res.status}`);
  return res.json();
}

// ── Group stage fixture sync ──────────────────────────────────────────────────

function syncFixtures(apiMatches, teamMap) {
  const file     = readJson('data/fixtures.json');
  const fixtures = file.data;

  const byTeams = new Map(fixtures.map(f => [`${f.homeTeamId}:${f.awayTeamId}`, f]));

  let changed = 0;
  for (const m of apiMatches) {
    if (m.stage !== 'GROUP_STAGE') continue;

    const homeId = teamMap[String(m.homeTeam?.id)];
    const awayId = teamMap[String(m.awayTeam?.id)];
    if (!homeId || !awayId) continue;

    const f = byTeams.get(`${homeId}:${awayId}`);
    if (!f) { console.warn(`  no internal fixture for ${homeId} vs ${awayId}`); continue; }

    const newStatus = STATUS_MAP[m.status] ?? 'scheduled';
    const newHome   = m.score?.fullTime?.home ?? null;
    const newAway   = m.score?.fullTime?.away ?? null;

    if (f.status !== newStatus || f.homeScore !== newHome || f.awayScore !== newAway) {
      f.status    = newStatus;
      f.homeScore = newHome;
      f.awayScore = newAway;
      changed++;
    }
  }

  if (changed > 0) {
    file.lastUpdated = new Date().toISOString();
    writeJson('data/fixtures.json', file);
    console.log(`fixtures.json    → ${changed} match(es) updated`);
  } else {
    console.log('fixtures.json    → no changes');
  }
}

// ── Standings sync ────────────────────────────────────────────────────────────

function syncStandings(apiStandings, teamMap) {
  const file    = readJson('data/standings.json');
  const byGroup = new Map(file.data.map(g => [g.groupId, g]));

  let changed = 0;
  for (const s of apiStandings) {
    if (s.type !== 'TOTAL') continue;

    // API: "Group A" → internal: "A"
    const groupId = s.group.replace(/^Group\s+/i, '').trim();
    const internal = byGroup.get(groupId);
    if (!internal) { console.warn(`  unknown group: ${s.group}`); continue; }

    const newTeams = s.table.map(entry => {
      const teamId = teamMap[String(entry.team?.id)];
      if (!teamId) return null;
      const existing = internal.teams.find(t => t.teamId === teamId);
      return {
        teamId,
        position:           entry.position,
        played:             entry.playedGames,
        won:                entry.won,
        drawn:              entry.draw,
        lost:               entry.lost,
        goalsFor:           entry.goalsFor,
        goalsAgainst:       entry.goalsAgainst,
        goalDifference:     entry.goalDifference,
        points:             entry.points,
        qualificationStatus: existing?.qualificationStatus ?? null,
      };
    }).filter(Boolean);

    const prev = internal.teams;
    const diff = newTeams.some((t, i) => !prev[i] || prev[i].played !== t.played || prev[i].points !== t.points || prev[i].position !== t.position);

    if (diff) {
      internal.teams = newTeams;
      changed++;
    }
  }

  if (changed > 0) {
    file.lastUpdated = new Date().toISOString();
    writeJson('data/standings.json', file);
    console.log(`standings.json   → ${changed} group(s) updated`);
  } else {
    console.log('standings.json   → no changes');
  }
}

// ── Knockout sync ─────────────────────────────────────────────────────────────

function syncKnockout(apiMatches, teamMap) {
  const file   = readJson('data/knockout.json');
  const rounds = file.data;

  // Build lookup: "homeTeamId:awayTeamId" → match (only for matches where teams are known)
  const byTeams = new Map();
  for (const round of rounds) {
    for (const m of round.matches ?? []) {
      if (m.homeTeamId && m.awayTeamId) {
        byTeams.set(`${m.homeTeamId}:${m.awayTeamId}`, m);
      }
    }
  }

  // Build date-only lookup for unassigned slots (multiple matches per date possible)
  const byDateVenue = new Map();
  for (const round of rounds) {
    for (const m of round.matches ?? []) {
      if (!m.homeTeamId && !m.awayTeamId && m.kickoff) {
        const dateKey = m.kickoff.slice(0, 10);
        if (!byDateVenue.has(dateKey)) byDateVenue.set(dateKey, []);
        byDateVenue.get(dateKey).push(m);
      }
    }
  }

  let changed = 0;
  for (const m of apiMatches) {
    if (m.stage === 'GROUP_STAGE') continue;

    const newStatus = STATUS_MAP[m.status] ?? 'scheduled';
    const newHome   = m.score?.fullTime?.home ?? null;
    const newAway   = m.score?.fullTime?.away ?? null;
    const homeId    = teamMap[String(m.homeTeam?.id)] ?? null;
    const awayId    = teamMap[String(m.awayTeam?.id)] ?? null;

    // If teams are known, match by team pair
    let internal = null;
    if (homeId && awayId) {
      internal = byTeams.get(`${homeId}:${awayId}`);
      if (!internal) {
        // Teams are now known but slot was TBD — find by date and assign
        const apiDate    = m.utcDate.slice(0, 10);
        const candidates = byDateVenue.get(apiDate) ?? [];
        if (candidates.length === 1) {
          internal = candidates[0];
        }
      }
    }

    if (!internal) continue;

    let touched = false;
    if (homeId && internal.homeTeamId !== homeId) { internal.homeTeamId = homeId; touched = true; }
    if (awayId && internal.awayTeamId !== awayId) { internal.awayTeamId = awayId; touched = true; }
    if (internal.status    !== newStatus) { internal.status    = newStatus; touched = true; }
    if (internal.homeScore !== newHome)   { internal.homeScore = newHome;   touched = true; }
    if (internal.awayScore !== newAway)   { internal.awayScore = newAway;   touched = true; }

    if (touched) changed++;
  }

  if (changed > 0) {
    file.lastUpdated = new Date().toISOString();
    writeJson('data/knockout.json', file);
    console.log(`knockout.json    → ${changed} match(es) updated`);
  } else {
    console.log('knockout.json    → no changes');
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Fetching from football-data.org (${new Date().toISOString()})...`);

  const [matchesData, standingsData] = await Promise.all([
    apiFetch('/competitions/WC/matches'),
    apiFetch('/competitions/WC/standings'),
  ]);

  const teamMap = readJson('data/api-team-map.json');

  console.log(`  ${matchesData.count ?? matchesData.matches.length} matches fetched`);
  console.log(`  ${standingsData.standings.length} standing groups fetched\n`);

  syncFixtures(matchesData.matches, teamMap);
  syncStandings(standingsData.standings, teamMap);
  syncKnockout(matchesData.matches, teamMap);

  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
