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

const { buildHeadToHeadSection, buildMatchMeta, attachTabScrollHandlers, pickActiveGroupId } = await import('../js/modules/match-centre.js');

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

// Regression coverage for a user-reported gap: the Match Centre header
// showed no date/time at all for completed matches (only score + "FT"),
// even though the exact same formatKickoff() helper already used for
// upcoming matches works fine on a past ISO timestamp too.

test('buildMatchMeta shows the formatted kickoff date/time for a completed (FT) match', () => {
  const fixture = {
    status: 'FT', kickoff: '2026-06-28T19:00:00Z',
    venue: 'SoFi Stadium, Inglewood', broadcaster: 'ITV',
  };
  const html = buildMatchMeta(fixture);

  assert.match(html, /mc-date/);
  assert.match(html, /28 Jun/);
  assert.match(html, /SoFi Stadium/);
});

test('buildMatchMeta does NOT show a date for an upcoming match (already shown prominently elsewhere in the header)', () => {
  const fixture = {
    status: 'scheduled', kickoff: '2026-07-11T21:00:00Z',
    venue: 'Hard Rock Stadium, Miami Gardens', broadcaster: null,
  };
  const html = buildMatchMeta(fixture);

  assert.doesNotMatch(html, /mc-date/);
  assert.match(html, /Hard Rock Stadium/);
});

// Regression coverage for a user-reported bug: clicking a Match Centre tab
// (Match/Context/Teams or Preview/Lineups/Teams) showed "Page not found".
// Root cause: the tab strip's plain <a href="#mc-group-X"> anchors changed
// location.hash, which this app's global router intercepts on every
// hashchange — "mc-group-X" doesn't match any known route, so the whole
// page got torn down and replaced with NotFoundModule. The fix intercepts
// the click and scrolls manually, never touching the hash.

test('attachTabScrollHandlers scrolls to the target section without ever changing location.hash', () => {
  document.body.innerHTML = `
    <nav class="mc-tab-strip"><a class="mc-tab" href="#mc-group-context">Context</a></nav>
    <section id="mc-group-context"></section>`;

  const section = document.getElementById('mc-group-context');
  let scrollCalls = 0;
  section.scrollIntoView = () => { scrollCalls++; };
  const hashBefore = window.location.hash;

  attachTabScrollHandlers(document.body);
  document.querySelector('.mc-tab').dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

  assert.equal(scrollCalls, 1, 'scrollIntoView called exactly once on the matching section');
  assert.equal(window.location.hash, hashBefore, 'location.hash must never change — this is exactly what triggered the 404');
});

test('attachTabScrollHandlers does not throw when a tab has no matching section', () => {
  document.body.innerHTML = `<nav class="mc-tab-strip"><a class="mc-tab" href="#mc-group-nonexistent">Ghost</a></nav>`;

  attachTabScrollHandlers(document.body);
  assert.doesNotThrow(() => {
    document.querySelector('.mc-tab').dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  });
});

// Regression coverage for two related user-reported bugs in the tab
// strip's scroll-spy. Bug A: the original IntersectionObserver callback
// did "clear all tabs, set one" PER entry it looped over, not once per
// batch — so when calling .observe() on every section coalesced multiple
// simultaneously-active entries into one callback (e.g. at initial page
// load), whichever entry was processed LAST silently won, overriding the
// hardcoded first-tab default before any scrolling happened. Bug B: an
// isIntersecting/overlap-based redesign fixed Bug A but then picking
// "topmost overlapping" got the WRONG answer for a tab click, since two
// adjacent contiguous sections can both briefly overlap a wide detection
// band at once, and the just-clicked (lower) section should win, not the
// one above it. pickActiveGroupId() fixes both by comparing real top-edge
// positions against one fixed trigger line and taking the LAST section
// (in document order) whose top has already reached it — never "topmost
// of whatever's currently overlapping."

test('pickActiveGroupId returns null when no section has reached the line yet (caller should leave the current tab alone)', () => {
  const tops = new Map([['mc-group-match', 500], ['mc-group-context', 1200]]);
  assert.equal(pickActiveGroupId(['mc-group-match', 'mc-group-context'], tops, 100), null);
});

test('pickActiveGroupId returns the sole section whose top has reached the line', () => {
  const tops = new Map([['mc-group-match', -50], ['mc-group-context', 1200]]);
  assert.equal(pickActiveGroupId(['mc-group-match', 'mc-group-context'], tops, 100), 'mc-group-match');
});

test('pickActiveGroupId resolves the LAST (bottommost) section whose top has reached the line, not the topmost (Bug B regression)', () => {
  // Simulates a tab click landing on "context": both "match" (now
  // scrolled well above the line, top deeply negative) and "context"
  // (freshly landed, top just at/past the line) have reached the line
  // simultaneously — "context" must win, since it's the one the user
  // actually navigated to, not "match" simply because it comes first.
  const groupIds = ['mc-group-match', 'mc-group-context', 'mc-group-teams'];
  const tops = new Map([
    ['mc-group-match', -537],
    ['mc-group-context', 98],
    ['mc-group-teams', 1500],
  ]);
  assert.equal(pickActiveGroupId(groupIds, tops, 100), 'mc-group-context');
});

test('pickActiveGroupId is unaffected by processing/insertion order — only position and document order matter (Bug A regression)', () => {
  const groupIds = ['mc-group-match', 'mc-group-context', 'mc-group-teams'];
  // Same positions as the previous test, but inserted into the Map in a
  // different order — must still resolve to "context", not whichever
  // entry happened to be set last.
  const tops = new Map([
    ['mc-group-teams', 1500],
    ['mc-group-match', -537],
    ['mc-group-context', 98],
  ]);
  assert.equal(pickActiveGroupId(groupIds, tops, 100), 'mc-group-context');
});

test('pickActiveGroupId keeps the last section active once scrolled past everything', () => {
  const groupIds = ['mc-group-match', 'mc-group-context', 'mc-group-teams'];
  const tops = new Map([
    ['mc-group-match', -1500],
    ['mc-group-context', -900],
    ['mc-group-teams', -50],
  ]);
  assert.equal(pickActiveGroupId(groupIds, tops, 100), 'mc-group-teams');
});

test('pickActiveGroupId ignores a group id with no known position', () => {
  const groupIds = ['mc-group-match', 'mc-group-context'];
  const tops = new Map([['mc-group-context', 50]]); // "match" never fired an entry
  assert.equal(pickActiveGroupId(groupIds, tops, 100), 'mc-group-context');
});
