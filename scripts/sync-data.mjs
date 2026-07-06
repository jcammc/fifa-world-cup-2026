/**
 * Syncs fixture results, standings, and knockout data from football-data.org.
 * Run: node scripts/sync-data.mjs
 * Env: FOOTBALL_DATA_API_KEY (falls back to value in source if unset)
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mergeKnockoutMatches } from './lib/knockout-merge.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
if (!API_KEY) throw new Error('FOOTBALL_DATA_API_KEY env var is not set');
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
//
// Merge logic lives in scripts/lib/knockout-merge.mjs — shared with
// netlify/functions/live-data.mjs so the two don't drift (see
// docs/ROADMAP.md Sprint 42, Defect 3).

function syncKnockout(apiMatches, teamMap) {
  const file   = readJson('data/knockout.json');
  const rounds = file.data;

  const changed = mergeKnockoutMatches(rounds, apiMatches, teamMap);

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
