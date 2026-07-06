// Regression coverage for the consolidated merge function shared by
// scripts/sync-data.mjs and netlify/functions/live-data.mjs (Sprint 42,
// Defect 3). Locks in: local-propagation resolution taking priority over
// the fragile date fallback, team-pair matching, and the home/away-swap
// handling that live-data.mjs had but sync-data.mjs previously lacked.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeKnockoutMatches } from '../scripts/lib/knockout-merge.mjs';

const TEAM_MAP = { '100': 'france', '200': 'sweden', '300': 'brazil', '400': 'japan' };

function apiMatch(overrides) {
  return {
    stage: 'ROUND_OF_16',
    status: 'FINISHED',
    utcDate: '2026-07-07T20:00:00Z',
    score: { fullTime: { home: 1, away: 0 } },
    homeTeam: { id: 100 },
    awayTeam: { id: 200 },
    ...overrides,
  };
}

test('mergeKnockoutMatches resolves a same-date TBD collision via local propagation, not the date fallback', () => {
  // Two R16 slots share a kickoff date and are both still TBD locally —
  // exactly the shape that defeated the old per-script date fallback.
  // Their feeders are already FT, so the new local-propagation path
  // should resolve both correctly even with an EMPTY apiMatches list.
  const rounds = [
    { id: 'r32', matches: [
      { id: 'r32-m14', homeTeamId: 'argentina', awayTeamId: 'cape-verde', homeScore: 3, awayScore: 2, status: 'FT' },
      { id: 'r32-m16', homeTeamId: 'australia',  awayTeamId: 'egypt',     homeScore: 3, awayScore: 5, status: 'FT' },
      { id: 'r32-m13', homeTeamId: 'switzerland', awayTeamId: 'algeria',  homeScore: 2, awayScore: 0, status: 'FT' },
      { id: 'r32-m15', homeTeamId: 'colombia',    awayTeamId: 'ghana',    homeScore: 1, awayScore: 0, status: 'FT' },
    ]},
    { id: 'r16', matches: [
      { id: 'r16-m7', homeTeamId: null, awayTeamId: null, kickoff: '2026-07-07' },
      { id: 'r16-m8', homeTeamId: null, awayTeamId: null, kickoff: '2026-07-07' },
    ]},
  ];

  const changed = mergeKnockoutMatches(rounds, [], TEAM_MAP);
  const r16 = rounds[1].matches;

  assert.ok(changed > 0, 'reports at least the local-propagation resolutions as changed');
  assert.deepEqual(
    { home: r16[0].homeTeamId, away: r16[0].awayTeamId },
    { home: 'argentina', away: 'egypt' },
  );
  assert.deepEqual(
    { home: r16[1].homeTeamId, away: r16[1].awayTeamId },
    { home: 'switzerland', away: 'colombia' },
  );
});

test('mergeKnockoutMatches matches an API result to a known slot by team pair', () => {
  const rounds = [
    { id: 'r32', matches: [
      { id: 'r32-m5', homeTeamId: 'france', awayTeamId: 'sweden', status: 'scheduled', homeScore: null, awayScore: null },
    ]},
  ];

  const changed = mergeKnockoutMatches(rounds, [apiMatch({ score: { fullTime: { home: 3, away: 0 } } })], TEAM_MAP);
  const m = rounds[0].matches[0];

  assert.equal(changed, 1);
  assert.equal(m.status, 'FT');
  assert.equal(m.homeScore, 3);
  assert.equal(m.awayScore, 0);
});

test('mergeKnockoutMatches handles a home/away swap between the API and local data', () => {
  // Local data has France as home, Sweden as away; the API reports the
  // same fixture with Sweden as home. Scores must be un-swapped to match
  // OUR stored orientation, not overwritten in the API's orientation.
  const rounds = [
    { id: 'r32', matches: [
      { id: 'r32-m5', homeTeamId: 'france', awayTeamId: 'sweden', status: 'scheduled', homeScore: null, awayScore: null },
    ]},
  ];

  const swappedApiMatch = apiMatch({
    homeTeam: { id: 200 }, // sweden
    awayTeam: { id: 100 }, // france
    score: { fullTime: { home: 0, away: 3 } }, // sweden 0, france 3
  });

  mergeKnockoutMatches(rounds, [swappedApiMatch], TEAM_MAP);
  const m = rounds[0].matches[0];

  // Our stored home (france) must show 3, our stored away (sweden) must show 0 —
  // this is the fix live-data.mjs already had that sync-data.mjs previously lacked.
  assert.equal(m.homeTeamId, 'france');
  assert.equal(m.homeScore, 3);
  assert.equal(m.awayScore, 0);
});

test('mergeKnockoutMatches ignores group-stage matches', () => {
  const rounds = [{ id: 'r32', matches: [
    { id: 'r32-m5', homeTeamId: 'france', awayTeamId: 'sweden', status: 'scheduled', homeScore: null, awayScore: null },
  ]}];
  const changed = mergeKnockoutMatches(rounds, [apiMatch({ stage: 'GROUP_STAGE' })], TEAM_MAP);
  assert.equal(changed, 0);
  assert.equal(rounds[0].matches[0].status, 'scheduled');
});
