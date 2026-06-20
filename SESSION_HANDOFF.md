# SESSION HANDOFF — World Cup 2026 Squad Explorer
# Paste everything below this line into your next Claude session.

---

## PROJECT OVERVIEW

**"World Cup 2026 Squad Explorer and Tournament Companion"** — a vanilla JavaScript SPA hosted on Netlify. No framework, no build step, ES Modules only. All data lives in local JSON files; all routing is hash-based.

**Working directory:** `C:\Users\jcame\OneDrive\Desktop\FIFA World Cup 2026`

**Source spec files (read-only reference, not actively used):**
`C:\Users\jcame\OneDrive\Documents\Notes\Fifa World Cup .md files\`
`01_PRODUCT_SPEC.md.txt` through `07_ACCEPTANCE_CRITERIA.md.txt`

**Living project documents (read these when implementing):**
- `IMPLEMENTATION_BLUEPRINT.md` — module design, lifecycle, routing, Auto-Focus system detail
- `TASK_BREAKDOWN.md` — all tasks T-001 through T-083 with statuses
- `RECOMMENDATIONS.md` — 18 architectural recommendations with adopt/reject status
- `DATA_ENTRY_GUIDE.md` — squad/fixture/standings entry conventions and ID rules

---

## REPOSITORY & DEPLOYMENT

- **GitHub:** https://github.com/jcammc/fifa-world-cup-2026
- **Branch:** `master`
- **Netlify:** Auto-deploys from `master` on every push (~30 seconds)
- **Git identity:** `jcame` / `jcameronmcd@gmail.com`

---

## CURRENT STATUS

| Sprint | Scope | Status |
|--------|-------|--------|
| Sprint 0 | Project scaffold — all files, directories, stubs | **COMPLETE** |
| Sprint 1 | DataManager, Router, Nav, theme, France/England/Brazil data, countries.json, groups.json | **COMPLETE** |
| Sprint 2 | TeamPage, squad tab, Auto-Focus system (IntersectionObserver), ProfilePanel | **COMPLETE** |
| Sprint 3 | Overview tab (hero cards, fixture strip, group leaders), Stats tab stub, Fixtures tab stub | **COMPLETE** |
| Sprint 4A | TournamentCentre 3-tab layout, GroupCarousel (12 groups, drag/wheel/arrow nav), real fixture + standings data for Groups C/I/L | **COMPLETE** |
| Sprint 4B | Group deep-linking (#today / #group-a through #group-l / #knockout), KnockoutBracket module, knockout.json data populated | **COMPLETE** |
| Sprint 5 | Not started — see next steps section |

---

## WHAT IS IMPLEMENTED

### JS modules (`js/`)

| File | Status | Notes |
|------|--------|-------|
| `app.js` | Complete | Entry point — ThemeManager, Nav, Router.init() |
| `router.js` | Complete | Hash routing, all current routes wired |
| `data.js` | Complete | DataManager singleton, #cache Map, all loaders |
| `time.js` | Complete | `formatKickoff()`, `isToday()` |
| `utils.js` | Complete | `escapeHtml()` |
| `theme.js` | Complete | localStorage, data-theme attribute toggle |
| `bio.js` | Stub | 10-line runtime fallback only |
| `search.js` | Stub | Not yet implemented |
| `charts.js` | Stub | Not yet implemented |
| `modules/nav.js` | Complete | Top nav, hash-based active link |
| `modules/team-page.js` | Complete | TeamPage — 4-tab shell, tab switching, `scrollToPlayer` param |
| `modules/squad-tab.js` | Complete | Squad tab — position groups, Auto-Focus IntersectionObserver |
| `modules/profile-panel.js` | Complete | Singleton panel — player stats, club badge, bio, similar players |
| `modules/overview-tab.js` | Complete | Hero cards, captain highlight, fixture strip, group standing |
| `modules/stats-tab.js` | Stub | Placeholder |
| `modules/fixtures-tab.js` | Stub | Placeholder |
| `modules/tournament-centre.js` | Complete | 3-tab shell — Today / Group Stage / Knockout Stage |
| `modules/group-carousel.js` | Complete | 12 group cards, standings tables, fixture strips, drag/wheel/arrow nav, `scrollToGroup()` |
| `modules/knockout-bracket.js` | Complete | Horizontal bracket, 5 rounds, seed labels, wheel redirect |
| `modules/search-overlay.js` | Stub | Not yet implemented |
| `modules/compare-view.js` | Stub | Not yet implemented |

### CSS files (`styles/`)

All files exist and are fully implemented unless noted:
- `main.css` — custom properties, CSS reset
- `theme.css` — light/dark colour tokens
- `layout.css` — page grid, `.page-content` max-width
- `nav.css` — top nav bar
- `team-page.css` — TeamPage tabs, squad layout
- `squad.css` — squad cards, position group headers
- `profile-panel.css` — sticky side panel
- `tournament-centre.css` — snapshot, tabs, match cards, group leaders
- `carousel.css` — GroupCarousel, standings table, fixture strip, broadcaster badges
- `knockout.css` — horizontal bracket, round columns, team slots
- `search.css` — stub
- `utilities.css` — badge classes (badge--ft, badge--live, badge--bbc, badge--itv, empty-state)

### Data files (`data/`)

| File | Status |
|------|--------|
| `countries.json` | Complete — all 48 teams |
| `groups.json` | Complete — all 12 groups A–L |
| `clubs.json` | Complete — clubs referenced by France/England/Brazil |
| `leagues.json` | Complete — leagues referenced by above clubs |
| `fixtures.json` | **Partial** — Groups C, I, L only (18 fixtures). 9 groups still empty. |
| `standings.json` | **Partial** — Groups C, I, L only. 9 groups still empty (carousel shows placeholder). |
| `knockout.json` | Complete structure — 5 rounds, 16+8+4+2+2 matches. All slots null (no teams qualified yet). R32 has seed labels. |
| `rankings.json` | Empty stub |
| `search-index.json` | Empty stub |
| `players/france.json` | Complete — 26 players |
| `players/england.json` | Complete — 26 players |
| `players/brazil.json` | Complete — 26 players |
| `players/*.json` (45 teams) | Not yet created |

---

## DATA SCHEMAS — ACTUAL (not spec)

These are the live schemas in use. The original spec differs in field names — always use these.

### Player (`data/players/{countryId}.json`)

```json
{
  "id":              "france-mbappe",
  "name":            "Kylian Mbappé",
  "shirt":           10,
  "position":        "FW",
  "dob":             "1998-12-20",
  "age":             27,
  "caps":            98,
  "goals":           56,
  "clubId":          "real-madrid",
  "captain":         true,
  "bio":             "",
  "marketValue":     null,
  "similarPlayerIds": [],
  "recentForm":      [],
  "isOfficialSquad": true,
  "isReserve":       false
}
```

Key differences from spec: `shirt` (not `shirtNumber`), `position` values are `GK/DF/MF/FW` (not GK/DEF/MID/FWD), no `countryId` field, no `leagueId` field, no `photoUrl` at runtime.

### Group (`data/groups.json`)

```json
{ "id": "A", "name": "Group A", "teamIds": ["mexico", "south-korea", "south-africa", "czech-republic"] }
```

`DataManager.loadGroups()` returns the array of these objects. GroupCarousel uses `group.id` and `group.name`.

### Country (`data/countries.json`)

```json
{
  "id": "france",
  "name": "France",
  "code": "FRA",
  "confederation": "UEFA",
  "fifaRanking": 2,
  "groupId": "I",
  "manager": "Didier Deschamps"
}
```

### Fixture (`data/fixtures.json`)

```json
{
  "id":          "i-r1-fra-sen",
  "groupId":     "I",
  "round":       1,
  "homeTeamId":  "france",
  "awayTeamId":  "senegal",
  "kickoff":     "2026-06-14T19:00:00Z",
  "status":      "FT",
  "homeScore":   3,
  "awayScore":   1,
  "venue":       "SoFi Stadium, Inglewood CA",
  "broadcaster": null
}
```

**Status values — exactly three valid strings:**
- `"scheduled"` — not yet played
- `"live"` — in progress
- `"FT"` — completed

**Never use:** `"finished"`, `"complete"`, `"played"`. Score fields: `homeScore`/`awayScore` (NOT `score.home`/`score.away`).

### Standings (`data/standings.json`)

**NESTED structure — critical. NOT a flat per-team array.**

```json
{
  "data": [
    {
      "groupId": "I",
      "teams": [
        {
          "teamId": "france",
          "position": 1,
          "played": 1, "won": 1, "drawn": 0, "lost": 0,
          "goalsFor": 3, "goalsAgainst": 1, "goalDifference": 2,
          "points": 3,
          "qualificationStatus": null
        }
      ]
    }
  ]
}
```

`teams[0]` is always the current leader (sorted by position). Use `teamId` (not `countryId`). `qualificationStatus`: `null | "qualified" | "eliminated" | "playoff"`.

### Knockout (`data/knockout.json`)

```json
{
  "version": "1.0",
  "lastUpdated": "2026-06-20T00:00:00Z",
  "data": [
    {
      "id": "r32",
      "label": "Round of 32",
      "matches": [
        {
          "id": "r32-m1",
          "homeLabel": "1A",
          "awayLabel": "2B",
          "homeTeamId": null,
          "awayTeamId": null,
          "homeScore": null,
          "awayScore": null,
          "kickoff": null,
          "status": "scheduled",
          "venue": null
        }
      ]
    }
  ]
}
```

`data` is an array of round objects. `DataManager.loadKnockout()` returns that array directly. R32 matches have `homeLabel`/`awayLabel` (seed strings like `"1A"`, `"2B"`, `"Best 3rd"`). R16+ slots have null labels until winner propagation is added. Final-round matches have an optional `matchLabel` field (`"3rd Place"` / `"Final"`).

### All data files use this envelope:
```json
{ "version": "1.0", "lastUpdated": "2026-06-20T00:00:00Z", "data": [] }
```
Exception: `search-index.json` is a bare array `[]`.

---

## ROUTING — COMPLETE MAP

```
Hash                  Module             Params
─────────────────────────────────────────────────────────────────
(empty) / #tournament TournamentCentre   {}
#today                TournamentCentre   { initialTab: 'today' }
#group-a … #group-l   TournamentCentre   { initialTab: 'groups', groupId: 'A'…'L' }
#knockout             TournamentCentre   { initialTab: 'knockout' }
#france               TeamPage           { countryId: 'france' }
#france-mbappe        TeamPage           { countryId: 'france', scrollToPlayer: 'mbappe' }
#countries            PlaceholderModule  (stub)
#compare              PlaceholderModule  (stub)
#statistics           PlaceholderModule  (stub)
#club-explorer        PlaceholderModule  (stub)
#league-explorer      PlaceholderModule  (stub)
(anything else)       NotFoundModule
```

Group deep-link regex: `/^group-[a-l]$/` — matched before country route check. Letter extracted as `hash.slice(6).toUpperCase()`.

---

## CRITICAL NON-OBVIOUS PATTERNS

### 1. Listener attachment rule
Event listeners in `render()`/`init()` must target **inner elements** (recreated by `innerHTML`), NOT the persistent `#app-content` container. Attaching to `#app-content` causes listener accumulation across navigations.

```javascript
// CORRECT — targets .tournament-centre which is recreated each render()
this.#container.querySelector('.tournament-centre').addEventListener('click', ...);

// WRONG — this.#container IS #app-content, persistent across navigations
this.#container.addEventListener('click', ...);
```

### 2. Standings structure — access pattern

```javascript
// standings = [{ groupId, teams: [] }, ...]
const leader = standings.find(g => g.groupId === 'I')?.teams[0];
```

Never assume flat structure. `group.teams[0]` is always position 1.

### 3. GroupCarousel deep-link timing
`scrollToGroup()` must be called inside a `setTimeout(fn, 0)` after `carousel.init()` to allow browser layout to settle before reading `offsetWidth`.

```javascript
this.#tabModule.init();
const groupId = this.#params.groupId;
if (groupId) {
  this.#params.groupId = null; // consume once — prevents re-scroll on manual tab switch
  setTimeout(() => this.#tabModule?.scrollToGroup(groupId), 0);
}
```

### 4. Carousel gap-aware index math
Card width must include the CSS gap — use `getComputedStyle` to read it:

```javascript
const gap   = parseFloat(getComputedStyle(carousel).columnGap) || 16;
const cardW = (cards[0]?.offsetWidth ?? 0) + gap;
const idx   = Math.round(carousel.scrollLeft / cardW);
```

### 5. Drag vs scroll-snap conflict
CSS `scroll-snap-type` fights pointer drag. Solution: add `.is-dragging` class on `pointerdown` which disables snap, remove on `pointerup`/`pointercancel`.

### 6. DataManager unwrap behaviour
`DataManager.#load()` returns `json.data ?? []`. For most files this is a plain array. For knockout.json, `json.data` is an array of round objects — `loadKnockout()` returns that array of rounds directly (not the envelope).

### 7. `behavior: 'instant'` for deep-link scrolls
Navigation-triggered carousel position changes use `behavior: 'instant'`. User-triggered arrow clicks use `behavior: 'smooth'`.

---

## MODULE LIFECYCLE

Every module must implement:
- `async render()` — fetches data, writes `this.#container.innerHTML`
- `init()` — attaches listeners and observers (synchronous, called after render resolves)
- `teardown()` — disconnects observers, cancels animation frames, nulls refs

Router calls them in order: `await mod.render(); mod.init();`
On navigation away: `this.#currentModule?.teardown();`

---

## AUTO-FOCUS SYSTEM (Squad tab)

IntersectionObserver on `.squad-group[data-position]` sections:
- `root: document.getElementById('app-content')` (the scroll container, also the router's `#contentEl`)
- `rootMargin: '-30% 0px'`, `threshold: 0`
- On intersect: load the first visible player in that position group into ProfilePanel
- `#rowSelections` Map (keyed by position string "GK"/"DF"/"MF"/"FW") tracks last-viewed player per group
- Keyboard: `card.addEventListener('focus', ...)` → `card.scrollIntoView({ behavior: 'smooth', block: 'center' })` → observer fires naturally

---

## WHAT'S NEXT — SPRINT 5 CANDIDATES

**Priority 1 — Real fixture/standings data for all 12 groups**
Groups A/B/D/E/F/G/H/J/K still show "available soon" placeholder in the carousel. Populating `fixtures.json` and `standings.json` is the highest-impact content task. Use Wikipedia API workflow (Section 9 of DATA_ENTRY_GUIDE.md) — the API section-fetch trick is mandatory for groups beyond the first few. No code changes required.

**Priority 2 — Nav active state for deep-link routes**
`#updateActiveLink` in `router.js` only highlights exact hash matches. `#today`, `#group-a` etc. don't highlight any nav link. Fix: pass a `highlightHash` alongside params so the router knows which nav item to activate regardless of the actual URL hash. Or pass `'tournament'` as the canonical highlight for all TC routes.

**Priority 3 — qualificationStatus indicators**
`qualificationStatus` is null for all teams. Once data is populated, add visual indicators (coloured dots / row highlights) to carousel standings tables. CSS class `.standings-row--qualified` / `--eliminated` hooks are natural; just needs data and styling.

**Priority 4 — Player data (45 remaining squads)**
France, England, Brazil are complete. 45 squads need `data/players/{id}.json`. Each file: 26 players, all required fields. Wikipedia API is the source of truth for names, positions, DOBs, caps, goals, clubs. See DATA_ENTRY_GUIDE.md Sections 2–12 for all conventions and disambiguation rules.

**Priority 5 — Winner propagation in knockout bracket**
When R32 results are available: set `homeTeamId`/`awayTeamId` in knockout.json and the bracket renders flags + real names automatically. A script (`scripts/update-knockout.js`) should handle this — reads match results, advances winners to the next round's slots.

**Priority 6 — Today's Matches broadcaster data**
`broadcaster` is null on all fixtures. Setting `"broadcaster": "BBC"` or `"ITV"` activates the existing badge styles (`.badge--bbc`, `.badge--itv`) in carousel.css.

---

## WIKIPEDIA DATA WORKFLOW (for next data session)

Wikipedia is the sole source of truth for squad player names, positions, DOBs, caps, goals, clubs.

**Do NOT use anchor URLs** (`/wiki/2026_FIFA_World_Cup_squads#Group_A`) — the page is too large and WebFetch truncates before most groups are reached.

**Always use the API:**
```
Step 1: GET section indices
https://en.wikipedia.org/w/api.php?action=parse&page=2026_FIFA_World_Cup_squads&prop=sections&format=json

Step 2: Fetch the specific squad section by index
https://en.wikipedia.org/w/api.php?action=parse&page=2026_FIFA_World_Cup_squads&prop=wikitext&section=42&format=json
```

Known section indices (verify with a fresh fetch before each session):

| Group | Country | Section |
|-------|---------|---------|
| C | Brazil | 12 |
| I | France | 42 |
| L | England | 58 |
| A | Mexico | 2 |
| J | Argentina | 46 |
| K | Portugal | 50 |

---

## KNOWN ISSUES / DEFERRED

- `#today` and `#tournament` both resolve to TournamentCentre today-tab, but only `#tournament` activates a nav link (no nav link exists for `#today`)
- Stats tab and Fixtures tab on TeamPage are placeholder stubs
- Search overlay not implemented
- Compare view not implemented
- No player photos (all showing `player-avatar.svg` placeholder)
- No club badges (CSS fallback active)
- `data/rankings.json` empty — Rankings component not implemented
- `scripts/update-standings.js`, `scripts/update-knockout.js` etc. are stubs

---

## HOW TO START A SESSION

1. Read this document fully.
2. Read `TASK_BREAKDOWN.md` for the detailed task list with statuses.
3. If implementing a module, read the relevant section of `IMPLEMENTATION_BLUEPRINT.md`.
4. If entering data, read `DATA_ENTRY_GUIDE.md` before touching any JSON.
5. Pick up from the next uncompleted task. Do not re-implement completed work.
