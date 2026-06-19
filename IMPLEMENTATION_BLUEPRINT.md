# IMPLEMENTATION_BLUEPRINT.md

Version: 1.0
Status: Planning Document — Phase 2
Purpose: Detailed engineering blueprint sufficient for another engineer to build this application
         without additional specifications.

---

# 1. APPLICATION STRUCTURE

## Entry point

`index.html` is the single HTML file. It contains:

- Document metadata (charset, viewport, theme-color)
- Link to base CSS (non-module styles loaded immediately)
- App shell HTML (header, sidebar, main content area)
- `<script type="module" src="js/app.js">` as the sole script entry point
- No inline scripts. No inline styles.

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>World Cup 2026 Squad Explorer</title>
  <link rel="stylesheet" href="styles/base.css">
  <link rel="stylesheet" href="styles/layout.css">
  <link rel="stylesheet" href="styles/components.css">
</head>
<body>
  <div id="app">
    <header id="app-header">...</header>
    <nav id="app-sidebar" aria-label="Main navigation">...</nav>
    <nav id="app-drawer" aria-label="Mobile navigation" aria-hidden="true">...</nav>
    <main id="app-content" aria-live="polite">...</main>
  </div>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

## App shell (always mounted)

The shell renders once on page load. Only `#app-content` is replaced on navigation.

```
#app
├── #app-header
│   ├── .app-logo
│   ├── #search-input (global search)
│   └── #theme-toggle
├── #app-sidebar (desktop)
│   ├── .nav-section[Browse]
│   │   ├── a[#countries]
│   │   ├── a[#groups]
│   │   └── a[#continents]
│   ├── .nav-section[Tournament]
│   │   └── a[#tournament]
│   ├── .nav-section[Analysis]
│   │   ├── a[#compare]
│   │   └── a[#statistics]
│   └── .nav-section[Football]
│       ├── a[#club-explorer]
│       └── a[#league-explorer]
├── #app-drawer (mobile, toggled)
│   └── (same nav content as sidebar)
├── #search-overlay (rendered when search active)
└── #app-content
    └── (active module renders here)
```

---

# 2. FOLDER STRUCTURE

```
worldcup2026/
│
├── index.html
│
├── styles/
│   ├── base.css              CSS custom properties, reset, typography tokens
│   ├── layout.css            App shell, header, sidebar, drawer, content area
│   ├── components.css        Cards, tables, badges, buttons, tabs, form elements
│   ├── utilities.css         Spacing, display, flex, grid helpers
│   └── modules/
│       ├── team-page.css     Team header, tab bar
│       ├── squad.css         Squad grid, player cards, profile panel, reserves
│       ├── tournament.css    Today's matches, group cards, knockout bracket
│       ├── search.css        Search overlay, result groups, result items
│       └── compare.css       Compare page layout
│
├── js/
│   ├── app.js                Bootstrap: init shell, router, theme, search
│   ├── router.js             Hash routing, module lifecycle (mount/teardown)
│   ├── data.js               DataManager: fetch, cache, lookup, filter
│   ├── search.js             Search index builder, fuzzy match, filter prefix
│   ├── theme.js              Theme toggle, CSS variable swap, localStorage
│   ├── time.js               UTC → Europe/London, BST/GMT label, format helpers
│   ├── bio.js                Bio template engine (position-aware generation)
│   ├── radar.js              SVG radar chart renderer (reusable)
│   ├── utils.js              Slugify, debounce, clamp, DOM helpers
│   └── modules/
│       ├── home.js           Home/landing module
│       ├── countries.js      Countries list module
│       ├── groups.js         Groups browse module
│       ├── continents.js     Continents module
│       ├── team-page.js      Team page root: header + tabs
│       ├── overview-tab.js   Overview tab content
│       ├── squad-tab.js      Squad tab + Auto-Focus System
│       ├── fixtures-tab.js   Fixtures tab content
│       ├── statistics-tab.js Statistics tab content
│       ├── tournament.js     Tournament Centre root
│       ├── group-stage.js    Group Stage carousel
│       ├── knockout.js       Knockout bracket
│       ├── compare.js        Compare Teams
│       ├── stats-dashboard.js Statistics Dashboard
│       ├── club-explorer.js  Club Explorer
│       └── league-explorer.js League Explorer
│
├── data/
│   ├── countries.json        48 countries
│   ├── players/
│   │   ├── argentina.json    Per-team player files (~26 players each)
│   │   ├── france.json
│   │   ├── england.json
│   │   └── ...              (one file per team, 48 total)
│   ├── groups.json           12 groups (A–L) with team IDs
│   ├── fixtures.json         All 72 group stage fixtures
│   ├── standings.json        All 12 group standings (live-updatable)
│   ├── clubs.json            All clubs represented
│   ├── leagues.json          All leagues represented
│   ├── rankings.json         Player consensus + component scores
│   └── knockout.json         Knockout bracket (32 slots)
│
└── assets/
    ├── flags/                Country flag SVGs (ISO 3166-1 alpha-2 codes)
    ├── badges/               Club badge SVGs
    ├── logos/                League logos
    ├── icons/                UI icons (SVG)
    └── placeholders/
        ├── player-avatar.svg Premium placeholder avatar
        └── club-badge.svg    Generic club badge fallback
```

---

# 3. COMPONENT TREE

```
App
└── AppShell
    ├── Header
    │   ├── Logo
    │   ├── SearchInput
    │   │   └── [triggers] SearchOverlay
    │   └── ThemeToggle
    ├── Sidebar [desktop]
    │   ├── NavSection "Browse"
    │   │   ├── NavLink → #countries
    │   │   ├── NavLink → #groups
    │   │   └── NavLink → #continents
    │   ├── NavSection "Tournament"
    │   │   └── NavLink → #tournament
    │   ├── NavSection "Analysis"
    │   │   ├── NavLink → #compare
    │   │   └── NavLink → #statistics
    │   └── NavSection "Football"
    │       ├── NavLink → #club-explorer
    │       └── NavLink → #league-explorer
    ├── Drawer [mobile, toggleable]
    │   └── [same as Sidebar]
    ├── Breadcrumb
    ├── SearchOverlay [conditional]
    │   ├── SearchResultGroup "Players"
    │   ├── SearchResultGroup "Countries"
    │   ├── SearchResultGroup "Clubs"
    │   ├── SearchResultGroup "Leagues"
    │   └── SearchResultGroup "Managers"
    └── ContentArea [#app-content]
        └── [one of the following, mounted by Router]
            │
            ├── HomeModule
            │
            ├── TeamPageModule
            │   ├── TeamHeader
            │   │   ├── CountryFlag
            │   │   └── TeamStats (ranking, manager, age, value, WCs)
            │   ├── TabBar [Overview|Squad|Fixtures|Statistics]
            │   └── [one active tab]
            │       │
            │       ├── OverviewTab
            │       │   ├── HeroCardStrip (5× HeroCard)
            │       │   │   └── HeroCard → [triggers HeroNavigation]
            │       │   ├── TournamentSnapshot
            │       │   │   └── BroadcasterBadge
            │       │   ├── RadarChart [SVG]
            │       │   ├── RecentForm
            │       │   ├── ClubDistribution
            │       │   ├── LeagueDistribution
            │       │   └── SquadMakeup
            │       │
            │       ├── SquadTab
            │       │   ├── SquadGrid
            │       │   │   └── n× PlayerRow
            │       │   │       └── 4× PlayerCard [desktop] / 2× [mobile]
            │       │   ├── ProfilePanel [singleton, one exists in DOM]
            │       │   │   ├── PlayerPhoto
            │       │   │   ├── PlayerDetails
            │       │   │   ├── RankingBreakdown
            │       │   │   ├── Biography
            │       │   │   └── SimilarPlayers
            │       │   └── ReservesSection [collapsed by default]
            │       │       └── ReservesGrid → same PlayerRow / PlayerCard pattern
            │       │
            │       ├── FixturesTab
            │       │   ├── GroupTable
            │       │   ├── UpcomingFixtures (n× FixtureCard)
            │       │   ├── CompletedFixtures (n× ResultCard)
            │       │   └── QualificationStatus
            │       │
            │       └── StatisticsTab
            │           ├── ValueBreakdownChart [SVG bar]
            │           ├── PositionBreakdownChart [SVG donut or bar]
            │           ├── ClubRepresentationList
            │           ├── LeagueRepresentationList
            │           ├── AgeDistributionChart [SVG bar]
            │           └── ExperienceDistributionChart [SVG bar]
            │
            ├── TournamentCentreModule
            │   ├── TournamentTabBar [Today|Groups|Knockout]
            │   ├── TodaysMatchesSection
            │   │   ├── n× MatchCard [or EmptyState]
            │   │   └── EmptyState → NextMatchdayInfo
            │   ├── GroupStageSection
            │   │   ├── CarouselArrow [left]
            │   │   ├── GroupCarousel [scroll-snap container]
            │   │   │   └── 12× GroupCard
            │   │   │       ├── GroupHeader
            │   │   │       ├── StandingsTable
            │   │   │       ├── UpcomingFixtures
            │   │   │       └── QualificationIndicators
            │   │   └── CarouselArrow [right]
            │   └── KnockoutSection
            │       ├── [desktop] KnockoutBracket
            │       │   └── per round: RoundColumn → n× KnockoutMatchCard
            │       └── [mobile] RoundCarousel
            │           └── n× RoundCard → n× KnockoutMatchCard
            │
            ├── CompareModule
            │   ├── TeamSelector A
            │   ├── TeamSelector B
            │   ├── ComparisonStats (ranking, age, value, WCs won)
            │   ├── TopPlayersComparison
            │   └── RadarChart [SVG, two overlaid polygons]
            │
            ├── StatsDashboardModule
            │   ├── SectionTabs [Squads|Players|Clubs|Leagues]
            │   ├── MostValuableXI
            │   ├── MostExperiencedXI
            │   ├── YoungestXI
            │   ├── ClubStatsList
            │   └── LeagueStatsList
            │
            ├── ClubExplorerModule
            │   ├── ClubSearchInput
            │   ├── ClubList → ClubCard
            │   └── ClubDetailView
            │       ├── ClubSummary (player count, countries, MVP)
            │       └── n× CountryGroup → n× PlayerMiniCard
            │
            ├── LeagueExplorerModule
            │   ├── LeagueSearchInput
            │   ├── LeagueList → LeagueCard
            │   └── LeagueDetailView
            │       ├── LeagueSummary
            │       └── PlayerListing
            │
            ├── CountriesModule
            │   └── n× CountryCard → links to team pages
            │
            ├── GroupsModule
            │   └── 12× GroupSummaryCard
            │
            └── ContinentsModule
                └── 6× ContinentSection → n× CountryCard
```

---

# 4. DATA FLOW DIAGRAM

```
                        ┌──────────────┐
                        │  DataManager │
                        │  (data.js)   │
                        └──────┬───────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
         Fetch JSON      Memory cache      Fallback to
         on demand       (Map<id, data>)   cached on fail
              │
              ├── countries.json    → getCountry(id), getAllCountries()
              ├── players/{id}.json → getPlayersForTeam(countryId)
              ├── groups.json       → getGroup(id), getAllGroups()
              ├── fixtures.json     → getFixturesForTeam(id), getTodaysFixtures()
              ├── standings.json    → getStandingsForGroup(id)
              ├── clubs.json        → getClub(id), getAllClubs()
              ├── leagues.json      → getLeague(id), getAllLeagues()
              ├── rankings.json     → getRanking(playerId)
              └── knockout.json     → getAllKnockoutMatches()

                               │
                               ▼
                        ┌──────────────┐
                        │    Router    │
                        │  (router.js) │
                        └──────┬───────┘
                               │
                    parses window.location.hash
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
         teardown()      module factory    mount into
         current module   (new Module(     #app-content
                           data, el))
                               │
                               ▼
                        ┌──────────────┐
                        │    Module    │
                        │  render()    │
                        │  init()      │
                        │  teardown()  │
                        └──────────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
              DataManager           User Interactions
              .get*(...)             → router.navigate()
                                     → module.handleXxx()
```

## Search data flow

```
User types in #search-input
        │
        ▼ (debounced, 50ms)
  search.query(term)
        │
        ▼
  fuzzy match against SearchIndex
        │
  SearchIndex built from:
  ├── countries.json (name, manager)
  ├── clubs.json (name)
  ├── leagues.json (name)
  └── all players/*.json (name, club, country)
        │
        ▼
  results grouped by category
        │
        ▼
  SearchOverlay.render(results)
        │
  user selects result
        │
        ▼
  router.navigate(result.hash)
```

## Auto-Focus data flow

```
SquadTab.init()
        │
        ▼
  build PlayerRow elements
  for each row: observe with IntersectionObserver
        │
        ▼
  IntersectionObserver callback fires
        │
  most-visible row determined
        │
        ├── if row changed:
        │   ├── deactivate previous row (remove .row--active)
        │   ├── ProfilePanel.update(activePlayer in new row)
        │   └── activate new row (add .row--active)
        │
        └── if same row:
            └── no-op (or player selection update if card clicked)
```

---

# 5. ROUTING MAP

## Router module contract

```javascript
// router.js
export class Router {
  constructor(routes, contentEl) {}
  navigate(hash) {}         // programmatic navigation
  init() {}                 // sets up hashchange listener
  getCurrentRoute() {}      // returns parsed route object
}
```

## Route resolution logic

```
hash → parser → { type, params }

'#france'              → { type: 'team', countryId: 'france' }
'#france-mbappe'       → { type: 'player', countryId: 'france', playerId: 'mbappe' }
'#club-real-madrid'    → { type: 'club', clubId: 'real-madrid' }
'#league-premier-league' → { type: 'league', leagueId: 'premier-league' }
'#tournament'          → { type: 'tournament' }
'#compare'             → { type: 'compare' }
'#statistics'          → { type: 'statistics' }
'#club-explorer'       → { type: 'clubExplorer' }
'#league-explorer'     → { type: 'leagueExplorer' }
'#countries'           → { type: 'countries' }
'#groups'              → { type: 'groups' }
'#continents'          → { type: 'continents' }
```

## Parser edge cases

- `#france-mbappe`: distinguish player routes from team routes
  Rule: if slug contains a country ID prefix followed by `-`, treat as player route.
  Implementation: check `slug.startsWith(countryId + '-')` for all 48 country IDs.

- Unknown hash: render 404/fallback state in content area.

## Module lifecycle

Each module exports a class with this interface:

```javascript
export class SomeModule {
  constructor(container, data, params) {}
  async render() {}   // fetch data, build DOM, insert into container
  init() {}           // attach observers, event listeners
  teardown() {}       // remove observers, clear timers, free resources
}
```

Router calls `teardown()` before unmounting, then instantiates the new module.

---

# 6. RENDERING STRATEGY

## Principle

Only the active module renders. No hidden modules remain in the DOM.
All rendering is explicit DOM construction (no innerHTML blobs for data — use
DOM API or safe template strings with escaped values).

## Template pattern

Use tagged template literals for safe HTML generation:

```javascript
// utils.js
export function html(strings, ...values) {
  return strings.reduce((acc, str, i) => {
    const val = values[i - 1];
    return acc + escapeHtml(String(val ?? '')) + str;
  });
}

// Usage:
const card = html`<div class="player-card">
  <span class="player-name">${player.name}</span>
</div>`;
```

Data values are always escaped. HTML structure is safe static strings.

## Rendering sequence for team page

1. Router resolves `#france` → `{ type: 'team', countryId: 'france' }`
2. Router tears down previous module
3. Router mounts `TeamPageModule` into `#app-content`
4. `TeamPageModule.render()`:
   a. `await DataManager.getCountry('france')`
   b. Render team header (immediate — no image dependency)
   c. Render tab bar (Overview selected by default)
   d. `await OverviewTab.render(country)`
      i. Render tournament snapshot from standings
      ii. Render hero cards (photos lazy loaded)
      iii. Render radar chart (SVG, immediate)
      iv. Render distributions and makeup
5. `TeamPageModule.init()`: attach tab click handlers

## Lazy image rendering

All `<img>` elements use `loading="lazy"` and an `onerror` fallback:

```javascript
function playerPhotoEl(player) {
  const img = document.createElement('img');
  img.src = player.photo || '';
  img.alt = player.name;
  img.loading = 'lazy';
  img.className = 'player-photo';
  img.onerror = () => {
    img.src = 'assets/placeholders/player-avatar.svg';
    img.onerror = null; // prevent infinite loop
  };
  return img;
}
```

---

# 7. STATE MANAGEMENT STRATEGY

## State overview

This application has no global state store. State lives in three places:

| State type             | Lives in                          |
|------------------------|-----------------------------------|
| Theme preference       | localStorage + `data-theme` attr  |
| Data cache             | DataManager Map (in memory)       |
| Active module state    | Module instance properties        |
| URL / navigation state | `window.location.hash`            |
| Search query           | Search module instance            |
| Auto-Focus row state   | SquadTab instance                 |

## Theme state

```javascript
// theme.js
const STORAGE_KEY = 'wc2026-theme';

export function getTheme() {
  return localStorage.getItem(STORAGE_KEY) || 'dark';
}
export function setTheme(theme) {
  localStorage.setItem(STORAGE_KEY, theme);
  document.documentElement.setAttribute('data-theme', theme);
}
export function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}
```

Theme is applied via CSS custom properties scoped to `[data-theme="dark"]` and
`[data-theme="light"]`. No class toggling. One attribute swap = instant theme change.

## Data cache state

```javascript
// data.js
const cache = new Map(); // key: 'players-france', value: Array<Player>

async function load(key, url) {
  if (cache.has(key)) return cache.get(key);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}`);
  const data = await response.json();
  cache.set(key, data);
  return data;
}
```

Entries are never evicted during a session (data is small enough to hold in memory).

## Squad tab state

The SquadTab module is the most stateful module. It tracks:

```javascript
class SquadTab {
  #activeRowIndex = 0;          // which row is currently in focus
  #rowSelections = new Map();   // rowIndex → playerId (last selected in each row)
  #observer = null;             // IntersectionObserver instance
  #profilePanel = null;         // ProfilePanel singleton reference
}
```

These are instance properties. They are destroyed when `teardown()` is called.
If the user returns to the Squad tab (e.g., from a Hero Card click), the module
re-instantiates and `#rowSelections` starts fresh. This is acceptable per spec.

## Hero Player Navigation state

When a Hero Card is clicked:

1. `OverviewTab` calls `TeamPageModule.activateSquadTab(playerId)`
2. `TeamPageModule` switches tab to Squad
3. `SquadTab.focusPlayer(playerId)` is called
4. `SquadTab` scrolls to the player card and opens the profile panel

This is the only cross-module communication pattern in the application.
It is handled via direct method calls between co-located module instances.

---

# 8. CACHING STRATEGY

## Data cache

| Layer           | Mechanism                              | Duration       |
|-----------------|----------------------------------------|----------------|
| In-memory       | DataManager Map                        | Session only   |
| Browser cache   | HTTP `Cache-Control` headers           | Configurable   |
| Offline fallback| Cached response from prior fetch       | Until session end |

During a session:
- First request fetches from network
- Subsequent requests served from Map cache (< 1ms)
- If network fails: Map cache used if available; error state if not

Recommendation for hosting: serve JSON files with `Cache-Control: max-age=3600`
during the tournament (data may update daily) and `max-age=86400` for static assets.

## Image cache

Browser handles image caching natively via HTTP cache headers.
Player photos and club badges should be served with `Cache-Control: max-age=604800`
(one week) as they change rarely.

## Search index cache

The search index is built once per session from all loaded data.
It is rebuilt only if new data is loaded (e.g., a new team's players are fetched).

---

# 9. PERFORMANCE STRATEGY

## Initial load targets

| Target                    | Strategy                                    |
|---------------------------|---------------------------------------------|
| < 3s to interactive       | No blocking scripts. CSS loads first.       |
| < 250ms team page switch  | Data cached. Only content area re-renders.  |
| < 100ms search results    | In-memory index. Debounced 50ms.            |
| < 100ms theme switch      | Single attribute change on `<html>`.        |
| 60fps scrolling           | No layout thrashing in scroll handlers.     |

## Key optimisations

### Avoid rendering all teams simultaneously
Router renders one team at a time. No hidden teams in the DOM.

### Per-team player files
`data/players/france.json` fetched only when France page opens.
48 × ~26KB = ~1.25MB if all loaded. Per-team fetching limits to ~26KB per navigation.

### Deferred non-critical data
Statistics tab data loaded when Statistics tab is first activated, not on team page load.

### IntersectionObserver over scroll events
The Auto-Focus System uses IntersectionObserver exclusively. No scroll event listeners
means no forced layouts on scroll.

### CSS scroll-snap for Group Stage
Native CSS scroll-snap is GPU-accelerated. No JavaScript scroll handling required.
JavaScript only reads `scrollLeft` to update arrow state and ARIA labels.

### `content-visibility: auto` on off-screen sections
Large scrollable areas (full squad grid) can use `content-visibility: auto` to defer
rendering of off-screen content, reducing paint time.

### Image lazy loading
All images use `loading="lazy"`. Only images in (or near) the viewport are decoded.

### Debounced search
Search query handler debounced to 50ms. Prevents index queries on every keystroke.

---

# 10. ACCESSIBILITY STRATEGY

## Keyboard navigation

| Element                 | Keyboard behaviour                          |
|-------------------------|---------------------------------------------|
| Sidebar nav links       | Tab to focus, Enter to navigate             |
| Tab bar                 | Arrow keys to move between tabs             |
| Player cards            | Tab to focus, Enter/Space to select         |
| Search input            | Type to search, Arrow keys in results, Enter to select |
| Group carousel arrows   | Tab to focus, Enter/Space to activate       |
| Theme toggle            | Tab to focus, Enter/Space to toggle         |
| Drawer toggle           | Tab to focus, Enter/Space to open/close     |
| Reserves toggle         | Tab to focus, Enter/Space to expand/collapse|
| Profile panel           | Focus moves into panel when opened          |

## Focus management

- When squad tab activates via Hero Navigation: focus moves to the targeted player card.
- When search result is selected: focus moves to the new page's heading.
- When tab is switched: focus moves to the active tab button.
- When drawer opens: focus trapped inside drawer. Returns to trigger on close.

## ARIA usage

```html
<!-- Tab bar -->
<div role="tablist">
  <button role="tab" aria-selected="true" aria-controls="overview-panel">Overview</button>
  <button role="tab" aria-selected="false" aria-controls="squad-panel">Squad</button>
</div>
<div id="overview-panel" role="tabpanel">...</div>

<!-- Group carousel -->
<div role="region" aria-label="Group Stage">
  <button aria-label="Previous group">◀</button>
  <div class="carousel" aria-live="polite" aria-atomic="true">
    <!-- current group card -->
  </div>
  <button aria-label="Next group">▶</button>
</div>

<!-- Squad profile panel -->
<aside aria-label="Player Profile" aria-live="polite">
  <!-- updates when active player changes -->
</aside>

<!-- Reserves section -->
<section>
  <button aria-expanded="false" aria-controls="reserves-grid">
    Reserves (12)
  </button>
  <div id="reserves-grid" hidden>...</div>
</section>
```

## Colour contrast

- All text meets WCAG AA (4.5:1 for normal text, 3:1 for large text)
- Status indicators (qualified/possible/eliminated) use colour AND icon/text label
- Focus rings use `outline: 2px solid var(--color-accent)` — visible in both themes
- Links and interactive elements use underline or icon in addition to colour

## Screen reader support

- `aria-live="polite"` on `#app-content` to announce page changes
- `aria-live="polite"` on profile panel to announce player changes
- `aria-label` on all icon-only buttons
- `alt` text on all images (player name for photos, club name for badges)
- `<nav>` landmarks for sidebar, drawer, breadcrumb
- `<main>` landmark for content area
- `<header>` landmark for app header

---

# 11. AUTO-FOCUS SQUAD SYSTEM — DETAILED IMPLEMENTATION

This is the most complex feature. Full specification:

## DOM structure

```html
<div class="squad-grid" id="squad-grid">
  <div class="player-row" data-row="0">
    <div class="player-card" data-player-id="france-maignan" tabindex="0">...</div>
    <div class="player-card" data-player-id="france-saliba"  tabindex="0">...</div>
    <div class="player-card" data-player-id="france-upamecano" tabindex="0">...</div>
    <div class="player-card" data-player-id="france-hernandez" tabindex="0">...</div>
  </div>
  <div class="player-row" data-row="1">...</div>
  <!-- n rows total -->
</div>

<!-- Singleton: exists once in DOM for this squad tab instance -->
<aside class="profile-panel" id="profile-panel" aria-live="polite" aria-label="Player Profile">
  <!-- Rendered by ProfilePanel class -->
</aside>
```

## IntersectionObserver setup

```javascript
// squad-tab.js (pseudocode)
const observer = new IntersectionObserver(
  (entries) => {
    // Find the entry with highest intersection ratio
    const mostVisible = entries
      .filter(e => e.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (mostVisible) {
      const row = mostVisible.target;
      const rowIndex = parseInt(row.dataset.row);
      if (rowIndex !== this.#activeRowIndex) {
        this.#deactivateRow(this.#activeRowIndex);
        this.#activateRow(rowIndex);
      }
    }
  },
  {
    root: null,               // viewport
    rootMargin: '-30% 0px',   // trigger when row enters middle 40% of viewport
    threshold: [0, 0.25, 0.5, 0.75, 1.0]
  }
);

// Observe each row
this.#rows.forEach(row => observer.observe(row));
```

## Row activation

```javascript
#activateRow(rowIndex) {
  this.#activeRowIndex = rowIndex;
  const row = this.#rows[rowIndex];
  row.classList.add('row--active');

  // Restore last selected player in this row, or default to first
  const savedPlayerId = this.#rowSelections.get(rowIndex);
  const playerId = savedPlayerId || row.querySelector('.player-card').dataset.playerId;

  this.#showProfile(playerId);
}

#deactivateRow(rowIndex) {
  if (rowIndex < 0 || rowIndex >= this.#rows.length) return;
  const row = this.#rows[rowIndex];
  row.classList.remove('row--active');
}
```

## Player card selection

```javascript
// Player card click handler
row.addEventListener('click', (e) => {
  const card = e.target.closest('.player-card');
  if (!card) return;
  const playerId = card.dataset.playerId;
  this.#rowSelections.set(rowIndex, playerId);
  this.#showProfile(playerId);
});
```

## Profile panel update

```javascript
async #showProfile(playerId) {
  const player = await DataManager.getPlayer(playerId);
  const ranking = await DataManager.getRanking(playerId);
  const bio = BioEngine.getBio(player); // uses stored bio or generates
  const similarPlayers = await DataManager.getPlayers(player.similarPlayerIds);

  this.#profilePanel.render({
    player,
    ranking,
    bio,
    similarPlayers
  });
}
```

## Hero Player Navigation implementation

```javascript
// Called by TeamPageModule when hero card is clicked
async focusPlayer(playerId) {
  // 1. Find which row contains this player
  const rowIndex = this.#findRowForPlayer(playerId);

  // 2. Scroll row into view
  const row = this.#rows[rowIndex];
  row.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // 3. Wait for scroll to complete, then activate
  await this.#waitForScrollEnd();

  // 4. Activate row and show player profile
  this.#deactivateRow(this.#activeRowIndex);
  this.#rowSelections.set(rowIndex, playerId);
  this.#activateRow(rowIndex);

  // 5. Focus the player card for keyboard users
  const card = row.querySelector(`[data-player-id="${playerId}"]`);
  card?.focus();
}
```

---

# 12. GROUP STAGE CAROUSEL — DETAILED IMPLEMENTATION

## DOM structure

```html
<section class="group-stage" aria-label="Group Stage">
  <button class="carousel-arrow carousel-arrow--prev"
          aria-label="Previous group"
          id="group-prev">◀</button>

  <div class="group-carousel"
       id="group-carousel"
       role="region"
       aria-label="Group standings carousel">
    <!-- 12 group cards, one per group A–L -->
    <article class="group-card" data-group="A" aria-label="Group A">
      <h2 class="group-card__title">Group A</h2>
      <table class="standings-table">...</table>
      <div class="group-card__fixtures">...</div>
      <div class="group-card__qualification">...</div>
    </article>
    <!-- ... -->
  </div>

  <button class="carousel-arrow carousel-arrow--next"
          aria-label="Next group"
          id="group-next">▶</button>
</section>
```

## CSS scroll-snap

```css
.group-carousel {
  display: flex;
  overflow-x: scroll;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  gap: var(--space-4);
}

.group-card {
  scroll-snap-align: center;
  flex: 0 0 min(600px, 90vw); /* never too wide on small screens */
}
```

`scroll-snap-type: x mandatory` with `scroll-snap-align: center` ensures exactly one
card is in focus at all times. No partial resting positions possible.

## Arrow navigation

```javascript
// Programmatic navigation snaps to next/prev card
function navigateCarousel(direction) {
  const carousel = document.getElementById('group-carousel');
  const cards = carousel.querySelectorAll('.group-card');
  const cardWidth = cards[0].offsetWidth + GAP;

  // Calculate current index from scrollLeft
  const currentIndex = Math.round(carousel.scrollLeft / cardWidth);
  const targetIndex = Math.max(0, Math.min(cards.length - 1, currentIndex + direction));

  carousel.scrollTo({
    left: targetIndex * cardWidth,
    behavior: 'smooth'
  });
}
```

## Drag support

Drag scrolling uses pointer events (works for mouse and touch):

```javascript
function initDragScroll(carousel) {
  let isDown = false;
  let startX;
  let scrollLeft;

  carousel.addEventListener('pointerdown', (e) => {
    isDown = true;
    carousel.setPointerCapture(e.pointerId);
    startX = e.pageX - carousel.offsetLeft;
    scrollLeft = carousel.scrollLeft;
  });

  carousel.addEventListener('pointermove', (e) => {
    if (!isDown) return;
    const x = e.pageX - carousel.offsetLeft;
    const walk = (x - startX) * 1.5; // scroll speed multiplier
    carousel.scrollLeft = scrollLeft - walk;
  });

  carousel.addEventListener('pointerup', () => { isDown = false; });
  carousel.addEventListener('pointercancel', () => { isDown = false; });
}
```

CSS scroll-snap handles the final resting position after pointer release.

## Mouse-wheel support

```javascript
carousel.addEventListener('wheel', (e) => {
  if (e.deltaY !== 0 && e.deltaX === 0) {
    e.preventDefault();
    carousel.scrollLeft += e.deltaY;
  }
}, { passive: false });
```

This redirects vertical wheel to horizontal scroll. CSS scroll-snap handles snap.

---

# 13. BIO TEMPLATE ENGINE — DETAILED IMPLEMENTATION

```javascript
// bio.js

const POSITION_TEMPLATES = {
  GK: (p) => [
    `${p.name} is a goalkeeper for ${resolveClub(p.clubId)} and ${resolveCountry(p.countryId)}.`,
    p.caps > 0 ? `He has earned ${p.caps} international caps${p.goals > 0 ? ` and scored ${p.goals} goal${p.goals > 1 ? 's' : ''} for his country` : ''}.` : null,
    `One of the most dependable shot-stoppers at the tournament.`
  ],
  DF: (p) => [
    `${p.name} is a defender for ${resolveClub(p.clubId)}, representing ${resolveCountry(p.countryId)} at their ${ordinal(p.worldCupCount || 1)} World Cup.`,
    p.caps > 0 ? `A reliable presence with ${p.caps} caps to his name.` : null,
    null
  ],
  MF: (p) => [
    `${p.name} is a midfielder for ${resolveClub(p.clubId)} and a key figure in ${resolveCountry(p.countryId)}'s setup.`,
    p.caps > 0 ? `He brings ${p.caps} caps of international experience to the squad.` : null,
    null
  ],
  FW: (p) => [
    `${p.name} is a forward for ${resolveClub(p.clubId)}, representing ${resolveCountry(p.countryId)}.`,
    p.goals > 0 && p.caps > 0 ? `He has scored ${p.goals} goals in ${p.caps} international appearances.` : null,
    null
  ]
};

export function getBio(player, clubs, countries) {
  if (player.bio) return player.bio; // curated override wins

  const posKey = player.position; // 'GK' | 'DF' | 'MF' | 'FW'
  const template = POSITION_TEMPLATES[posKey] || POSITION_TEMPLATES['MID'];
  const sentences = template(player).filter(Boolean);
  return sentences.join(' ');
}
```

Key properties:
- Stored `bio` always takes priority
- Templates are position-aware
- All conditional clauses handle missing data gracefully
- Generated bios read as 2–3 natural sentences

---

# 14. SVG RADAR CHART — DETAILED IMPLEMENTATION

```javascript
// radar.js

const DIMENSIONS = ['attack', 'midfield', 'defence', 'goalkeeping', 'depth'];
const LABELS = ['Attack', 'Midfield', 'Defence', 'GK', 'Depth'];

export function renderRadar(container, datasets) {
  // datasets: Array<{ label, color, values: { attack, midfield, ... } }>

  const SIZE = 200;
  const CENTER = SIZE / 2;
  const RADIUS = 80;
  const AXES = DIMENSIONS.length;
  const ANGLE_STEP = (2 * Math.PI) / AXES;

  // Calculate point position for axis i at value (0–100)
  function point(i, value) {
    const angle = i * ANGLE_STEP - Math.PI / 2;
    const r = (value / 100) * RADIUS;
    return {
      x: CENTER + r * Math.cos(angle),
      y: CENTER + r * Math.sin(angle)
    };
  }

  // Build SVG string
  let svg = `<svg viewBox="0 0 ${SIZE} ${SIZE}" role="img" aria-label="Team strength radar">`;

  // Grid lines (3 rings at 33%, 66%, 100%)
  [0.33, 0.66, 1.0].forEach(factor => {
    const pts = DIMENSIONS.map((_, i) => {
      const p = point(i, 100 * factor);
      return `${p.x},${p.y}`;
    }).join(' ');
    svg += `<polygon points="${pts}" class="radar-grid" />`;
  });

  // Axis lines
  DIMENSIONS.forEach((_, i) => {
    const p = point(i, 100);
    svg += `<line x1="${CENTER}" y1="${CENTER}" x2="${p.x}" y2="${p.y}" class="radar-axis" />`;
  });

  // Dataset polygons
  datasets.forEach(dataset => {
    const pts = DIMENSIONS.map((dim, i) => {
      const p = point(i, dataset.values[dim] ?? 0);
      return `${p.x},${p.y}`;
    }).join(' ');
    svg += `<polygon points="${pts}" class="radar-data" style="fill:${dataset.color};stroke:${dataset.color}" />`;
  });

  // Labels
  DIMENSIONS.forEach((_, i) => {
    const p = point(i, 115); // slightly outside the chart
    svg += `<text x="${p.x}" y="${p.y}" class="radar-label">${LABELS[i]}</text>`;
  });

  svg += '</svg>';
  container.innerHTML = svg;
}
```

Used for both single team radar (Overview tab) and comparison radar (Compare Teams, two polygons).

---

# 15. TESTING STRATEGY

## Acceptance criteria validation

Each AC (AC-001 through AC-084) maps to a manual test case.
All 84 acceptance criteria are tested before project is considered complete.

## Browser matrix

| Browser          | Priority |
|------------------|----------|
| Chrome (latest)  | P1       |
| Safari (latest)  | P1       |
| Firefox (latest) | P2       |
| Safari iOS       | P1       |
| Chrome Android   | P1       |

## Device matrix

| Device class     | Width range   | Priority |
|------------------|---------------|----------|
| Mobile portrait  | 320–480px     | P1       |
| Mobile landscape | 568–767px     | P2       |
| Tablet           | 768–1024px    | P1       |
| Desktop          | 1025–1440px   | P1       |
| Wide desktop     | 1440px+       | P2       |

## Critical paths to test for each sprint

### Sprint 1 (Foundation)
- App loads without errors
- Navigation links route correctly
- Theme toggle persists to localStorage
- Drawer opens/closes on mobile
- Breadcrumb updates on navigation

### Sprint 3 (Team Pages)
- Hero card click → squad tab → player focused → profile open (Hero Navigation, AC-013)
- Auto-Focus: scroll triggers row change → profile updates (AC-019, AC-020)
- Row selection persists per row (AC-021)
- Reserves collapsed by default, expand on click (AC-023)
- 4 cards per row desktop, 2 mobile (AC-014, AC-015)

### Sprint 4 (Tournament Centre)
- Group carousel: drag scrolls (AC-030), wheel scrolls (AC-031), arrows navigate (AC-032)
- Scroll snap: no partial resting (AC-034, AC-035)
- Knockout bracket: full view desktop (AC-040), horizontal mobile (AC-041)
- Today's matches empty state shows correctly

### Sprint 5 (Search)
- "mbape" returns Mbappe (AC-025)
- player:Mbappe filters to players only (AC-026)
- Selecting result navigates (AC-027)

### Sprint 7 (Polish)
- All images have alt text (AC-073)
- Focus states visible on Tab navigation (AC-072)
- Colour alone is never the sole status indicator (AC-074)
- Player photos lazy loaded — network waterfall confirms (AC-067)

---

# 16. ACCEPTANCE STRATEGY

## AC coverage map

All 84 acceptance criteria from 07_ACCEPTANCE_CRITERIA.md are covered by this blueprint.
The table below shows where each group of ACs is satisfied.

| AC Range | Topic                  | Sprint | Module                    |
|----------|------------------------|--------|---------------------------|
| 001–005  | Global                 | 1      | router.js, theme.js       |
| 006–008  | Navigation             | 1      | app.js (shell)            |
| 009–012  | Team Page header/hero  | 3      | team-page.js, overview-tab.js |
| 013      | Hero navigation        | 3      | squad-tab.js (focusPlayer)|
| 014–023  | Squad tab              | 3      | squad-tab.js              |
| 024–027  | Search                 | 5      | search.js                 |
| 028–029  | Tournament Centre      | 4      | tournament.js             |
| 030–039  | Group Stage            | 4      | group-stage.js            |
| 040–045  | Knockout               | 4      | knockout.js               |
| 046–051  | Time / Broadcaster     | 2,4    | time.js, tournament.js    |
| 052–058  | Statistics             | 6      | stats-dashboard.js        |
| 059–061  | Compare                | 6      | compare.js                |
| 062–064  | Club Explorer          | 6      | club-explorer.js          |
| 065–066  | League Explorer        | 6      | league-explorer.js        |
| 067–070  | Performance            | 7      | all modules               |
| 071–074  | Accessibility          | 7      | all modules               |
| 075–078  | Mobile                 | 1,7    | layout.css, all modules   |
| 079–084  | Data                   | 2      | data.js, all modules      |

---

End of IMPLEMENTATION_BLUEPRINT.md
