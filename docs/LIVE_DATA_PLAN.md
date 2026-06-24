# Live Tournament Data — Implementation Plan

**Status:** Implemented — Sprint 25 (2026-06-24). All core components deployed.  
**Written:** Sprint 24 (2026-06-23) | **Implemented:** Sprint 25 (2026-06-24)  
**Goal:** Replace manual fixture, standings, and knockout updates with automated data pipeline while keeping all squad/player/manager/club/league data static.

---

## 1. Recommended API — football-data.org

**Why:** Covers WC 2026 (covered WC 2022), plain REST JSON, no SDK, free tier viable for scheduled polling. API key has no strict secret requirement on the free plan, but should be stored as a Netlify environment variable regardless.

**Relevant endpoints:**

| Data | Endpoint |
|---|---|
| All competition matches | `GET /v4/competitions/WC/matches` |
| Single match detail | `GET /v4/matches/{matchId}` |
| Standings | `GET /v4/competitions/WC/standings` |
| Teams (for validation) | `GET /v4/competitions/WC/teams` |

**Free tier limits:** 10 requests/minute. A single `/matches` call returns all 104 fixtures — one call covers everything. Polling every 3 minutes during match windows = well within limits.

**Registration:** https://www.football-data.org/client/register

---

## 2. Netlify Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   football-data.org API                      │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST (every 2-3 min on match days)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            Netlify Scheduled Function                        │
│  netlify/functions/sync-tournament.mts                       │
│                                                             │
│  1. Fetch /v4/competitions/WC/matches                       │
│  2. Map API response → internal fixtures.json schema        │
│  3. Derive standings from match results                     │
│  4. Populate knockout slots where team IDs are known        │
│  5. Write JSON blobs to Netlify Blob Store                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ Blob Store write
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 Netlify Blob Store                           │
│  tournament/fixtures.json                                    │
│  tournament/standings.json                                   │
│  tournament/knockout.json                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │ fetch() from browser
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   SPA (client browser)                       │
│  DataManager.loadFixtures() → fetch Blob Store URL          │
│  Cache-Control: stale-while-revalidate                       │
└─────────────────────────────────────────────────────────────┘
```

**Why Blob Store over static files:** Avoids triggering a full site rebuild on every update. The Blob Store acts as a live JSON endpoint the browser can fetch directly, updated out-of-band from the deploy pipeline.

**Alternative (simpler but slower):** Scheduled Function writes JSON to GitHub via API → triggers Netlify rebuild (~30–60s). Simpler to implement but adds latency and build minutes.

---

## 3. Data Flow Detail

### fixtures.json mapping

The API returns match objects. The mapping function translates:

| API field | Internal field | Notes |
|---|---|---|
| `match.id` | `id` | Prefix with group letter for disambiguation |
| `match.homeTeam.id` | `homeTeamId` | Must map to internal country ID (see §6) |
| `match.awayTeam.id` | `awayTeamId` | Same |
| `match.score.fullTime.home` | `homeScore` | null if not played |
| `match.score.fullTime.away` | `awayScore` | null if not played |
| `match.status` | `status` | API: FINISHED → internal: FT; IN_PLAY → live; TIMED/SCHEDULED → scheduled |
| `match.utcDate` | `kickoff` | ISO 8601, keep as-is |
| `match.stage` | (derived) | GROUP_STAGE → groupId; ROUND_OF_32 etc → knockout |
| `match.group` | `groupId` | e.g. "GROUP_A" → "A" |
| `match.venue` | `venue` | May be null |

### standings.json derivation

The API's `/standings` endpoint returns group tables directly. Map each team entry:

```javascript
{
  groupId: "A",
  teams: [
    { teamId: "mexico", played: 3, won: 2, drawn: 0, lost: 1, gf: 5, ga: 2, gd: 3, points: 6 },
    ...
  ]
}
```

### knockout.json population

Knockout slots with known teams (after group stage): the API populates `homeTeam`/`awayTeam` when teams qualify. The function fills `homeTeamId`/`awayTeamId` only when both are non-null in the API response — leaving TBD slots untouched.

---

## 4. Update Frequency

| Window | Function frequency | Rationale |
|---|---|---|
| Match in progress | Every 2 min | Minimises score lag while staying well within rate limit |
| Match day (no live match) | Every 15 min | Catch kickoff status changes |
| Between match days | Every 60 min | Standings/bracket don't change |
| Off-season / post-tournament | Disabled | Stop burning quota |

Netlify Scheduled Functions use cron syntax. The function can check the current time against a known match schedule to self-regulate frequency — only poll every 2 min when a match is expected to be in progress.

---

## 5. What Gets Automated

| Data | Automated? | Notes |
|---|---|---|
| Fixture results (FT scores) | ✅ Yes | API → fixtures.json |
| Live match status/score | ✅ Yes | status: live, updated every 2 min |
| Group standings | ✅ Yes | Derived from API standings endpoint |
| Knockout team population | ✅ Mostly | Populated when API has both teams |
| `qualificationStatus` per team | ⚠️ Partial | Can derive top-2 per group; best-third requires FIFA Annex C tiebreaker logic (complex) |
| Knockout bracket results | ✅ Yes | Same as fixtures — status + score from API |

---

## 6. What Remains Manual

| Item | Why manual | Mitigation |
|---|---|---|
| API team ID → internal country ID map | API uses its own team IDs (numeric); internal uses slug strings | One-time mapping file `data/api-team-map.json` written at setup |
| `qualificationStatus` for best-third teams | FIFA selects best 8 of 12 third-placed teams using Annex C criteria — not derivable from scores alone | Continue manual entry after R3 completes; 2 min job |
| `broadcaster` field | Not in football-data.org free tier | Keep null or remove from fixture cards |
| Venue names | API may differ from internal venue strings | Manual reconcile at setup; doesn't change mid-tournament |

---

## 7. Client-Side Changes (data.js)

`DataManager.loadFixtures()`, `loadStandings()`, and `loadKnockout()` currently fetch from `data/fixtures.json` etc. (static files in the repo).

After live data is wired:
- These methods will fetch from the Blob Store URL instead
- Add `Cache-Control: stale-while-revalidate, max-age=60` header handling
- No other client changes needed — the internal JSON schema stays identical

---

## 8. Implementation — What Was Built

All steps completed in Sprint 25. Deviations from the original plan are noted.

### Files created

| File | Role |
|------|------|
| `data/api-team-map.json` | 48-entry map: API numeric team ID → internal country slug |
| `scripts/sync-data.mjs` | One-shot local sync — run `npm run sync-data` to update JSON files directly |
| `netlify/functions/sync-tournament.mjs` | Scheduled function (every 2 min) — fetches API, merges, writes Blob Store |
| `netlify/functions/live-data.mjs` | HTTP endpoint `/api/live?type=` — reads Blob Store, serves with 30s cache |

### Files updated

| File | Change |
|------|--------|
| `js/data.js` | Added `#loadLive()` — tries `/api/live` on production, falls back to static files |
| `package.json` | Added `@netlify/blobs ^8.1.0` dep, added `sync-data` npm script |
| `netlify.toml` | Added `[functions] node_bundler = "esbuild"` and `[functions.sync-tournament] schedule = "*/2 * * * *"` |

### Deployment requirement

Add env var `FOOTBALL_DATA_API_KEY` in Netlify dashboard (Site settings → Environment variables). Value: the football-data.org API token. Mark as Secret.

### Deviations from original plan

| Plan item | Actual |
|-----------|--------|
| Functions as `.mts` TypeScript | Written as `.mjs` (plain ES modules) — no TypeScript setup needed |
| `schedule` config needed a plugin | Native `[functions.{name}] schedule = "..."` syntax in `netlify.toml` — no plugin required |
| DataManager feature-flagged behind env var | Used hostname check (`IS_LIVE`) instead — cleaner, no Vite required |
| Staleness guard (don't overwrite on API error) | Function bails out on any API error via try/catch — same effect |
| Knockout sync complex | Implemented: matches by (homeTeamId, awayTeamId) pair when both known; falls back to date-only matching for single-match days |

---

## 9. Estimated Effort

| Item | Effort |
|---|---|
| API registration + team ID mapping | 1–2h |
| Netlify Function (fetch + map + write) | 3–4h |
| qualificationStatus best-third logic (if attempted) | 4–6h (skip first pass) |
| DataManager Blob Store integration | 1h |
| Testing + deploy | 2h |
| **Total** | **~8–10h (1–2 days)** |

---

## 10. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| football-data.org rate limits during busy match window | Low | Single `/matches` call per interval — 1 req per 2 min is well within 10/min |
| API returns stale or incorrect data | Low | Staleness guard: don't overwrite if API response is older than current data |
| Blob Store write fails silently | Medium | Log errors to Netlify Function logs; client falls back to last-good cached response |
| `qualificationStatus` for best-third wrong | Medium (if automated) | Skip automation; keep manual — 2 min job, only happens once after R3 |
| WC 2026 not in football-data.org free tier | Low | Verify at registration; paid tier is £10/mo if needed |
