// Regression coverage for scripts/dump-player-honours.mjs's pure section-
// extraction logic. No network access -- real wikitext fixtures only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { extractHonoursSection } from '../scripts/dump-player-honours.mjs';

// Confirmed real bug (Sprint 39, USA Awards research): every single USA
// player came back "no Honours section found" -- a 100% failure rate.
// American players' Wikipedia articles use the US spelling "Honors" by
// house style (Christian Pulisic's article carries an explicit editorial
// note: "Do not change to 'Honours' because he is American"), which the
// old Honours-only regex silently missed.

test('extractHonoursSection matches the American-English "Honors" heading, including an inline HTML comment', () => {
  // Real heading text captured from Christian Pulisic's live article.
  const wikitext = `
Some lead prose.

== Honors <!--Do not change to "Honours" because he is American.--> ==
'''Borussia Dortmund U17'''
*[[Under 17 Bundesliga]]: 2014-15

== Club statistics ==
Some stats.
`;
  const section = extractHonoursSection(wikitext);
  assert.match(section, /Borussia Dortmund U17/);
  assert.doesNotMatch(section, /Club statistics/);
});

test('extractHonoursSection still matches the British-English "Honours" heading', () => {
  const wikitext = `
Some lead prose.

== Honours ==
'''Real Madrid'''
*[[UEFA Champions League]]: 2017-18

== References ==
`;
  const section = extractHonoursSection(wikitext);
  assert.match(section, /Real Madrid/);
});

test('extractHonoursSection returns null when neither heading is present', () => {
  assert.equal(extractHonoursSection('Some lead prose with no matching heading.'), null);
});
