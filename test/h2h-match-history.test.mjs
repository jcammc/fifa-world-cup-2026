// Coverage for buildMatchHistoryList() and competitionBadge() — the
// match-results table that replaced the old Wikipedia-prose "History
// notes"/"Head-to-Head History" toggle content. Three states, deliberately
// distinct (see the function's own header comment in match-centre.js):
// nothing-verified-yet (renders nothing, not a placeholder sentence),
// confirmed-zero, and rows-present (with or without a known true total).
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
globalThis.window   = dom.window;
globalThis.document = dom.window.document;

const { buildMatchHistoryList, competitionBadge } = await import('../js/modules/match-centre.js');

test('stats is null (never fetched) renders nothing at all — no placeholder sentence', () => {
  assert.equal(buildMatchHistoryList(null), '');
});

test('confirmed zero meetings (not capped) renders "No previous meetings"', () => {
  const stats = { matches: [], meta: { autoCapped: { allTime: false }, trueTotal: { allTime: 0 } } };
  const html = buildMatchHistoryList(stats);
  assert.match(html, /no previous meetings/i);
});

test('capped with zero verified rows renders nothing — a research gap, not something to paper over with a sentence', () => {
  const stats = { matches: [], meta: { autoCapped: { allTime: true }, trueTotal: { allTime: 7 } } };
  assert.equal(buildMatchHistoryList(stats), '');
});

test('capped with partial rows and a known true total shows "Showing X of Y"', () => {
  const stats = {
    matches: [
      { date: '2024-07-09', competition: 'European Championship', homeTeam: 'Spain', awayTeam: 'France', homeScore: 2, awayScore: 1 },
    ],
    meta: { autoCapped: { allTime: true }, trueTotal: { allTime: 7 } },
  };
  const html = buildMatchHistoryList(stats);
  assert.match(html, /Showing 1 of 7 previous meetings/);
  assert.match(html, /Spain/);
  assert.match(html, /France/);
});

test('capped with verified rows but no known true total (manual-partial case) shows the generic incomplete caveat, not a fabricated count', () => {
  const stats = {
    matches: [
      { date: '1990-06-17', competition: 'FIFA World Cup', homeTeam: 'Uruguay', awayTeam: 'Spain', homeScore: 0, awayScore: 0 },
    ],
    meta: { autoCapped: { allTime: true }, trueTotal: { allTime: null } },
  };
  const html = buildMatchHistoryList(stats);
  assert.match(html, /Only verified meetings shown/);
  assert.doesNotMatch(html, /Showing \d+ of/);
});

test('manual override that resolved allTime clears a stale capped flag — no caveat, even if autoCapped is still true', () => {
  // Real shape from l-r3-pan-eng: automated fetch flagged capped before any
  // override existed; the override then resolved BOTH scopes (this pair's
  // entire history is one confirmed match), but autoCapped itself is never
  // recomputed after the merge. The override resolving allTime must win.
  const stats = {
    matches: [
      { date: '2018-06-24', competition: 'FIFA World Cup', homeTeam: 'Panama', awayTeam: 'England', homeScore: 1, awayScore: 6 },
    ],
    meta: {
      autoCapped: { allTime: true, worldCup: true },
      trueTotal: { allTime: 1, worldCup: null },
      manualSupplement: { scopes: ['allTime', 'worldCup'] },
    },
  };
  const html = buildMatchHistoryList(stats);
  assert.doesNotMatch(html, /Showing/);
  assert.doesNotMatch(html, /Only verified/);
});

test('manual override that resolved only worldCup leaves allTime genuinely capped — caveat still shows', () => {
  // Real shape from h-r3-uru-esp: override explicitly left allTime
  // unresolved (only 2 of a real ~10 all-time meetings are confirmed), so
  // the capped caveat must survive even though `scopes` is present.
  const stats = {
    matches: [
      { date: '1950-07-09', competition: 'FIFA World Cup', homeTeam: 'Uruguay', awayTeam: 'Spain', homeScore: 2, awayScore: 2 },
      { date: '1990-06-17', competition: 'FIFA World Cup', homeTeam: 'Uruguay', awayTeam: 'Spain', homeScore: 0, awayScore: 0 },
    ],
    meta: {
      autoCapped: { allTime: true, worldCup: true },
      trueTotal: { allTime: 2, worldCup: null },
      manualSupplement: { scopes: ['worldCup'] },
    },
  };
  const html = buildMatchHistoryList(stats);
  assert.match(html, /Only verified meetings shown/);
});

test('uncapped with rows present is the complete list — no caveat at all', () => {
  const stats = {
    matches: [
      { date: '2022-12-01', competition: 'FIFA World Cup', homeTeam: 'Canada', awayTeam: 'Morocco', homeScore: 0, awayScore: 3 },
    ],
    meta: { autoCapped: { allTime: false }, trueTotal: { allTime: 1 } },
  };
  const html = buildMatchHistoryList(stats);
  assert.doesNotMatch(html, /Showing/);
  assert.doesNotMatch(html, /Only verified/);
});

test('rows are sorted most-recent-first regardless of input order', () => {
  const stats = {
    matches: [
      { date: '1974-06-18', competition: 'FIFA World Cup', homeTeam: 'Scotland', awayTeam: 'Brazil', homeScore: 0, awayScore: 0 },
      { date: '1998-06-10', competition: 'FIFA World Cup', homeTeam: 'Scotland', awayTeam: 'Brazil', homeScore: 1, awayScore: 2 },
      { date: '1982-06-18', competition: 'FIFA World Cup', homeTeam: 'Scotland', awayTeam: 'Brazil', homeScore: 1, awayScore: 4 },
    ],
    meta: { autoCapped: { allTime: false }, trueTotal: { allTime: 3 } },
  };
  const html = buildMatchHistoryList(stats);
  const positions = ['10 Jun 1998', '18 Jun 1982', '18 Jun 1974'].map(d => html.indexOf(d));
  assert.ok(positions.every(p => p !== -1), 'all three formatted dates must appear in the output');
  assert.ok(positions[0] < positions[1] && positions[1] < positions[2], 'expected 1998, then 1982, then 1974');
});

test('winner is bolded via mc-h2h-history__winner, draws get neither side marked', () => {
  const stats = {
    matches: [
      { date: '2018-06-24', competition: 'FIFA World Cup', homeTeam: 'Panama', awayTeam: 'England', homeScore: 1, awayScore: 6 },
      { date: '1974-06-18', competition: 'FIFA World Cup', homeTeam: 'Scotland', awayTeam: 'Brazil', homeScore: 0, awayScore: 0 },
    ],
    meta: { autoCapped: { allTime: false }, trueTotal: { allTime: 2 } },
  };
  const html = buildMatchHistoryList(stats);
  assert.match(html, /mc-h2h-history__winner">England/);
  assert.doesNotMatch(html, /mc-h2h-history__winner">Panama/);
  assert.doesNotMatch(html, /mc-h2h-history__winner">Scotland/);
  assert.doesNotMatch(html, /mc-h2h-history__winner">Brazil/);
});

test('competitionBadge maps known competitions to short labels and falls back to the raw name otherwise', () => {
  assert.match(competitionBadge('FIFA World Cup'), />World Cup</);
  assert.match(competitionBadge('European Championship'), />EURO</);
  assert.match(competitionBadge('Copa América'), />Copa Am/);
  assert.match(competitionBadge('Some Obscure Cup'), />Some Obscure Cup</);
  assert.equal(competitionBadge(null), '');
});
