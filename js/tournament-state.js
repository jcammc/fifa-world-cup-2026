/**
 * Pure utility functions for deriving tournament state.
 * No DOM, no fetching, no side effects.
 */

// ─── Best-third ranking ────────────────────────────────────

/**
 * Returns 3rd-place entries from all groups, sorted by FIFA best-third criteria:
 * points → goal difference → goals for.
 * Each entry: { groupId, teamId, points, gd, gf, played }
 */
export function rankBestThirds(standings) {
  const thirds = [];
  for (const group of standings) {
    const t = group.teams.find(t => t.position === 3);
    if (t) thirds.push({
      groupId: group.groupId,
      teamId:  t.teamId,
      points:  t.points,
      gd:      t.goalDifference,
      gf:      t.goalsFor,
      played:  t.played,
    });
  }
  return thirds.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd     !== a.gd)     return b.gd     - a.gd;
    return b.gf - a.gf;
  });
}

/**
 * Returns sorted array of 8 group letters whose 3rd-place teams are projected to advance.
 */
export function getAdvancingThirdGroups(standings) {
  return rankBestThirds(standings).slice(0, 8).map(t => t.groupId).sort();
}

// ─── Annex C lookup ────────────────────────────────────────

/**
 * Looks up Annex C slot assignments for the given advancing groups.
 * advancingGroups: array or string of 8 group letters.
 * Returns { [matchId]: groupLetter } or null if combination not found.
 */
export function lookupAnnexC(annexCData, advancingGroups) {
  const key = [...advancingGroups].sort().join('');
  return annexCData.combinations[key] ?? null;
}

// ─── Group projection ──────────────────────────────────────

/**
 * Returns { winner, runnerUp, complete } for a single group.
 * winner/runnerUp are teamIds (null if not yet determined).
 * complete: true when all teams have played 3 matches.
 */
export function getGroupProjection(groupStandings) {
  const pos1 = groupStandings.teams.find(t => t.position === 1);
  const pos2 = groupStandings.teams.find(t => t.position === 2);
  return {
    winner:   pos1?.teamId ?? null,
    runnerUp: pos2?.teamId ?? null,
    complete: groupStandings.teams.every(t => t.played >= 3),
  };
}

// ─── Full bracket projection ───────────────────────────────

/**
 * Builds a map of slot label → { teamId, confidence } for all R32 slots.
 *
 * Slot labels:
 *   'Winner Group A' ... 'Winner Group L'
 *   'Runner-up Group A' ... 'Runner-up Group L'
 *   'best-third-r32-m2' ... (keyed by matchId for best-third slots)
 *
 * confidence: 'confirmed' | 'likely' | 'open'
 *   confirmed — group is complete, position is locked
 *   likely    — qualificationStatus === 'qualified'
 *   open      — still uncertain
 */
export function buildBracketProjection(standings, annexCData) {
  const map = new Map();

  // ── Winner / Runner-up slots ──
  for (const group of standings) {
    const gid      = group.groupId;
    const complete = group.teams.every(t => t.played >= 3);
    for (const team of group.teams) {
      if (team.position !== 1 && team.position !== 2) continue;
      const label      = `${team.position === 1 ? 'Winner' : 'Runner-up'} Group ${gid}`;
      const confidence = complete ? 'confirmed'
        : team.qualificationStatus === 'qualified' ? 'likely'
        : 'open';
      map.set(label, { teamId: team.teamId, confidence });
    }
  }

  // ── Best-third slots via Annex C ──
  const advancingGroups = getAdvancingThirdGroups(standings);
  const annexMapping    = lookupAnnexC(annexCData, advancingGroups);

  if (annexMapping) {
    const ranked = rankBestThirds(standings);
    const allDone = ranked.slice(0, 8).every(t =>
      standings.find(g => g.groupId === t.groupId)?.teams.every(t2 => t2.played >= 3)
    );

    for (const [matchId, groupLetter] of Object.entries(annexMapping)) {
      const entry = ranked.find(t => t.groupId === groupLetter);
      if (!entry) continue;
      const groupDone  = standings.find(g => g.groupId === groupLetter)?.teams.every(t => t.played >= 3);
      const confidence = allDone    ? 'confirmed'
        : groupDone    ? 'likely'
        : 'open';
      map.set(`best-third-${matchId}`, { teamId: entry.teamId, confidence, matchId });
    }
  }

  return map;
}

// ─── Match implications ────────────────────────────────────

/**
 * Returns { status, text } describing what's at stake for a team in a group fixture,
 * or null if implications are unknown/not applicable.
 *
 * status: 'qualified' | 'eliminated' | 'leading' | 'contention' | 'danger'
 */
export function getMatchImplication(team, groupStandings) {
  if (!groupStandings || !team) return null;
  const t = groupStandings.teams.find(t => t.teamId === team.id);
  if (!t) return null;

  if (t.qualificationStatus === 'qualified')  return { status: 'qualified',  text: 'Already qualified' };
  if (t.qualificationStatus === 'eliminated') return { status: 'eliminated', text: 'Already eliminated' };

  const pos2 = groupStandings.teams.find(tt => tt.position === 2);
  const pos3 = groupStandings.teams.find(tt => tt.position === 3);
  const gap  = (pos2?.points ?? 0) - t.points;

  if (t.position === 1) {
    const leadOver3 = t.points - (pos3?.points ?? 0);
    if (leadOver3 >= 3) return { status: 'leading',    text: '1st — win secures top spot' };
    return               { status: 'contention', text: '1st — win strengthens position' };
  }

  if (t.position === 2) {
    const leadOver3 = t.points - (pos3?.points ?? 0);
    if (leadOver3 >= 3) return { status: 'leading',    text: '2nd — win secures top-two finish' };
    return               { status: 'contention', text: '2nd — win strengthens position' };
  }

  // Position 3 or 4
  if (gap === 0) return { status: 'contention', text: 'Level on points — win could move up' };
  if (gap <= 3)  return { status: 'contention', text: `${gap} pt${gap > 1 ? 's' : ''} behind — win could qualify` };
  return               { status: 'danger',      text: `${gap} pts off qualification` };
}
