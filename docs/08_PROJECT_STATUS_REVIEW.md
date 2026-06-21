# 08 — Project Status Review

**Last reviewed:** 2026-06-20
**Reviewed by:** Claude (project-status-review skill)
**Maintenance:** Refresh after each sprint using the `project-status-review` skill.

**Document scope:** This is the permanent project-state record — what exists, what works, what is broken, what was decided, and what remains.

**Companion document:** `docs/SESSION_HANDOFF.md` is the operational quick-reference for active development sessions. It covers npm scripts, data-entry workflow, schema rules, the Wikipedia API workflow, routing map, and JSON schema definitions. When these documents conflict on feature status, this document takes precedence. When they conflict on operational procedure, `docs/SESSION_HANDOFF.md` takes precedence.

---

## 1. Executive Summary

The project is a vanilla JavaScript SPA — "FIFA World Cup 2026 Squad Explorer and Tournament Companion" — hosted on Netlify with no build step and no framework. All data lives in local JSON files. All routing is hash-based.

### Overall Assessment

The project has completed its hardest architectural work. The core team exploration experience, the tournament centre, and the squad auto-focus system are all implemented and working. All 48 squads are fully populated (1,248 players). The search overlay is functional. The data pipeline has validation tooling and an index generator.

What remains is a mix of time-sensitive data maintenance (tournament results are live now), a critical rendering bug in overview-tab.js, and a large body of analysis features (Stats Tab, Compare, Club Explorer) that are entirely unstarted.

### Completion Estimates

| Dimension | Estimate | Basis |
|-----------|----------|-------|
| Architecture completeness | 75% | Core routing, module lifecycle, data layer, and primary features are solid. DataManager is missing its statistics query methods (T-020/T-021). Analysis module architecture is entirely absent. |
| Data completeness | 45% | Squad data is 100% complete. Tournament data is 55% complete (R2/R3 in progress). `recentForm` is 0/48. `teamStrength` is 3/48. Rankings are empty. All broadcaster fields are null. |
| User-facing completeness | 65% | Team pages, squad browsing, group carousel, and search are all usable. Statistics tab is a stub on every team page. Overview tab's Recent Form section is broken by a logic bug. No player photos exist. |
| Production readiness | 55% | The app delivers real value today but has visible gaps on every page. Tournament data must be kept current daily through June 27. The recentForm rendering bug means a core feature section is broken even once data is entered. |

### Most Important Facts

- **All 48 squads are complete** — 1,248 players across 48 player files, all passing validation.
- **Tournament Centre is the app's strongest feature** — group carousel, standings, knockout bracket shell are all working.
- **There is a rendering bug in overview-tab.js** — `#renderRecentForm()` silently returns `''` when `recentForm` data exists, meaning the feature will never render even after data is populated.
- **The Statistics tab is a 7-line empty stub** — it shows "Coming soon" on every team page.
- **League name resolution is broken for 85% of clubs** — `leagues.json` covers 14 of 86 distinct leagueId strings used in clubs.json. The League Distribution panel on Overview shows `—` for most entries.
- **All broadcaster data is null** — BBC/ITV badge CSS exists and is ready, but no broadcaster field in any of the 72 fixtures is populated.
- **search.js is an orphaned dead stub** — the real search implementation is `modules/search-overlay.js`. The top-level `search.js` exports an empty object and is never imported.

---

## 2. Current Feature Inventory

### Team Explorer

#### Fully Implemented

**Team Page shell (`modules/team-page.js`)**
Four-tab shell with active state management. Loads country data, clubs, and leagues in parallel. Renders header (flag, name, group, ranking, confederation, manager). Tab switching without page reload. `scrollToPlayer` deep-link parameter handled. Error state for unknown country IDs. Hero player navigation (Overview → Squad → focused player card) implemented via callback chain — no event bus.

**Overview Tab (`modules/overview-tab.js`)**
Hero cards (top 5 by caps descending), squad makeup bar chart by position, club distribution list (top 6), league distribution list, radar chart (renders only when `teamStrength` exists), and recent form section. Note: recent form section has a rendering bug — see Major Findings.

**Fixtures Tab (`modules/fixtures-tab.js`)**
Group-stage fixtures with W/D/L result indicators. Knockout pending state with deep-link to bracket. Today badge on live fixtures. Deep-links to Group Carousel and Knockout Bracket from each fixture card.

#### Partially Implemented

**Team header (T-026 — documented PARTIAL)**
Renders: flag, country name, group, FIFA ranking, confederation, manager name.
Not rendered: average age (computable from player data but not implemented), squad value (field not in schema), world cups won (field not in schema).

**Profile Panel (`modules/profile-panel.js`)**
Renders: photo (with initials fallback), shirt number, name, position badge, club name, age, caps, goals, fallback bio.
Not rendered: ranking breakdown (5-component consensus score — explicitly deferred, requires rankings data that does not exist), similar players section (explicitly deferred), height field (not in player schema).

**Bio generator (`js/bio.js`)**
`generateFallbackBio()` is implemented and produces a readable sentence. However it uses a single generic template regardless of position. The spec (T-022) calls for GK/DEF/MID/FWD-specific templates with conditional clauses. Current output is functional but generic.

**Charts (`js/charts.js`)**
`renderRadar()` is fully implemented: 5-axis SVG, 4 grid rings at 25/50/75/100%, data polygon, vertex dots, axis labels, `role="img"` accessibility attribute. `renderBar()` and `renderSparkline()` are no-op stubs (empty function bodies).

**DataManager (`js/data.js`)**
All core loaders implemented: `loadCountries()`, `loadGroups()`, `loadFixtures()`, `loadStandings()`, `loadKnockout()`, `loadClubs()`, `loadLeagues()`, `loadRankings()`, `loadSearchIndex()`, `loadPlayersForTeam()`. Cache via `#cache` Map. Envelope unwrap (`json.data ?? []`).
Not implemented: `getTopPlayersForTeam()`, `getMostRepresentedClubs()`, `getMostRepresentedLeagues()`, `getMostValuableXI()`, `getMostExperiencedXI()`, `getYoungestXI()`, `getSquadValueRanking()` (all T-020/T-021 — required by Stats Tab and Compare View).

#### Stubbed / Placeholder

**Statistics Tab (`modules/stats-tab.js`)**
7 lines. Empty `render()`, `init()`, `teardown()`. Clicking the Statistics tab on any team page renders a "Coming soon" message from the fallback branch in `team-page.js`.

### Squad Experience

#### Fully Implemented

**Squad Tab (`modules/squad-tab.js`)**
Player cards grouped by position (GK / DF / MF / FW). Player cards show photo (with initials fallback), name, position badge, club name. Lazy loading via `loading="lazy"`. `content-visibility: auto` applied to squad cards. `data-player-id` attribute on each card.

**Auto-Focus System**
IntersectionObserver on `.squad-group[data-position]` sections. Root is `#app-content` (the scroll container). `rootMargin: '-30% 0px'`. `#rowSelections` Map keyed by position string tracks last-viewed player per group. Observer fires when position group enters viewport, loads first visible player into Profile Panel. Keyboard: card focus → `scrollIntoView` → observer fires naturally.

**Hero Player Navigation**
Click hero card on Overview → `TeamPage.#navigateToPlayer(playerId)` → `#loadTab('squad')` → `SquadTab.scrollToPlayer(playerId)`. Fully working. No event bus; direct callback chain.

#### Gaps (Not a separate classification — included here for clarity)

No player photo assets exist. All 1,248 players show the initials fallback. No club badge assets exist. Profile Panel ranking breakdown and similar players are explicitly deferred pending a rankings data source decision.

### Tournament Centre

#### Fully Implemented

**Tournament Centre shell (`modules/tournament-centre.js`)**
3-tab layout: Today's Matches / Group Stage / Knockout Stage. Params-driven initial tab from route hash. Tab switching without reload. Event listener attached to inner `.tournament-centre` element (not `#app-content`) to prevent listener accumulation across navigations.

**Group Carousel (`modules/group-carousel.js`)**
12 group cards with standings tables and fixture strips. Drag scrolling (pointer events), wheel redirect, left/right arrow navigation. Gap-aware card index calculation via `getComputedStyle().columnGap`. `.is-dragging` class disables `scroll-snap-type` during pointer drag to prevent conflict. Public `scrollToGroup(groupId)` method for deep-link navigation. `setTimeout(0)` defer on deep-link scroll to allow browser layout to settle. Qualification badges shown for teams where `qualificationStatus` is set. Groups without standings data show "available soon" placeholder.

**Knockout Bracket (`modules/knockout-bracket.js`)**
Horizontal bracket with 5 rounds. Match pairs wrapped in `.bracket-pair` elements for CSS connector lines. Seed labels (e.g. `1A`, `2B`) rendered for R32. Empty team slots render with null label. Horizontally scrollable on narrow viewports.

#### Partially Implemented

**Today's Matches**
Uses `isToday()` from `time.js`. Falls back to next 6 scheduled fixtures when no matches are scheduled today. Broadcaster badge slot exists in the template but always renders nothing because all `broadcaster` fields are `null`.

**Knockout Bracket data**
All `homeTeamId` and `awayTeamId` fields across all 16 R32 matches are `null`. The bracket renders correctly with seed labels, but no real teams appear. No mechanism exists to propagate R32 winners into R16 slots as matches are played.

### Search

#### Fully Implemented

**Search Overlay (`modules/search-overlay.js`)**
Activated by Ctrl+K, Cmd+K, or nav search button. Backdrop click and ESC close. Diacritic normalisation via `normalize('NFD')`. Live substring filter on input. Results grouped: Teams (max 6) and Players (max 8). Player results navigate to `#countryId-playerId` deep-link. Persistent singleton — instantiated once in `app.js`, not torn down by router. Index loaded once and cached.

**Search Index (`data/search-index.json`)**
1,296 entries: 48 team entries + 1,248 player entries. Envelope format `{ version, lastUpdated, data }`. Regenerated by `scripts/generate-search-index.js`.

#### Gaps

No fuzzy matching. Exact substring only after diacritic normalisation. `"mbape"` returns zero results. No club, league, or manager entries in the index — search is teams and players only.

#### Stubbed / Orphaned

**`js/search.js`**
6 lines. Exports an empty `Search` object with no-op methods. Never imported by any other module. This file is entirely superseded by `modules/search-overlay.js` and is orphaned dead code.

### Data Layer

#### Fully Implemented

See DataManager above. All core loaders, HTTP error handling, cache invalidation methods, `getTodaysFixtures()`, `getGroupStandings()`, `getPlayerResolved()`.

**Validation tooling (`scripts/validate-data.js`)**
Checks all 48 squads: 26 players per squad, shirts 1–26 exactly once, exactly one captain, valid positions (GK/DF/MF/FW), `clubId` present in `clubs.json`, DOB within 1984–2009 range (soft warning for known exceptions), cross-squad duplicate ID detection, `_verification` flag reporting.

**Search index generator (`scripts/generate-search-index.js`)**
Reads `countries.json`, `clubs.json`, and all player files. Writes `data/search-index.json` in envelope format. Run after any squad data change.

#### Not Implemented (T-020 / T-021)

Statistics generators: `getMostValuableXI()`, `getMostExperiencedXI()`, `getYoungestXI()`, `getMostRepresentedClubs()`, `getMostRepresentedLeagues()`, `getSquadValueRanking()`. These are prerequisites for the Statistics Dashboard and Compare View and are currently absent from `data.js`.

### Analysis Features

#### Planned, Not Started

All analysis features are either 7-line lifecycle stubs or PlaceholderModule routes:

| Feature | State | Route |
|---------|-------|-------|
| Statistics Dashboard | 7-line stub (`modules/stats-tab.js`) — note: this is the team-level tab, not a global dashboard | `#statistics` → PlaceholderModule |
| Compare Teams | 7-line stub (`modules/compare-view.js`) | `#compare` → PlaceholderModule |
| Club Explorer | No module | `#club-explorer` → PlaceholderModule |
| League Explorer | No module | `#league-explorer` → PlaceholderModule |
| Countries Browse | No module | `#countries` → PlaceholderModule |
| Rankings | No module, empty data file | `#rankings` — not in router |

### Utility Features

#### Fully Implemented

`utils.js`: `escapeHtml()`, `html` tagged template literal, `slugify()`, `getInitials()`, `ordinal()`, `formatCurrency()`, `debounce()`, `clamp()`, `waitForScrollEnd()`.

`time.js`: `formatKickoff()`, `isToday()`.

`theme.js`: `initTheme()`, `toggleTheme()`, localStorage persistence, `data-theme` attribute on `<html>`.

#### Stubbed

`scripts/generate-player-bios.js`, `scripts/generate-rankings.js`, `scripts/update-standings.js`, `scripts/update-knockout.js`, `scripts/gather-photos.js`, `scripts/build-search-index.js` (superseded by `generate-search-index.js`).

---

## 3. Current Data Coverage

All counts verified by direct file inspection on 2026-06-20.

| Data Type | Current | Expected | Coverage | Notes |
|-----------|---------|----------|----------|-------|
| Teams | 48 | 48 | 100% | All present in `countries.json` |
| Squads | 48 | 48 | 100% | All player files exist |
| Players | 1,248 | 1,248 | 100% | 48 files × 26 players, all validated |
| Clubs | 456 | 456+ | 100% | All clubs referenced by players are present |
| Leagues (named) | 14 | 86 | 16% | 86 distinct `leagueId` strings in clubs.json; only 14 have a name entry in leagues.json |
| Fixtures total | 72 | 72 | 100% | All group-stage fixtures present |
| Fixtures completed (FT) | 32 | 72 | 44% | R1 all groups + R2 Groups A–D complete |
| Fixtures with broadcaster | 0 | 72 | 0% | All `broadcaster` fields are `null` |
| Standing groups | 12 | 12 | 100% | A–L all present |
| Teams qualified | 4 | 16 | 25% | Mexico, Canada, Switzerland, USA (post-R2) |
| Teams eliminated | 4 | 32 | 13% | Bosnia, Qatar, Haiti, Turkey (post-R2) |
| Knockout R32 team slots | 0 | 32 | 0% | All `homeTeamId`/`awayTeamId` null; seed labels present |
| Search index entries | 1,296 | 1,296 | 100% | 48 teams + 1,248 players |
| Rankings entries | 0 | 48 | 0% | `rankings.json` is an empty stub |
| `recentForm` populated | 0 | 48 | 0% | All `null` in `countries.json` |
| `teamStrength` populated | 3 | 48 | 6% | France, England, Brazil only |
| Player photos | 0 | 1,248 | 0% | No assets in `assets/players/`; initials fallback always active |
| Flag SVGs | Present | 48 | Unknown | Not counted; fallback `onerror` exists |

### Data Quality Issues

- **`uzbekistan-shomurodov` name collision:** Shirt #9 (`uzbekistan-turgunboev`) has the name "Eldor Shomurodov" — this is incorrect. The real Shomurodov plays shirt #14. Validator passes because IDs are unique; the error is in the `name` field only.
- **`scotland-gordon` DOB warning:** Craig Gordon (DOB 1982-12-31, age 43) triggers the validator's `DOB_MIN=1984` soft warning on every run. This is a known exception — he is genuinely 43. The warning is benign but persistent.
- **`jordan-zito`:** Has `_verification: "caps/club uncertain"` flag. Data confidence issue, not a schema error.

---

## 4. Major Findings From Review

These are findings that contradict planning document claims or that were not visible from the planning documents alone.

### Positive Findings

**The Auto-Focus squad system works correctly and is architecturally clean.** The IntersectionObserver targeting position-group sections (not individual rows) was the right call — it scales cleanly, handles mobile touch scroll, and integrates correctly with the keyboard focus chain.

**DataManager is a genuine singleton with no leaks.** The `#cache` Map pattern with HTTP error handling and envelope unwrap is solid. All 48 squad files load correctly on demand without double-fetching.

**The search overlay is production-quality for its current scope.** Diacritic normalisation, Ctrl+K trigger, singleton lifecycle, and player deep-link navigation all work as designed. The implementation is clean and self-contained.

**Validation tooling is comprehensive and fast.** `validate-data.js` catches the full set of errors that matter (shirt uniqueness, captain count, position validity, club ID references, DOB range, cross-squad ID duplicates). It runs without errors on all 48 squads.

**The group carousel is the app's strongest UI feature.** Gap-aware index math, drag/snap conflict resolution via `.is-dragging`, `setTimeout(0)` deep-link scroll defer, and `scrollToGroup()` are all correctly implemented. The wheel redirect from body to carousel is also correctly handled.

### Critical Findings

**CRITICAL BUG — `#renderRecentForm()` in `overview-tab.js:184–195` is inverted.**

The method has the following logic:
- When `country.recentForm` is `null` or empty → renders a "Match results not yet available" placeholder section
- When `country.recentForm` IS populated → returns `''` (empty string, renders nothing)

This means that even after all 48 countries' `recentForm` arrays are populated with data, zero form bubbles will appear anywhere in the application. The rendering path for actual data is completely absent — only the empty-state path is implemented. This is a hidden bug in code that was classified as "complete" because the file is non-trivial and has no stub markers.

**Evidence:** `js/modules/overview-tab.js`, lines 184–195. The method body: `if (!country.recentForm?.length) { return placeholder HTML }; return '';`

**`search.js` is an orphaned dead file.**

`js/search.js` exports a `Search` object with four no-op methods. It is never imported by any other module. The actual search implementation is `js/modules/search-overlay.js`. These two files describe conflicting approaches and `search.js` would cause confusion for any future contributor who encounters it.

**DataManager statistics methods were never built.**

T-020 and T-021 (query utilities and statistics generators) are entirely absent from `data.js`. The Stats Tab, Compare View, and the Statistics Dashboard all require these methods. They are not stubbed — they simply do not exist. Any attempt to build analysis features must begin with implementing these methods.

### Minor Findings

**League name resolution works for only 16% of clubs.** `leagues.json` has 14 entries. `clubs.json` uses 86 distinct `leagueId` strings. The `#leagueMap.get(id)` call in `overview-tab.js` returns `null` for 72 of 86 leagueIds, rendering `'—'` in the League Distribution panel on every team's Overview tab. This is immediately visible to users and requires only data entry (no code changes) to fix.

**T-026 (team header) was marked PARTIAL and remains partial.** Average age, squad value, and world cups won are all absent from the team header. Average age is computable from the already-loaded players array. Squad value and world cups won would require schema additions.

**`charts.js` has two no-op stub methods alongside the working radar.** `renderBar()` and `renderSparkline()` both have empty function bodies. Not a current issue (Stats Tab doesn't call them), but they will surface immediately once Stats Tab is built.

**The `bio.js` position-specific template spec (T-022) was not implemented.** `generateFallbackBio()` produces a single generic pattern for all positions. A goalkeeper and a striker get identical sentence structures. Functional but not per-spec.

**`build-search-index.js` is a superseded stub alongside the working generator.** Both `scripts/build-search-index.js` (stub, never worked) and `scripts/generate-search-index.js` (complete, actively used) exist in `scripts/`. The superseded file is dead weight.

---

## 5. Current Roadmap Assessment

### What should happen next

**Tournament data maintenance is the only time-critical work.** R2 for Groups E–L plays June 20–24. R3 for all 12 groups plays June 25–27. Knockout R32 begins approximately June 28. Every match result that isn't reflected in `fixtures.json` and `standings.json` makes the Tournament Centre — the app's default landing page — show incorrect information to real users. This work cannot be deferred.

**The recentForm rendering bug must be fixed before recentForm data is entered.** It is a 30-minute code change. Without it, all 48 countries' form data is invisible regardless of whether the data exists. Fix the code first, then enter the data.

**recentForm population is the next-highest visible improvement.** Every team's Overview tab currently shows "Match results not yet available." Populating `recentForm` for all 48 countries from Wikipedia match histories is verifiable data entry with immediate user-facing impact. It is unblocked by the bug fix above.

**League name resolution is low-effort, high-reward.** Adding 72 entries to `leagues.json` requires no code changes and fixes a visually broken panel on every team's Overview tab.

### What should NOT happen next

**Do not start the Statistics Tab until DataManager statistics methods exist.** `stats-tab.js` cannot be built without `getTopPlayersForTeam()`, `getMostRepresentedClubs()`, `getMostRepresentedLeagues()` etc. Attempting to build the UI before the data layer is in place will produce a second wave of stubs.

**Do not start Compare Teams or Club Explorer until Stats Tab is delivered.** These are lower-traffic features. Stats Tab fills the dead fourth tab on every team page and has higher daily user impact.

**Do not expand leagues.json beyond the 86 entries currently referenced.** Only add entries that resolve existing `leagueId` strings in clubs.json. Do not expand leagues as a separate workstream.

**Do not pursue teamStrength ratings until the methodology is agreed.** Three teams (France, England, Brazil) have values entered with no documented methodology. Adding more values using a different approach would create inconsistent data. Decision must precede data entry.

### Priority order

1. Fixture and standings updates through June 27 (time-locked)
2. recentForm rendering bug fix (code, 30 minutes)
3. recentForm population — all 48 countries (data entry)
4. Knockout R32 slot population after all groups complete (~June 27)
5. League name resolution (data entry, no code)
6. DataManager statistics methods (T-020/T-021)
7. Statistics Tab (T-043)
8. Fuzzy search (Fuse.js integration)

---

## 6. Open Decisions

### Rankings methodology

**Status:** Entirely unresolved. `rankings.json` is empty. `data.js` has a `loadRankings()` method that returns `[]`.

**Options:**
- A. Use FIFA World Rankings (official, authoritative, available via Wikipedia)
- B. Build a consensus score from Transfermarkt (market value), EA FC ratings, and media rankings (40%/20%/20%/10%/10% as specified in RECOMMENDATIONS.md)
- C. Defer rankings entirely to V1.1 — remove the rankings route rather than show a perpetual stub

**Recommendation:** Option C in the short term (remove or acknowledge the stub) to avoid a permanently empty page. Option B for V1.1 if the data can be sourced. Option A is too shallow to differentiate players and doesn't answer the "who are the best players" question in an interesting way.

**Priority:** Low — does not block any current work. Must be decided before attempting to build the Profile Panel ranking breakdown.

---

### TeamStrength ratings methodology

**Status:** France, England, and Brazil have values. No methodology is documented. The five dimensions are: `attack`, `midfield`, `defence`, `goalkeeping`, `depth`. Values appear to be in the 80–95 range for the three teams that have them.

**Options:**
- A. FIFA ranking-derived formula (objective but coarse — ranking doesn't capture dimension breakdown)
- B. EA FC ratings per position group, averaged (objective, detailed, but involves a third-party product)
- C. Editorial judgement per team by the developer (fast, consistent if done in one session, subjective)
- D. Defer until a clear methodology emerges; remove radar chart for teams without data

**Recommendation:** Option C, done in a single session to ensure consistency. Document the methodology as a comment in `countries.json` or a separate note. The radar is a supplementary visual — it does not need to be rigorously sourced to be useful.

**Priority:** Medium — the radar chart is absent on 45 of 48 team pages, which is a visible gap.

---

### Broadcaster data source

**Status:** All 72 `broadcaster` fields are `null`. BBC/ITV badge CSS exists and is ready. The data simply hasn't been sourced.

**Options:**
- A. Source from BBC Sport / ITV Sport fixture listings (manual entry, ~72 records)
- B. Source from an official FIFA broadcast schedule (if publicly available)
- C. Omit broadcaster data for V1.0 — leave null and hide the badge slot when null

**Recommendation:** Option A, done in a single session once the full UK broadcast schedule is known. The CSS infrastructure is ready — this is data entry only. If the schedule isn't available before launch, Option C is acceptable.

**Priority:** Medium for UK audience. Low globally.

---

### Player photo sourcing strategy

**Status:** No assets exist in `assets/players/`. All 1,248 players show the initials fallback. The `gather-photos.js` script is a stub.

**Options:**
- A. Wikipedia image API — fetch player images from their Wikipedia pages (permissive licence, variable quality)
- B. Wikidata / Commons API — more structured access to the same images
- C. Manual curation — download and resize images individually for priority players only
- D. Accept no photos for V1.0; initials fallback is functional

**Recommendation:** Option D for V1.0. Option A or B for V1.1, implemented via `gather-photos.js`. The initials fallback is intentional and not broken. Sourcing 1,248 photos is a significant workstream that should not delay other priorities.

**Priority:** Low for V1.0. High for polish.

---

### Club Explorer scope

**Status:** Route exists (`#club-explorer` → PlaceholderModule). No module implemented. No design spec beyond the task breakdown (T-059, T-060).

**Options:**
- A. Implement as planned: club list sorted by player count, click → club detail with players grouped by country
- B. Reduce scope to a simple table: club name, player count, country — no detail view
- C. Defer to V1.1

**Recommendation:** Option C. Club Explorer is not on the critical path for V1.0. The data (clubs.json, player files) is ready to support it, but the development time is better spent on Stats Tab first.

**Priority:** Low.

---

### League Explorer scope

**Status:** Same as Club Explorer — route exists, no module, no detailed spec beyond T-061/T-062. Compounded by the fact that `leagues.json` currently covers only 14 of 86 leagues, making any league detail view incomplete.

**Options:**
- A. Implement after leagues.json is fully expanded
- B. Defer to V1.1

**Recommendation:** Option B. League Explorer requires leagues.json to be complete first, which is itself deferred work. Two layers of prerequisite make this a V1.1 item.

**Priority:** Low.

---

## 7. Technical Debt Register

### P1 — Must address before production

**`#renderRecentForm()` logic inversion in `overview-tab.js`**
The method returns `''` when `recentForm` data exists, and renders a placeholder when it is null. This inverted logic means the feature will never work regardless of data state. Every team page is affected.
*Location:* `js/modules/overview-tab.js` lines 184–195.
*Resolution:* Add the rendering path for the populated state (W/D/L bubbles). ~30 minutes.

---

### P2 — Should address soon

**DataManager statistics methods absent (T-020 / T-021)**
`getTopPlayersForTeam()`, `getMostRepresentedClubs()`, `getMostRepresentedLeagues()`, and all statistics generators are not implemented in `data.js`. Stats Tab and Compare View cannot be built without them.
*Location:* `js/data.js` — methods simply do not exist.
*Resolution:* Implement T-020 and T-021 before beginning any analysis feature work.

**League name resolution — 72 of 86 leagueIds unresolved**
`leagues.json` covers 14 of 86 distinct `leagueId` strings used in `clubs.json`. The League Distribution panel on every team's Overview tab shows `—` for the majority of entries.
*Location:* `data/leagues.json`, rendered in `js/modules/overview-tab.js`.
*Resolution:* Add 72 entries to `leagues.json`. No code changes required.

**Team header partial — average age, squad value, world cups won missing (T-026)**
These three fields are absent from the team header. Average age is computable from the already-loaded players array. Squad value and world cups won require schema additions.
*Location:* `js/modules/team-page.js` `#renderShell()`.
*Resolution:* Average age — ~1 hour (compute in `render()`). Squad value and world cups won — schema decision + 48-team data entry.

**Profile Panel — ranking breakdown and similar players absent (T-036 deferred)**
The panel shows name, position, club, age/caps/goals, and a fallback bio. Ranking breakdown and similar players were explicitly deferred. Ranking breakdown is blocked by the rankings methodology decision. Similar players can be built without rankings using DataManager queries.
*Location:* `js/modules/profile-panel.js`.
*Resolution:* Similar players — Medium effort once DataManager query methods exist. Ranking breakdown — blocked on open decision.

**No fuzzy search**
Exact substring matching returns zero results for misspellings. `"mbape"` → no results. RECOMMENDATIONS.md explicitly recommended Fuse.js (6KB, MIT).
*Location:* `js/modules/search-overlay.js` `#filter()`.
*Resolution:* Replace `String.includes()` with Fuse.js instance. Medium effort.

---

### P3 — Address when time permits

**`js/search.js` — orphaned dead stub**
Exports an empty `Search` object. Never imported. Superseded entirely by `modules/search-overlay.js`. Exists only to confuse future contributors.
*Resolution:* Delete the file.

**`scripts/build-search-index.js` — superseded stub**
Dead file alongside the working `generate-search-index.js`. Never used.
*Resolution:* Delete the file.

**`js/bio.js` — generic template, not position-specific**
Spec (T-022) requires GK/DEF/MID/FWD-specific templates. Current implementation uses one template for all positions.
*Location:* `js/bio.js`.
*Resolution:* Add three additional template branches. Low effort.

**`js/charts.js` — `renderBar()` and `renderSparkline()` are no-ops**
Not a current problem (Stats Tab doesn't call them). Will surface immediately when Stats Tab is built.
*Location:* `js/charts.js` lines 87–88.
*Resolution:* Implement when Stats Tab implementation begins.

**`uzbekistan-shomurodov` name error**
Player `uzbekistan-turgunboev` (shirt #9) has the name "Eldor Shomurodov" — which belongs to shirt #14. Validator passes because IDs are unique. Cosmetically incorrect data.
*Location:* `data/players/uzbekistan.json`.
*Resolution:* Correct the name on the shirt #9 entry.

**`scotland-gordon` DOB warning noise**
Craig Gordon (DOB 1982-12-31) produces a soft DOB-range warning on every `npm run validate` run. This is a known legitimate exception, not an error.
*Resolution:* Either raise `DOB_MIN` in the validator to 1982, or add an explicit allowlist for known exceptions. Low priority.

---

## 8. Architecture Decisions That Must Not Be Lost

### Vanilla JS + ES Modules — no framework

**Decision:** The application uses vanilla JavaScript with ES Modules. No React, Vue, Alpine.js, Preact, or any UI framework.

**Alternatives considered:** Alpine.js (3KB, declarative bindings), Preact (3KB, virtual DOM), Lit (5KB, web components).

**Why this was chosen:** The application's complexity lives in native browser APIs: IntersectionObserver for Auto-Focus, CSS scroll-snap for the carousel, hash-based routing via `hashchange`, SVG string generation for charts, and a fuzzy-search algorithm. None of these benefit from a framework. The only scaling risk was DOM management at 1,248 player cards — solved by per-team lazy loading (only 26 players ever in the DOM simultaneously). No two-way data binding needs exist. A framework would add a learning curve, dependency rot risk, and no solution to any actual problem.

**Consequences:** Zero build step. Direct Netlify deploy. No `node_modules` in the production path. Debugging is straightforward (real DOM, real stack traces). Future contributors need no toolchain knowledge beyond a browser and a text editor.

---

### Per-team player files — not a monolithic players.json

**Decision:** Player data lives in `data/players/{countryId}.json` — one file per team of 26 players. There is no combined `players.json`.

**Alternatives considered:** Single `players.json` containing all 1,248 players; `players.json` as a name-only index with per-team detail files.

**Why this was chosen:** A single file containing 1,248 players would be approximately 1.3MB and would be fetched on every first page load regardless of which team the user is viewing. Per-team files average ~26KB each. The team page loads only its own player file. The search index is pre-built and covers all players without requiring all player files to be loaded.

**Consequences:** The search overlay can function with only `search-index.json` loaded. Player detail (position, age, caps, goals, bio) is only fetched when a team page is opened. DataManager caches per-team files after first load, so navigating back to a team is instant.

---

### DataManager singleton — sole data access point

**Decision:** All data access goes through the `DataManager` singleton exported from `data.js`. No module fetches JSON directly.

**Alternatives considered:** Direct `fetch()` calls in each module; a context/provider pattern; global store.

**Why this was chosen:** Cache logic lives in one place. Error handling is centralised (log + return `[]`, never crash). Switching from local JSON to a future API requires changing only `DataManager`. The URL table (`URLS` constant) in `data.js` is the single location that defines where data lives.

**Consequences:** DataManager is the most important file in the project. Bugs here affect every feature. It must be read carefully before adding any new data access pattern.

---

### Module lifecycle — render/init/teardown

**Decision:** Every module implements exactly three methods: `async render()` (fetches data, writes `innerHTML`), `init()` (attaches listeners and observers, synchronous), `teardown()` (disconnects observers, nulls refs, synchronous). Router calls them in this order.

**Alternatives considered:** Combined render+init; React-style component lifecycle; no teardown convention.

**Why this was chosen:** Mixing async data fetching with synchronous event binding causes race conditions. Separating them makes each concern independently testable. Teardown prevents IntersectionObserver and event listener leaks across navigations.

**Consequences:** Every new module must implement all three methods. `init()` must never be called before `render()` resolves. `teardown()` is called by the router on navigation away — modules that skip teardown will leak memory and event listeners.

---

### Listener attachment rule — inner elements only

**Decision:** Event listeners are always attached to elements created by `innerHTML` inside the module's container, never to the container element itself (`#app-content`).

**Alternatives considered:** Attaching to `#app-content` directly for convenience.

**Why this was chosen:** `#app-content` is a persistent element that survives across navigations. Attaching listeners to it accumulates handlers with every render — the fourth navigation to a page would fire the event handler four times. Inner elements created by `innerHTML` are destroyed and recreated on each render, so their listeners are automatically cleaned up.

**Consequences:** The pattern must be followed in every module. The rule applies even when it feels more convenient to attach to the outer container. The Tournament Centre and Group Carousel both follow this pattern correctly.

---

### Auto-Focus system — position groups, not rows

**Decision:** The IntersectionObserver observes `.squad-group[data-position]` sections (one per position: GK, DF, MF, FW), not individual player rows.

**Alternatives considered:** Observing each player row individually; observing the first card in each row.

**Why this was chosen:** Observing 26 individual elements creates 26 observer callbacks per scroll event. Observing 4 position sections is cleaner, produces fewer callbacks, and maps naturally to the "which position group is the user currently viewing" mental model. The `#rowSelections` Map (keyed by position string) remembers the last-viewed player per group, so the profile panel shows the right player even when the user scrolls past and back.

**Consequences:** The observer's `rootMargin: '-30% 0px'` means a position group must enter the inner 70% of the viewport before triggering. This was tuned to avoid triggering on partially-visible sections at the top/bottom of the scroll area. Changing this value will affect which player appears in the profile panel during normal scrolling.

---

### Search overlay — persistent singleton, not router-managed

**Decision:** `SearchOverlay` is instantiated once in `app.js` and is never torn down by the router. Its index is loaded once and cached in the instance.

**Alternatives considered:** Instantiating SearchOverlay per-page; lazily loading the index on first open.

**Why this was chosen:** The search overlay is a global UI element — it should be openable from any page. Tying its lifecycle to the router would require re-initialising it (and re-fetching the 1,296-entry index) on every navigation. Instantiating once in `app.js` guarantees the index is loaded and cached before the first user interaction.

**Consequences:** `SearchOverlay.init()` is `await`ed in `app.js` before `Router.init()`. The search index must be available at application startup. Any changes to the search index require re-running `generate-search-index.js` and redeploying.

---

### Player ID convention — `{countryId}-{lastname-slug}` with disambiguation suffixes

**Decision:** Player IDs follow the pattern `{countryId}-{lastname-slug}`. When multiple players on the same squad share a surname, disambiguation suffixes are appended: `-2` for a second player, initials (`-g`, `-d`) for same-name pairs, or first-name initial (`-j`, `-l`) when needed.

**Alternatives considered:** `{countryId}-{firstname-lastname-slug}` (longer, no disambiguation needed); numeric suffixes for all players.

**Why this was chosen:** Surname-slug is shorter and more readable in URLs and deep-links. Disambiguation only adds complexity where necessary. The convention emerged from real collisions encountered during data entry (two Hendersons, two Hernándezes, two Danilos, two Edersons) — it is empirically grounded.

**Consequences:** IDs must be globally unique across all 48 squads. `validate-data.js` checks for cross-squad duplicate IDs. The deep-link router parses `#france-mbappe` by checking if the hash starts with a known `countryId + '-'` prefix — this means a player whose last name is the same as a country name would create an ambiguous route. The validator does not currently check for this edge case.

---

### Search index — pre-built file, not runtime-constructed

**Decision:** The search index is a pre-built JSON file (`data/search-index.json`) generated by `scripts/generate-search-index.js`. It is not constructed at runtime from loaded player data.

**Alternatives considered:** Building the index at runtime on first search query; building it on first app load.

**Why this was chosen:** Building the index from 1,248 player records at runtime takes 50–200ms and requires all player files to be pre-loaded. The pre-built file is 1,296 entries served as a single fetch, ready immediately. The generator script runs as part of the data workflow after any squad update.

**Consequences:** `generate-search-index.js` must be run after any change to player data or country data. The generated file is committed to the repository. The search index is slightly stale between data changes and regeneration, but this gap is zero in practice (the script is run as part of the data-update workflow).

---

### Hash-based routing with country ID prefix parsing

**Decision:** All routing is hash-based. The router maintains a `Set` of all 48 country IDs loaded from `countries.json` and uses it to disambiguate player routes (`#france-mbappe`) from country routes (`#france`) and group routes (`#group-a`).

**Alternatives considered:** Path-based routing; query parameter routing; client-side history API.

**Why this was chosen:** No server configuration is required. Netlify serves `index.html` for all requests — hash routing works without any redirect rules. The 48-country-ID set is authoritative and prevents false positive matches (e.g. `#south-africa` is correctly identified as a country route, not a player route starting with `south`).

**Consequences:** Route order in the parser matters. Group routes (`/^group-[a-l]$/`) are checked before country routes. Player routes (startsWith `{countryId}-`) are checked before country routes. Country routes are checked before stub routes. The order must not change. A country ID that is also a valid group prefix would break this ordering — currently no such collision exists.

---

## 9. Historical Lessons Learned

### Wikipedia as primary squad data source

The 2026 FIFA World Cup squads page is too large for a single WebFetch request. Anchor-URL fetching (e.g. `...#Group_A`) does not work reliably. The correct approach is the Wikipedia section API:

1. Fetch section indices: `https://en.wikipedia.org/w/api.php?action=parse&page=2026_FIFA_World_Cup_squads&prop=sections&format=json`
2. Fetch the specific squad section by index: `...&prop=wikitext&section=N&format=json`

This technique was discovered during Sprint 8–9 data entry and is documented in `DATA_ENTRY_GUIDE.md`. Do not attempt to fetch the squads page as a single URL.

For fixtures and standings, individual group pages work correctly: `https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_Group_A` through `Group_L`.

---

### Club expansion complexity

The project began with approximately 50 clubs. As squad data was entered across 48 teams covering 86 leagues worldwide, `clubs.json` grew to 456 entries. This growth was not anticipated in the original architecture. The practical consequence: `leagues.json` was not expanded in parallel with `clubs.json`, creating the current 14/86 resolution gap.

**Lesson:** When expanding reference data (clubs, leagues), expand the full hierarchy at the same time. Adding a club without resolving its league creates visible debt in every feature that displays league names.

---

### ID disambiguation at scale

During data entry for 48 squads, surname collisions were common within squads: two Hendersons (England), two Hernándezes (Mexico), two Danilos (Brazil/Portugal), two Edersons (Brazil/Portugal). The disambiguation convention (`-2`, initials, first-name initial) was developed reactively rather than proactively.

**Lesson:** With 1,248 players, collision-free IDs require a documented disambiguation convention established before data entry begins. The current convention works but was applied inconsistently early in the project. `validate-data.js` now catches duplicate IDs before they reach the search index.

---

### Listener accumulation — the #app-content trap

During Sprint 4 development, event listeners were initially attached to `#app-content` (the router's persistent content container). On the third navigation to the Tournament Centre, click handlers fired three times. The root cause: `#app-content` persists across navigations, so listeners accumulate with each `init()` call.

**Lesson:** Never attach event listeners to `#app-content`. Always target elements created by `innerHTML` inside the module. This is now a documented architectural rule and is consistently followed in all current modules.

---

### GroupCarousel deep-link timing

When the Tournament Centre first implemented deep-linking to a specific group (e.g. `#group-c`), `scrollToGroup()` was called immediately after `carousel.init()`. On some browsers, the carousel had not yet rendered and `offsetWidth` was 0, causing the scroll to land at position 0 (Group A) regardless of the requested group.

**Lesson:** `scrollToGroup()` must be called inside `setTimeout(fn, 0)` to defer until after the browser has performed layout. The one-tick defer is sufficient — `requestAnimationFrame` is not required. This pattern is documented in `SESSION_HANDOFF.md` and in the implementation as a named pattern.

---

### Search implementation — overlay vs search.js

The original plan (T-023, T-024) called for a `search.js` module with an index builder and Fuse.js fuzzy matching. During Sprint 7 implementation, the search overlay was built as a self-contained `modules/search-overlay.js` using substring matching. The original `search.js` was never populated and was never integrated. The result: two search files exist, one working and one orphaned.

**Lesson:** When an implementation diverges from the original planned module, the original planned file should be deleted or updated immediately — not left as an orphaned stub. Dead files with plausible names are a significant source of future contributor confusion.

---

## 10. Definition of Version 1.0

### Required Before V1.0

These are gate conditions. The project does not ship as V1.0 without all of these.

1. **Tournament data current through the tournament.** `fixtures.json` and `standings.json` must reflect all completed matches up to the current moment. A user should never see an incorrect score on the Tournament Centre.

2. **Knockout bracket populates as matches are played.** Either via a defined manual data entry workflow or via an automated propagation script, `homeTeamId`/`awayTeamId` in `knockout.json` must be updated as R32 matches conclude.

3. **recentForm rendering bug fixed.** `#renderRecentForm()` in `overview-tab.js` must correctly render form bubbles when `recentForm` data exists. *This is a prerequisite for item 4.*

4. **recentForm populated for all 48 countries.** Every team's Overview tab currently shows "Match results not yet available." All 48 `recentForm` arrays must be populated from verified match data before V1.0.

5. **Zero console errors on all valid routes.** No uncaught promise rejections, no 404 fetches for expected resources, no application-code warnings.

6. **All 48 team pages load and render on mobile.** Squad tab, group carousel, search overlay all usable on a phone-sized screen. Touch-drag carousel scroll confirmed working.

7. **All 48 team pages load without errors.** No blank screens, no broken layouts, no unhandled data-missing states.

*Why these and not others:* These items represent the minimum that allows a real user to trust the application. An app with wrong scores (item 1), a broken feature section on every page (item 3+4), or console errors (item 5) does not meet a production bar regardless of how many other features work.

### Nice to Have Before V1.0

These improve the experience meaningfully but are not blockers.

- **Broadcaster badges populated** (72 `broadcaster` fields). CSS is ready; data entry only.
- **`teamStrength` for all 48 teams.** Radar chart absent on 45 of 48 Overview tabs.
- **League name resolution** (72 of 86 leagueIds in `leagues.json`). Fixes `—` in League Distribution panel on every Overview tab.
- **Statistics Tab — minimum viable version.** Position breakdown and club distribution at minimum. Removes the dead fourth tab from all 48 team pages.
- **Average age in team header.** Computable from existing data; one code change.
- **Fuzzy search (Fuse.js).** Typos currently return zero results.

*Why nice-to-have and not required:* These are visible gaps but do not cause incorrect information or broken interactions. A user can productively use the app without them.

### Post-V1.0 Features

These belong in a subsequent milestone. Do not block V1.0 for these.

- Player photos and club badge assets
- Compare Teams module
- Full Statistics Dashboard (global, not per-team)
- Club Explorer
- League Explorer
- Rankings system (pending methodology decision)
- Hand-crafted player bios for star players
- Service Worker / offline support
- Countries browse page
- Similar players in Profile Panel (blocked by rankings)
- Profile Panel ranking breakdown (blocked by rankings data)

---

## 11. Recommended Next Sprint

### Sprint 10: Live Data + Foundation Fixes

**Objective:** Keep the Tournament Centre accurate through R3 completion and fix the two foundational gaps that prevent the recentForm feature from working at all.

**Scope — in:**
- Fix `#renderRecentForm()` rendering bug in `overview-tab.js` (~30 minutes)
- Populate `recentForm` for all 48 countries from Wikipedia match histories (~5 hours)
- Update `fixtures.json` + `standings.json` for R2 Groups E–L results as they come in (June 20–24)
- Update `fixtures.json` + `standings.json` for R3 all groups (June 25–27)
- Populate knockout.json R32 `homeTeamId`/`awayTeamId` after all groups complete (~June 27)
- Expand `leagues.json` to cover all 86 referenced leagueId strings (~2 hours)

**Scope — out:**
- No new modules
- No changes to `data.js` query methods
- No Stats Tab work
- No fuzzy search

**Deliverables:**
- recentForm bubbles rendering correctly on all 48 team Overview pages
- Tournament Centre showing accurate scores through the group stage
- Knockout bracket displaying real teams in R32 slots
- League Distribution panel on Overview showing real league names instead of `—`

**Estimated effort:** 14–18 hours across 8 days (time-gated by real-world match schedule)

**Risks:**
- Standing recalculation errors (can be caught by running the validator after each update)
- Wikipedia match history for some national teams may be incomplete or ambiguous
- R3 scheduling surprises (venue changes, rescheduled matches)

**Why this sprint over any alternative:**

The tournament is live. R2 matches are playing today (June 20). Every result that isn't entered makes the default landing page of the application show wrong information to real users. No other sprint has a hard real-world deadline measured in hours, not weeks.

The recentForm fix is the highest-ratio task in the project: 30 minutes of code work that unblocks a feature visible on all 48 team pages. It must precede the data entry, or the data entry is invisible.

League resolution is 2 hours of data entry with no code changes, and fixes a visually broken panel on every Overview tab.

The next logical code sprint — Stats Tab — requires DataManager statistics methods to exist first. Those methods are a prerequisite, not a deliverable of this sprint. Stats Tab belongs in Sprint 11.

---

*End of document. Next review recommended after Sprint 10 completes (~June 28, 2026).*
