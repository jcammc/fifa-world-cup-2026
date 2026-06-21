# SESSION HANDOFF — World Cup 2026 Squad Explorer
# Paste everything below this line into your next Claude session.

---

## PROJECT OVERVIEW

**"World Cup 2026 Squad Explorer and Tournament Companion"** — a vanilla JavaScript SPA hosted on Netlify. No framework, no build step, ES Modules only. All data lives in local JSON files; all routing is hash-based.

**Working directory:** `C:\Users\jcame\OneDrive\Desktop\FIFA World Cup 2026`

**Source spec files (read-only reference, not actively used):**
`C:\Users\jcame\OneDrive\Documents\Notes\Fifa World Cup .md files\`
`01_PRODUCT_SPEC.md.txt` through `07_ACCEPTANCE_CRITERIA.md.txt`

**Document location convention:** All `.md` files live in `docs/`. Never place `.md` files in the project root or other directories (exception: `skills/**/SKILL.md` and `schemas/README.md` which serve their own directories).

**Living project documents (read these when implementing):**
- `docs/08_PROJECT_STATUS_REVIEW.md` — definitive snapshot of current feature state, findings, architecture decisions, and V1.0 definition
- `docs/IMPLEMENTATION_BLUEPRINT.md` — module design, lifecycle, routing, Auto-Focus system detail
- `docs/TASK_BREAKDOWN.md` — all tasks T-001 through T-083 with statuses
- `docs/RECOMMENDATIONS.md` — 18 architectural recommendations with adopt/reject status
- `docs/DATA_ENTRY_GUIDE.md` — squad/fixture/standings entry conventions and ID rules

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
| Sprint 5A | Nav active-state fix for all TC deep-link routes; fixtures.json + standings.json populated for all 12 groups R1; qualificationStatus set where certain after R1 | **COMPLETE** |
| Sprint 5B | Fix leagueId bug in getPlayerResolved(); qualification badges in carousel; Team Fixtures Tab; knockout bracket connector lines; all 48 manager fields; Group C + D R2 results | **COMPLETE** |
| Sprint 5C | Data model decisions (recentForm → country level; teamStrength deferred); squad files for Germany/Spain/Argentina/Portugal/Netherlands; leagues.json + clubs.json expanded | **COMPLETE** |
| Sprint 6 | Tournament data maintenance — R2 results for Groups A–D confirmed FT; qualificationStatus set for 8 teams. R2 for Groups E–L and all R3 still scheduled as of June 20. | **IN PROGRESS** |
| Sprint 7 | Search overlay — Ctrl+K trigger, 1,296-entry index, diacritic normalisation, player deep-link `#player-id` | **COMPLETE** |
| Sprint 8 | Squad population for Norway, Belgium, USA, Japan, Morocco (5 squads × 26 players) | **COMPLETE** |
| Sprint 9 | Squad population for all remaining 23 teams — all 48 squads now complete (1,248 players). validate-data.js tooling. generate-search-index.js script. clubs.json grown to 456 entries. | **COMPLETE** |
| Sprint 10 | GroupCarousel drag fix — `setPointerCapture` deferred behind 5px threshold so native clicks on child anchors are preserved. | **COMPLETE** |
| Sprint 11 | Statistics Tab full implementation (Experience, International Goals, Squad Profile). Avg-age in team header meta. Dead files removed (js/search.js, scripts/build-search-index.js). | **COMPLETE** |
| Sprint 12 | Flag download utility (scripts/download-flags.js). teamStrength for all 48 teams in countries.json. Compare Teams full implementation (compare-view.js + styles/compare.css + router compare route + nav active-link fix). | **COMPLETE** |
| Sprint 13 Phase 1 | Code-based verification pass (carousel, bracket, search, compare URL flow). update-knockout.js fully implemented. knockout.json bracket corrected against Wikipedia: actual R32 structure (non-sequential paths, host-nation home matches, best-3rd eligible-group labels), kickoff dates, venues all populated. | **COMPLETE** |
| Sprint 14 | Production verification (code audit + data consistency check — all 48 player files present, leagues/clubs perfectly in sync, zero app errors); recentForm audit (schema ✓, null only for Egypt/Cape Verde, short arrays documented); search upgrade (relevance scoring, word-prefix matching, subsequence + Levenshtein fuzzy fallback); hero photo architecture (player-photos.json, DataManager.loadPlayerPhotos(), photoMap threaded through team-page → overview-tab + squad-tab → profile-panel, gather-photos.js fully implemented). | **COMPLETE** |
| Sprint 15 | Global Statistics Dashboard (`#statistics`): experience, career scorers, demographics, club & league representation. Countries Browse page (`#countries`): 48 nations by tournament group A–L, 4-wide card grid. `#groups` redirect to TournamentCentre groups tab. `DataManager.loadAllPlayers()` + `loadPlayerPhotos()` added. squad-tab photoMap fix. | **COMPLETE** |
| Sprint 17 | Continents page (`#continents`): 48 nations by confederation, sorted by FIFA ranking. League Explorer (`#league-explorer`): ranked list of all 86 leagues, click-to-expand club lists with nation flags, real-time search, confederation badges. Router fully wired — only `club-explorer` remains a stub. PlaceholderModule text cleaned up. | **COMPLETE** |
| Sprint 18 | Club Explorer (`#club-explorer`): search-first, 2+/all toggle, nation flags linking to team pages. All named routes now functional — STUB_ROUTES is empty. Today tab knockout awareness: loads `knockout.json` alongside `fixtures.json`, merges both into today/next-matches display. `#matchCard()` falls back to `homeLabel`/`awayLabel` for pre-populated slots. Live score null guard fixed. | **COMPLETE** |
| Sprint 19 | Snapshot remaining-count fix (tournament-centre.js now counts knockout matches in played/remaining). CompareView silent failure fixed (resets result div to prompt state when countryA/B not found). Statistics player rows converted from `<div>` to `<a href="#playerId">` — click through to team page. Egypt and Cape Verde recentForm populated from WC 2026 R1 results (`["D"]` each). | **COMPLETE** |
| Sprint 20 — Pass 1 | Photo Recovery Pass 1: Wikipedia Search API retry for all 404 null entries. `searchWikiTitle()` with `"{name} footballer"` query handles disambiguation pages, macron/diacritic normalisation, birth-year qualifiers. 45s cooldown between search phase and pageimages batch. Result: 844 → 974/1248 (67.6% → 78.0%), 130 players recovered. | **COMPLETE** |
| Sprint 20 — Audit | Photo Quality Audit: enumerated all 130 Pass-1 recoveries by filename. Found 22 confirmed false positives: logos (KRC Genk, Uzbekistan league/cup, Jordan team ×2), non-persons (Qasem Soleimani, Iran protests 2026), wrong-player assignments (Erick Davis, Stiven Mendoza, Behruz Karimov, Al Mehdi Al Harrar ×2, Ahmed Al-Kaf, Argentina GK photo on Uruguay's Emiliano Martínez, Wollacott photo on Ghana Harrison), duplicate-URL pairs. All 22 nulled. Coverage: 974 → 952/1248 (76.3%). Note: 4 entries (dr-congo-ngoy/Meschack Elia, colombia-cumbal/Cristian Borja, panama-godoy-r/Roderick Miller, panama-taylor/Michael Murillo) were later found to be correct — the player names match the photo subjects; ID vs name mismatch misled the audit. These were correctly restored by Pass 2. `isSuspicious()` strengthened: now also blocks `logo`, `_crest`, `_badge`, `_emblem`, `_shield`, `_coat_of_arms`, `federation`, `association` tokens and `.svg.png` thumbnails. Post-batch duplicate-URL rejection added to `runRetryPass()`. | **COMPLETE** |
| Sprint 21 — Manager Profiles | Manager data model (managerNationality, managerDob, managerBio added to all 48 countries.json entries; _verificationManager flags on 14 uncertain entries). UI: `#renderManager(country)` in overview-tab.js renders 72px avatar, name, nationality · Age N, bio between hero cards and stats grid. Styles in team-page.css (`.tp-manager-section`, `.tp-manager`, `.tp-manager__photo`, `.tp-manager__initials`, `.tp-manager__info`, `.tp-manager__name`, `.tp-manager__meta`, `.tp-manager__bio`). Manager photos gathered via gather-photos.js GATHER_MANAGERS mode using "football manager" qualifier. 45/48 manager photos found. Gaps: Haiti (Migné), Cape Verde (Bubista), Saudi Arabia (Donis) — no Wikipedia lead image; Wikidata P18 may recover them. | **COMPLETE** |
| Sprint 21 — Photo Pass 2 | Wikidata P18 fallback for null player entries. Phases: A (Wikipedia search API), 45s cooldown, B (pageimages), C (Wikidata wbgetentities P18 for articles without lead image), D (duplicate URL scan — now also cross-checks existing photoMap), E (write). Net recovered: 968 − 952 = +16 genuine new photos. 9 false positives nulled post-run (uruguay-martinez-e, ghana-harrison, colombia-diaz-s, jordan-al-bawab, jordan-al-omari-a, jordan-al-qasem, jordan-haddad, uzbekistan-alijonov, uzbekistan-khamdamov). Bug fixed: `runWikidataPass()` Phase D now builds `existingUrls` set from current photoMap before scanning candidates — prevents any URL already assigned to another player from being assigned again. WIKIDATA_PASS reset to false. Final coverage: 968/1248 (77.6%). | **COMPLETE** |

---

## WHAT IS IMPLEMENTED

### JS modules (`js/`)

| File | Status | Notes |
|------|--------|-------|
| `app.js` | Complete | Entry point — ThemeManager, Nav, Router.init(), SearchOverlay.init() |
| `router.js` | Complete | Hash routing, all current routes wired |
| `data.js` | Complete | DataManager singleton, #cache Map, all loaders including `loadSearchIndex()`, `loadPlayerPhotos()` (returns Object not array — custom loader, not #load()), and `loadAllPlayers()` (parallel fetch all 48 squads, annotates each player with `countryId`, caches under `'all-players'`) |
| `time.js` | Complete | `formatKickoff()`, `isToday()` |
| `utils.js` | Complete | `escapeHtml()` |
| `theme.js` | Complete | localStorage, data-theme attribute toggle |
| `bio.js` | Stub | 10-line runtime fallback only |
| `charts.js` | Complete | `Charts.renderRadar(container, data)` — 5-axis SVG spider chart. `data`: `{ attack, midfield, defence, goalkeeping, depth }` all 0–100. |
| `modules/nav.js` | Complete | Top nav, hash-based active link, #search-trigger wired |
| `modules/team-page.js` | Complete | TeamPage — 4-tab shell, tab switching, `scrollToPlayer` param |
| `modules/squad-tab.js` | Complete | Squad tab — position groups, Auto-Focus IntersectionObserver |
| `modules/profile-panel.js` | Complete | Singleton panel — player stats, club badge, bio, similar players |
| `modules/overview-tab.js` | Complete | Hero cards, captain highlight, fixture strip, group standing. Manager profile section added (Sprint 21): `#renderManager(country)` renders 72px photo avatar + name/nationality/age/bio between hero section and stats grid. `#managerAge(dob)` computes age at tournament start (June 11 2026). Photo keyed as `manager-{countryId}` in photoMap. Initials fallback via `getInitials()`. |
| `modules/stats-tab.js` | **Complete** | Experience (caps leaderboard), International Goals (scorers), Squad Profile (avg age, youngest/oldest, by-position age). Constructor: `(container, country, players)` — all computation inline, no DataManager calls. |
| `modules/fixtures-tab.js` | Complete | Group-stage results + W/D/L indicators, TC deep-links (#group-x, #knockout), knockout pending state |
| `modules/tournament-centre.js` | Complete | 3-tab shell — Today / Group Stage / Knockout Stage. `#renderSnapshot()` includes both group + knockout matches in played/remaining count (shows 32 remaining after all 72 group matches are FT). Today tab merges `#fixtures` + `#knockoutMatches`. |
| `modules/group-carousel.js` | Complete | 12 group cards, standings tables, fixture strips, drag/wheel/arrow nav, `scrollToGroup()` |
| `modules/knockout-bracket.js` | Complete | Horizontal bracket, 5 rounds, seed labels, wheel redirect |
| `modules/search-overlay.js` | **Complete** | Ctrl+K or nav button trigger, relevance-scored results (exact→prefix→contains→word-prefix→subsequence→Levenshtein), diacritic normalisation, team/player results, player deep-link nav |
| `modules/compare-view.js` | **Complete** | Two `<select>` dropdowns grouped by optgroup (Group A–L). URL scheme `#compare/teamA/teamB` via `history.replaceState`. Sections: Experience, International Goals, Squad Profile, Squad Makeup, Team Strength (radar, conditional on teamStrength). Winner highlighting for Experience/Goals. Silent failure fixed (Sprint 19): if `#runComparison()` can't find countryA/B in `this.#countries`, it now resets `#cv-result` to the prompt state rather than leaving "Loading comparison…" forever. |
| `modules/countries-page.js` | **Complete** | 48 nations grouped by tournament group A–L, sorted within each group, 4-wide card grid with flag + FIFA ranking + confederation. Reuses `cp-` CSS namespace from countries.css. |
| `modules/statistics-page.js` | **Complete** | Tournament-wide stats: Squad Experience (caps leaderboard, top 10 squads + top 15 players), Career International Scorers (with caveat note — not WC 2026 match scorers), Tournament Demographics (avg age, youngest/oldest, position breakdown), Club & League Representation. Uses `loadAllPlayers()`. CSS namespace `sp-`. Player rows in Experience and Scorers lists are `<a href="#playerId">` links — clicking navigates to team page and scrolls to the player. |
| `modules/continents-page.js` | **Complete** | 48 nations grouped by confederation (UEFA, CONMEBOL, CAF, AFC, CONCACAF, OFC) sorted by FIFA ranking within each section. Team count badge on each section heading. Reuses all `cp-` CSS classes. |
| `modules/league-explorer.js` | **Complete** | Ranked list of all 86 leagues by player count. 3 summary stat cards. Real-time search filters by league name + country. Click-to-expand rows show all clubs sorted by player count with nation flag strips (up to 8 flags + overflow). One expanded at a time. Confederation colour-coded badges. CSS namespace `le-`. |
| `modules/club-explorer.js` | **Complete** | 453 clubs ranked by player count. Search-first (real-time name filter). 2+/all toggle (default: 231 clubs with 2+ players; active search overrides toggle). Nation flags per club (up to 8, each an `<a href="#countryId">` linking to team page), +N overflow. Empty state with clear button. CSS namespace `ce-`. |

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
- `compare.css` — **Complete** (selectors, duel rows, headers, radar section, responsive)
- `search.css` — **Complete** (overlay, modal, result groups, empty state, responsive)
- `countries.css` — **Complete** (`cp-` namespace: page, group sections, 4-wide card grid, flag + meta cards, responsive breakpoints at 960px/640px)
- `stats-global.css` — **Complete** (`sp-` namespace: page, header, loading state, two-col layout, player rows, squad rows, caveat note, stat cards)
- `league-explorer.css` — **Complete** (`le-` namespace: header, stat cards, search input, row list, expand/collapse rows, confederation badges with per-conf colours, club rows with flag strips, responsive)
- `club-explorer.css` — **Complete** (`ce-` namespace: header, stat cards, controls row, search input, 2+/all toggle button group, club rows with flag links, empty state, responsive)
- `utilities.css` — badge classes (badge--ft, badge--live, badge--bbc, badge--itv, empty-state)

### Scripts (`scripts/`)

| File | Status | Notes |
|------|--------|-------|
| `validate-data.js` | **Complete** | Checks all 48 squads: 26 players, shirts 1–26, 1 captain, valid positions (GK/DF/MF/FW), clubId in clubs.json, DOB 1984–2009, cross-squad duplicate IDs, `_verification` flag reporting. Run: `npm run validate` |
| `generate-search-index.js` | **Complete** | Reads countries.json + clubs.json + all player files → writes data/search-index.json in envelope format. Run: `node scripts/generate-search-index.js` |
| `download-flags.js` | **Complete** | Downloads 48 flag SVGs from `flagcdn.com/{code}.svg` to `assets/flags/{country-id}.svg`. Requires Node 18+. Non-obvious: Scotland→gb-sct, England→gb-eng, DR Congo→cd, Ivory Coast→ci, Curaçao→cw, Cape Verde→cv. Run: `node scripts/download-flags.js` |
| `generate-player-bios.js` | Stub | |
| `generate-rankings.js` | Stub | |
| `update-standings.js` | Stub | |
| `update-knockout.js` | **Complete** | Records a knockout match result + propagates winner to next round. Args: `--match <id> --home <n> --away <n> [--pen-home N --pen-away N] [--dry-run] [--no-propagate] [--force]`. SF losers propagate to 3rd-place automatically. PROPAGATION map verified against Wikipedia bracket (non-sequential R32 paths). |
| `gather-photos.js` | **Complete** | Four modes (set exactly one flag `true`, rest `false`): `RETRY_NULLS=true` (Pass 1 — Search API retry for null player entries); `GATHER_MANAGERS=true` (manager photos — stores as `manager-{countryId}` keys); `WIKIDATA_PASS=true` (Pass 2 — Wikidata P18 fallback for remaining nulls); all false (normal — exact-title lookup for undefined entries). `isSuspicious()` rejects placeholders, logos, crests, SVG thumbnails, federation/association images. `runRetryPass()` + `runWikidataPass()` both have post-batch duplicate-URL rejection. **Critical bug fixed:** `runWikidataPass()` Phase D now builds `existingUrls` from the full photoMap before scanning — prevents re-assigning a URL already held by another player. All flags currently `false`. Manager search uses `"football manager"` qualifier. 45s cooldown + 2s per-request. Run: `node scripts/gather-photos.js`. |

**npm scripts** (`package.json`):
```
npm run validate          → node scripts/validate-data.js
npm run pre-deploy        → validate && generate-bios && generate-rankings && build-search-index
```
After any squad data change: `node scripts/generate-search-index.js` then `npm run validate`.

---

## DATA FILES — CURRENT STATE

| File | Status |
|------|--------|
| `countries.json` | Complete — all 48 teams, all 48 managers, `teamStrength` populated for all 48 teams (Sprint 12). `recentForm` populated for 46 teams; Egypt `["D"]` (drew Belgium 1-1 R1), Cape Verde `["D"]` (drew Spain 0-0 R1). Will expand to 2+ entries as R2/R3 results arrive. Constraint: WC 2026 group matches + WC 2026 qualifiers only — no friendlies. |
| `groups.json` | Complete — all 12 groups A–L |
| `leagues.json` | **86 entries** — covers all leagueIds referenced by the 48 squads. Expanded during Sprint 9/10. Note: validate-data.js does NOT check leagueId against leagues.json; it only validates clubId against clubs.json. |
| `clubs.json` | **456 entries, 86 distinct leagueIds** — all clubs referenced by all 48 squads |
| `fixtures.json` | **72 group fixtures total. R1+R2 FT for Groups A–F (inc. ecu-cur 0-0 FT, tun-jpn FT June 21 early). Groups G–L R2 scheduled June 21–24. R3 all groups June 25–27.** |
| `standings.json` | **R2 complete for Groups A–F.** Qualified: mexico, canada, switzerland, usa, germany. Eliminated: bosnia-herzegovina, qatar, haiti, turkey. Groups G–L at R1 only. All others null. |
| `knockout.json` | R32 labels corrected against actual Wikipedia bracket (Sprint 13). All `homeTeamId`/`awayTeamId` null (R3 not complete). All 32 matches now have `kickoff` dates and `venue`. See Knockout Bracket section below for R32 structure. |
| `rankings.json` | Empty stub |
| `search-index.json` | **1,296 entries** — envelope format `{ version, lastUpdated, data }`. 48 team entries + 1,248 player entries. Regenerated by generate-search-index.js. |
| `player-photos.json` | **968/1,248 player URLs (77.6%)** + **45/48 manager URLs**. Total 1,296 entries (1,248 player + 48 manager). History: original 844 → Pass 1 +130 → Audit −22 = 952 → Pass 2 (Wikidata) net +16 = 968. 3 manager gaps: Haiti (Migné), Cape Verde (Bubista), Saudi Arabia (Donis). Schema: envelope `{ version, lastUpdated, data: Object }`. Player keys: `"{countryId}-{playerId-slug}"`. Manager keys: `"manager-{countryId}"`. Values: URL string or `null` (confirmed no image / failed QA). No `undefined` entries remain. |
| `players/france.json` | Complete — 26 players |
| `players/england.json` | Complete — 26 players |
| `players/brazil.json` | Complete — 26 players |
| `players/germany.json` | Complete — 26 players |
| `players/spain.json` | Complete — 26 players |
| `players/argentina.json` | Complete — 26 players |
| `players/portugal.json` | Complete — 26 players |
| `players/netherlands.json` | Complete — 26 players |
| `players/norway.json` | Complete — 26 players (Sprint 8) |
| `players/belgium.json` | Complete — 26 players (Sprint 8) |
| `players/usa.json` | Complete — 26 players (Sprint 8) |
| `players/japan.json` | Complete — 26 players (Sprint 8) |
| `players/morocco.json` | Complete — 26 players (Sprint 8) |
| `players/mexico.json` | Complete — 26 players (Sprint 9) |
| `players/south-korea.json` | Complete — 26 players (Sprint 9) |
| `players/south-africa.json` | Complete — 26 players (Sprint 9) |
| `players/czech-republic.json` | Complete — 26 players (Sprint 9) |
| `players/canada.json` | Complete — 26 players (Sprint 9) |
| `players/bosnia-herzegovina.json` | Complete — 26 players (Sprint 9) |
| `players/qatar.json` | Complete — 26 players (Sprint 9) |
| `players/switzerland.json` | Complete — 26 players (Sprint 9) |
| `players/haiti.json` | Complete — 26 players (Sprint 9) |
| `players/scotland.json` | Complete — 26 players (Sprint 9) |
| `players/australia.json` | Complete — 26 players (Sprint 9) |
| `players/turkey.json` | Complete — 26 players (Sprint 9) |
| `players/paraguay.json` | Complete — 26 players (Sprint 9) |
| `players/curacao.json` | Complete — 26 players (Sprint 9) |
| `players/ecuador.json` | Complete — 26 players (Sprint 9) |
| `players/ivory-coast.json` | Complete — 26 players (Sprint 9) |
| `players/sweden.json` | Complete — 26 players (Sprint 9) |
| `players/tunisia.json` | Complete — 26 players (Sprint 9) |
| `players/egypt.json` | Complete — 26 players (Sprint 9) |
| `players/iran.json` | Complete — 26 players (Sprint 9) |
| `players/new-zealand.json` | Complete — 26 players (Sprint 9) |
| `players/cape-verde.json` | Complete — 26 players (Sprint 9) |
| `players/saudi-arabia.json` | Complete — 26 players (Sprint 9) |
| `players/uruguay.json` | Complete — 26 players (Sprint 9) |
| `players/iraq.json` | Complete — 26 players (Sprint 9) |
| `players/senegal.json` | Complete — 26 players (Sprint 9) |
| `players/algeria.json` | Complete — 26 players (Sprint 9) |
| `players/austria.json` | Complete — 26 players (Sprint 9) |
| `players/jordan.json` | Complete — 26 players (Sprint 9) |
| `players/colombia.json` | Complete — 26 players (Sprint 9) |
| `players/dr-congo.json` | Complete — 26 players (Sprint 9) |
| `players/uzbekistan.json` | Complete — 26 players (Sprint 9) |
| `players/croatia.json` | Complete — 26 players (Sprint 9) |
| `players/ghana.json` | Complete — 26 players (Sprint 9) |
| `players/panama.json` | Complete — 26 players (Sprint 9) |

**All 48 squads are now populated. 1,248 players total.**

---

## DATA SCHEMAS — ACTUAL (not spec)

These are the live schemas in use. Always use these, not the original spec files.

### Player (`data/players/{countryId}.json`)

**Lean schema — used by ALL 48 squads:**

```json
{
  "id":       "france-mbappe",
  "name":     "Kylian Mbappé",
  "shirt":    10,
  "position": "FW",
  "dob":      "1998-12-20",
  "age":      27,
  "caps":     98,
  "goals":    56,
  "clubId":   "real-madrid",
  "captain":  true,
  "bio":      ""
}
```

**Optional sparse field** (only add when data confidence is low):
```json
"_verification": "caps uncertain — Wikipedia wikitext ambiguous"
```

Key rules:
- `shirt`: integer 1–26. Every squad must have each shirt number exactly once.
- `position`: exactly one of `"GK"`, `"DF"`, `"MF"`, `"FW"` (never DEF/MID/FWD)
- `captain`: exactly one `true` per squad, all others `false`
- `clubId`: must match an entry in `data/clubs.json`
- `id` convention: `{countryId}-{lastname-slug}`, disambiguation suffixes `-2`, `-a`/`-b`, or initials (e.g. `france-mbappe`, `paraguay-gomez-g` vs `paraguay-gomez-d`)
- `age` rule: birthday ≤ June 11 → `2026 − birth_year`; birthday > June 11 → `2026 − birth_year − 1` (tournament opens June 11, 2026)
- **DO NOT add** `marketValue`, `similarPlayerIds`, `recentForm`, `isOfficialSquad`, `isReserve` — legacy spec fields not used in the runtime

### Club (`data/clubs.json`)

```json
{ "id": "real-madrid", "name": "Real Madrid", "leagueId": "la-liga", "country": "Spain" }
```

456 clubs currently. `leagueId` values do NOT need to match `leagues.json` — the validator does not enforce this. `leagues.json` has 86 entries covering all leagues in current use, but freeform strings remain valid.

### League (`data/leagues.json`)

```json
{ "id": "premier-league", "name": "Premier League", "country": "England", "confederation": "UEFA" }
```

**86 entries** — covers all leagueIds referenced by the 48 squads. Fields: `id`, `name`, `country` (league's home country as string), `confederation` (UEFA/CAF/AFC/CONCACAF/CONMEBOL/OFC). Not exhaustive — do not require leagues.json coverage to add a club. The validator does NOT check leagueId resolution.

### Group (`data/groups.json`)

```json
{ "id": "A", "name": "Group A", "teamIds": ["mexico", "south-korea", "south-africa", "czech-republic"] }
```

`DataManager.loadGroups()` returns the array. GroupCarousel uses `group.id` and `group.name`.

### Country (`data/countries.json`)

```json
{
  "id": "france",
  "name": "France",
  "code": "FRA",
  "confederation": "UEFA",
  "fifaRanking": 2,
  "groupId": "I",
  "manager": "Didier Deschamps",
  "recentForm": null,
  "teamStrength": { "attack": 95, "midfield": 88, "defence": 82, "goalkeeping": 90, "depth": 91 }
}
```

`recentForm`: `null | string[]` — last 5 international results oldest→newest, e.g. `["W","D","W","W","L"]`. Set on countries, not players. Populate only from verified match data.

`teamStrength`: **populated for all 48 teams** (Sprint 12). Five axes, all 0–100: `{ attack, midfield, defence, goalkeeping, depth }`. Rendered as a radar chart in Compare Teams via `Charts.renderRadar(container, data)`.

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
          "played": 2, "won": 2, "drawn": 0, "lost": 0,
          "goalsFor": 6, "goalsAgainst": 2, "goalDifference": 4,
          "points": 6,
          "qualificationStatus": null
        }
      ]
    }
  ]
}
```

`teams` is sorted by position; `teams[0]` is always the current leader. Use `teamId` (not `countryId`). `qualificationStatus`: `null | "qualified" | "eliminated" | "playoff"`.

**qualificationStatus rules:**
- `"qualified"` — team has 6 pts AND only 1 other team has ≥ 4 pts (single threat can't dislodge top 2)
- `"eliminated"` — team has 0 pts AND two other teams each have ≥ 4 pts (3 pts from R3 cannot reach top 2)
- `null` — everything else
- **NEVER copy Wikipedia's provisional "qualified/eliminated" notes** — they appear after R1 and are not mathematically certain

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

`DataManager.loadKnockout()` returns the `data` array of round objects directly. R32 matches have `homeLabel`/`awayLabel` seed strings. R16+ slots null until winner propagation.

#### R32 bracket structure (verified Wikipedia June 2026)

The 2026 R32 is NOT 1A-vs-2B for every match. Three match types:

| Type | Count | Examples |
|------|-------|---------|
| Runner-up vs runner-up | 4 | `r32-m1` (2A/2B), `r32-m6` (2E/2I), `r32-m11` (2K/2L), `r32-m16` (2D/2G) |
| Group winner vs best-3rd | 8 | `r32-m7` (1A), `r32-m9` (1D), `r32-m13` (1B), plus 1E/1I/1L/1G/1K |
| Cross-group winner vs runner-up | 4 | `r32-m3` (1F/2C), `r32-m4` (1C/2F), `r32-m12` (1H/2J), `r32-m14` (1J/2H) |

Host nation home matches: Mexico (1A) → `r32-m7` at Azteca; USA (1D) → `r32-m9` at Levi's; Canada (1B) → `r32-m13` at BC Place.

R16 paths are non-sequential: `r32-m1`+`r32-m3` → `r16-m2`; `r32-m2`+`r32-m5` → `r16-m1`; `r32-m14`+`r32-m16` → `r16-m7`; `r32-m13`+`r32-m15` → `r16-m8` etc. Full map is in `scripts/update-knockout.js` PROPAGATION constant.

#### Best 3rd place assignment rule

8 of the 12 groups' 3rd-place teams advance. The 8 are ranked by points → GD → GF → FIFA ranking. Each R32 "Best 3rd" slot has a fixed list of eligible source groups:

| Match | Eligible groups |
|-------|----------------|
| `r32-m2` (M74) | A, B, C, D, F |
| `r32-m5` (M77) | C, D, F, G, H |
| `r32-m7` (M79) | C, E, F, H, I |
| `r32-m8` (M80) | E, H, I, J, K |
| `r32-m9` (M81) | B, E, F, I, J |
| `r32-m10` (M82) | A, E, H, I, J |
| `r32-m13` (M85) | E, F, G, I, J |
| `r32-m15` (M87) | D, E, I, J, L |

Which 4 of those slots gets which specific 3rd-place team depends on which combination of 8 groups actually advance 3rd-place teams — FIFA published 495 such combinations in tournament Annex C. Once R3 is complete (June 27), look up the applicable combination and assign accordingly. The homeLabel/awayLabel fields for those 8 matches already show the eligible groups; replace them with the specific seed (e.g. `"3rd A"`) when confirmed.

### Search Index (`data/search-index.json`)

**Envelope format** (same as other data files — NOT a bare array):
```json
{ "version": "1.0", "lastUpdated": "...", "data": [...] }
```

`DataManager.loadSearchIndex()` returns `json.data ?? []` — the caller receives the flat array.

Entry schemas:

```json
{ "type": "team",   "id": "france",        "label": "France",        "meta": "Group I · UEFA",               "href": "#france" }
{ "type": "player", "id": "france-mbappe", "label": "Kylian Mbappé", "meta": "France · FW · Real Madrid",    "href": "#france-mbappe" }
```

Player `href` is `#player-id` — a direct deep-link. The router parses this as `countryId + scrollToPlayer` (e.g. `#france-mbappe` → countryId `france`, scrollToPlayer `mbappe`).

**Always regenerate with:** `node scripts/generate-search-index.js` after any squad data change.

### Standard data file envelope

All data files use:
```json
{ "version": "1.0", "lastUpdated": "2026-06-20T00:00:00Z", "data": [] }
```

---

## ROUTING — COMPLETE MAP

```
Hash                  Module             Params
─────────────────────────────────────────────────────────────────
(empty) / #tournament TournamentCentre   {}
#today                TournamentCentre   { initialTab: 'today' }
#groups               TournamentCentre   { initialTab: 'groups' }
#group-a … #group-l   TournamentCentre   { initialTab: 'groups', groupId: 'A'…'L' }
#knockout             TournamentCentre   { initialTab: 'knockout' }
#france               TeamPage           { countryId: 'france' }
#france-mbappe        TeamPage           { countryId: 'france', scrollToPlayer: 'mbappe' }
#countries            CountriesPage      {}
#continents           ContinentsPage     {}
#statistics           StatisticsPage     {}
#league-explorer      LeagueExplorer     {}
#club-explorer        ClubExplorer       {}
#compare              CompareView        { teamA: null, teamB: null }
#compare/arg/ger      CompareView        { teamA: 'argentina', teamB: 'germany' }
(anything else)       NotFoundModule
```

**STUB_ROUTES is now empty. Every named route in the nav is functional.**

Group deep-link regex: `/^group-[a-l]$/` — matched before country route check. Letter extracted as `hash.slice(6).toUpperCase()`.

Compare route: matched as `hash === 'compare' || hash.startsWith('compare/')` — checked BEFORE the player-route loop so that `compare/ivory-coast/...` is not accidentally matched as a player deep-link. Separator is `/` (not `-`) because country IDs can contain hyphens but never `/`.

Player deep-link parsing: strip `{countryId}-` prefix from hash to get `scrollToPlayer`. e.g. `france-mbappe` → countryId `france`, scrollToPlayer `mbappe`.

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

`DataManager.loadPlayerPhotos()` is a **custom method** that does NOT use `#load()` — it returns `json.data` as an Object (key→URL map), not an array. Falls back to `{}` on error. Critical: do not route player-photos through `#load()` or it will return `{}` via the `?? []` fallback giving an empty array.

### 7. `behavior: 'instant'` for deep-link scrolls
Navigation-triggered carousel position changes use `behavior: 'instant'`. User-triggered arrow clicks use `behavior: 'smooth'`.

### 8. clubs.json vs leagues.json coverage
`leagues.json` has **86 entries** (expanded during Sprints 9/10 to cover all leagueIds in the 48 squads). When adding new clubs, any freeform `leagueId` string is still acceptable — the validator does NOT check leagueId resolution. `validate-data.js` checks that each player's `clubId` exists in `clubs.json`; it does NOT check that `leagueId` exists in `leagues.json`.

### 9. loadAllPlayers() — annotated player objects

`DataManager.loadAllPlayers()` returns all 1,248 players in a flat array. Each player object is a spread copy of the original player JSON **plus a `countryId` field** injected at load time. The per-team caches (`players-{id}`) are NOT mutated — the `countryId` annotation only exists on `all-players` cache entries. Use this method for any cross-team player comparison (Statistics page, League Explorer, Club Explorer).

```javascript
const allPlayers = await DataManager.loadAllPlayers();
// allPlayers[0] = { id: 'mexico-guardado', name: '...', countryId: 'mexico', ... }
```

### 10. Search overlay — persistent singleton
`SearchOverlay` is instantiated once in `app.js` and persists across navigations. It is NOT torn down by the router. Its `#index` array is loaded once and cached — no re-fetch on re-open.

### 10. Player ID disambiguation
When multiple players on the same squad share a surname, append a suffix:
- `-2` for a second player
- initials: `-g` / `-d` (e.g. `paraguay-gomez-g` vs `paraguay-gomez-d`)
- `-j` / `-l` for first-name initial (e.g. `curacao-bacuna-j` vs `curacao-bacuna-l`)
- `-a` / `-e` for position distinction if needed
Keep IDs globally unique across all 48 squads.

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

## SPRINT 6 — REMAINING WORK (rolling data sprint)

Sprint 6 is a rolling data-only sprint. No code changes — data updates only.

### Current state as of June 21, 2026
- Groups A–D: R1 + R2 complete (FT). qualificationStatus set for 8 teams.
  - Qualified: mexico (A), canada + switzerland (B), usa (D)
  - Eliminated: bosnia-herzegovina + qatar (B), haiti (C), turkey (D)
- Group E: R1 + R2 complete (FT). germany 2-1 ivory-coast; ecuador 0-0 curacao. Standings updated.
- Group F: R1 complete. ned-swe 5-1 complete. tun-jpn (June 21 04:00 UTC) — check for result.
- Groups G–L: R1 complete. R2 plays June 21–24. R3 for all groups plays June 25–27.
- Knockout round: labels, kickoffs, venues all populated. All teamId slots null — no confirmed qualifiers yet.

### R2 Update Windows

| Date (UTC) | Groups | Key fixture IDs |
|-----------|--------|----------------|
| June 20 | E, F | `e-r2-ger-civ`, `f-r2-ned-swe` |
| June 21 | E, F, G, H | `e-r2-ecu-cur`, `f-r2-tun-jpn`, `g-r2-bel-irn`, `h-r2-esp-ksa` |
| June 22 | G, H, I, J | `g-r2-nzl-egy`, `h-r2-uru-cpv`, `i-r2-fra-irq`, `j-r2-arg-aut` |
| June 23 | I, J, K, L | `i-r2-nor-sen`, `j-r2-jor-alg`, `k-r2-por-uzb`, `l-r2-eng-gha` |
| June 24 | K, L | `k-r2-col-cod`, `l-r2-pan-cro` |

R3 all play June 25–27 (simultaneous pairs per group, all 4 teams playing at once).

### Per-fixture update pattern

**fixtures.json:** For each completed match, set `"status": "FT"`, `homeScore`, `awayScore`.

**standings.json:** For the group containing the match, update all 4 teams' `played/won/drawn/lost/goalsFor/goalsAgainst/goalDifference/points/position`. Re-sort by: 1) points desc, 2) GD desc, 3) GF desc.

Apply `qualificationStatus` rules (see Data Schemas section above) after each R2 and again after R3.

### After all R3 complete (~June 27) → knockout.json
Populate `homeTeamId`/`awayTeamId` for all 16 R32 matches. Set `kickoff` and `venue` for R32 matches (June 28 onwards).

---

## WIKIPEDIA DATA WORKFLOW

### Fixtures and standings

Fetch individual group pages directly:
```
https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_Group_A
https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_Group_B
... (up to Group_L)
```
Fetch all needed groups in parallel. Convert local times to UTC using the venue offset table in DATA_ENTRY_GUIDE.md Section 15.

### Squad player data (if ever needed to add/correct a player)

The squads page is too large for a single WebFetch. **Do NOT use anchor URLs.**

**Use the section API:**
```
Step 1: GET section indices
https://en.wikipedia.org/w/api.php?action=parse&page=2026_FIFA_World_Cup_squads&prop=sections&format=json

Step 2: Fetch specific squad section by index
https://en.wikipedia.org/w/api.php?action=parse&page=2026_FIFA_World_Cup_squads&prop=wikitext&section=N&format=json
```

After writing any player file, always run:
```
node scripts/generate-search-index.js
npm run validate
```

---

## WHAT'S NEXT — CANDIDATE SPRINTS

All squad data is complete. The natural next work areas, in rough priority order:

### Sprint 6 continued (immediate) — Tournament data
Complete R2 for Groups E–L as results come in June 20–24, then R3 for all groups June 25–27. Populate knockout.json R32 once all groups complete. This is the most time-sensitive work.

### Sprint 20 (now) — R2+R3 data maintenance + knockout population ⚡ TIME-CRITICAL

R2 matches for Groups G–L: June 21–24. R3 for all 12 groups: June 25–27. R32 kick-off: June 28.

**Pre-June 28 checklist (MUST complete before first knockout match):**
- [ ] All 72 group fixtures FT with correct scores
- [ ] All 48 teams have non-null qualificationStatus
- [ ] All 16 R32 slots in knockout.json have homeTeamId/awayTeamId set
- [ ] Best-3rd assignment confirmed from FIFA Annex C (8 slots)
- [ ] `npm run validate` — zero errors
- [ ] Snapshot shows "Remaining: 32"

**R2 update windows:**

| Date (UTC) | Fixture IDs |
|-----------|-------------|
| June 21 (today) | `g-r2-bel-irn` (19:00), `h-r2-esp-ksa` (16:00), `h-r2-uru-cpv` (22:00) |
| June 22 | `g-r2-nzl-egy` (01:00), `i-r2-fra-irq` (21:00), `j-r2-arg-aut` (17:00) |
| June 23 | `i-r2-nor-sen` (00:00), `j-r2-jor-alg` (03:00), `k-r2-por-uzb` (17:00) |
| June 24 | `k-r2-col-cod`, `l-r2-eng-gha`, `l-r2-pan-cro` |

**R3:** All 12 groups play simultaneous pairs June 25–27. Full standings + qualificationStatus for all 48 teams.

**After R3:** Populate knockout.json R32 using final group standings + FIFA Annex C best-3rd lookup. Use `scripts/update-knockout.js` for subsequent round results.

### Sprint 20 (optional) — Photo Pass 2: Wikidata P18 fallback
Remaining 296 nulls include many players with valid Wikipedia articles that have no lead image but have a Wikidata image (P18). Approach: for each null entry, query Wikidata `wbgetentities` by sitelink (`enwiki` article title from the search API) → read `claims.P18[0].mainsnak.datavalue.value` → construct `https://commons.wikimedia.org/wiki/Special:FilePath/{filename}` URL. Expected gain: ~30–50 additional photos. `isSuspicious()` and duplicate-URL rejection are already in place. This is lower priority than tournament data maintenance.

### Sprint 22 — Manager photo gap recovery + Photo Pass 3
3 managers still null (Migné/Haiti, Bubista/Cape Verde, Donis/Saudi Arabia). Their Wikipedia articles exist but have no lead image — Wikidata P18 may recover them. Set `GATHER_MANAGERS=true` + add a Wikidata fallback phase for managers, OR manually supply photo URLs. Low priority vs tournament data.

Also: 280 player nulls remain. A targeted Pass 3 could try alternate search qualifiers (remove "footballer", add birth year, add nationality) for the hardest-to-find entries. Low expected yield vs effort.

### Post-June 28 — Knockout maintenance (rolling)
Populate R32 results as they happen (June 28 – July 6), propagate winners to R16. Use `scripts/update-knockout.js --match <id> --home N --away N`. Maintain R16 → QF → SF → Final through July 19.

---

## KNOWN ISSUES / DEFERRED

- ~~Nav active state: `#today`, `#group-a` etc. didn't highlight any nav link~~ — **Fixed Sprint 5A**
- ~~`getPlayerResolved()` in data.js used `player.leagueId` which doesn't exist~~ — **Fixed Sprint 5B**
- ~~Fixtures tab on TeamPage was a placeholder stub~~ — **Implemented Sprint 5B**
- ~~Search overlay not implemented~~ — **Implemented Sprint 7**
- ~~Stats tab on TeamPage was a placeholder stub~~ — **Implemented Sprint 11** (`js/modules/stats-tab.js`)
- ~~Compare view not implemented~~ — **Implemented Sprint 12** (`js/modules/compare-view.js`)
- ~~**CompareView silent failure**~~ — **Fixed Sprint 19.** `#runComparison()` now resets `#cv-result` to the prompt state before returning if countryA/B is not found.
- ~~**Live score null render**~~ — **Fixed Sprint 18.** `#matchCard()` now uses `homeScore ?? 0` and `awayScore ?? 0`.
- No club badges (CSS fallback active).
- `data/rankings.json` empty — Rankings component not implemented.
- `scotland-gordon` age (43, DOB 1982-12-31) triggers a validator DOB-range warning — expected and benign (Craig Gordon is genuinely 43; the DOB_MIN=1984 bound is a soft warning, not fatal).
- `jordan-zito` has `_verification: "caps/club uncertain"` — data confidence flag, no action needed.
- `uzbekistan.json` has two players with identical name "Eldor Shomurodov" (shirt 9 and shirt 14, different IDs) — cosmetic data quality issue. Validator passes because IDs are unique. Shirt 14 (`uzbekistan-shomurodov`) is the real captain at Istanbul Başakşehir; shirt 9 (`uzbekistan-turgunboev`) is a different player entered with the wrong name.
- `scripts/update-standings.js`, `scripts/generate-player-bios.js`, `scripts/generate-rankings.js` are stubs. `update-knockout.js` and `gather-photos.js` are fully implemented.

---

## HOW TO START A SESSION

1. Read this document fully.
2. Read `TASK_BREAKDOWN.md` for the detailed task list with statuses.
3. If implementing a module, read the relevant section of `IMPLEMENTATION_BLUEPRINT.md`.
4. If entering data, read `DATA_ENTRY_GUIDE.md` before touching any JSON.
5. After any squad data change: run `node scripts/generate-search-index.js` then `npm run validate`.
6. Pick up from the next uncompleted task. Do not re-implement completed work.
