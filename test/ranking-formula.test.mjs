// Regression coverage for scripts/lib/ranking-formula.mjs (Sprint 39).
// Locks in the three real-data bugs found while building the ranking
// pipeline (see docs/plans/2026-07-06-ranking-system-design.md) plus the
// determinism requirement: an event name that can't be resolved must be
// reported and skipped, never guessed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normaliseName, buildTeamIndex, matchEventName, aggregateFormStats,
  rawFormScore, percentileRank, computeConsensus, FORM_WEIGHTS,
} from '../scripts/lib/ranking-formula.mjs';

// ── normaliseName ───────────────────────────────────────────────────────

test('normaliseName lowercases, strips diacritics, and normalises hyphens', () => {
  assert.equal(normaliseName('Kevin De Bruyne'), 'kevin de bruyne');
  assert.equal(normaliseName('Núñez'), 'nunez');
  assert.equal(normaliseName('Al-Tambakti'), 'al tambakti');
});

// ── matchEventName: the Messi bare-surname bug ──────────────────────────

test('matchEventName resolves a bare surname to the one full-name match on the roster (Messi bug)', () => {
  const index = buildTeamIndex([
    { id: 'argentina-messi', name: 'Lionel Messi' },
    { id: 'argentina-dibu', name: 'Emiliano Martinez' },
  ]);
  const match = matchEventName('Messi', index);
  assert.equal(match?.playerId, 'argentina-messi');
});

// ── matchEventName: compound surnames (Lo Celso / De Bruyne) ────────────

test('matchEventName resolves a compound-surname event name via unambiguous suffix match', () => {
  const index = buildTeamIndex([
    { id: 'argentina-locelso', name: 'Giovani Lo Celso' },
    { id: 'argentina-messi', name: 'Lionel Messi' },
  ]);
  assert.equal(matchEventName('Lo Celso', index)?.playerId, 'argentina-locelso');
});

test('matchEventName resolves De Bruyne the same way on a different roster', () => {
  const index = buildTeamIndex([
    { id: 'belgium-debruyne', name: 'Kevin De Bruyne' },
    { id: 'belgium-courtois', name: 'Thibaut Courtois' },
  ]);
  assert.equal(matchEventName('De Bruyne', index)?.playerId, 'belgium-debruyne');
});

// ── matchEventName: determinism — never guess an ambiguous or unknown name ──

test('matchEventName refuses an ambiguous suffix match shared by two players', () => {
  const index = buildTeamIndex([
    { id: 'argentina-la-martinez', name: 'Lautaro Martinez' },
    { id: 'argentina-li-martinez', name: 'Alejandro Martinez' },
  ]);
  assert.equal(matchEventName('Martinez', index), null);
});

test('matchEventName returns null for a name with no candidate on the roster', () => {
  const index = buildTeamIndex([{ id: 'argentina-messi', name: 'Lionel Messi' }]);
  assert.equal(matchEventName('Diney', index), null);
});

// ── aggregateFormStats: basic aggregation + MOTM-via-substitute ─────────

test('aggregateFormStats counts starts, goals, assists, subApps, and motm', () => {
  const matchEventsData = {
    'f1': {
      homeStarting: [{ name: 'Lionel Messi' }],
      awayStarting: [{ name: 'Kevin De Bruyne' }],
      events: [
        { type: 'goal', teamId: 'argentina', scorer: 'Messi', assistBy: null },
      ],
      motm: 'Lionel Messi',
    },
  };
  const matchLookup = new Map([['f1', { homeTeamId: 'argentina', awayTeamId: 'belgium' }]]);
  const teamIndexes = new Map([
    ['argentina', buildTeamIndex([{ id: 'argentina-messi', name: 'Lionel Messi' }])],
    ['belgium', buildTeamIndex([{ id: 'belgium-debruyne', name: 'Kevin De Bruyne' }])],
  ]);

  const { stats, unmatched } = aggregateFormStats(matchEventsData, matchLookup, teamIndexes);
  assert.deepEqual(unmatched, []);
  assert.deepEqual(stats.get('argentina-messi'), { starts: 1, subApps: 0, goals: 1, assists: 0, motm: 1 });
  assert.deepEqual(stats.get('belgium-debruyne'), { starts: 1, subApps: 0, goals: 0, assists: 0, motm: 0 });
});

test('aggregateFormStats resolves MOTM awarded to a substitute, not just starters (Manzambi bug)', () => {
  const matchEventsData = {
    'f1': {
      homeStarting: [{ name: 'Granit Xhaka' }],
      awayStarting: [{ name: 'Kevin De Bruyne' }],
      events: [
        { type: 'substitution', teamId: 'switzerland', onPlayer: 'Zeki Amdouni' },
      ],
      motm: 'Zeki Amdouni',
    },
  };
  const matchLookup = new Map([['f1', { homeTeamId: 'switzerland', awayTeamId: 'belgium' }]]);
  const teamIndexes = new Map([
    ['switzerland', buildTeamIndex([
      { id: 'switzerland-xhaka', name: 'Granit Xhaka' },
      { id: 'switzerland-amdouni', name: 'Zeki Amdouni' },
    ])],
    ['belgium', buildTeamIndex([{ id: 'belgium-debruyne', name: 'Kevin De Bruyne' }])],
  ]);

  const { stats, unmatched } = aggregateFormStats(matchEventsData, matchLookup, teamIndexes);
  assert.deepEqual(unmatched, []);
  assert.deepEqual(stats.get('switzerland-amdouni'), { starts: 0, subApps: 1, goals: 0, assists: 0, motm: 1 });
});

test('aggregateFormStats reports an unresolvable event name rather than guessing', () => {
  const matchEventsData = {
    'f1': {
      homeStarting: [{ name: 'Lionel Messi' }],
      awayStarting: [],
      events: [
        { type: 'goal', teamId: 'argentina', scorer: 'Diney', assistBy: null },
      ],
      motm: null,
    },
  };
  const matchLookup = new Map([['f1', { homeTeamId: 'argentina', awayTeamId: 'belgium' }]]);
  const teamIndexes = new Map([
    ['argentina', buildTeamIndex([{ id: 'argentina-messi', name: 'Lionel Messi' }])],
    ['belgium', buildTeamIndex([])],
  ]);

  const { stats, unmatched } = aggregateFormStats(matchEventsData, matchLookup, teamIndexes);
  assert.equal(unmatched.length, 1);
  assert.equal(unmatched[0].name, 'Diney');
  assert.equal(stats.has('argentina-messi'), true); // the start is still counted
});

// ── rawFormScore ─────────────────────────────────────────────────────────

test('rawFormScore applies the documented weights', () => {
  const s = { starts: 3, subApps: 1, goals: 7, assists: 0, motm: 3 };
  assert.equal(rawFormScore(s, FORM_WEIGHTS), 3 * 3 + 1 * 1 + 8 * 7 + 6 * 0 + 40 * 3);
});

// ── percentileRank: tie-break ────────────────────────────────────────────

test('percentileRank assigns tied raw scores the same percentile', () => {
  const entries = [
    { key: 'a', raw: 10 },
    { key: 'b', raw: 20 },
    { key: 'c', raw: 20 },
    { key: 'd', raw: 30 },
  ];
  const result = percentileRank(entries);
  assert.equal(result.get('b'), result.get('c'));
  assert.ok(result.get('a') < result.get('b'));
  assert.ok(result.get('c') < result.get('d'));
  assert.equal(result.get('d'), 100);
});

test('percentileRank gives the sole entry 100 when there is only one', () => {
  const result = percentileRank([{ key: 'a', raw: 5 }]);
  assert.equal(result.get('a'), 100);
});

// ── computeConsensus: renormalization + provisional flag ─────────────────

test('computeConsensus renormalizes over present manual fields and flags provisional when any are missing', () => {
  const entry = { transfermarkt: 80, ea: null, awards: null, media: null, form: 90 };
  const { consensus, provisional } = computeConsensus(entry);
  // Only transfermarkt (0.40) + form (0.10) are present; renormalized over 0.50.
  const expected = Math.round(((80 * 0.40 + 90 * 0.10) / 0.50) * 10) / 10;
  assert.equal(consensus, expected);
  assert.equal(provisional, true);
});

test('computeConsensus is not provisional once all four manual components are present', () => {
  const entry = { transfermarkt: 80, ea: 70, awards: 60, media: 50, form: 90 };
  const { consensus, provisional } = computeConsensus(entry);
  const expected = Math.round((80 * 0.40 + 70 * 0.20 + 60 * 0.20 + 50 * 0.10 + 90 * 0.10) * 10) / 10;
  assert.equal(consensus, expected);
  assert.equal(provisional, false);
});
