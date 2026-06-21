# PROJECT_ANALYSIS.md

Version: 1.0
Status: Planning Document — Phase 1
Purpose: Complete mental model of the World Cup 2026 Squad Explorer application

---

# 1. PRODUCT SUMMARY

## What it is

The World Cup 2026 Squad Explorer is a static, client-side football intelligence platform
covering all 48 FIFA World Cup 2026 teams, their squads, tournament progress, and associated
club and league data. It is the definitive reference tool for the 2026 tournament — combining
encyclopedia depth with a premium sports-dashboard experience.

## What it is not

It is not a news site, betting platform, fantasy game, or social network.
It is a read-only data exploration tool.

## Core experience

A user arrives at the application and can:

- Navigate to any of the 48 national teams and explore their squad, stats, and fixtures
- Browse the live tournament standings and knockout bracket
- Search across all players, teams, clubs, leagues, and managers instantly
- Compare two teams side-by-side with radar visualisations
- Explore the club and league ecosystems feeding the tournament

## Tournament context

FIFA World Cup 2026 is co-hosted by the United States, Canada, and Mexico.
It is the first 48-team World Cup.

- 48 teams
- 12 groups (A through L), 4 teams per group
- 72 group stage fixtures (12 groups × 6 matches)
- 32 knockout fixtures (Round of 32 × 16 + Round of 16 × 8 + QF × 4 + SF × 2 + 3rd Place + Final)
- 104 total fixtures

---

# 2. ARCHITECTURE SUMMARY

## Technology stack

| Layer          | Technology                              |
|----------------|------------------------------------------|
| Markup         | Semantic HTML5                          |
| Styling        | CSS (Custom Properties, Flexbox, Grid)  |
| Logic          | Vanilla JavaScript, ES Modules          |
| Routing        | Client-side hash routing                |
| Data           | Local JSON files, fetched on demand     |
| Charts         | SVG (custom, no library)                |
| Search         | Lightweight fuzzy matching (in-memory)  |
| Theme          | CSS Custom Properties + localStorage    |
| Scroll         | CSS scroll-snap (native)                |
| Focus tracking | IntersectionObserver API (native)       |
| Images         | Lazy loading (native loading="lazy")    |
| Time           | Intl.DateTimeFormat (Europe/London)     |

## Application model

```
App Shell (always mounted)
├── Header
│   ├── Logo / App Title
│   ├── Global Search
│   └── Theme Toggle
├── Sidebar (desktop) / Drawer (mobile)
│   └── Navigation Sections
├── Router
│   └── resolves hash → renders module
└── Content Area
    └── active module renders here
```

The shell is mounted once. Only the Content Area re-renders on navigation.
No page reloads. No virtual DOM. Explicit DOM management per module.

## Rendering model

On navigation:
1. Router parses the hash
2. Router calls `teardown()` on the current module
3. Router instantiates the new module
4. Module fetches required data (cached after first load)
5. Module renders into the Content Area
6. Module calls its own `init()` (sets up observers, event listeners)

Only one module is active at any time.

## File organisation

```
worldcup2026/
├── index.html
├── styles/
│   ├── base.css          (reset, custom properties, tokens)
│   ├── layout.css        (shell, sidebar, header, content area)
│   ├── components.css    (cards, tables, badges, buttons)
│   ├── modules/
│   │   ├── team-page.css
│   │   ├── squad.css
│   │   ├── tournament.css
│   │   ├── search.css
│   │   └── compare.css
│   └── utilities.css     (spacing, typography, responsive)
├── js/
│   ├── app.js            (entry point, bootstraps shell)
│   ├── router.js         (hash routing, module lifecycle)
│   ├── data.js           (data loader, cache manager)
│   ├── search.js         (search index, fuzzy matching)
│   ├── theme.js          (theme engine, persistence)
│   ├── time.js           (UTC → Europe/London conversion)
│   ├── bio.js            (bio template engine)
│   ├── utils.js          (shared utilities)
│   └── modules/
│       ├── home.js
│       ├── team-page.js
│       ├── squad-tab.js      (Auto-Focus System lives here)
│       ├── overview-tab.js
│       ├── fixtures-tab.js
│       ├── statistics-tab.js
│       ├── tournament.js
│       ├── group-stage.js    (Scroll-Snap System lives here)
│       ├── knockout.js
│       ├── compare.js
│       ├── stats-dashboard.js
│       ├── club-explorer.js
│       ├── league-explorer.js
│       └── countries.js
├── data/
│   ├── countries.json
│   ├── players.json
│   ├── groups.json
│   ├── fixtures.json
│   ├── standings.json
│   ├── clubs.json
│   ├── leagues.json
│   ├── rankings.json
│   └── knockout.json
└── assets/
    ├── flags/
    ├── badges/
    ├── logos/
    ├── icons/
    └── placeholders/
        ├── player-avatar.svg
        └── club-badge.svg
```

---

# 3. FEATURE INVENTORY

## F-001: Application Shell
- Persistent header with logo, search, and theme toggle
- Sidebar navigation (desktop) / drawer navigation (mobile)
- Hash-based routing with no page reloads
- Breadcrumb display across all pages
- Dark / Light theme engine with localStorage persistence

## F-002: Global Search
- Live search results as user types (target: < 100ms)
- Results grouped by category: Players, Countries, Clubs, Leagues, Managers
- Fuzzy matching (e.g. "mbape" → Mbappe)
- Filter prefix support: `player:`, `country:`, `club:`, `league:`
- Result selection navigates via hash router

## F-003: Team Explorer — all 48 teams
Each team page has four mandatory tabs:

### F-003a: Overview Tab
- Team Header (flag, name, FIFA ranking, manager, avg age, squad value, world cups won)
- Top 5 Hero Player Cards (auto-generated by consensus score)
- Tournament Snapshot (group, position, record, GD, next match, broadcaster)
- Team Strength Radar Chart (SVG, 5 dimensions)
- Recent Form display
- Club Distribution list
- League Distribution list
- Squad Makeup summary (positions, avg age, avg height, avg caps)

### F-003b: Squad Tab (core experience)
- Player grid (4 cols desktop / 2 cols mobile)
- Auto-Focus Squad System (IntersectionObserver row detection)
- Single Active Profile Panel
- Reserves section (collapsed by default)
- Player cards (photo, name, position, club badge, club name)

### F-003c: Fixtures Tab
- Group standings table
- Upcoming fixtures (opponent, date, time BST, broadcaster)
- Completed fixtures (opponent, result, status)
- Qualification status display

### F-003d: Statistics Tab
- Value breakdown chart
- Position breakdown chart
- Club representation
- League representation
- Age distribution
- Experience distribution

## F-004: Hero Player Navigation (core defining feature)
- Click hero card on Overview → switch to Squad tab → scroll to player → focus card → open profile panel
- Must be fully automatic — zero manual steps required from user

## F-005: Auto-Focus Squad System (core defining feature)
- IntersectionObserver tracks which player row is in viewport centre
- Active row: profile panel updates automatically
- Previous row: profile panel closes automatically
- Only one profile panel may exist in the DOM
- Selection per row persists when user returns to that row
- Works on desktop and mobile

## F-006: Tournament Centre (core defining feature)
- Three sections: Today's Matches, Group Stage, Knockout Stage
- Empty state when no matches today: "No matches scheduled today" + next matchday info

### F-006a: Today's Matches
- Match, time (BST), broadcaster, status for each match today
- Live / Scheduled / Finished states
- BBC / ITV / TBD broadcaster branding

### F-006b: Group Stage Carousel (core defining feature)
- 12 group cards (A–L) in horizontal scroll container
- CSS scroll-snap (mandatory, no partial resting positions)
- Drag scrolling (pointer events)
- Mouse-wheel horizontal scrolling
- Large left/right arrow navigation buttons
- Each card: standings, upcoming fixtures, qualification status (in that order)

### F-006c: Knockout Stage Bracket
- Desktop: full bracket visible (Round of 32 through Final)
- Mobile: horizontal round-by-round navigation with snap
- Match cards: teams, date, time, broadcaster, status
- Live / Scheduled / Finished states

## F-007: Compare Teams
- Team A selector + Team B selector
- Side-by-side: FIFA ranking, squad value, avg age, world cups won
- Top players comparison
- Radar chart comparison (same 5 dimensions)

## F-008: Statistics Dashboard
- Most Valuable XI
- Most Experienced XI
- Youngest XI
- Most Represented Clubs
- Most Represented Leagues
- Highest / Lowest Squad Values
- Sections: Squad Stats, Player Stats, Club Stats, League Stats

## F-009: Club Explorer
- List of all clubs represented at the tournament
- Per club: player count, countries represented, most valuable player
- Players grouped by country within club view
- Club search

## F-010: League Explorer
- List of all leagues represented
- Per league: player count, countries represented, teams represented
- Player listing
- League search

## F-011: Bio Template Engine
- If player `bio` field is populated: display it
- If `bio` is null/empty: generate from structured data
- Template is position-aware (GK, DEF, MID, FWD have different structures)
- Bio draws on: club, caps, goals, age, nationality, consensus ranking
- Allows curated overrides for star players

## F-012: Data Layer
- JSON files loaded on demand (not all upfront)
- In-memory cache with last-updated timestamp
- Graceful fallback to cache if fetch fails
- Graceful offline behaviour

## F-013: Image System
- Player photos: FIFA source → local cache → placeholder avatar (SVG)
- Club badges: SVG source → local cache → club initials
- Broken images never shown
- All images lazy loaded (loading="lazy")

## F-014: Accessibility
- Full keyboard navigation
- Visible focus states
- Semantic HTML throughout
- Alt text on all images
- Colour never sole status indicator
- ARIA attributes where necessary

## F-015: Responsive Layout
- Desktop: sidebar + main content, 4-column squad grid
- Tablet: adapted sidebar, 3-column squad grid
- Mobile: navigation drawer, 2-column squad grid, no feature removal

---

# 4. COMPONENT INVENTORY

## Shell Components

| Component       | Purpose                                      | File                  |
|-----------------|----------------------------------------------|-----------------------|
| AppShell        | Root container, mounts once                 | app.js                |
| Header          | Logo, search input, theme toggle            | app.js                |
| Sidebar         | Desktop navigation                          | app.js                |
| Drawer          | Mobile navigation overlay                   | app.js                |
| Breadcrumb      | Contextual location indicator               | app.js                |
| SearchOverlay   | Live search results overlay                 | search.js             |
| ThemeToggle     | Dark/Light mode button                      | theme.js              |

## Team Page Components

| Component          | Purpose                                       | File                 |
|--------------------|-----------------------------------------------|----------------------|
| TeamPage           | Root team page, manages tabs                  | team-page.js         |
| TeamHeader         | Flag, name, stats summary                     | team-page.js         |
| TabBar             | Overview/Squad/Fixtures/Statistics tabs       | team-page.js         |
| OverviewTab        | Overview content container                    | overview-tab.js      |
| HeroCard           | Single hero player card (5 per team)         | overview-tab.js      |
| TournamentSnapshot | Current group/position/next match            | overview-tab.js      |
| RadarChart         | SVG spider chart for team strength            | overview-tab.js      |
| RecentForm         | W/D/L bubble row                             | overview-tab.js      |
| ClubDistribution   | Club count list                               | overview-tab.js      |
| LeagueDistribution | League count list                             | overview-tab.js      |
| SquadMakeup        | Position counts, averages                     | overview-tab.js      |
| SquadTab           | Squad grid container with Auto-Focus         | squad-tab.js         |
| PlayerRow          | Row of 4 (desktop) / 2 (mobile) player cards| squad-tab.js         |
| PlayerCard         | Individual player card                        | squad-tab.js         |
| ProfilePanel       | Expanded player dossier (singleton)           | squad-tab.js         |
| RankingBreakdown   | 5-component ranking display                   | squad-tab.js         |
| SimilarPlayers     | Linked player references                      | squad-tab.js         |
| ReservesSection    | Collapsible reserves grid                     | squad-tab.js         |
| FixturesTab        | Fixtures content container                    | fixtures-tab.js      |
| GroupTable         | Standings table for this team's group        | fixtures-tab.js      |
| UpcomingFixtures   | Future matches list                           | fixtures-tab.js      |
| CompletedFixtures  | Past matches list                             | fixtures-tab.js      |
| QualificationStatus| Visual qualification indicator               | fixtures-tab.js      |
| StatisticsTab      | Statistics content container                  | statistics-tab.js    |

## Tournament Components

| Component          | Purpose                                        | File               |
|--------------------|------------------------------------------------|--------------------|
| TournamentCentre   | Root tournament page, manages sections        | tournament.js      |
| TodaysMatches      | Today's match cards                           | tournament.js      |
| MatchCard          | Single match display (scheduled/live/FT)      | tournament.js      |
| BroadcasterBadge   | BBC/ITV/TBD visual badge                      | tournament.js      |
| GroupStageCarousel | Horizontal snap scroll container (12 groups) | group-stage.js     |
| GroupCard          | Single group: standings + fixtures + status   | group-stage.js     |
| KnockoutBracket    | Full bracket (desktop) / round nav (mobile)  | knockout.js        |
| KnockoutMatchCard  | Match card in bracket context                 | knockout.js        |

## Analysis Components

| Component          | Purpose                                       | File                  |
|--------------------|-----------------------------------------------|-----------------------|
| CompareTeams       | Two-team selector and comparison display      | compare.js            |
| CompareRadar       | Overlaid radar chart for two teams            | compare.js            |
| StatsDashboard     | Global statistics hub                         | stats-dashboard.js    |
| MostValuableXI     | Auto-generated 11-player display              | stats-dashboard.js    |
| MostExperiencedXI  | Auto-generated 11-player display              | stats-dashboard.js    |
| YoungestXI         | Auto-generated 11-player display              | stats-dashboard.js    |
| ClubStatsList      | Most represented clubs ranking                | stats-dashboard.js    |
| LeagueStatsList    | Most represented leagues ranking              | stats-dashboard.js    |

## Football Database Components

| Component       | Purpose                                        | File                |
|-----------------|------------------------------------------------|---------------------|
| ClubExplorer    | Club search and listing                        | club-explorer.js    |
| ClubView        | Single club detail: players by country         | club-explorer.js    |
| LeagueExplorer  | League search and listing                      | league-explorer.js  |
| LeagueView      | Single league detail: player listing           | league-explorer.js  |

---

# 5. ROUTING INVENTORY

All routing is hash-based. No page reloads.

| Hash Route                  | Resolves To                                      |
|-----------------------------|--------------------------------------------------|
| `#` or `#home`              | Home / Landing (or redirect to #tournament)      |
| `#countries`                | Country list (Browse → Countries)                |
| `#groups`                   | Groups list (Browse → Groups)                    |
| `#continents`               | Continents view (Browse → Continents)            |
| `#tournament`               | Tournament Centre                                |
| `#compare`                  | Compare Teams                                    |
| `#statistics`               | Statistics Dashboard                             |
| `#club-explorer`            | Club Explorer                                    |
| `#league-explorer`          | League Explorer                                  |
| `#{countryId}`              | Team page, Overview tab (e.g. `#france`)         |
| `#{countryId}-{playerId}`   | Team page, Squad tab, player focused             |
| `#club-{clubId}`            | Club detail view                                 |
| `#league-{leagueId}`        | League detail view                               |

### Route parameter format

countryId: lowercase, hyphenated (e.g. `france`, `south-africa`, `united-states`)
playerId: lowercase, hyphenated (e.g. `mbappe`, `bellingham`, `van-dijk`)
clubId: lowercase, hyphenated (e.g. `real-madrid`, `manchester-city`)
leagueId: lowercase, hyphenated (e.g. `premier-league`, `la-liga`)

### Hero player deep link behaviour

When route is `#{countryId}-{playerId}`:
1. Router loads Team Page for countryId
2. Team Page activates Squad tab
3. Squad Tab scrolls to player with matching playerId
4. Player card is focused
5. Profile panel opens

This is the same behaviour triggered by clicking a Hero Card.

---

# 6. DATA INVENTORY

## JSON file overview

| File            | Records (est.)    | Loaded when                              |
|-----------------|-------------------|------------------------------------------|
| countries.json  | 48                | Team page, Compare, any country reference |
| players.json    | ~1,250+           | Squad tab, Search index, Statistics      |
| groups.json     | 12                | Tournament Centre, Group Stage           |
| fixtures.json   | ~72               | Team Fixtures tab, Tournament Centre     |
| standings.json  | 12                | Group cards, Fixtures tab                |
| clubs.json      | ~400              | Club Explorer, Search                    |
| leagues.json    | ~25               | League Explorer, Search                  |
| rankings.json   | ~1,250+           | Player profiles, Statistics              |
| knockout.json   | ~32               | Knockout Stage                           |

## Amended Country schema

```json
{
  "id": "france",
  "name": "France",
  "flag": "assets/flags/france.svg",
  "group": "I",
  "continent": "UEFA",
  "manager": "Didier Deschamps",
  "fifaRanking": 2,
  "worldCupsWon": 2,
  "averageAge": 27.4,
  "squadValue": 1310000000,
  "clubsRepresented": 18,
  "leaguesRepresented": 6,
  "youngestPlayerId": "player-id",
  "oldestPlayerId": "player-id",
  "mostValuablePlayerId": "player-id",
  "topPlayerIds": ["id1", "id2", "id3", "id4", "id5"],
  "recentForm": ["W", "W", "D", "W", "L"],
  "teamStrength": {
    "attack": 97,
    "midfield": 89,
    "defence": 85,
    "goalkeeping": 82,
    "depth": 90
  }
}
```

Note: `topPlayerIds` references player IDs. Resolved at runtime from players.json.
`youngestPlayerId`, `oldestPlayerId`, `mostValuablePlayerId` are optional references.

## Amended Player schema

```json
{
  "id": "france-mbappe",
  "name": "Kylian Mbappe",
  "countryId": "france",
  "group": "I",
  "continent": "UEFA",
  "position": "FWD",
  "positionFull": "Forward",
  "clubId": "real-madrid",
  "leagueId": "la-liga",
  "age": 27,
  "birthDate": "1998-12-20",
  "height": 1.78,
  "caps": 95,
  "goals": 51,
  "marketValue": 180000000,
  "shirtNumber": 10,
  "isOfficialSquad": true,
  "isReserve": false,
  "photo": "assets/players/france-mbappe.jpg",
  "bio": null,
  "rankings": {
    "consensus": 98.4,
    "transfermarkt": 99,
    "ea": 91,
    "awards": 97,
    "media": 99,
    "form": 95
  },
  "similarPlayerIds": ["england-bellingham", "brazil-vinicius"]
}
```

Note:
- `countryId`, `clubId`, `leagueId` are normalised references (not inline strings)
- `bio` is null → bio template engine generates from structured fields
- `bio` populated → display as-is (curated override)
- `similarPlayerIds` is precomputed (offline process)

## Club schema

```json
{
  "id": "real-madrid",
  "name": "Real Madrid",
  "league": "la-liga",
  "country": "Spain",
  "badge": "assets/badges/real-madrid.svg",
  "playerIds": ["france-mbappe", "brazil-vinicius"]
}
```

## League schema

```json
{
  "id": "la-liga",
  "name": "La Liga",
  "country": "Spain",
  "clubIds": ["real-madrid", "barcelona", "atletico-madrid"],
  "playerIds": ["france-mbappe", "brazil-vinicius"]
}
```

## Fixture schema (unchanged, clarified)

```json
{
  "id": "f-001",
  "stage": "group",
  "group": "I",
  "homeTeamId": "france",
  "awayTeamId": "iraq",
  "kickoffUtc": "2026-06-22T21:00:00Z",
  "venue": "MetLife Stadium, New Jersey",
  "broadcaster": "ITV",
  "status": "scheduled",
  "score": null
}
```

## Knockout schema

```json
{
  "id": "ko-001",
  "round": "round-of-32",
  "slot": 1,
  "homeTeamId": "france",
  "awayTeamId": "tbc",
  "kickoffUtc": "2026-07-04T20:00:00Z",
  "venue": "TBC",
  "broadcaster": "TBD",
  "status": "scheduled",
  "score": null
}
```

## Standings schema (unchanged, clarified)

```json
{
  "group": "I",
  "teams": [
    {
      "teamId": "france",
      "played": 1,
      "won": 1,
      "drawn": 0,
      "lost": 0,
      "goalsFor": 2,
      "goalsAgainst": 0,
      "goalDifference": 2,
      "points": 3,
      "qualificationStatus": "possible"
    }
  ]
}
```

---

# 7. RISKS

## R-001 — Data volume and accuracy [HIGH]
~1,250+ real players need accurate data: clubs, caps, goals, values, rankings.
Data sourcing is a separate workstream. Application must be designed to function with
partial data while remaining architecturally sound.

Mitigation: Schema normalisation, graceful fallbacks throughout, sample data for dev/test.

## R-002 — Player photo availability [HIGH]
No confirmed CDN or API for official FIFA player photos.
Placeholder system must be production-quality, not a development shortcut.

Mitigation: Three-tier fallback (FIFA → local cache → SVG avatar). SVG avatar must look
intentional and professional, not broken.

## R-003 — Auto-Focus System on mobile [MEDIUM]
IntersectionObserver behaves differently across mobile browsers, particularly regarding
scroll inertia and threshold crossing timing. The profile panel switching must feel
natural during fast scrolling.

Mitigation: Careful threshold tuning, debounced observer callbacks, testing on iOS Safari
and Android Chrome specifically.

## R-004 — Group Stage carousel on touch devices [MEDIUM]
CSS scroll-snap + drag scrolling + touch scrolling must coexist. Arrow navigation must
be accessible. Horizontal scroll-snap containers can have edge cases on iOS.

Mitigation: Test on real devices. Use `overscroll-behavior-x: contain` to prevent
propagation to body. Verify snap alignment on all viewport widths.

## R-005 — Ranking data sourcing [MEDIUM]
The consensus formula is defined but component scores (Transfermarkt, EA, Awards, Media,
Form) require external data sources that may change or be unavailable.

Mitigation: Rankings stored as separate data file (rankings.json). Schema supports partial
population (null components degrade gracefully to available components).

## R-006 — Performance with full dataset [MEDIUM]
Loading players.json with ~1,250 entries is a significant payload. Loading all at once on
app start would slow initial load.

Mitigation: Lazy-load players.json only when Squad tab is first accessed. Cache after load.
Consider splitting into per-country player files (players-france.json) for team-specific loads.

## R-007 — SVG radar chart correctness [LOW]
Custom SVG radar charts require trigonometric calculations for polygon vertices.
Must handle edge cases (all-zero values, unequal scales).

Mitigation: Well-tested utility function. Constrained value range (0–100). Graceful
fallback if values are missing.

## R-008 — Bio template quality [LOW]
Generated bios must read naturally across 1,250+ players with varied data completeness.
Templates must handle missing fields (no caps data, no goals data for defenders, etc.).

Mitigation: Position-aware templates with conditional clauses. Missing field handling
for each template variable. All generated bios reviewed against sample players.

## R-009 — Time zone edge cases [LOW]
Matches during BST/GMT transition periods must convert correctly.
Intl.DateTimeFormat with Europe/London handles this natively but must be tested.

Mitigation: Unit test timezone conversions against known fixture times.

## R-010 — Tournament data currency [LOW]
Fixtures, standings, and knockout data change daily during the tournament.
The application reads from static JSON files with no live data feed.

Mitigation: Manual update workflow. Data files designed for easy replacement.
Last-updated timestamp displayed where appropriate.

---

# 8. ASSUMPTIONS

## A-001
All JSON data files will be populated with accurate real-world data before the
application is considered production-ready.

## A-002
Application will be hosted as static files. No server-side rendering, API, or database.

## A-003
UK (Europe/London) time zone is the primary display timezone. All kickoff times shown in BST/GMT.

## A-004
Primary broadcasters are BBC and ITV. Other broadcasters stored as string; styling
applies to BBC and ITV specifically. All others displayed as plain text.

## A-005
FIFA World Cup 2026 contains exactly 48 teams in 12 groups (A–L) of 4 teams each.
This is the confirmed tournament format.

## A-006
Squad sizes are data-driven. No hardcoded minimum or maximum squad size.
The application renders however many players exist in the data.

## A-007
`similarPlayerIds` values are precomputed before deployment and stored in player records.
The application does not compute similarity at runtime.

## A-008
`teamStrength` values (attack, midfield, defence, goalkeeping, depth) are curated externally
and stored in countries.json. The application does not derive these from player data.

## A-009
The application does not require any user accounts, authentication, or personalisation.
No persistent user state beyond theme preference.

## A-010
"Today" is determined by the client's local clock converted to the UTC date.
No server-side date injection required.

## A-011
Player `bio` fields are optional. Null or empty bio triggers template-generated bio.
No player should ever display an empty biography section.

---

# 9. OPEN QUESTIONS

## OQ-001 — Players data file structure
Should players be in a single `players.json` (~1,250 records) or split into per-team files
(`players-france.json`, `players-brazil.json`, etc.)?

Single file: simpler, but large initial load if fetched eagerly.
Split files: better lazy loading (only load when team page is opened), but 48 fetch calls.

Recommendation: Split per team. Load on first team page open. Cache in DataManager.
Confirm before implementation.

## OQ-002 — Landing page
The spec defines four navigation areas but no explicit home/landing page content.
Should `#home` or `#` redirect to Tournament Centre (most timely content)?
Or is a purpose-built landing page required?

## OQ-003 — Hosting environment
Where will the application be hosted? This affects:
- Whether relative paths work correctly
- Whether a build step is needed for ES modules (CORS restrictions on file://)
- Cache-busting strategy for data file updates

## OQ-004 — Data update workflow
During the live tournament, standings and fixture results change daily.
What is the manual process for updating JSON files? Will this be done by you?
Should the application display a "Last updated: X" timestamp?

## OQ-005 — Knockout bracket during group stage
The knockout bracket page will initially have no confirmed teams (all TBC).
How should the bracket display before the knockout round begins?
Show empty slots with "TBC" or hide the bracket entirely?

Recommendation: Show the bracket with "TBC" placeholders in all slots. Provides
structural context even before teams are known.

## OQ-006 — Continent view content
The navigation includes "Continents" under Browse. The spec defines this as a
navigation entry but does not specify the content of this view.

Recommendation: Group the 48 teams by confederation (UEFA, CONMEBOL, CONCACAF,
CAF, AFC, OFC) with team counts and links to individual team pages.

## OQ-007 — Compare Teams — team selection mechanism
The spec says "User selects Team A and Team B. Results appear side-by-side."
How do users select teams? Dropdown? Search input? Grid picker?

Recommendation: Search-style autocomplete inputs for both Team A and Team B,
consistent with the global search aesthetic.

## OQ-008 — Statistics Dashboard XI display format
"Most Valuable XI", "Most Experienced XI", "Youngest XI" — how should a team of 11
be displayed? A pitch formation visual, a card grid, or a list?

Recommendation: A pitch-inspired visual (11 player cards positioned in a 4-4-2 or
adaptive formation) would feel premium. A grid fallback for mobile.

## OQ-009 — Groups Browse view
The "Groups" entry under Browse — what does this show?
Recommendation: The Group Stage carousel (same as Tournament Centre → Group Stage tab),
or a grid of all 12 group cards.

---

# 10. PROPOSED IMPLEMENTATION STRATEGY

## Guiding principles

1. Build vertically. Each sprint delivers working, usable functionality.
2. Build one team page completely before scaling to 48.
3. Core defining features are implemented with full fidelity — not simplified.
4. Performance is a first-class concern from Sprint 1, not a Sprint 7 afterthought.

## Phase sequence

### Sprint 1 — Foundation
Deliverables: App shell, header, sidebar, drawer, hash router, breadcrumbs, dark/light
theme with persistence, responsive grid, placeholder content areas.
Gate: User can open app, navigate all sections, switch themes, resize to mobile.

### Sprint 2 — Data Layer
Deliverables: DataManager module, all JSON schemas defined, sample data for 3–5 teams,
data loading with caching, lookup/filter utilities, bio template engine.
Gate: Team page renders from real JSON. Data cached after first load.

### Sprint 3 — Team Pages (one team → all teams)
Deliverables: Complete team page for France (all 4 tabs). Auto-Focus Squad System.
Hero Player Navigation. RadarChart SVG. Then generalise to all teams.
Gate: All 48 teams render correctly from JSON. Hero navigation works. Auto-Focus works.

### Sprint 4 — Tournament Centre
Deliverables: Today's Matches, Group Stage carousel (12 groups, scroll-snap, drag, arrows),
Knockout bracket (desktop + mobile), live/finished states.
Gate: Tournament Centre fully functional. Scroll-snap confirmed on mobile.

### Sprint 5 — Search + Deep Linking
Deliverables: Live search index, fuzzy matching, filter prefixes, deep link routing to
teams, players, clubs, leagues. All hash routes functional.
Gate: Search is primary discovery mechanism. All deep links resolve correctly.

### Sprint 6 — Analysis + Football Database
Deliverables: Compare Teams, Statistics Dashboard (all XIs + club/league stats), Club
Explorer, League Explorer.
Gate: Application feels like a football database. All statistics auto-generated from data.

### Sprint 7 — Polish + Acceptance
Deliverables: Performance audit, lazy loading verified, accessibility audit, keyboard
navigation, focus states, contrast checks, mobile refinement, acceptance criteria pass.
Gate: AC-001 through AC-084 all pass. No critical defects.

## Critical path items

These must not slip. They block dependent work:
1. Hash router (blocks everything)
2. DataManager (blocks all data rendering)
3. Auto-Focus Squad System (most complex feature, needs early validation)
4. Group Stage scroll-snap (needs mobile device testing early)
5. Schema finalisation (blocks data population workstream)

## Technology decisions requiring confirmation before Sprint 1

1. ES modules: use native `<script type="module">` or minimal bundler?
   Recommendation: Native ES modules. Avoids build step. Works on all modern browsers.
   Caveat: Requires HTTP server (not file:// protocol). Localhost dev server needed.

2. Fuzzy search: build from scratch or use Fuse.js (6KB)?
   Recommendation: Fuse.js. Lightweight, well-tested, MIT licensed, no build step required.
   Justification: Building a production-quality fuzzy matcher from scratch is significant
   work for marginal benefit. Fuse.js is the pragmatic choice.

3. SVG radar chart: custom or library?
   Recommendation: Custom SVG. The chart is simple (5 axes, polygon). A 50-line utility
   function covers it. No library dependency justified.

4. Players data splitting: single file or per-team?
   Recommendation: Per-team files (players-france.json). Load on demand. Cache aggressively.
   This keeps initial app load fast and scales as data grows.

---

End of PROJECT_ANALYSIS.md
