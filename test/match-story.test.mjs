// Regression coverage for Sprint 33's Match Centre fix. The bug: the
// FT-branch guard in buildHeadToHeadSection only checked the (at the time,
// unmigrated) `matchStory` field — every completed match with only the
// legacy `headToHead` field populated silently rendered nothing. The fix
// widened the guard to accept either field. This test locks that in by
// reproducing the EXACT pre-migration data shape (matchStory empty,
// headToHead populated) and asserting content still renders.
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// js/modules/match-centre.js imports js/data.js, which reads
// window.location.hostname at module-load time.
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
globalThis.window   = dom.window;
globalThis.document = dom.window.document;

const { buildHeadToHeadSection } = await import('../js/modules/match-centre.js');

const home = { id: 'brazil', name: 'Brazil' };
const away = { id: 'morocco', name: 'Morocco' };

test('FT match with only the legacy headToHead field populated still renders Match Story (Sprint 33 regression)', () => {
  const matchPreviews = {
    data: {
      'c-r1-bra-mor': {
        matchStory: '',           // NOT yet migrated — the exact pre-fix data shape
        headToHead: 'The two sides had met three times previously, with Brazil winning twice.',
        headToHeadStats: null,
      },
    },
  };

  const html = buildHeadToHeadSection('c-r1-bra-mor', matchPreviews, true, home, away);

  assert.notEqual(html, '', 'must render something, not the old silent empty string');
  assert.match(html, /Match Story/);
  assert.match(html, /Brazil winning twice/);
});

test('FT match with matchStory already migrated prefers it over the legacy field', () => {
  const matchPreviews = {
    data: {
      'c-r1-bra-mor': {
        matchStory: 'Brazil came from behind to beat Morocco 2-1.',
        headToHead: 'Some older prose that should not be the primary blockquote.',
        headToHeadStats: null,
      },
    },
  };

  const html = buildHeadToHeadSection('c-r1-bra-mor', matchPreviews, true, home, away);

  assert.match(html, /came from behind/);
});

test('FT match with neither field nor stats populated renders nothing (correct empty case, not a regression)', () => {
  const matchPreviews = { data: { 'c-r1-bra-mor': { matchStory: '', headToHead: '', headToHeadStats: null } } };
  const html = buildHeadToHeadSection('c-r1-bra-mor', matchPreviews, true, home, away);
  assert.equal(html, '');
});

test('upcoming (non-FT) match uses the Head-to-Head branch, unaffected by the FT-branch fix', () => {
  const matchPreviews = {
    data: { 'r32-m11': { matchStory: '', headToHead: 'Portugal have won 7 of 10 meetings.', headToHeadStats: null } },
  };
  const html = buildHeadToHeadSection('r32-m11', matchPreviews, false, home, away);

  assert.match(html, /Head-to-Head</);
  assert.doesNotMatch(html, /Match Story/);
});
