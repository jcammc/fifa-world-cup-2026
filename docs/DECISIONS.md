# Architectural Decision Log

## ADR-001: Vanilla JavaScript + ES Modules (no framework)

**Decision:** Build with plain JavaScript and native ES Modules. No React, Vue, Angular, or other framework.

**Rationale:** This is a read-mostly, data-display application with no complex client state management requirements. Vanilla JS eliminates the build step entirely — no Webpack, no Babel, no node_modules for the frontend. The result is a repo that deploys directly from the file system to Netlify with zero tooling. ES Modules are supported natively in all modern browsers and provide clean dependency graphs without bundling.

**Trade-off:** No component library, no ecosystem. Custom module lifecycle (render/init/teardown) is hand-rolled. Accepted.

---

## ADR-002: Local-first photo strategy (no runtime remote URLs)

**Decision:** All player photos are stored locally in `assets/players/{id}.jpg`. The `photoUrl` field in player JSON is source metadata only — used by `scripts/gather-photos.js` offline, never fetched by the browser.

**Rationale:** External image URLs rot during a 6-week tournament as clubs update their press packs, FIFA reshuffles their CDN, and sponsorship agreements expire. A single broken URL handling case forces runtime fallback logic across every player card. Local-first eliminates the entire category of URL-rot bugs. With ~1,250 players at ~30KB each, total photo payload is ~40MB — well within Netlify's free tier.

**Trade-off:** Requires a one-time download step (`npm run gather-photos`). New players during tournament require manual photo download. Accepted.

---

## ADR-003: Pre-generated bios (not runtime generation)

**Decision:** Player bios are pre-generated offline by `scripts/generate-player-bios.js` and stored in the `bio` field of each player JSON file. `js/bio.js` in the browser is a 10-line fallback only — it generates a minimal description if `bio` is null at render time.

**Rationale:** Runtime bio generation via LLM APIs would require API keys in the browser, incur per-request latency, create a dependency on external uptime, and add cost proportional to page views. Pre-generating offline produces consistent, reviewable output that can be committed to the repo.

**Trade-off:** Bios must be regenerated and redeployed after squad changes. Script is idempotent — it never overwrites existing non-null bios. Accepted.

---

## ADR-004: Per-team player files (not single players.json)

**Decision:** Player data is split into 48 files: `data/players/{countryId}.json`. A single `data/players/france.json` is ~30KB for 26 players. A monolithic file would be 48 × 26 = 1,248 players ≈ 1.5MB.

**Rationale:** The team page only ever needs one team's players at a time. Loading all 1,248 players on initial page load would waste bandwidth for users browsing only one or two teams. Per-team files make the DataManager's caching strategy straightforward — `loadPlayersForTeam('france')` loads and caches one file. Data entry is also simpler: volunteers can work on one team at a time without merge conflicts.

**Trade-off:** Search index (`data/search-index.json`) must be pre-built to enable cross-team search. Accepted.

---

## ADR-005: GitHub → Netlify git-based deploy (not drag-and-drop)

**Decision:** The Netlify site is connected to the GitHub repo via git integration. Every `git push master` triggers an automatic deploy within ~30 seconds.

**Rationale:** During the 6-week tournament, standings and results will be updated after every match — up to 8 times per day during the group stage. A git-based workflow (`git commit && git push`) is faster and less error-prone than repeated drag-and-drop deploys. It also provides a full audit trail: every score update is a commit.

**Trade-off:** Requires the GitHub repo to be connected to Netlify once during setup. Instructions in `SESSION_HANDOFF.md`. Accepted.

---

## ADR-006: Cache-Aside Pipeline — live-data.mjs as Primary Data Handler

**Decision:** The live data pipeline is implemented as a cache-aside pattern in `netlify/functions/live-data.mjs` (an on-demand HTTP function). This function owns both the API fetch and the Blob Store write. The scheduled function (`sync-tournament.mjs`) is effectively disabled.

**Rationale:** The original Sprint 25 architecture assigned API fetching to a Netlify Scheduled Function and Blob Store reading to the live-data on-demand function. This failed silently: Netlify only injects `NETLIFY_BLOBS_CONTEXT` into HTTP-triggered functions, not scheduled functions. In `@netlify/blobs` v8, calling `getStore()` without valid context returns a no-op store — `set()` calls appear to succeed but write nothing. The Blob Store was never populated; the SPA always served static files.

The cache-aside pattern in an on-demand function solves this at the root: on-demand functions always receive blob context, so reads and writes both work correctly. The first request after a 90-second staleness window pays the API cost (~500ms); all subsequent requests within that window serve from the Blob Store.

**Trade-off:** Each cache miss (first visitor after 90s) triggers a full API fetch + merge + write cycle before returning. This adds ~500ms latency to the first request of each polling cycle but is invisible to subsequent requests. The alternative (scheduled pre-warm) cannot write to Blob Store without additional infrastructure. Accepted.

---

## ADR-007: setTimeout Polling Over setInterval

**Decision:** `TournamentCentre` uses recursive `setTimeout(fn, POLL_INTERVAL_MS)` for its 50-second poll cycle, not `setInterval`.

**Rationale:** `setInterval` queues invocations on a fixed wall-clock schedule. If the callback (API fetch + DOM update) takes longer than the interval, invocations pile up in the queue and execute back-to-back when the long callback finally completes. `setTimeout` reschedules after the current callback finishes, so the minimum gap between poll cycles equals the callback duration plus the interval. This prevents overlapping poll cycles that would hammer the live-data endpoint simultaneously and create race conditions in DOM updates.

**Trade-off:** Slight jitter — the actual interval is `POLL_INTERVAL_MS + callback_duration`. At ~500ms callback duration vs 50,000ms interval, jitter is < 1%. Accepted.

---

## ADR-008: Pure Functions Module for Tournament State

**Decision:** All tournament state derivation logic lives in `js/tournament-state.js` as exported pure functions (no DOM, no fetching, no module-level state).

**Rationale:** The same logic is needed by multiple modules: `TournamentCentre` (snapshot stats, poll cycle), `KnockoutBracket` (bracket projection), `MatchCentre` (What's at stake, form), `BestThirds` (ranked table, slot cards). Putting this logic in a class module would create circular import chains (e.g. TournamentCentre importing KnockoutBracket importing TournamentCentre). Pure functions in a shared utility module break the cycle — any module can import without creating a dependency loop.

Pure functions are also independently testable: given the same standings input, `buildBracketProjection()` always returns the same map. This is not true of methods bound to class instances with shared state.

**Trade-off:** All callers must import explicitly (`import { buildBracketProjection } from '../tournament-state.js'`). No implicit coupling. Accepted.

---

## ADR-009: #loadRaw() for Object-Valued JSON Files

**Decision:** `DataManager` has two internal fetch methods: `#load(key, url)` (unwraps `json.data ?? []`, returns array) and `#loadRaw(key, url)` (stores and returns the full JSON object without unwrapping).

**Rationale:** Most data files use `{ data: Array }` envelopes and are consumed as arrays. Three files use `{ data: Object }`: `annex-c.json`, `managers.json`, `player-photos.json`. Routing an object-valued file through `#load()` produces a subtle failure: `json.data ?? []` evaluates to `{}` (the object is truthy, so the fallback never fires), and callers that iterate `{}` with array methods get zero results with no error. This is the hardest class of bug to catch — the code runs, returns a value, and produces wrong output silently.

`#loadRaw()` stores the full envelope and returns it. Callers that need the inner object access `json.data` themselves after verifying its type.

**Decision rule for new files:** `data: Array` → use `#load()` via a named method. `data: Object` → use `#loadRaw()` or a custom loader. Never route an object-valued file through `#load()`.

**Trade-off:** Two internal patterns — any new data file must choose correctly. The rule is simple and the consequences of choosing wrong are deterministic. Accepted.

---

## ADR-010: Annex C Pre-Computation (One-Shot Generation)

**Decision:** `data/annex-c.json` contains all 246 possible FIFA Annex C combinations as a pre-computed lookup table, generated once by `scripts/gen-annex-c.mjs`. The browser does a single O(1) key lookup at runtime.

**Rationale:** FIFA's Annex C table maps every possible set of 8 advancing third-place groups to specific R32 slot assignments. It is a fixed lookup table — it has not changed in tournament history. Computing this table at runtime in the browser would require fetching and parsing FIFA's table format. Pre-computing it offline means the browser consumes a 25KB JSON file and does one hash lookup (key = 8 sorted group letters joined: `"ABCDFGIL"`).

**Trade-off:** `gen-annex-c.mjs` must be re-run and the result committed if Annex C data is ever corrected (has never happened in practice). The generated file is checked into the repo as static data. Accepted.
