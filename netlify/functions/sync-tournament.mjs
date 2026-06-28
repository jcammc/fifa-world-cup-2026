/**
 * Netlify Scheduled Function — runs every 2 minutes on match days.
 * Fetches WC 2026 data from football-data.org, merges with existing
 * static structure (preserving venues/IDs/qualificationStatus), and
 * writes updated JSON to Netlify Blob Store.
 *
 * Required env vars:
 *   FOOTBALL_DATA_API_KEY  — from football-data.org
 *   URL                    — set automatically by Netlify (site URL)
 */
import { getStore } from '@netlify/blobs';

const API_KEY  = process.env.FOOTBALL_DATA_API_KEY;
const SITE_URL = process.env.URL;
const BASE     = 'https://api.football-data.org/v4';

const STATUS_MAP = {
  FINISHED:  'FT',
  IN_PLAY:   'live',
  PAUSED:    'live',
  TIMED:     'scheduled',
  SCHEDULED: 'scheduled',
};

async function apiFetch(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-Auth-Token': API_KEY },
  });
  if (!res.ok) throw new Error(`API ${path} → HTTP ${res.status}`);
  return res.json();
}

async function siteFetch(path) {
  const res = await fetch(`${SITE_URL}${path}`);
  if (!res.ok) throw new Error(`Site fetch ${path} → HTTP ${res.status}`);
  return res.json();
}

// ── Transform helpers ─────────────────────────────────────────────────────────

function mergeFixtures(existing, apiMatches, teamMap) {
  const out     = structuredClone(existing);
  const byTeams = new Map(out.data.map(f => [`${f.homeTeamId}:${f.awayTeamId}`, f]));

  for (const m of apiMatches) {
    if (m.stage !== 'GROUP_STAGE') continue;
    const homeId = teamMap[String(m.homeTeam?.id)];
    const awayId = teamMap[String(m.awayTeam?.id)];
    if (!homeId || !awayId) continue;

    const f = byTeams.get(`${homeId}:${awayId}`);
    if (!f) continue;

    f.status    = STATUS_MAP[m.status] ?? 'scheduled';
    f.homeScore = m.score?.fullTime?.home ?? null;
    f.awayScore = m.score?.fullTime?.away ?? null;
  }

  out.lastUpdated = new Date().toISOString();
  return out;
}

function mergeStandings(existing, apiStandings, teamMap) {
  const out     = structuredClone(existing);
  const byGroup = new Map(out.data.map(g => [g.groupId, g]));

  for (const s of apiStandings) {
    if (s.type !== 'TOTAL') continue;
    const groupId  = s.group.replace(/^Group\s+/i, '').trim();
    const internal = byGroup.get(groupId);
    if (!internal) continue;

    internal.teams = s.table.map(entry => {
      const teamId = teamMap[String(entry.team?.id)];
      if (!teamId) return null;
      const prev = internal.teams.find(t => t.teamId === teamId);
      return {
        teamId,
        position:            entry.position,
        played:              entry.playedGames,
        won:                 entry.won,
        drawn:               entry.draw,
        lost:                entry.lost,
        goalsFor:            entry.goalsFor,
        goalsAgainst:        entry.goalsAgainst,
        goalDifference:      entry.goalDifference,
        points:              entry.points,
        qualificationStatus: prev?.qualificationStatus ?? null,
      };
    }).filter(Boolean);
  }

  out.lastUpdated = new Date().toISOString();
  return out;
}

function mergeKnockout(existing, apiMatches, teamMap) {
  const out    = structuredClone(existing);
  const rounds = out.data;

  const byTeams = new Map();
  const byDate  = new Map();

  for (const round of rounds) {
    for (const m of round.matches ?? []) {
      if (m.homeTeamId && m.awayTeamId) {
        byTeams.set(`${m.homeTeamId}:${m.awayTeamId}`, m);
      } else if (m.kickoff) {
        const d = m.kickoff.slice(0, 10);
        if (!byDate.has(d)) byDate.set(d, []);
        byDate.get(d).push(m);
      }
    }
  }

  for (const m of apiMatches) {
    if (m.stage === 'GROUP_STAGE') continue;

    const homeId    = teamMap[String(m.homeTeam?.id)] ?? null;
    const awayId    = teamMap[String(m.awayTeam?.id)] ?? null;
    const newStatus = STATUS_MAP[m.status] ?? 'scheduled';
    const newHome   = m.score?.fullTime?.home ?? null;
    const newAway   = m.score?.fullTime?.away ?? null;

    let slot = null;
    if (homeId && awayId) {
      slot = byTeams.get(`${homeId}:${awayId}`);
      if (!slot) {
        const candidates = byDate.get(m.utcDate.slice(0, 10)) ?? [];
        if (candidates.length === 1) slot = candidates[0];
      }
    }
    if (!slot) continue;

    if (homeId) slot.homeTeamId = homeId;
    if (awayId) slot.awayTeamId = awayId;
    slot.status    = newStatus;
    slot.homeScore = newHome;
    slot.awayScore = newAway;
    // Write full UTC kickoff timestamp when API provides one and we only have a date-only string
    if (m.utcDate?.includes('T') && !slot.kickoff?.includes('T')) {
      slot.kickoff = m.utcDate;
    }
  }

  out.lastUpdated = new Date().toISOString();
  return out;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function () {
  if (!API_KEY)  { console.error('sync-tournament: FOOTBALL_DATA_API_KEY not set'); return; }
  if (!SITE_URL) { console.error('sync-tournament: URL env not set'); return; }

  try {
    const [matchesData, standingsData, teamMap, existingFx, existingSt, existingKo] =
      await Promise.all([
        apiFetch('/competitions/WC/matches'),
        apiFetch('/competitions/WC/standings'),
        siteFetch('/data/api-team-map.json'),
        siteFetch('/data/fixtures.json'),
        siteFetch('/data/standings.json'),
        siteFetch('/data/knockout.json'),
      ]);

    const fixtures  = mergeFixtures(existingFx,  matchesData.matches,    teamMap);
    const standings = mergeStandings(existingSt,  standingsData.standings, teamMap);
    const knockout  = mergeKnockout(existingKo,   matchesData.matches,    teamMap);

    const store = getStore({ name: 'tournament', consistency: 'strong' });
    await Promise.all([
      store.setJSON('fixtures',  fixtures),
      store.setJSON('standings', standings),
      store.setJSON('knockout',  knockout),
    ]);

    const finished = matchesData.matches.filter(m => m.status === 'FINISHED').length;
    const live     = matchesData.matches.filter(m => m.status === 'IN_PLAY' || m.status === 'PAUSED').length;
    console.log(`sync-tournament: OK — ${finished} FT, ${live} live [${new Date().toISOString()}]`);
  } catch (err) {
    console.error('sync-tournament: failed —', err.message);
  }
}

export const config = { schedule: '*/2 * * * *' };
