# RECOMMENDATIONS.md

Version: 1.0
Status: Planning Document — Phase 5
Purpose: Architecture, performance, maintainability, and scalability recommendations.
         These do not change requirements. They are options and suggestions only.

---

# IMPORTANT

These recommendations do not override any specification.
They are presented for your consideration before implementation begins.
Each recommendation is tagged:

  [ADOPT]    — Strong recommendation. Low risk, clear benefit.
  [CONSIDER] — Worth evaluating. Moderate tradeoff.
  [FUTURE]   — Not needed now, worth planning for.

---

# 1. ARCHITECTURE RECOMMENDATIONS

---

## REC-ARCH-001 [ADOPT]
**Normalise the player schema using IDs.**

Current spec has players referencing clubs and leagues as strings:
`"club": "Real Madrid"`, `"league": "La Liga"`.

Recommendation: use `"clubId": "real-madrid"`, `"leagueId": "la-liga"`.

Why this matters:
- Club names, badge paths, and league data live in clubs.json / leagues.json
- With string duplication, a club name change requires editing 15+ player records
- With IDs, you update clubs.json once
- Enables deep linking from player profile to club/league page
- At 1,250 players × ~400 clubs, deduplication is meaningful

How to implement: DataManager.getPlayer() returns a resolved player object
(with club and league objects populated from lookup) via a utility function.
The raw JSON stores IDs; the application always works with resolved objects.

---

## REC-ARCH-002 [ADOPT]
**Keep a single DataManager module as the sole source of truth.**

All data access goes through DataManager. No module fetches JSON directly.
This means:
- Cache logic lives in one place
- Error handling is centralised
- Switching from local JSON to a future API requires changing DataManager only
- Testing data scenarios (missing player, null standings) is easy — mock DataManager

---

## REC-ARCH-003 [ADOPT]
**Separate module lifecycle clearly: render() is async, init() is sync.**

Convention:
- `render()`: fetches data, builds DOM, inserts into container. Returns promise.
- `init()`: called after render completes. Attaches observers and event listeners. Sync.
- `teardown()`: removes observers, clears timers. Sync. Called before module removed.

Why: mixing data fetching and event binding leads to race conditions and memory leaks.
Clean separation makes each concern testable and replaceable.

---

## REC-ARCH-004 [ADOPT]
**Define a strict event delegation pattern rather than per-element listeners.**

Instead of attaching click listeners to every player card, attach one listener
to the squad grid container and delegate:

```javascript
squadGrid.addEventListener('click', (e) => {
  const card = e.target.closest('[data-player-id]');
  if (card) handleCardClick(card.dataset.playerId);
});
```

Why:
- Cards rendered dynamically (squad may re-render on data update)
- Per-element listeners must be removed on teardown or they leak
- Delegation scales from 26 players to any number
- Single listener per squad grid instead of 26+ listeners

---

## REC-ARCH-005 [CONSIDER]
**Adopt a consistent "View Object" pattern for rendering.**

Before rendering any component, build a plain object from the data:

```javascript
// Bad: passing raw player and rank objects through multiple functions
renderProfile(player, ranking, bio, similarPlayers);

// Better: build a view object, render from that
const view = buildPlayerView(player, ranking, bio, similarPlayers);
renderProfile(view);
```

Why:
- Separates data transformation from presentation
- Makes the shape of rendered data explicit
- Allows the same view to be rendered in multiple contexts (profile panel vs statistics XI)
- Makes future data source changes non-breaking for rendering

---

## REC-ARCH-006 [CONSIDER]
**Implement a lightweight event bus for cross-module communication.**

Currently, Hero Navigation requires `OverviewTab` to directly call a method on
`TeamPageModule`, which calls a method on `SquadTab`. This creates tight coupling.

An event bus decouples modules:

```javascript
// OverviewTab
EventBus.emit('hero:selected', { playerId: 'france-mbappe' });

// TeamPageModule
EventBus.on('hero:selected', ({ playerId }) => this.activateSquadTab(playerId));
```

Why:
- Modules don't need references to each other
- Adding new cross-module interactions doesn't require changing existing modules
- Easier to test individual modules in isolation

Caveat: adds complexity. Only adopt if cross-module communication grows beyond
the single Hero Navigation case.

---

# 2. PERFORMANCE RECOMMENDATIONS

---

## REC-PERF-001 [ADOPT]
**Split player data into per-team files.**

`data/players/france.json`, `data/players/brazil.json` etc.

Why:
- Loading a single players.json with 1,250+ entries on first visit is slow
- Per-team files average ~26KB each (vs ~1.3MB combined)
- Team page loads only its own players
- Search index built progressively as teams are visited
- Or: search index built from countries.json (names only) for instant search,
  with per-team files for detail views

This is the single highest-impact performance decision in the project.

---

## REC-PERF-002 [ADOPT]
**Pre-fetch adjacent team data during idle time.**

When a user opens the France team page, pre-fetch players for the next group's
teams during the browser's idle period:

```javascript
requestIdleCallback(() => {
  DataManager.loadPlayersForTeam('norway'); // next in same group
});
```

Why:
- Makes subsequent navigations feel instant
- Uses idle time that would otherwise be wasted
- No impact on current page rendering

---

## REC-PERF-003 [ADOPT]
**Use CSS Custom Properties for all theming. Never toggle classes for theme changes.**

A single `document.documentElement.setAttribute('data-theme', 'dark')` changes
all themed values in one operation. No JavaScript loop over elements. No class toggling.

Why:
- Theme switch: < 1ms (no JS layout work)
- Custom properties cascade through shadow DOM if web components used later
- Zero extra CSS specificity battles

---

## REC-PERF-004 [ADOPT]
**Use `content-visibility: auto` on off-screen squad rows.**

For teams with large squads, most player rows are below the fold.
`content-visibility: auto` defers rendering of off-screen content:

```css
.player-row {
  content-visibility: auto;
  contain-intrinsic-size: 0 160px; /* approximate row height */
}
```

Why:
- Reduces initial paint time on Squad tab
- Browser skips rendering off-screen rows until user scrolls near them
- Combined with IntersectionObserver, this is entirely compatible

---

## REC-PERF-005 [CONSIDER]
**Cache the search index in localStorage across sessions.**

Building the search index from 1,250+ players takes 50–200ms on first run.
Storing the serialised index in localStorage means subsequent sessions skip
index construction entirely.

Why:
- Instant search on return visits
- Index is deterministic from the data — regenerate only if data version changes
- Add a version hash to countries.json; if hash changes, rebuild index

Caveat: localStorage has a 5MB limit; a serialised search index for 1,250 players
is approximately 300–500KB — well within limits.

---

## REC-PERF-006 [CONSIDER]
**Use Intersection Observer for lazy-loading whole sections, not just images.**

The Statistics tab on team pages renders 6 chart sections. All 6 are computed
and rendered on tab activation. On low-end devices, this may cause a visible delay.

Alternative: render chart sections as they scroll into view (IntersectionObserver
on each section container). Charts below the fold are placeholders until reached.

---

# 3. MAINTAINABILITY RECOMMENDATIONS

---

## REC-MAINT-001 [ADOPT]
**Generate player bios from structured data, not manual text.**

As agreed: the `bio` field is optional. If null, the bio template engine generates
a 2–3 sentence bio from structured player fields.

Maintenance impact:
- Without this: 1,250 bios to write and maintain
- With this: 0 bios to write (until you want to override a specific player)
- If a player transfers clubs, the generated bio auto-updates from clubId
- Star player bios (Mbappe, Bellingham, Vinicius, etc.) can receive hand-crafted overrides

Template engine priority: stored `bio` → position-aware generated bio.
This is the highest-ROI maintainability decision in the project.

---

## REC-MAINT-002 [ADOPT]
**Keep all tournament data in JSON files, never hardcode.**

No group names, team names, fixture times, broadcasters, or standings in JS code.
100% data-driven rendering.

Why:
- Fixture times change (rescheduled matches)
- Broadcasters change (rights issues)
- Scores update as matches complete
- All updates require only JSON file edits, not code changes

---

## REC-MAINT-003 [ADOPT]
**Use semantic version constants in JSON files.**

Add to each JSON file:
```json
{ "version": "1.0", "lastUpdated": "2026-06-19T10:00:00Z", "data": [...] }
```

Why:
- Data cache can check version before using cached data
- UI can display "Last updated: 19 Jun, 10:00 BST" to users during the tournament
- Version number enables future cache invalidation strategy

---

## REC-MAINT-004 [ADOPT]
**Document all DataManager methods with JSDoc.**

DataManager is the central module all other modules depend on.
JSDoc comments on each method make it self-documenting:

```javascript
/**
 * @param {string} countryId - e.g. 'france'
 * @returns {Promise<Player[]>} Official squad players, sorted by position then shirt number
 */
async loadPlayersForTeam(countryId) { ... }
```

This is the one file where documentation is worth the investment.

---

## REC-MAINT-005 [CONSIDER]
**Create a data validation script.**

A Node.js script (not part of the app) that validates all JSON files against
their schemas and checks for:
- Missing required fields
- Broken player ID references (similarPlayerIds pointing to non-existent players)
- Club/league ID references that don't exist in clubs.json / leagues.json
- Invalid recentForm values (not W/D/L)
- All 48 teams present
- All 12 groups populated

Run before deployment. Zero cost to the app bundle. Prevents data entry errors
from reaching the live application.

---

## REC-MAINT-006 [ADOPT]
**Create a data entry guide document.**

STATUS: COMPLETE — see DATA_ENTRY_GUIDE.md (created Sprint 2).

For the person populating the 48 squads:
- Schema reference with all required vs optional fields
- Example of a complete player record
- Valid position values: GK, DF, MF, FW (not DEF/MID/FWD)
- Player ID naming conventions and disambiguation rules
- Brazilian single-name conventions
- Wikipedia API workflow (section-fetch technique)
- Club ID conventions
- Captain field conventions

Promoted from [CONSIDER] to [ADOPT] after Sprint 2 data entry confirmed real
disambiguation cases across just 78 players (two Hendersons, two Hernándezes,
two Danilos, two Edersons). At 1,250 players across 48 teams, inconsistency
without this guide is near-certain.

---

# 4. SCALABILITY RECOMMENDATIONS

---

## REC-SCALE-001 [ADOPT]
**Design DataManager to support future data sources.**

The DataManager interface should be source-agnostic:
- Currently: `fetch('data/players/france.json')`
- Future: `fetch('https://api.worldcup2026.example.com/players/france')`

The rest of the application never knows or cares where data comes from.
Switching to a live API requires changing DataManager only.

Practical steps:
- Never hardcode URLs in modules
- All data URLs defined as constants in DataManager
- DataManager may accept a base URL config on init

---

## REC-SCALE-002 [ADOPT]
**Design the ranking system for source replacement.**

The consensus formula (40%/20%/20%/10%/10%) is stored as constants, not
hardcoded in calculations. Adding or removing a component means changing the
formula constant, not the calculation logic.

```javascript
const CONSENSUS_WEIGHTS = {
  transfermarkt: 0.40,
  ea: 0.20,
  awards: 0.20,
  media: 0.10,
  form: 0.10
};
```

Why: Ranking sources will change. Transfermarkt may update their valuation
methodology. EA ratings update seasonally. Media scores are subjective.
The architecture must allow components to be replaced without schema changes.

---

## REC-SCALE-003 [CONSIDER]
**Design the router to support nested routes in the future.**

Current routing is flat: `#france`, `#france-mbappe`.
A future version might want: `#france/squad`, `#france/fixtures`.

The current hash parameter system (`#france-mbappe`) uses a hyphen separator
which conflicts if country IDs themselves contain hyphens (e.g. `south-africa`).

This is already a risk with the current spec (how to distinguish `#south-africa`
from a player named Africa on the South team?). The parser must check against a
known list of 48 country IDs.

Recommendation:
- Keep current hash format for now
- Maintain an authoritative list of all 48 country IDs as a constant
- Parser checks against this list before falling back to player route parsing
- This is robust for the current 48 teams

---

## REC-SCALE-004 [FUTURE]
**Plan for a Service Worker for offline support.**

The spec mentions "graceful offline behaviour." During the 2026 tournament,
many users will be at venues or in situations with poor connectivity.

A Service Worker caching the application shell and JSON data would make the
app function without a network connection after first visit.

This is a post-launch enhancement:
1. Register Service Worker during Sprint 7 (as a stub)
2. Full implementation after core features are complete

---

## REC-SCALE-005 [FUTURE]
**Consider a tournament-generic architecture.**

The spec mentions in 03_TECHNICAL_ARCHITECTURE.md:
"Architecture must allow: Additional tournaments, Additional teams, Additional players..."

The current data structure is World Cup 2026-specific (groups.json assumes 12 groups,
etc.). A future-generic architecture would allow Europa 2028, Copa America, etc.

For now: design with clear data/config boundaries.
The application knows it is "World Cup 2026" from a single config constant:

```javascript
const TOURNAMENT = {
  name: "FIFA World Cup 2026",
  teamCount: 48,
  groupCount: 12,
  groups: ['A','B','C','D','E','F','G','H','I','J','K','L']
};
```

Changing this constant and its data files should be sufficient to adapt for
a different tournament. No other changes required.

---

# 5. SPECIFIC RECOMMENDATION: VANILLA JS VS FRAMEWORK

This is one of the questions the audit identified (ARCH-001).

## Assessment

**Arguments for staying with Vanilla JS + ES Modules:**
- Spec prefers it, allowing frameworks only if complexity demands
- No build step — simpler deployment, simpler debugging
- ES modules give us the organisation of a framework (import/export, lifecycle)
- IntersectionObserver, scroll-snap, hash routing — all native APIs
- Long-term: no dependency rot (React deprecations, Vue major versions, etc.)
- The application is read-only with no complex two-way data binding needs

**Arguments for a lightweight framework:**
- Alpine.js (3KB): declarative x-data bindings reduce boilerplate
- Preact (3KB): virtual DOM for dynamic lists of 1,250 players
- Lit (5KB): Web Components with reactive properties

**Verdict:**

Vanilla JS + ES Modules is the right choice for this application.

The application's complexity is in:
1. Auto-Focus System — native APIs (IntersectionObserver)
2. Scroll-snap carousel — native CSS
3. Hash routing — native events
4. SVG charts — string generation
5. Fuzzy search — algorithm

None of these benefit from a framework.
The complexity is in feature design, not in data binding.
A framework would add a learning curve and dependency without addressing
the actual hard problems.

The only risk is DOM management at scale (1,250 player cards). This is managed
by per-team lazy loading — only 26 players are in the DOM at once.

**Decision: Stay with Vanilla JS + ES Modules. No framework.**

---

# 6. SPECIFIC RECOMMENDATION: FUSE.JS FOR SEARCH

**Recommendation: Use Fuse.js.**

Why:
- 6KB gzipped — negligible bundle cost
- Production-quality fuzzy matching out of the box
- "mbape" → Mbappe works without any algorithm work
- Configurable threshold, key weighting, and result scoring
- MIT licensed
- Zero dependencies of its own

Alternative (build from scratch):
- Levenshtein distance: ~30 lines of JS
- But: weighting (name vs club vs country), thresholds, and grouped results
  require significant additional code
- Risk: edge cases in fuzzy matching that Fuse.js handles correctly

**The productivity gain of Fuse.js outweighs any philosophical benefit
of a fully custom implementation. Recommend adoption.**

---

# 7. SPECIFIC RECOMMENDATION: SVG FOR ALL CHARTS

**Recommendation: Custom SVG for all charts. No chart library.**

Charts in this application:
- Radar/spider chart (5 axes) — Overview, Compare
- Horizontal bar charts — Club/League distribution
- Bar charts — Value, Age, Experience distribution (Statistics tab)

All of these are geometrically simple. A radar chart is 50 lines of trigonometry.
A bar chart is 20 lines of SVG rectangles.

Chart.js (60KB) or D3 (85KB) would add significant bundle weight for charts
that can be built in under 200 lines total.

**Custom SVG charts: better performance, smaller bundle, easier to style
consistently with the application's CSS custom properties.**

---

End of RECOMMENDATIONS.md
