/**
 * Shared knockout-slot merge logic — used by both scripts/sync-data.mjs
 * (Node CLI, writes directly to data/knockout.json) and
 * netlify/functions/live-data.mjs (Netlify Function, writes to Blob
 * Store). These two previously reimplemented near-identical matching
 * logic independently; consolidating removes the risk of a fix landing
 * in one and not the other (see docs/ROADMAP.md Sprint 42, Defect 3).
 */
import { resolvePropagatedSlots } from '../../js/bracket-topology.js';

const STATUS_MAP = {
  FINISHED:  'FT',
  IN_PLAY:   'live',
  PAUSED:    'live',
  TIMED:     'scheduled',
  SCHEDULED: 'scheduled',
};

/**
 * Mutates `rounds` (the knockout.json `.data` array) in place, merging in
 * whatever the API already knows. Returns the number of matches touched.
 *
 * Resolution order per API match:
 *   1. Local propagation graph (run once, up front, over ALL rounds —
 *      doesn't need an API match to trigger it): if a slot is still TBD
 *      but its own feeder match(es) are already FT locally, resolve it
 *      from OUR OWN data. Needs nothing from the API's date field, so it
 *      isn't exposed to the same-date collision risk below at all.
 *   2. Exact team-pair match against an already-known local slot — tried
 *      in both home/away orientations, since the API and our stored data
 *      can disagree on which side is "home" for the same fixture.
 *   3. Date-collision fallback — used only when neither of the above
 *      applies (rare once the propagation graph is in place): match by
 *      "the one local slot still TBD on this date," which is ambiguous
 *      whenever two TBD slots share a kickoff date. Kept as a last resort
 *      rather than removed, since it's still useful for the very first
 *      knockout round (R32), which isn't fed by another knockout match.
 *
 * Local propagation is run BOTH before and after the API loop. Before:
 * catches anything already-FT locally whose feeders finished since the
 * last run. After: catches a match that only became FT *during this same
 * run* (its own score just arrived from the API loop below) — without
 * this second pass, a fresh result wouldn't propagate into the next round
 * until a subsequent run, even though this run already has everything
 * needed to resolve it. Found via real data: a same-run Portugal vs Spain
 * result didn't advance Spain into the Quarter-finals slot until this was
 * added (see docs/ROADMAP.md Sprint 39 notes).
 */
export function mergeKnockoutMatches(rounds, apiMatches, teamMap) {
  let changed = resolvePropagatedSlots(rounds);

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

    const before = JSON.stringify(slot);

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

    if (JSON.stringify(slot) !== before) changed++;
  }

  changed += resolvePropagatedSlots(rounds);

  return changed;
}
