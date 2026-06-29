# Engineering Principles

Lessons derived from building and debugging this project. These are permanent guidance — not historical notes.

---

## 1. Debugging Philosophy

### Verify the pipeline before debugging components

When a multi-layer system produces wrong output, the instinct is to debug the component closest to where the symptom appears. This is almost always wrong. The symptom often appears at the end of a chain; the root cause is somewhere in the middle.

**The correct order:**

1. Map the full pipeline (data source → transform → storage → delivery → client)
2. Verify each stage independently, working from the source toward the symptom
3. Find the first stage that fails
4. Fix only that stage

For this project, the live data pipeline is:
```
football-data.org API → live-data.mjs → Blob Store → /api/live → DataManager → DOM
```

If the client is showing wrong data, verify in this order:
1. Does the Blob Store have any data at all? (check live-data.mjs logs for 503)
2. Is the API returning correct data? (check Netlify function logs for refresh messages)
3. Is the client fetching from `/api/live` and getting a 200? (check network tab)
4. Is the DOM rendering the received data correctly?

Only investigate a downstream stage when the upstream stage is confirmed working.

---

### Distinguish "no exception thrown" from "successful outcome"

A function that completes without throwing an error has not necessarily produced the correct side effect. This distinction is critical when debugging writes to external systems.

The Sprint 25 live data pipeline failure is the canonical example: `sync-tournament.mjs` called `store.setJSON('fixtures', data)` and logged `"OK"` every two minutes. The function ran without errors. But the Blob Store had never been written to — because `getStore()` without valid context returns a no-op store that silently discards writes.

**When a function logs success but downstream behaviour is wrong, the first question is: can we directly verify the side effect?** For Blob Store writes, that means reading the value back immediately after writing. For API calls, that means logging the response body. For DOM updates, that means querying the element after the update and asserting the expected content.

Do not take a success log at face value. Verify the outcome.

---

### Add diagnostics before adding fixes

When a bug is not immediately obvious, the right first move is to add read-back diagnostics — code that verifies what actually happened, not just what should have happened. Fixes applied without diagnostic verification often fix the wrong thing.

Correct sequence:
1. Add a read-back check that will reveal the actual state
2. Deploy and observe
3. Now you know where the failure is
4. Apply a targeted fix

Skipping step 1 and going straight to step 3 is the most common cause of multi-session debugging loops.

**In practice for this project:** When Netlify function behaviour is unexpected, add a `console.log` that reads back what was written. If `store.set('fixtures', data)` is suspect, immediately follow it with `store.get('fixtures')` and log the result. If the get returns `null`, the write failed.

---

### Binary-search the pipeline

If you cannot verify the full pipeline in one step, use binary search:

- Confirm the midpoint works
- If yes, the bug is in the second half; if no, the bug is in the first half
- Repeat until the failing stage is isolated

For the live data pipeline:
- Stage 3 (Blob Store) is the natural midpoint
- If Blob Store has data → bug is in delivery or client
- If Blob Store is empty → bug is in API fetch or merge or write

---

## 2. Observability Standards

### What every Netlify function should log

**On each successful refresh:**
```
live-data: refreshed — 73 FT, 0 live, 16 KO completed [2026-06-28T21:46:09.652Z]
```

This one line tells you:
- The function ran
- The API was reachable
- The merge produced plausible output
- The timestamp enables latency calculation

**On cache hit (Blob Store fresh):** No log needed — silence means cache is working.

**On failure:**
```
live-data error: API /competitions/WC/matches → HTTP 429
live-data: no blob for type="knockout" — returning 503
```

Errors should name the failing operation and include the HTTP status or error message. "Error: failed" is useless.

### What NOT to log as success

Do not log `"OK"` after an operation unless you have verified the side effect. `"sync-tournament: OK"` after Blob Store writes turned out to mean "the code ran without throwing" — not "the data was written". The log was actively misleading.

A better pattern:
```javascript
await store.set('fixtures', JSON.stringify(fixtures));
const verify = await store.get('fixtures');
if (!verify) console.error('sync: Blob Store write for fixtures produced no readable value');
else console.log(`sync: fixtures written — ${fixtures.data.length} records`);
```

### Fallback path visibility

When a module silently falls back to a default (static file, cached value, empty state), the fallback should be detectable from logs even if it is not shown to the user.

`DataManager.#loadLive()` falls back silently to static files when `/api/live` fails. This is correct behaviour (resilience), but it means a broken live pipeline looks identical to a working one from the user's perspective. The Netlify function logs are the only place to detect this.

**Lesson:** Any silent fallback that masks a pipeline failure should emit a warning log at the function layer. If the Blob Store is empty and the function is returning 503, the log should say so clearly — not just return the status code silently.

---

## 3. Netlify-Specific Constraints

### Blob Store context injection

Netlify Blob Store context (`NETLIFY_BLOBS_CONTEXT`) is automatically injected **only into HTTP-triggered (on-demand) functions**. Scheduled functions do not receive a request object and therefore do not receive blob context.

**Consequence:** In `@netlify/blobs` v8, calling `getStore({ name: 'tournament' })` from a scheduled function returns a no-op store. All read and write calls appear to succeed (no errors) but do nothing.

**Rule:** Any function that writes to Netlify Blob Store must be an on-demand function. If you need a scheduled write, either:
- Use explicit credentials: `getStore({ name: '...', siteID: SITE_ID, token: TOKEN })` where `TOKEN` is stored in a non-`NETLIFY_`-prefixed env var
- Have the scheduled function call an HTTP function that writes on its behalf

### The NETLIFY_ env var prefix is reserved

Netlify strips any environment variable whose name starts with `NETLIFY_` before passing the process environment to function code. `process.env.NETLIFY_ANYTHING` is always `undefined` in function code, regardless of what is set in the Netlify dashboard.

Store all custom env vars with non-`NETLIFY_` names (e.g. `BLOBS_TOKEN`, `FOOTBALL_DATA_API_KEY`, `SITE_ID`).

### CDN caching bypasses hard refresh

`Cache-Control: public, max-age=N` on a Netlify function response causes the Netlify CDN to cache the response for `N` seconds. A browser hard-refresh (Ctrl+Shift+R) bypasses the browser cache but NOT the Netlify CDN cache. Users will see stale CDN-cached responses until the cache TTL expires.

For live data endpoints, use `Cache-Control: no-store` to prevent CDN caching entirely. Use the Blob Store's own TTL (90s) as the cache layer instead — it is under application control and can be bypassed by writing a fresh value.

### esbuild bundling in Netlify Functions

`netlify.toml` sets `node_bundler = "esbuild"` for functions. This bundles `@netlify/blobs` and its dependencies into the function. When updating `@netlify/blobs`, re-deploy to pick up the bundled version change — the old bundle is not automatically invalidated.

---

## 4. Caching and Invalidation Patterns

### The three-layer cache stack

The live data pipeline has three cache layers:

| Layer | TTL | Invalidation |
|-------|-----|-------------|
| DataManager `#cache` Map | Page lifetime | `invalidateLive()` — evicts `fixtures`, `standings`, `knockout` |
| Blob Store | 90s (checked via `lastUpdated`) | Writing a new value |
| Netlify CDN | Disabled (`no-store`) | n/a |

When debugging a stale data issue, check all three layers. The DataManager cache is the most common cause of stale data within a single page session. The Blob Store TTL controls how often the API is called. CDN caching (if re-enabled) would be the hardest to bust.

### DataManager.invalidateLive() — what it does and does not do

`invalidateLive()` evicts only `LIVE_KEYS = ['fixtures', 'standings', 'knockout']`. It does NOT evict countries, players, clubs, standings (read: all the other static data). It does NOT force an immediate re-fetch — it only removes the cached values so the next `load*` call will fetch fresh data.

The TournamentCentre poll cycle calls `invalidateLive()` then immediately calls `loadFixtures/loadStandings/loadKnockout` to get fresh data. This is the intended pattern.

Do not call `clearCache()` in the poll cycle — that would evict all data (countries, all player lists, etc.) and force expensive re-fetches on the next navigation.

### outerHTML reassignment invalidates stored DOM refs

When a module does `el.outerHTML = newHtml`, the original `el` reference becomes a detached node — it is no longer part of the document. Any stored reference to that element or its descendants must be re-queried from the container after the swap.

This is not a bug — it is how the DOM works. But it is non-obvious and has been rediscovered multiple times. The pattern to follow:

```javascript
this.#snapshotEl.outerHTML = this.#renderSnapshot(data);
// Re-query immediately — the old ref is detached
this.#snapshotEl      = this.#container.querySelector('.tc-snapshot');
this.#pollIndicatorEl = this.#container.querySelector('.tc-poll-indicator__text');
```

Any future in-place DOM swap using `outerHTML` must follow the same re-query pattern.

---

## 5. Silent Failure Patterns to Avoid

The project has several patterns that produce incorrect output without throwing errors. Know them:

| Pattern | Symptom | Cause |
|---------|---------|-------|
| `#load()` on object-valued JSON | Returns `{}`, treated as array — zero items | `json.data ?? []` returns `{}` because object is truthy |
| `getStore()` in scheduled function | Writes silently no-op | No `NETLIFY_BLOBS_CONTEXT` — no-op store |
| `Charts.renderRadar()` on detached element | Renders into void — chart never appears | Called before `innerHTML` is set on the container |
| `byTeams.get('home:away')` mismatch | Knockout score never updates | API and knockout.json disagree on home/away order |
| Listener on `#app-content` container | Accumulates across navigations | `#app-content` persists; inner elements are recreated each render |
| `IS_LIVE` fallback | Static data served on production | `/api/live` error causes silent fall-through — no visible indication |

For each of these, the symptom is wrong output or missing data with no error. They are only catchable by verifying the output, not by catching exceptions.

---

## 6. Post-Mortem Template

When a production bug takes more than one session to resolve, run a post-mortem. The purpose is to extract reusable lessons, not to assign blame.

**Questions to answer:**

1. What was the symptom? (user-visible behaviour)
2. What was the root cause? (lowest-level technical explanation)
3. How long did it take to find the root cause? What was the investigation path?
4. What diagnostic check would have found the root cause immediately?
5. Why was that check not the first thing done?
6. What false assumptions were held during investigation?
7. What code or architecture made the bug harder to find? (observability gaps)
8. What changed as a result? (code fix + documentation + process)
9. What one thing, if done differently, would have cut the time to resolution in half?

The Sprint 25 pipeline bug post-mortem answers are in `docs/LIVE_DATA_PLAN.md §11` and `docs/SESSION_HANDOFF.md` (Sprint 25+ entry). The key answer to question 4: **"Check whether the Blob Store has any data at all — one read-back call in live-data would have shown 503 for all three types immediately."** This check was not done until three sessions into debugging.

---

## 7. Data Schema Discipline

### Never use #load() for object-valued envelopes

`DataManager.#load()` unwraps via `json.data ?? []`. For `data: Array` files this returns the array. For `data: Object` files this returns the object (which is truthy, so `?? []` never fires), and callers that iterate it as an array get zero results with no error.

**Rule:** Any new data file with `data: Object` must use `#loadRaw()` or a custom loader. The current object-valued files are `annex-c.json`, `managers.json`, `player-photos.json`.

### Static base files are the merge source of truth

The live data pipeline merges API responses into the static base files (`data/fixtures.json`, `data/standings.json`, `data/knockout.json`). The static files provide the structural schema — venue names, bracket labels, match IDs. The API provides live state — scores, statuses, team IDs.

If static files are corrupted or outdated, the merged output inherits those errors. Always verify the static files before investigating the live pipeline when bracket or fixture data looks wrong.

### qualificationStatus is always manual

`qualificationStatus` in `standings.json` is not set by the automated pipeline. The pipeline preserves whatever value is already in the static file. After each match day, `qualificationStatus` must be set manually for teams where certainty has been reached:
- Top 2 per group after R3 → `"qualified"`
- Bottom 2 per group after R3 → `"eliminated"`
- Advancing 3rd-place teams (FIFA Annex C) → `"qualified"`
- Non-advancing 3rd-place teams after Annex C confirmed → `"eliminated"`

`deriveQualificationStatus()` in `tournament-state.js` provides a rule-based fallback when the stored value is null — but it should not be relied upon for display; manual values are more reliable.
