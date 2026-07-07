// Regression coverage for the pure functions in scripts/gather-rankings-signals.mjs
// (Sprint 39, Wikidata Awards extension). No network access -- only the
// deterministic parsing/mapping logic, using real wikitext/Q-id fixtures
// captured while verifying this against the live APIs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectWorldCupWinner, mapWikidataAwardsToRaw, mostRecentCompletedMonth,
} from '../scripts/gather-rankings-signals.mjs';

// ── detectWorldCupWinner ────────────────────────────────────────────────

test('detectWorldCupWinner finds a senior World Cup win in the medaltemplates block (real Messi fixture)', () => {
  const wikitext = `
| medaltemplates = {{MedalSport|Men's [[Association football|football]]}}
{{Medal|Country|{{fb|ARG}}}}
{{MedalCompetition|[[FIFA World Cup]]}}
{{Medal|W|[[2022 FIFA World Cup|2022 Qatar]]|}}
{{Medal|RU|[[2014 FIFA World Cup|2014 Brazil]]|}}
{{MedalCompetition|[[Copa América]]}}
{{Medal|W|[[2021 Copa América|2021 Brazil]]|}}
| module = {{Infobox person
`;
  assert.equal(detectWorldCupWinner(wikitext), true);
});

test('detectWorldCupWinner does not count a youth World Cup as a senior win', () => {
  const wikitext = `
| medaltemplates = {{MedalSport|Men's football}}
{{MedalCompetition|[[FIFA U-20 World Cup|U20 World Cup]]}}
{{Medal|W|[[2005 FIFA World Youth Championship|2005 Netherlands]]|}}
| module = {{Infobox person
`;
  assert.equal(detectWorldCupWinner(wikitext), false);
});

test('detectWorldCupWinner returns false for a runner-up, not a win', () => {
  const wikitext = `
| medaltemplates = {{MedalSport|Men's football}}
{{MedalCompetition|[[FIFA World Cup]]}}
{{Medal|RU|[[2014 FIFA World Cup|2014 Brazil]]|}}
| module = {{Infobox person
`;
  assert.equal(detectWorldCupWinner(wikitext), false);
});

test('detectWorldCupWinner returns false when there is no medaltemplates field at all', () => {
  assert.equal(detectWorldCupWinner('| name = Some Player\n| module = {{Infobox person\n'), false);
});

// ── mapWikidataAwardsToRaw ──────────────────────────────────────────────

test('mapWikidataAwardsToRaw maps the real Messi Q-id set to all three covered fields', () => {
  const qids = ['Q17355204', 'Q2291862', 'Q166177', 'Q182529', 'Q233454', 'Q1049896', 'Q260117'];
  assert.deepEqual(mapWikidataAwardsToRaw(qids), {
    ballonDorTier: 'winner',
    uefaPoty: true,
    wcGoldenBall: true,
  });
});

test('mapWikidataAwardsToRaw returns an empty object for a player with no covered awards (real Langås fixture)', () => {
  assert.deepEqual(mapWikidataAwardsToRaw([]), {});
});

test('mapWikidataAwardsToRaw ignores unrelated award Q-ids, never guessing a mapping', () => {
  // Q233454 (European Golden Shoe) and Q645468 (Footballer of the Year of
  // Argentina) are real awards Messi has, but neither is in the rubric's
  // covered set -- must not leak into the mapped result.
  assert.deepEqual(mapWikidataAwardsToRaw(['Q233454', 'Q645468']), {});
});

test('mapWikidataAwardsToRaw does NOT map FIFA Best Player Q-ids -- removed after a confirmed false positive', () => {
  // Real bug found 2026-07-08: Egypt's Salah has a P166 claim for Q28156245
  // ("The Best FIFA Men's Player") despite only finishing 3rd (2018, 2021) --
  // Wikidata includes podium finalists under "award received" for this
  // specific award with no queryable qualifier distinguishing them from an
  // actual winner. Per this project's determinism principle, this field was
  // removed entirely rather than patched with an unverified heuristic --
  // these Q-ids must map to nothing, not silently resolve to some other field.
  assert.deepEqual(mapWikidataAwardsToRaw(['Q28156245']), {});
  assert.deepEqual(mapWikidataAwardsToRaw(['Q182529']), {});
});

// ── mostRecentCompletedMonth ────────────────────────────────────────────

test('mostRecentCompletedMonth computes a same-month start/end that satisfies the Pageviews API (verified: day 28 fails for 30-day months)', () => {
  const window = mostRecentCompletedMonth(new Date(Date.UTC(2026, 6, 7))); // "now" = 2026-07-07
  assert.equal(window.start, '20260601');
  assert.equal(window.end, '20260630'); // June has 30 days, not 28
  assert.equal(window.label, '2026-06');
});

test('mostRecentCompletedMonth handles a January "now" by rolling back to December of the prior year', () => {
  const window = mostRecentCompletedMonth(new Date(Date.UTC(2026, 0, 15))); // "now" = 2026-01-15
  assert.equal(window.start, '20251201');
  assert.equal(window.end, '20251231');
  assert.equal(window.label, '2025-12');
});
