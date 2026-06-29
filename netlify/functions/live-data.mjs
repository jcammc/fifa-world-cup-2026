/**
 * Netlify Function — serves live tournament data.
 * GET /api/live?type=fixtures|standings|knockout
 *
 * On-demand (HTTP) functions automatically receive Netlify Blobs context,
 * so this function can both READ and WRITE the Blob Store without any
 * extra credentials. The scheduled sync-tournament function cannot do this.
 *
 * Strategy: serve cached Blob Store data if < 90 s old. If stale or
 * missing, fetch from football-data.org, merge with static files, write
 * all three types to Blob Store, then return the requested type.
 */
import { getStore } from '@netlify/blobs';

const VALID_TYPES  = new Set(['fixtures', 'standings', 'knockout']);
const API_KEY      = process.env.FOOTBALL_DATA_API_KEY;
const SITE_URL     = process.env.URL;
const BASE         = 'https://api.football-data.org/v4';
const CACHE_TTL_MS = 90_000;

const STATUS_MAP = {
  FINISHED:  'FT',
  IN_PLAY:   'live',
  PAUSED:    'live',
  TIMED:     'scheduled',
  SCHEDULED: 'scheduled',
};

// ── Fetchers ──────────────────────────────────────────────────────────────────

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

// ── Merge helpers ─────────────────────────────────────────────────────────────

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

    let slot    = null;
    let swapped = false;
    if (homeId && awayId) {
      slot = byTeams.get(`${homeId}:${awayId}`);
      if (!slot) {
        slot = byTeams.get(`${awayId}:${homeId}`);
        if (slot) swapped = true;
      }
      if (!slot) {
        const candidates = byDate.get(m.utcDate?.slice(0, 10) ?? '') ?? [];
        if (candidates.length === 1) slot = candidates[0];
      }
    }
    if (!slot) continue;

    if (!swapped) {
      if (homeId) slot.homeTeamId = homeId;
      if (awayId) slot.awayTeamId = awayId;
    }
    slot.status    = newStatus;
    slot.homeScore = swapped ? newAway : newHome;
    slot.awayScore = swapped ? newHome : newAway;
    if (m.utcDate?.includes('T') && !slot.kickoff?.includes('T')) {
      slot.kickoff = m.utcDate;
    }
  }

  out.lastUpdated = new Date().toISOString();
  return out;
}

// ── Refresh all three types from the API ──────────────────────────────────────

async function refreshAll(store) {
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
  const standings = mergeStandings(existingSt, standingsData.standings, teamMap);
  const knockout  = mergeKnockout(existingKo,  matchesData.matches,    teamMap);

  await Promise.all([
    store.set('fixtures',  JSON.stringify(fixtures)),
    store.set('standings', JSON.stringify(standings)),
    store.set('knockout',  JSON.stringify(knockout)),
  ]);

  const finished = matchesData.matches.filter(m => m.status === 'FINISHED').length;
  const live     = matchesData.matches.filter(m => m.status === 'IN_PLAY' || m.status === 'PAUSED').length;
  const koFT     = knockout.data.flatMap(r => r.matches ?? []).filter(m => m.status === 'FT').length;
  console.log(`live-data: refreshed — ${finished} FT, ${live} live, ${koFT} KO completed [${new Date().toISOString()}]`);

  return { fixtures, standings, knockout };
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function (req) {
  const type = new URL(req.url).searchParams.get('type');

  if (!type || !VALID_TYPES.has(type)) {
    return new Response(JSON.stringify({ error: 'Invalid type parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let cached = null;
  try {
    const store = getStore({ name: 'tournament', consistency: 'strong' });
    cached = await store.get(type, { type: 'json' });

    // Return cached data if still fresh
    if (cached?.lastUpdated) {
      const ageMs = Date.now() - new Date(cached.lastUpdated).getTime();
      if (ageMs < CACHE_TTL_MS) {
        return jsonOk(cached);
      }
    }

    // Stale or missing — refresh from API
    if (!API_KEY || !SITE_URL) {
      console.warn('live-data: FOOTBALL_DATA_API_KEY or URL not set, serving stale/503');
      if (cached) return jsonOk(cached);
      return new Response(JSON.stringify({ error: 'Not yet available' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const all = await refreshAll(store);
    return jsonOk(all[type]);

  } catch (err) {
    console.error('live-data error:', err.message);
    if (cached) return jsonOk(cached);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function jsonOk(data) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type':                'application/json',
      'Cache-Control':               'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export const config = { path: '/api/live' };
