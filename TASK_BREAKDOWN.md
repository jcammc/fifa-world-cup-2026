# TASK_BREAKDOWN.md

Version: 1.0
Status: Planning Document — Phase 3
Purpose: Full epic → feature → task breakdown with complexity, dependencies, and implementation order.

Complexity scale:
  S = Small      (~1–2 hours)
  M = Medium     (~half day)
  L = Large      (~full day)
  XL = Very Large (~2–3 days)

---

# EPIC 1 — FOUNDATION

Goal: Production-quality application shell. Usable, routable, responsive, themed.
Sprint: 1
Blocks all subsequent epics.

---

## Feature 1.1 — Project Setup

### T-001 — Directory and file structure
Complexity: S
Create full directory structure per blueprint:
worldcup2026/, styles/, js/, js/modules/, data/, data/players/, assets/
Create index.html, all CSS files (empty with comments), all JS files (empty with exports).
Dependency: None.

### T-002 — index.html shell
Complexity: S
Build the complete static HTML shell:
- DOCTYPE, meta viewport, lang attribute
- Link to CSS files (styles/base.css, layout.css, components.css)
- #app with #app-header, #app-sidebar, #app-drawer, #app-content
- Module script tag pointing to js/app.js
- Breadcrumb element
- No inline styles or scripts.
Dependency: T-001.

### T-003 — CSS design tokens (base.css)
Complexity: M
Define all CSS custom properties:
- Colour palette (dark theme: deep navy, charcoal, gold, off-white)
- Colour palette (light theme: white, light grey, French blue, gold, dark slate)
- Typography scale (font sizes, weights, line heights)
- Spacing scale (4px base unit, 4, 8, 12, 16, 24, 32, 48, 64px)
- Border radius tokens
- Shadow tokens
- Transition tokens
- Breakpoints documented as comments (not variables — use in media queries directly)
Data-theme scoping: [data-theme="dark"] and [data-theme="light"] custom property sets.
Dependency: T-001.

---

## Feature 1.2 — Theme Engine

### T-004 — theme.js module
Complexity: S
Implement: getTheme(), setTheme(theme), toggleTheme(), initTheme().
initTheme() called on app start: reads localStorage, sets data-theme on <html>.
Dependency: T-003.

### T-005 — Theme toggle UI
Complexity: S
Header button that calls toggleTheme().
Displays "Dark" / "Light" label and icon.
Smooth transition: CSS `transition: background-color 0.15s, color 0.15s` on body.
Dependency: T-004.

### T-006 — Theme regression test
Complexity: S
Manual verification: toggle persists across page reload. Both themes render cleanly.
All custom properties resolve in both themes (no missing variable fallback to initial).
Dependency: T-005.

---

## Feature 1.3 — Layout System

### T-007 — App shell layout (layout.css)
Complexity: M
CSS Grid layout for full-viewport app:
- Sidebar fixed left (~240px)
- Header fixed top (~60px)
- Content area fills remaining space
- Drawer: off-canvas, transform-based slide-in for mobile
- No overlap of header / sidebar content
Responsive breakpoints:
- < 768px: sidebar hidden, drawer used
- 768–1024px: sidebar narrower (icon + text)
- > 1024px: full sidebar
Dependency: T-002, T-003.

### T-008 — Sidebar navigation (HTML + CSS)
Complexity: M
Four nav sections: Browse, Tournament, Analysis, Football.
Each section has a heading and child links.
Active link gets .nav-link--active styling.
Hover states, focus states visible.
All links are `<a href="#route">` tags.
Dependency: T-007.

### T-009 — Mobile drawer
Complexity: M
Hamburger button in header triggers drawer.
Drawer slides in from left, overlays content.
Overlay backdrop closes drawer on click.
Focus trapped inside open drawer (Tab cycles within).
ESC key closes drawer.
Same nav content as sidebar.
aria-hidden on drawer when closed. aria-expanded on trigger button.
Dependency: T-007, T-008.

### T-010 — Breadcrumb component
Complexity: S
Static HTML slot in layout.
Router updates breadcrumb text on each navigation.
Example: World Cup 2026 > France > Squad
Maximum 3 levels deep.
Dependency: T-007.

---

## Feature 1.4 — Hash Router

### T-011 — router.js module
Complexity: L
Implement Router class:
- listen to hashchange events
- parse hash into route object ({ type, params })
- resolve route to module class
- teardown previous module
- instantiate and mount new module
- update breadcrumb
- update active nav link
Route resolution table for all defined routes (see blueprint §5).
Handle unknown routes → 404 fallback state.
Player route disambiguation: check countryId prefix.
Dependency: T-002.

### T-012 — Module base class / interface
Complexity: S
Define module contract in utils.js or base-module.js:
Every module must implement: render(), init(), teardown().
render() returns a promise (async data loading).
teardown() must remove all observers and event listeners.
Dependency: T-011.

### T-013 — Router integration test
Complexity: S
Verify: typing #tournament in URL loads correct module.
Verify: navigating back/forward via browser buttons works.
Verify: no console errors on any valid route.
Dependency: T-011, T-012.

---

## Feature 1.5 — Utility Modules

### T-014 — utils.js
Complexity: S
Implement:
- slugify(str): "Real Madrid" → "real-madrid"
- escapeHtml(str): prevents XSS in template strings
- debounce(fn, ms): returns debounced function
- clamp(n, min, max): clamps number
- ordinal(n): 1 → "1st", 2 → "2nd", etc.
- waitForScrollEnd(el): returns promise resolving when scroll stops
Dependency: None.

### T-015 — time.js
Complexity: M
Implement:
- formatKickoff(utcString): "2026-06-22T21:00:00Z" → "22 Jun 22:00 BST"
- formatKickoffShort(utcString): "22:00 BST"
- formatDate(utcString): "22 Jun 2026"
- isToday(utcString): boolean
- getNextMatchday(fixtures): returns date string of next upcoming fixture date
- timezoneLabel(): returns "BST" or "GMT" based on current date
Uses Intl.DateTimeFormat with timeZone: 'Europe/London'.
Handles BST/GMT transition automatically.
Dependency: None.

---

# EPIC 2 — DATA LAYER

Goal: All data infrastructure working. Application can load, cache, and query real data.
Sprint: 2
Blocks Epics 3–7.

---

## Feature 2.1 — JSON Schema Finalisation

### T-016 — Finalise and document all JSON schemas
Status: COMPLETE (Sprint 2)
Complexity: M
Produce schema documentation (as JS comments or a schemas.md file) for:
- countries.json (with recentForm, teamStrength)
- players/{id}.json (with normalised IDs, optional bio)
- groups.json
- fixtures.json
- standings.json
- clubs.json
- leagues.json
- rankings.json
- knockout.json
All foreign key relationships documented.
Dependency: T-001.

### T-017 — Create sample data for 3 teams
Status: COMPLETE (Sprint 2)
Complexity: L
Produce real, accurate sample data for France, England, Brazil:
- countries.json entries
- players/france.json, players/england.json, players/brazil.json
- Relevant fixtures, standings, group, club, league entries
This data drives all Sprint 3 development.
Do NOT use fictional players. Use real World Cup 2026 squad data.
Dependency: T-016.

### T-018 — Create knockout.json structure
Complexity: M
48-slot bracket (Round of 32 × 16, Round of 16 × 8, QF × 4, SF × 2, 3rd + Final).
All initially status: "scheduled", homeTeamId/awayTeamId: "tbc".
Round labels: "round-of-32", "round-of-16", "quarter-final", "semi-final",
"third-place", "final".
Dependency: T-016.

---

## Feature 2.2 — DataManager Module

### T-019 — data.js — core loader and cache
Complexity: L
Implement DataManager as a singleton module:
- load(key, url): fetch + cache (Map)
- loadCountries(): returns all countries
- loadCountry(id): returns single country
- loadPlayersForTeam(countryId): loads data/players/{countryId}.json
- loadGroups(): returns all groups
- loadFixtures(): returns all fixtures
- loadStandings(): returns all standings
- loadClubs(): returns all clubs
- loadLeagues(): returns all leagues
- loadRankings(): returns all rankings
- loadKnockout(): returns knockout bracket
All functions return promises. Cache on first load.
Error handling: log error, return null or empty array (never crash).
Dependency: T-016, T-017.

### T-020 — data.js — lookup and filter utilities
Complexity: M
Add derived query functions to DataManager:
- getFixturesForTeam(countryId)
- getFixturesForGroup(groupId)
- getTodaysFixtures()
- getStandingsForGroup(groupId)
- getTeamStanding(countryId, groupId)
- getClubById(clubId)
- getLeagueById(leagueId)
- getPlayerById(playerId)
- getTopPlayersForTeam(countryId, n=5): sorted by consensus score
- getClubPlayerCount(clubId): count of players from this club
- getLeaguePlayerCount(leagueId)
Dependency: T-019.

### T-021 — data.js — statistics generators
Complexity: M
Add statistics computation functions:
- getMostValuableXI(): top 11 by marketValue, valid formation (1 GK, 4 DEF, 4 MID, 2 FWD or similar)
- getMostExperiencedXI(): top 11 by caps
- getYoungestXI(): top 11 by lowest age
- getMostRepresentedClubs(n=10): clubs with most players, sorted
- getMostRepresentedLeagues(n=10): leagues with most players, sorted
- getSquadValueRanking(): countries sorted by squadValue
Dependency: T-019, T-020.

---

## Feature 2.3 — Bio Template Engine

### T-022 — bio.js
Complexity: M
Implement position-aware bio generator:
- Templates for GK, DEF, MID, FWD
- All conditional clauses handle null/undefined fields
- Stored bio override check (player.bio non-null takes priority)
- Returns 2–3 natural sentence string
- No broken output possible (minimum: "Name plays for Club, representing Country.")
Dependency: T-019.

---

## Feature 2.4 — Search Index

### T-023 — search.js — index builder
Complexity: M
Build SearchIndex from loaded data:
- Each entry: { type, id, name, secondary, hash }
  type: "player" | "country" | "club" | "league" | "manager"
  hash: the route to navigate to on selection
- Index built on first search query (lazy) or on app init (eager — TBD)
- Index rebuilt if new team data loaded
Dependency: T-019, T-020.

### T-024 — search.js — fuzzy match
Complexity: M
Implement lightweight fuzzy match:
Option A: Integrate Fuse.js (preferred — 6KB gzip, MIT)
Option B: Custom Levenshtein-based score function
Whichever chosen: must return "mbape" → Mbappe.
Results sorted by match quality. Grouped by type.
Filter prefix support: "player:mbappe" restricts to player type only.
Dependency: T-023.

---

# EPIC 3 — TEAM PAGES

Goal: Complete team page experience for all 48 teams.
Sprint: 3
Depends on: Epics 1, 2.

---

## Feature 3.1 — Team Page Root

### T-025 — team-page.js module
Complexity: M
TeamPageModule class:
- render(): load country data, render team header, render default tab (Overview)
- Tab switching: Overview/Squad/Fixtures/Statistics
- Tab switch does NOT reload page. Only replaces tab content area.
- Tab state tracked: can return to last active tab if user navigates away and back
- Expose activateSquadTab(playerId): for Hero Navigation
- Breadcrumb: World Cup 2026 > {CountryName} > {ActiveTab}
Dependency: T-011, T-019.

### T-026 — Team header component
Complexity: S
Renders:
- Country flag image (SVG, with onerror fallback)
- Country name (h1)
- FIFA ranking
- Manager name
- Average age
- Squad value (formatted: €1.31bn)
- World cups won
Optional fields rendered if data present:
- Clubs represented
- Leagues represented
All data-driven from country schema.
Dependency: T-025.

---

## Feature 3.2 — Overview Tab

### T-027 — overview-tab.js module
Complexity: L
Renders all Overview content:
- Hero Card strip (5 cards)
- Tournament Snapshot
- Radar Chart
- Recent Form
- Club Distribution
- League Distribution
- Squad Makeup
All sections rendered sequentially.
Missing data: each section handles missing data independently (shows fallback, not error).
Dependency: T-020, T-022.

### T-028 — Hero Cards
Complexity: M
5 HeroCard components in a horizontal strip.
Each card: large photo (onerror fallback), name, club, position, consensus score.
Visually larger and more prominent than squad player cards.
Click handler: calls TeamPageModule.activateSquadTab(playerId).
Top 5 auto-generated by getTopPlayersForTeam().
Dependency: T-027.

### T-029 — Tournament Snapshot
Complexity: M
Reads from standings + fixtures data for this team.
Displays: group, position, W/D/L record, GD, next match (opponent + date + time + broadcaster).
Broadcaster badge: BBC / ITV styled distinctly. Others as plain text. TBD if null.
Uses time.js for all date/time formatting.
Dependency: T-020, T-027.

### T-030 — radar.js SVG chart
Complexity: M
Implement renderRadar() as documented in blueprint §14.
5 axes: attack, midfield, defence, goalkeeping, depth.
Grid rings at 33%, 66%, 100%.
Polygon filled with team accent colour.
Values from country.teamStrength.
Axis labels outside chart.
Handles missing values: null dimension → 0.
Accessible: role="img", aria-label with summary.
Dependency: None (standalone utility).

### T-031 — Recent Form display
Complexity: S
Renders country.recentForm array as styled bubbles:
W → green bubble, D → grey bubble, L → red bubble.
Text label inside bubble (W/D/L) ensures colour is not sole indicator.
Dependency: T-027.

### T-032 — Club and League Distribution lists
Complexity: S
For club distribution: count players per club, sort by count descending.
For league distribution: count players per league, sort by count descending.
Both rendered as compact lists: badge + name + (count).
Dependency: T-020, T-027.

### T-033 — Squad Makeup panel
Complexity: S
Count by position: GKs, DEFs, MIDs, FWDs.
Calculate: average age, average height, average caps.
Rendered as a stat grid.
Dependency: T-020, T-027.

---

## Feature 3.3 — Squad Tab and Auto-Focus System

### T-034 — squad-tab.js — grid and player cards
Complexity: M
Render squad grid: rows of 4 (desktop) / 2 (mobile).
Each PlayerCard: photo (lazy, fallback), name, position badge, club badge (fallback to initials), club name.
CSS grid responds to breakpoints.
Player cards are interactive: focusable (tabindex=0), keyboard-activatable.
data-player-id and data-row attributes on correct elements.
Dependency: T-025, T-019.

### T-035 — Auto-Focus Squad System (IntersectionObserver)
Complexity: XL
Implement as documented in blueprint §11.
IntersectionObserver setup with rootMargin: '-30% 0px'.
Row activation/deactivation logic.
Row selection persistence per row (#rowSelections Map).
ProfilePanel singleton update on row change.
Smooth profile panel transitions (fade, not jump).
Must work correctly during:
- Initial page load
- Programmatic scroll (Hero Navigation)
- Manual scroll
- Mobile touch scroll
Dependency: T-034.

### T-036 — Profile Panel (singleton)
Complexity: L
Single ProfilePanel instance per SquadTab lifecycle.
Renders: large photo, name, position, club, age, caps, goals, height.
Renders: Ranking Breakdown (5 bars or scores: TM, EA, Awards, Media, Form + Consensus).
Renders: Biography (from bio.js).
Renders: Similar Players (3 linked mini-cards → navigate to player).
Profile update: fade out old content, render new, fade in.
Must never be duplicated in DOM.
Dependency: T-035, T-022.

### T-037 — Hero Player Navigation
Complexity: L
Implement TeamPageModule.activateSquadTab(playerId):
1. Switch active tab to Squad
2. Wait for SquadTab to render (async)
3. Call SquadTab.focusPlayer(playerId)
SquadTab.focusPlayer(playerId):
1. Find row index for player
2. scrollIntoView({behavior:'smooth', block:'center'})
3. Wait for scroll to complete (waitForScrollEnd)
4. Activate row, set row selection to this player
5. Open profile panel for this player
6. Focus the player card DOM element
Full acceptance: clicking a hero card results in exactly this sequence with no user action needed.
Dependency: T-035, T-036, T-028.

### T-038 — Reserves Section
Complexity: M
CollapsibleSection component:
- Header: "▶ Reserves (n)" button
- aria-expanded, aria-controls attributes
- Collapsed by default (grid hidden)
- Expand reveals same PlayerCard grid as main squad
- Reserves filtered from players where isReserve: true
- Same Auto-Focus behaviour does not apply to reserves (separate section, profile panel still works on click)
Dependency: T-034.

---

## Feature 3.4 — Fixtures Tab

### T-039 — fixtures-tab.js module
Complexity: M
Renders:
- Group standings table (this team's group)
- Upcoming fixtures (unplayed, sorted by date)
- Completed fixtures (played, sorted by date desc)
- Qualification Status indicator
Data from standings.json and fixtures.json filtered by team.
Dependency: T-020.

### T-040 — Group standings table
Complexity: M
Table columns: P W D L GF GA GD Pts.
Highlight this team's row.
Qualification status colours: green (qualified), amber (possible), red (eliminated).
Colour NOT sole indicator: add icon/text label alongside colour.
Dependency: T-039.

### T-041 — Upcoming and Completed fixture cards
Complexity: S
Upcoming: opponent flag + name, date, time (BST), broadcaster badge.
Completed: opponent flag + name, score, FT label.
Live: 🔴 LIVE badge, score, minute.
Dependency: T-039.

### T-042 — Qualification status component
Complexity: S
Shows one of: "Qualified ✓", "Qualification Possible", "Eliminated ✗".
Driven by team's qualificationStatus field in standings.
Dependency: T-039.

---

## Feature 3.5 — Statistics Tab

### T-043 — statistics-tab.js module
Complexity: L
Renders 6 chart/list sections:
- Value Breakdown (bar chart SVG)
- Position Breakdown (bar or donut SVG)
- Club Representation (horizontal bar SVG)
- League Representation (horizontal bar SVG)
- Age Distribution (bar SVG by age bands)
- Experience Distribution (bar SVG by caps bands)
All charts are SVG. No charting library.
All data computed from this team's player list.
Dependency: T-020.

---

## Feature 3.6 — Scale to all 48 teams

### T-044 — Data entry: remaining 45 team files
Complexity: XL
Produce accurate player/team data for all 48 nations.
This is a data workstream, not application code.
Application code is team-agnostic by design.
Note: this is the longest single task in the project.
Dependency: T-017 (schema), T-019 (loader), T-025 (renderer).

---

# EPIC 4 — TOURNAMENT CENTRE

Goal: Live tournament hub — matches, groups, knockout bracket.
Sprint: 4
Depends on: Epics 1, 2.

---

## Feature 4.1 — Tournament Centre Root

### T-045 — tournament.js module
Complexity: M
TournamentCentreModule:
- Three section tabs: Today's Matches, Group Stage, Knockout Stage
- Default section: Today's Matches
- Tab switching (no reload)
- Breadcrumb: World Cup 2026 > Tournament Centre > {Section}
Dependency: T-011, T-019.

---

## Feature 4.2 — Today's Matches

### T-046 — Today's Matches section
Complexity: M
Load all fixtures. Filter by isToday().
Render MatchCard for each: home team, away team, kickoff time (BST), broadcaster badge.
Status states:
- Scheduled: shows time
- Live: 🔴 LIVE badge + current minute
- Finished: FT label + score
Empty state: "No matches scheduled today" + next matchday info (using getNextMatchday()).
Dependency: T-015, T-020, T-045.

### T-047 — Broadcaster badges
Complexity: S
BBC badge: styled with BBC colours.
ITV badge: styled with ITV colours.
TBD: plain grey badge "TBD".
Other string: plain text display.
Dependency: T-046.

---

## Feature 4.3 — Group Stage Carousel

### T-048 — group-stage.js module
Complexity: XL
Full implementation per blueprint §12.
- Container: CSS scroll-snap, overflow-x scroll
- 12 GroupCard components rendered
- Drag scrolling: pointer events (pointerdown, pointermove, pointerup, pointercancel)
- Wheel redirect: wheel event listener (passive:false)
- Arrow buttons: left/right, large, visually prominent
- Programmatic snap navigation for arrows
- Arrow state: disable prev at group A, disable next at group L
- ARIA: region label, live region announcing current group
- No partial resting: CSS scroll-snap-type: x mandatory guarantees this
- Mobile: same behaviour, finger drag replaces pointer drag
Dependency: T-045, T-020.

### T-049 — Group Card component
Complexity: M
Each card contains (in this order):
1. Group header (Group A, teams listed)
2. Standings table (P W D L GD Pts)
3. Upcoming fixtures (next 2 matches in this group)
4. Qualification indicators (team name + status for each team)
Qualification uses colour + text/icon (never colour alone).
Dependency: T-048, T-020.

---

## Feature 4.4 — Knockout Stage Bracket

### T-050 — knockout.js module — desktop bracket
Complexity: XL
Full bracket displayed on desktop:
Columns: Round of 32 | Round of 16 | QF | SF | Final (+ 3rd Place)
Lines connecting match winners to next round.
SVG or CSS border-based connector lines.
TBC slots shown as "TBC" with appropriate styling.
Scrollable horizontally if viewport too narrow.
KnockoutMatchCard: teams, date, time, broadcaster, status.
Dependency: T-011, T-018, T-019.

### T-051 — knockout.js module — mobile bracket
Complexity: L
Round-by-round horizontal navigation on mobile.
CSS scroll-snap by round.
Same snap/drag/arrow controls as group carousel.
Each "slide" shows all matches in that round.
Dependency: T-050.

---

# EPIC 5 — SEARCH AND DEEP LINKING

Goal: Search becomes primary navigation mechanism.
Sprint: 5
Depends on: Epics 1, 2.

---

## Feature 5.1 — Global Search UI

### T-052 — SearchOverlay component
Complexity: M
Activated when user focuses #search-input or presses / keyboard shortcut.
Overlays content area (not full-screen).
Results grouped by category (Players, Countries, Clubs, Leagues, Managers).
Each result: icon/flag/badge + primary name + secondary info (club, country, etc.)
Best match highlighted.
Keyboard navigation: arrow keys move through results, Enter selects, ESC closes.
Clicking outside closes.
Dependency: T-024, T-011.

### T-053 — Search integration with router
Complexity: S
Selecting any search result calls router.navigate(result.hash).
Correct hash produced for each result type:
- Country → #france
- Player → #france-mbappe
- Club → #club-real-madrid
- League → #league-premier-league
- Manager → #france (navigates to their country page)
Dependency: T-052, T-011.

---

## Feature 5.2 — Deep Linking

### T-054 — Player deep link resolution
Complexity: M
Route #france-mbappe:
1. Parse: countryId=france, playerId=mbappe
2. Load TeamPageModule for france
3. Activate Squad tab
4. Call focusPlayer('france-mbappe')
All steps must complete before user sees content (or show loading state during).
Dependency: T-037, T-011.

### T-055 — Club and league deep links
Complexity: S
#club-real-madrid → ClubExplorer → ClubDetailView for Real Madrid
#league-premier-league → LeagueExplorer → LeagueDetailView for Premier League
Dependency: T-011.

---

# EPIC 6 — ANALYSIS AND FOOTBALL DATABASE

Goal: Analysis tools and football database tools. Transforms app into intelligence platform.
Sprint: 6
Depends on: Epics 1, 2.

---

## Feature 6.1 — Compare Teams

### T-056 — compare.js module
Complexity: L
Layout: two columns, one per team.
Team selectors: search-style autocomplete (reuses search index).
Default state: prompt to select teams.
Comparison rows: FIFA Ranking, Squad Value, Avg Age, World Cups Won.
Top Players: side-by-side strips of top 3 hero cards per team.
Radar comparison: renderRadar() with two polygons, different colours, legend.
Updates when either team selection changes (no reload).
Dependency: T-024, T-030, T-020.

---

## Feature 6.2 — Statistics Dashboard

### T-057 — stats-dashboard.js module
Complexity: L
Four section tabs: Squads, Players, Clubs, Leagues.

Squads section:
- Highest squad values ranking (all 48 teams)
- Lowest squad values ranking
- Average age by team

Players section:
- Most Valuable XI (display as pitch or grid)
- Most Experienced XI
- Youngest XI
- All XIs are auto-generated by getMostValuableXI() etc.

Clubs section:
- Most represented clubs (bar chart + list)
- Top clubs by player count

Leagues section:
- Most represented leagues
- Player count by league

All data computed by DataManager statistics generators.
Dependency: T-021, T-030.

### T-058 — XI Display component
Complexity: M
Displays 11 players in a visually organised formation.
Formation: fixed 4-3-3 or 4-4-2 visual layout.
Each player: photo (fallback), name, club, value/caps/age (contextual to which XI).
Links to player deep links on click.
Dependency: T-057.

---

## Feature 6.3 — Club Explorer

### T-059 — club-explorer.js module
Complexity: M
Club list: all clubs sorted by player count descending.
Each ClubCard: badge, name, player count, countries represented count.
Club search: filter by name as user types.
Click → ClubDetailView.
Dependency: T-020.

### T-060 — Club detail view
Complexity: M
Club summary: player count, countries represented, most valuable player name.
Players grouped by country:
- Country heading (flag + name)
- Player mini-cards (name, position, market value)
- Links to player profiles (#country-player route)
Dependency: T-059, T-020.

---

## Feature 6.4 — League Explorer

### T-061 — league-explorer.js module
Complexity: M
League list: all leagues sorted by player count descending.
Each LeagueCard: logo, name, player count, countries represented, teams represented.
League search input.
Click → LeagueDetailView.
Dependency: T-020.

### T-062 — League detail view
Complexity: M
League summary: player count, countries represented, teams represented.
Player listing: all players from this league, sorted by consensus score.
Each player: photo, name, country (flag), club, position, consensus score.
Dependency: T-061, T-020.

---

## Feature 6.5 — Browse Modules

### T-063 — countries.js module
Complexity: M
Grid of all 48 team cards.
Each card: flag, country name, group, FIFA ranking, squad value.
Click → team page.
Filter/sort: by group, by confederation, by ranking.
Dependency: T-019.

### T-064 — groups.js module
Complexity: S
Grid of 12 group summaries.
Each: group label, 4 team flags + names.
Click → Tournament Centre / Group Stage at that group.
Dependency: T-019.

### T-065 — continents.js module
Complexity: S
Six confederation sections: UEFA, CONMEBOL, CONCACAF, CAF, AFC, OFC.
Each: confederation name, team count, team cards.
Dependency: T-019.

---

# EPIC 7 — POLISH AND ACCEPTANCE

Goal: Production-quality. All 84 acceptance criteria pass.
Sprint: 7
Depends on: All previous epics.

---

## Feature 7.1 — Performance Audit

### T-066 — Lazy loading verification
Complexity: S
Confirm loading="lazy" on all img elements.
Network tab: player photos not fetched until visible.
AC-067, AC-068.

### T-067 — Data loading audit
Complexity: S
Confirm only active page data is loaded.
Navigating to France should not trigger Brazil player fetch.
AC-069.

### T-068 — Scroll performance
Complexity: M
Profile scroll performance on squad tab.
No forced layouts in IntersectionObserver callback.
Group carousel scrolls at 60fps on mid-range mobile.
AC-070.

---

## Feature 7.2 — Accessibility Audit

### T-069 — Keyboard navigation audit
Complexity: M
Tab through entire application without mouse.
All interactive elements reachable.
All interactive elements operable via keyboard.
AC-071.

### T-070 — Focus states audit
Complexity: S
Confirm visible focus ring on every interactive element.
Focus ring visible in both dark and light themes.
AC-072.

### T-071 — Alt text audit
Complexity: S
Every img has meaningful alt text.
Decorative images use alt="".
AC-073.

### T-072 — Colour-only indicators audit
Complexity: S
Check: qualification status (colour + text), form bubbles (colour + letter),
live badges (colour + text), status states (colour + label).
AC-074.

### T-073 — Screen reader smoke test
Complexity: M
Test with VoiceOver (macOS/iOS) or NVDA (Windows).
Navigation landmarks announced correctly.
Profile panel changes announced.
Group carousel navigation announced.
Dependency: T-069.

---

## Feature 7.3 — Mobile Refinement

### T-074 — Mobile drawer final polish
Complexity: S
Smooth animation. No jitter. Backdrop opacity correct.
Touch targets minimum 44×44px.
AC-075.

### T-075 — Squad grid mobile test
Complexity: S
2 columns on mobile. Auto-Focus behaves correctly on touch scroll.
Profile panel readable on small screens.
AC-015.

### T-076 — Group Stage mobile test
Complexity: S
Touch drag scrolls carousel. Snap works on iOS Safari.
Arrow buttons accessible on touch.
AC-076.

### T-077 — Knockout mobile test
Complexity: S
Round navigation works on mobile. Snap by round confirmed.
Match cards readable at 320px width.
AC-077.

---

## Feature 7.4 — Visual Polish

### T-078 — Hover states pass
Complexity: S
All clickable elements: hover state changes cursor + visual feedback.
Cards have subtle lift or highlight on hover.
No hover states that hide necessary information.

### T-079 — Transition refinement
Complexity: S
Profile panel fade: 150ms ease-in-out.
Tab switch: instant (no animation — feels snappy).
Theme switch: 150ms transition on background/colour.
Page transition: 100ms fade on content area.

### T-080 — Error and empty states
Complexity: M
Implement fallback states for:
- Missing team (unknown hash)
- Missing player data
- Failed data fetch
- No matches today
- Incomplete knockout bracket
None of these should produce blank screens or console errors.

---

## Feature 7.5 — Final Acceptance Pass

### T-081 — AC-001 through AC-084 verification
Complexity: L
Systematically test every acceptance criterion from 07_ACCEPTANCE_CRITERIA.md.
Document pass/fail for each.
Fix any failures before project closure.

### T-082 — Cross-browser test
Complexity: M
Chrome, Safari, Firefox latest.
iOS Safari, Chrome Android.
Document and fix any browser-specific issues.

### T-083 — Console clean pass
Complexity: S
Zero console errors on any route.
Zero console warnings from application code.
No uncaught promise rejections.

---

# IMPLEMENTATION ORDER (Recommended)

```
Week 1: T-001 → T-015 (Foundation)
Week 2: T-016 → T-024 (Data layer + search index)
Week 3: T-025 → T-033 (Team page + overview tab)
Week 4: T-034 → T-038 (Squad tab + Auto-Focus System)  ← Critical path
Week 5: T-039 → T-043 (Fixtures tab + statistics tab)
Week 6: T-044       (Data entry: all 45 remaining teams) ← Parallel workstream
Week 7: T-045 → T-051 (Tournament Centre)
Week 8: T-052 → T-055 (Search + deep linking)
Week 9: T-056 → T-065 (Analysis tools + football database)
Week 10: T-066 → T-083 (Polish + acceptance)
```

## Critical path (cannot slip without cascading delay)

```
T-001 (Structure)
  → T-011 (Router)
    → T-025 (Team page)
      → T-034 (Squad grid)
        → T-035 (Auto-Focus) ← Most complex, validate early
          → T-037 (Hero Nav)
            → T-081 (Acceptance)
```

## Parallelisable workstreams

The following can proceed independently once Epic 2 is complete:
- Data entry (T-044) runs in parallel with Epic 4–6 development
- Accessibility tasks (T-069–T-073) run in parallel with T-080
- Visual polish (T-078–T-079) runs in parallel with AC verification (T-081)

---

# TASK SUMMARY

| Epic | Tasks | S | M | L | XL |
|------|-------|---|---|---|----|
| 1: Foundation       | T-001–T-015 | 8 | 5 | 2 | 0  |
| 2: Data Layer       | T-016–T-024 | 0 | 5 | 4 | 0  |
| 3: Team Pages       | T-025–T-044 | 7 | 7 | 5 | 2  |
| 4: Tournament       | T-045–T-051 | 0 | 2 | 1 | 3  |
| 5: Search           | T-052–T-055 | 1 | 2 | 1 | 0  |
| 6: Analysis         | T-056–T-065 | 2 | 5 | 3 | 0  |
| 7: Polish           | T-066–T-083 | 8 | 5 | 2 | 0  |
| **Total**           | **83 tasks**| **26** | **31** | **18** | **5** |

Estimated complexity: ~5 XL, ~18 L, ~31 M, ~26 S tasks.
Total estimated effort: 45–60 working days including data population.
Code-only estimate (excluding T-044 data entry): 25–35 working days.

---

End of TASK_BREAKDOWN.md
