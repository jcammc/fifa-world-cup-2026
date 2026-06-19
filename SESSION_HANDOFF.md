# SESSION HANDOFF — World Cup 2026 Squad Explorer
# Copy everything below this line into your next Claude session.

---

## PROJECT OVERVIEW

You are continuing the build of **"World Cup 2026 Squad Explorer and Tournament Companion"** — a vanilla JavaScript single-page application hosted on Netlify. The planning phase is 100% complete and approved. We are now in **implementation**. Begin immediately from the task list below — do not re-ask planning questions.

**Working directory:** `C:\Users\jcame\OneDrive\Desktop\FIFA World Cup 2026`

**Source specification files (read-only, do not edit):**
`C:\Users\jcame\OneDrive\Documents\Notes\Fifa World Cup .md files\`
- `# 01_PRODUCT_SPEC.md.txt`
- `# 02_UX_AND_UI_SPEC.md.txt`
- `# 03_TECHNICAL_ARCHITECTURE.md.txt`
- `# 04_DATA_MODEL.md.txt`
- `# 05_IMPLEMENTATION_PLAN.md.txt`
- `# 06_UI_MOCKUPS.md.txt`
- `# 07_ACCEPTANCE_CRITERIA.md.txt`

**Planning documents already created in the working directory:**
- `PROJECT_ANALYSIS.md` — product summary, file structure, component inventory, routing, data schemas, risks
- `IMPLEMENTATION_BLUEPRINT.md` — full module design, lifecycle interfaces, Auto-Focus System detail, carousel detail, state management, rendering patterns
- `TASK_BREAKDOWN.md` — 83 tasks (T-001 through T-083), sized S/M/L/XL, with dependencies
- `SPEC_AUDIT.md` — 32 audit findings and resolutions
- `RECOMMENDATIONS.md` — 18 recommendations ([ADOPT]/[CONSIDER]/[FUTURE])

**These planning documents are your reference throughout the build. Read them when implementing each module.**

---

## CURRENT STATUS

| Phase | Status |
|-------|--------|
| Planning (7 documents) | COMPLETE — approved |
| DATA_ACQUISITION_STRATEGY.md | NOT YET CREATED (content ready — see Section 9 below) |
| Sprint 0 | NOT STARTED |
| Sprint 1–7 | NOT STARTED |

---

## IMMEDIATE TASKS — DO THESE NOW, IN ORDER

### Step 1: Create DATA_ACQUISITION_STRATEGY.md

Create `C:\Users\jcame\OneDrive\Desktop\FIFA World Cup 2026\DATA_ACQUISITION_STRATEGY.md` using the content in **Section 9** of this handoff. This is the final planning document — it must exist before Sprint 0.

### Step 2: Execute Sprint 0

Create the complete project structure below. Stop after Sprint 0 and ask the user to review before beginning Sprint 1.

---

## SPRINT 0 — COMPLETE TASK LIST

Create every file and directory listed below. Directories with no files get a `.gitkeep`.

### T-000a — Directory structure

```
C:\Users\jcame\OneDrive\Desktop\FIFA World Cup 2026\
├── index.html                        ← empty shell
├── netlify.toml
├── package.json
├── .gitignore
├── .vscode/
│   └── settings.json
├── js/
│   ├── app.js                        ← entry point stub
│   ├── router.js                     ← stub
│   ├── data.js                       ← DataManager stub
│   ├── search.js                     ← stub
│   ├── charts.js                     ← stub
│   ├── bio.js                        ← stub (10-line fallback only)
│   ├── theme.js                      ← stub
│   ├── utils.js                      ← stub
│   └── modules/
│       ├── tournament-centre.js      ← stub
│       ├── team-page.js              ← stub
│       ├── squad-tab.js              ← stub
│       ├── overview-tab.js           ← stub
│       ├── stats-tab.js              ← stub
│       ├── fixtures-tab.js           ← stub
│       ├── profile-panel.js          ← stub
│       ├── group-carousel.js         ← stub
│       ├── knockout-bracket.js       ← stub
│       ├── search-overlay.js         ← stub
│       ├── compare-view.js           ← stub
│       └── nav.js                    ← stub
├── styles/
│   ├── main.css                      ← custom properties, reset
│   ├── theme.css                     ← light/dark variables
│   ├── layout.css                    ← grid/flex layout stubs
│   ├── nav.css                       ← stub
│   ├── team-page.css                 ← stub
│   ├── squad.css                     ← stub
│   ├── profile-panel.css             ← stub
│   ├── tournament-centre.css         ← stub
│   ├── carousel.css                  ← stub
│   ├── knockout.css                  ← stub
│   ├── search.css                    ← stub
│   └── utilities.css                 ← stub
├── data/
│   ├── countries.json                ← empty stub
│   ├── groups.json                   ← empty stub
│   ├── fixtures.json                 ← empty stub
│   ├── standings.json                ← empty stub
│   ├── clubs.json                    ← empty stub
│   ├── leagues.json                  ← empty stub
│   ├── rankings.json                 ← empty stub
│   ├── knockout.json                 ← empty stub
│   ├── search-index.json             ← empty array []
│   └── players/
│       └── .gitkeep
├── assets/
│   ├── placeholders/
│   │   └── player-avatar.svg         ← designed placeholder
│   ├── flags/
│   │   └── .gitkeep
│   ├── badges/
│   │   └── .gitkeep
│   ├── logos/
│   │   └── .gitkeep
│   └── icons/
│       └── .gitkeep
├── scripts/
│   ├── generate-player-bios.js       ← stub
│   ├── generate-rankings.js          ← stub
│   ├── update-standings.js           ← stub
│   ├── update-knockout.js            ← stub
│   ├── validate-data.js              ← stub
│   ├── build-search-index.js         ← stub
│   └── lib/
│       ├── bio-templates.js          ← stub
│       └── ranking-formula.js        ← stub
├── schemas/
│   └── README.md                     ← data entry schema reference
├── CONTRIBUTING.md
├── DECISIONS.md
├── DATA_ENTRY_GUIDE.md
└── DATA_ACQUISITION_STRATEGY.md     ← created in Step 1
```

---

## KEY ARCHITECTURAL DECISIONS (non-negotiable)

1. **Stack:** Vanilla JavaScript + ES Modules. No framework. No build step.
2. **Routing:** Hash-based (`#france`, `#france-mbappe`, `#club-real-madrid`). Router loads `data/countries.json` on init to build a Set of valid country IDs — never hardcoded.
3. **Data:** 100% data-driven. Zero hardcoded tournament data in JS. All data from local JSON files in `data/`.
4. **Player data:** Per-team files — `data/players/france.json`, not a single players.json.
5. **Photo strategy:** Local-first only. Runtime chain: `assets/players/{id}.jpg` → `assets/placeholders/player-avatar.svg`. The `photoUrl` field in player JSON is source metadata for `scripts/gather-photos.js` ONLY — never used at runtime.
6. **Hosting:** GitHub → Netlify (git-based auto-deploy). No drag-and-drop.
7. **Badges/flags:** All local SVGs. CSS initials fallback for missing club badges.
8. **Search:** Fuse.js + precomputed `data/search-index.json` (built by `scripts/build-search-index.js`).
9. **Charts:** Custom SVG only. No Chart.js, no D3.
10. **Bios:** Pre-generated offline via `scripts/generate-player-bios.js`. Stored in `bio` field. Browser `bio.js` is a 10-line fallback only. Existing (non-null) bios never overwritten.
11. **Theme:** CSS Custom Properties scoped to `[data-theme="dark"]` / `[data-theme="light"]`. Single attribute swap = instant change. localStorage persistence.
12. **Module lifecycle:** Every module implements `render()` (async), `init()` (sync), `teardown()` (sync).

---

## DATA SCHEMAS (approved final versions)

### Player
```json
{
  "id": "france-mbappe",
  "countryId": "france",
  "name": "Kylian Mbappé",
  "position": "FWD",
  "shirtNumber": 10,
  "age": 27,
  "clubId": "real-madrid",
  "leagueId": "la-liga",
  "caps": 98,
  "goals": 48,
  "marketValue": 180000000,
  "photoUrl": "https://img.fifa.com/...",
  "bio": null,
  "recentForm": ["W","W","D","W","L"],
  "similarPlayerIds": ["spain-yamal","england-saka"],
  "isOfficialSquad": true,
  "isReserve": false
}
```

### Country
```json
{
  "id": "france",
  "name": "France",
  "code": "FRA",
  "confederation": "UEFA",
  "fifaRanking": 2,
  "groupId": "E",
  "manager": "Didier Deschamps",
  "teamStrength": {
    "attack": 95, "midfield": 88, "defence": 82, "goalkeeping": 90, "depth": 91
  }
}
```

### Club
```json
{
  "id": "real-madrid",
  "name": "Real Madrid",
  "leagueId": "la-liga",
  "country": "Spain"
}
```

### Fixture
```json
{
  "id": "f-001",
  "groupId": "A",
  "matchday": 1,
  "homeTeamId": "mexico",
  "awayTeamId": "usa",
  "kickoff": "2026-06-11T20:00:00Z",
  "venue": "AT&T Stadium, Arlington",
  "broadcaster": "BBC",
  "status": "finished",
  "score": { "home": 1, "away": 2 }
}
```

### Group Standings entry
```json
{
  "countryId": "france",
  "groupId": "E",
  "played": 2, "won": 2, "drawn": 0, "lost": 0,
  "goalsFor": 5, "goalsAgainst": 1, "goalDifference": 4, "points": 6,
  "qualificationStatus": "qualified"
}
```

### Knockout Match
```json
{
  "id": "ko-001",
  "round": "R32",
  "homeTeamId": "france",
  "awayTeamId": null,
  "homeTeamLabel": "1st Group E",
  "awayTeamLabel": "2nd Group F",
  "kickoff": "2026-07-01T20:00:00Z",
  "venue": "MetLife Stadium, New Jersey",
  "status": "scheduled",
  "score": null
}
```

### Player Ranking
```json
{
  "playerId": "france-mbappe",
  "transfermarkt": 95,
  "ea": 91,
  "awards": 88,
  "media": 99,
  "form": 85,
  "consensus": 92.8
}
```

### All JSON data files wrap in:
```json
{ "version": "1.0", "lastUpdated": "2026-06-19T00:00:00Z", "data": [] }
```
Exception: `search-index.json` is a bare array `[]`.

---

## FIVE CORE FEATURES (non-negotiable, implement exactly as specified)

### 1. Auto-Focus Squad System
- IntersectionObserver on player card rows. `rootMargin: '-30% 0px'`, threshold `[0, 0.25, 0.5, 0.75, 1.0]`.
- One singleton ProfilePanel for the whole team page.
- When a row enters the viewport: activate that row's profile data in the panel.
- Keyboard integration: `card.addEventListener('focus', ...)` → if card not visible, `card.scrollIntoView({ behavior: 'smooth', block: 'center' })` → IntersectionObserver fires naturally after scroll. Single code path, no duplication.

### 2. Group Stage Carousel
- CSS `scroll-snap-type: x mandatory`. 12 groups (A–L) as snap children.
- No partial resting positions — always lands on a full group view.
- Pointer event drag + mouse wheel redirect + arrow button navigation.
- Arrow buttons advance one group at a time.

### 3. Hero Player Navigation
- Overview tab shows hero cards (captain, key players).
- Clicking a hero card: switch to Squad tab → `scrollIntoView` → IntersectionObserver fires → profile opens automatically. No manual profile panel activation needed.

### 4. Team Page Tab Structure
- Tabs: Overview | Squad | Fixtures | Stats
- Hash updates on tab change: `#france` (overview), `#france` with tab param, or implemented via JS tab state.
- Squad tab = Auto-Focus System home.

### 5. Tournament Centre (Homepage)
- Exact order: Tournament Snapshot → Today's Matches → Current Group Leaders → Featured Match → Group Stage Carousel → Knockout Stage Bracket.
- Today's Matches: if no matches today, show next scheduled match(es) instead. Never show empty state.
- Hash: `#` or `#tournament` → this view.

---

## MODULE LIFECYCLE INTERFACE (implement on every module)

```javascript
export class SomeModule {
  #container;
  #observer = null;

  constructor(container, params = {}) {
    this.#container = container;
  }

  async render() {
    // 1. Fetch data via DataManager
    // 2. Build DOM string
    // 3. this.#container.innerHTML = html
  }

  init() {
    // Attach IntersectionObservers, event listeners
    // Called synchronously after render() resolves
  }

  teardown() {
    // this.#observer?.disconnect()
    // Remove all event listeners
    // Clear all timers
  }
}
```

---

## ROUTER LOGIC

```javascript
// On hashchange:
async function resolve(hash) {
  const countries = await DataManager.loadCountries();
  const countryIds = new Set(countries.map(c => c.id));

  if (!hash || hash === 'tournament') return showTournamentCentre();

  // Check for player route first: #countryid-playerslug
  for (const id of countryIds) {
    if (hash.startsWith(id + '-')) {
      const playerSlug = hash.slice(id.length + 1);
      return showTeamPage(id, { scrollToPlayer: playerSlug });
    }
  }

  // Check country route
  if (countryIds.has(hash)) return showTeamPage(hash);

  // Check club route
  if (hash.startsWith('club-')) return showClubPage(hash.slice(5));

  // Search
  if (hash.startsWith('search-')) return showSearch(hash.slice(7));

  return show404();
}
```

---

## DATAMANAGER INTERFACE (implement in js/data.js)

```javascript
class DataManager {
  #cache = new Map();

  async loadCountries()           // → Country[]
  async loadGroups()              // → Group[]
  async loadFixtures()            // → Fixture[]
  async loadStandings()           // → Standing[]
  async loadKnockout()            // → KnockoutMatch[]
  async loadPlayersForTeam(id)    // → Player[] (from data/players/{id}.json)
  async loadClubs()               // → Club[]
  async loadLeagues()             // → League[]
  async loadRankings()            // → Ranking[]
  async getPlayerResolved(id)     // → Player with club/league objects populated
  async getTodaysFixtures()       // → Fixture[] (filters by today's date)
  async getGroupStandings(groupId)// → Standing[] for one group
  invalidateCache(key)
  clearCache()
}

export const DataManager = new _DataManager();
```

All data URLs defined as constants inside DataManager. No module ever fetches JSON directly.

---

## DEVELOPMENT DATA (France, England, Brazil)

Do NOT create real tournament data yet. The only sample data needed for Sprint 0 is:
- Empty JSON stubs (correct structure, no actual records)
- The three reference teams (France, England, Brazil player files) will be populated during Sprint 1 development

The application must work gracefully with empty data files — show appropriate empty states, not crash.

---

## SPRINT 0 FILE SPECIFICATIONS

### `netlify.toml`
```toml
[build]
  publish = "."

[[headers]]
  for = "/*.json"
  [headers.values]
    Cache-Control = "public, max-age=300, stale-while-revalidate=60"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=3600"

[[headers]]
  for = "/*.css"
  [headers.values]
    Cache-Control = "public, max-age=3600"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### `package.json`
```json
{
  "name": "world-cup-2026",
  "version": "1.0.0",
  "description": "FIFA World Cup 2026 Squad Explorer and Tournament Companion",
  "type": "module",
  "scripts": {
    "generate-bios": "node scripts/generate-player-bios.js",
    "generate-rankings": "node scripts/generate-rankings.js",
    "update-standings": "node scripts/update-standings.js",
    "update-knockout": "node scripts/update-knockout.js",
    "validate": "node scripts/validate-data.js",
    "build-search-index": "node scripts/build-search-index.js",
    "gather-photos": "node scripts/gather-photos.js",
    "pre-deploy": "npm run validate && npm run generate-bios && npm run generate-rankings && npm run build-search-index"
  },
  "devDependencies": {},
  "dependencies": {}
}
```
Note: Fuse.js is loaded via CDN in index.html during development. Add as npm dep before production if preferred.

### `.gitignore`
```
node_modules/
.DS_Store
Thumbs.db
*.log
.env
.env.local
```

### `.vscode/settings.json`
```json
{
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "files.eol": "\n",
  "editor.formatOnSave": false,
  "files.exclude": {
    "node_modules": true
  },
  "liveServer.settings.donotShowInfoMsg": true
}
```

### `index.html` (functional shell — not just a placeholder)
```html
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>World Cup 2026</title>
  <link rel="stylesheet" href="styles/main.css">
  <link rel="stylesheet" href="styles/theme.css">
  <link rel="stylesheet" href="styles/layout.css">
  <link rel="stylesheet" href="styles/nav.css">
  <link rel="stylesheet" href="styles/team-page.css">
  <link rel="stylesheet" href="styles/squad.css">
  <link rel="stylesheet" href="styles/profile-panel.css">
  <link rel="stylesheet" href="styles/tournament-centre.css">
  <link rel="stylesheet" href="styles/carousel.css">
  <link rel="stylesheet" href="styles/knockout.css">
  <link rel="stylesheet" href="styles/search.css">
  <link rel="stylesheet" href="styles/utilities.css">
</head>
<body>
  <header id="app-nav"></header>
  <main id="app-root"></main>
  <div id="search-overlay" hidden></div>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

### `styles/main.css` (custom properties + reset)
Include: CSS reset, root custom properties for spacing/typography/radius, `html { font-size: 16px }`, `*, *::before, *::after { box-sizing: border-box }`, smooth scroll, focus-visible styles.

### `styles/theme.css` (all colour variables)
Structure:
```css
:root, [data-theme="light"] {
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f5f5f5;
  --color-bg-card: #ffffff;
  --color-text-primary: #0a0a0a;
  --color-text-secondary: #555555;
  --color-border: #e0e0e0;
  --color-accent: #c8a84b; /* gold */
  --color-accent-hover: #e0c06a;
  /* etc */
}

[data-theme="dark"] {
  --color-bg-primary: #0a0a0a;
  --color-bg-secondary: #141414;
  --color-bg-card: #1a1a1a;
  --color-text-primary: #f5f5f5;
  --color-text-secondary: #aaaaaa;
  --color-border: #2a2a2a;
  --color-accent: #c8a84b;
  --color-accent-hover: #e0c06a;
  /* etc */
}
```

### `js/app.js` (entry point stub)
```javascript
import { Router } from './router.js';
import { ThemeManager } from './theme.js';
import { Nav } from './modules/nav.js';

async function init() {
  ThemeManager.init();
  await Nav.render(document.getElementById('app-nav'));
  Nav.init();
  Router.init();
}

init();
```

### All other `js/` stubs
Each file exports its class/object with empty methods:
```javascript
// js/router.js
export const Router = {
  init() {},
  navigate(hash) {}
};
```
```javascript
// js/data.js
export const DataManager = {
  async loadCountries() { return []; },
  // ... etc
};
```

### All `scripts/` stubs
Each starts with a comment header and empty main function:
```javascript
// scripts/validate-data.js
// Validates all JSON data files against schemas. Run: node scripts/validate-data.js
import { readFileSync } from 'fs';

async function main() {
  console.log('validate-data: not yet implemented');
}

main().catch(console.error);
```

### `assets/placeholders/player-avatar.svg`
A designed SVG placeholder — silhouette of a player, not just a grey box:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
  <rect width="200" height="200" fill="#1a1a1a"/>
  <!-- head -->
  <circle cx="100" cy="72" r="28" fill="#2a2a2a"/>
  <!-- body -->
  <path d="M48 180 C48 140 72 124 100 124 C128 124 152 140 152 180 Z" fill="#2a2a2a"/>
</svg>
```

### `schemas/README.md`
Full JSON schema reference for data entry, covering all entity types with field descriptions, required/optional markers, valid values, and one complete example per entity. **This is critical for maintaining ID consistency across 1,250 players.**

ID naming conventions to enforce:
- All IDs: lowercase, hyphen-separated, no spaces, no special characters
- Country: `france`, `south-africa`, `united-states`
- Player: `{countryId}-{lastnameslug}` → `france-mbappe`, `england-bellingham`
- Club: `real-madrid`, `manchester-city`, `inter-milan`
- League: `la-liga`, `premier-league`, `serie-a`
- Fixture: `f-001` through `f-104`
- Knockout: `ko-001` through `ko-032`

### `CONTRIBUTING.md`
Developer workflow: how to set up the project locally (VS Code + Live Server), how to run scripts, how to add a new team's data, how to commit, how to deploy.

### `DECISIONS.md`
Architectural decision log. Pre-populate with the 5 major decisions made during planning:
1. Vanilla JS + ES Modules (no framework)
2. Local-first photo strategy (no runtime remote URLs)
3. Pre-generated bios (not runtime generation)
4. Per-team player files (not single players.json)
5. GitHub → Netlify git-based deploy (not drag-and-drop)

### `DATA_ENTRY_GUIDE.md`
Plain-English guide for the person populating squads:
- Step-by-step: how to create `data/players/france.json`
- Complete example of one player record with every field explained
- List of valid position values: `GK`, `DEF`, `MID`, `FWD`
- Where to find each data point (FIFA.com, Transfermarkt, etc.)
- How to run `npm run validate` after entry
- Common mistakes to avoid (ID inconsistency, wrong field names)

---

## SPRINT 0 COMPLETION GATE

Do not report Sprint 0 as complete until all 9 criteria pass:

1. All directories and files exist as listed in T-000a above
2. `index.html` serves without errors (check browser console for module import errors)
3. `<script type="module" src="js/app.js">` loads cleanly (no CORS, no 404s on imports)
4. All CSS files linked in index.html exist and load (no 404s in Network tab)
5. `package.json` exists with all 8 npm scripts defined
6. `netlify.toml` exists with correct cache headers
7. All data JSON stubs exist with correct `{ "version", "lastUpdated", "data": [] }` structure
8. `data/search-index.json` exists as `[]`
9. `assets/placeholders/player-avatar.svg` exists as a valid SVG

After all 9 pass: **stop and tell the user Sprint 0 is complete, show a summary of what was created, and wait for review before beginning Sprint 1.**

---

## SPRINT 1 PREVIEW (do not start until user approves)

Sprint 1 builds the data layer and navigation skeleton:
- DataManager fully implemented (`js/data.js`)
- Router fully implemented (`js/router.js`)
- Nav component (`js/modules/nav.js`)
- Theme manager (`js/theme.js`)
- France, England, Brazil player data populated (3 complete JSON files)
- countries.json populated for all 48 teams
- groups.json populated (all 12 groups A–L)

---

## SECTION 9 — CONTENT FOR DATA_ACQUISITION_STRATEGY.md

Create this file at: `C:\Users\jcame\OneDrive\Desktop\FIFA World Cup 2026\DATA_ACQUISITION_STRATEGY.md`

```
# DATA_ACQUISITION_STRATEGY.md

Version: 1.0
Status: Planning Document — Phase 6 (Final)
Purpose: Defines how every piece of tournament data is obtained, maintained,
         and updated before and during the FIFA World Cup 2026.

---

## SECTION 1 — DATA SOURCE INVENTORY

### Summary Table

| Dataset | Method | Pre-Deploy | During Tournament |
|---------|--------|-----------|------------------|
| Countries (48) | Manual | One-time | Emergency only |
| Groups (A–L) | Manual | One-time | Never |
| Official Squads | Manual | One-time | Squad changes only |
| Managers | Manual | One-time | Emergency only |
| Coaching Staff | Manual | One-time | Never |
| Player Photos | Script-assisted | One-time | New players only |
| Club Badges | Script-assisted | One-time | Never |
| League Logos | Manual | One-time | Never |
| Fixtures (104) | Manual + Script | Pre-tournament | After every match |
| Kickoff Times | Manual | Pre-tournament | Reschedules only |
| Broadcasters | Manual | Pre-tournament | Changes rarely |
| Standings | Script (automated) | N/A | After every group match |
| Knockout Bracket | Manual + Script | Structure only | After every KO match |
| Player Rankings | Manual | Phased (see §4) | Form: optional refresh |
| Clubs | Manual | After squads | Never |
| Leagues | Manual | After clubs | Never |
| Player Bios | Script (automated) | One-time | After squad changes |
| Similar Players | Script (offline) | One-time | Never |
| Team Strength | Manual/Script | Pre-tournament | Optional |
| Search Index | Script (automated) | Pre-deploy | After any data change |

---

## SECTION 2 — PHOTO STRATEGY

Runtime chain (production):
  assets/players/{player.id}.jpg  →  assets/placeholders/player-avatar.svg

photoUrl in player JSON = source metadata only. Used exclusively by scripts/gather-photos.js.
Never used at browser runtime. This eliminates URL rot risk during the 6-week tournament.

Photo specs: JPEG, 400px wide, 80% quality (~20–40KB each, ~50MB total for 1,250 players).

Workflow:
  node scripts/gather-photos.js
  Reads all player JSON, downloads files with photoUrl set to assets/players/.
  Idempotent — skips files that already exist.

---

## SECTION 3 — BADGE AND FLAG STRATEGY

All assets are local SVGs. No runtime external dependencies.

| Asset | Count | Source | Path |
|-------|-------|--------|------|
| Country flags | 48 | Wikimedia Commons SVG | assets/flags/{countryId}.svg |
| Club badges | ~400 | Club press packs / Wikimedia | assets/badges/{clubId}.svg |
| League logos | ~25 | Official league sites | assets/logos/{leagueId}.svg |

Club badge fallback: CSS initials badge (always works, no image required).
getInitials("Real Madrid") → "RM", displayed in a styled circle.

---

## SECTION 4 — RANKING DATA STRATEGY

Consensus formula:
  Consensus = (Transfermarkt × 0.40) + (EA × 0.20) + (Awards × 0.20) + (Media × 0.10) + (Form × 0.10)
  All components normalised to 0–100.

Phased approach:

  Phase 1 (launch): TM value + EA rating + Awards for top ~200 players (4-5 per team).
    Null components re-normalised by generate-rankings.js.
    Effective weights with 3 components: TM 50%, EA 25%, Awards 25%.

  Phase 2 (pre-tournament): Add Media + Form. Full 5-component consensus.

  Phase 3 (optional, mid-tournament): Refresh Form component with in-tournament stats.

Component sources:
  Transfermarkt: transfermarkt.com squad pages (manual lookup, already required for marketValue)
  EA Sports FC: ea.com/fc/ratings or FUTBIN (manual lookup, 0–99 scale → treat as 0–100)
  Awards: Wikipedia career sections + FIFA/UEFA records (manual, scoring rubric below)
  Media: Instagram follower count as proxy (manual lookup, ~60 minutes for all 1,250)
  Form: fbref.com international match logs, or WC qualification goals+assists as proxy

Awards scoring rubric:
  Ballon d'Or winner: 100 | Top 3: 85 | Top 10: 70
  FIFA Best Player: 95 | UEFA Player of Year: 90
  World Cup Golden Ball: 90 | TOTY (EA FC): 80
  World Cup winner: +15 | CL winner: +10 (per win, max +20)
  Domestic title: +5 (per title, max +15) | Cap at 100.

---

## SECTION 5 — TOURNAMENT UPDATE WORKFLOW

### Group Stage Match Update (time from whistle to live: ~3–5 minutes)

  1. Confirm final score (BBC Sport / FIFA.com)
  2. npm run update-standings -- --fixture f-001 --home 2 --away 1
     Script updates: fixture status, score, standings (P/W/D/L/GF/GA/GD/Pts), qualification status
  3. npm run validate
  4. git add data/fixtures.json data/standings.json
  5. git commit -m "FT: France 2-1 Iraq (Group I, MD2)"
  6. git push
  → Netlify auto-deploys in ~30 seconds

### Knockout Match Update

  1. npm run update-knockout -- --match ko-001 --winner france --home 2 --away 0 --aet false
     Script: updates result, advances team to next slot
  2. npm run validate && git add data/knockout.json && git commit -m "..." && git push

  Penalty shootout format:
  "score": { "home": 1, "away": 1, "aet": true, "penalties": { "home": 4, "away": 2 } }

### Squad Change Workflow (injury replacement)

  1. Edit data/players/{team}.json
     Departing: isOfficialSquad: false
     Arriving (promotion): isOfficialSquad: true, isReserve: false
     Arriving (new): full player record
  2. Download photo if new player (add photoUrl → npm run gather-photos)
  3. npm run generate-bios (idempotent — only fills null bios)
  4. npm run generate-rankings (if ranking data available)
  5. npm run build-search-index
  6. npm run validate && git add -A && git commit -m "Squad: ..." && git push

### Pre-Deployment Checklist

  npm run validate
  npm run generate-bios
  npm run generate-rankings
  npm run build-search-index
  git diff data/
  git add -A && git commit -m "..." && git push

---

## SECTION 6 — IMPLEMENTATION READINESS

All architectural decisions are resolved. No remaining blockers for Sprint 0.

Three accepted risks (resolved only by testing, not planning):
  1. IntersectionObserver threshold tuning on iOS Safari → test Auto-Focus in Sprint 3 on device
  2. CSS scroll-snap inertial scroll behaviour on iOS → test carousel in Sprint 4 on device
  3. Data population timeline → app is team-agnostic; works with 3–5 complete teams during dev

---

End of DATA_ACQUISITION_STRATEGY.md
```

---

## WHAT TO DO AFTER READING THIS HANDOFF

1. Confirm you have read this entire handoff.
2. Create `DATA_ACQUISITION_STRATEGY.md` (content in Section 9 above).
3. Create the complete Sprint 0 file structure.
4. When Sprint 0 is done, stop and tell the user what was created.
5. Wait for user review and approval before beginning Sprint 1.
6. Do not create any real tournament data. Use empty stubs and France/England/Brazil as reference when needed from Sprint 1 onwards.
```
