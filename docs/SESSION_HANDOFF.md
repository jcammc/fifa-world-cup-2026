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
- `docs/LIVE_DATA_PLAN.md` — live data pipeline implementation — football-data.org + Netlify Blob Store + Scheduled Functions. **Implemented Sprint 25.** See §8 of that doc for deviations from the original plan.

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
| Sprint 6 | Tournament data maintenance (rolling). All 48 matchday 1+2 results synced via `sync-data.mjs` (June 24). R3 completed June 25–27. R32 began June 28. qualificationStatus set for all 48 teams; R32 homeTeamId/awayTeamId populated via live pipeline. | **COMPLETE** |
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
| Sprint 22 — Squad Audit | Wikipedia squad section API audit across all 48 teams. 23 accurate, 1 minor fix (Cape Verde: "Mário Rosa" → "Mércio Rosa"), 12 full replacements (Morocco, USA, Japan, Austria, Uzbekistan, Ghana, Panama, Belgium, Norway, Colombia, DR Congo, Croatia) — pre-submission stale data. clubs.json expanded from 456 → 488 entries. search-index.json regenerated (1,296 entries). Uzbekistan duplicate-name bug (two players named "Eldor Shomurodov") resolved by squad replacement. **Note:** the git commit for this work is mislabeled "Sprint 14" — actual Sprint 14 was photo architecture. Cannot be amended; document inconsistency only. | **COMPLETE** |
| Sprint 22 — Manager Profiles | `managerTenure` + `managerFormerPosition` added to all 48 countries.json entries. `data/managers.json` created: 48 entries (object-keyed by countryId), each with `career[]` (managerial appointments), `playerClubs[]` (max 3 notable clubs), `honours[]` (major titles, role-labeled Manager/Player). `DataManager.loadManagers()` + `loadManager(countryId)` added. Accordion UI in overview-tab.js: tenure shown in accent colour below meta line; `<details>/<summary>` "Career & Honours" section with career timeline, player clubs, honour chips. player-photos.json reconciled after squad replacements: 200 orphaned keys removed, 200 new players gathered via gather-photos.js normal mode. Final state: 1,296 total keys (996 URLs + 300 null). | **COMPLETE** |
| Sprint 23 | Desktop layout & information density. `max-width` lifted from 960px/1100px to `var(--max-content-width)` across Tournament Centre, League Explorer, Club Explorer, Countries. Compare Teams radar promoted to primary position (full-width, above cv-body). cv-body 2-col grid at ≥1280px. Statistics Dashboard `.sp-sections` 2-col grid at ≥1280px; scorers section gains squad goal totals column. Club Explorer and League Explorer 2-col item lists at ≥1280px. | **COMPLETE** |
| Sprint 24 | Part A: Compare Teams consistency fix — `.cv-page` no longer overrides padding from `.page-content` (was `var(--space-4) 0 var(--space-8)`, zero horizontal padding was the root cause); `.cv-title` font-size corrected 2xl→3xl to match all other page titles. Part B: Tournament Centre fixture rail — Today's Matches tab removed; desktop gets a sticky ~240px rail (Live→Today→Recent→Coming Up sections); mobile gets a horizontal strip above the tabs. Default tab changed to Groups. Part C: Live data implementation plan written to `docs/LIVE_DATA_PLAN.md`. | **COMPLETE** |
| Sprint 25 | Live data pipeline (initial implementation). `data/api-team-map.json` — 48-entry map of football-data.org numeric team IDs → internal country slugs. `scripts/sync-data.mjs` — one-shot Node script to pull current scores/standings from API and write directly to local JSON files (`npm run sync-data`); tested and synced 12 matchday 2 results. `netlify/functions/sync-tournament.mjs` — Netlify Scheduled Function (every 2 min) + `netlify/functions/live-data.mjs` — HTTP read endpoint. `js/data.js` — `loadFixtures/loadStandings/loadKnockout` try `/api/live` first on production, fall back to static files locally. `package.json` — `@netlify/blobs` dep + `sync-data` script. `netlify.toml` — `esbuild` bundler + schedule. | **COMPLETE** |
| Sprint 25+ | **Live data pipeline redesign** (post-R32 debugging, 2026-06-28). Root cause found: Netlify scheduled functions do not receive `NETLIFY_BLOBS_CONTEXT`, so `getStore()` was a silent no-op — the Blob Store had never been written to; the app had always been serving static files. Fix: `live-data.mjs` completely rewritten as a cache-aside pipeline — it now owns both the API fetch and the Blob Store write. `sync-tournament.mjs` effectively disabled (BLOBS_TOKEN not set). Also fixed: `mergeKnockout()` reversed home/away key lookup fallback (API and static knockout.json could disagree on home/away team order, causing silent slot skips). CDN caching removed (`no-store`). See `docs/LIVE_DATA_PLAN.md` §9 and `docs/ENGINEERING_PRINCIPLES.md` for full post-mortem. | **COMPLETE** |
| Sprint 26 | Match Centre page and bracket wiring. `js/modules/match-centre.js` — new `#match/{fixtureId}` route resolving group fixtures and knockout rounds; header (flag, team name, score/time, venue, broadcaster), group standings snapshot with participating teams highlighted. `js/router.js` — `match/` route registered before the player deep-link loop. Knockout bracket cards converted from `<div>` to `<a href="#match/{id}">` links. `#projectionKey()` translation helper added to KnockoutBracket — bridges knockout.json compact labels (`"1A"`, `"3rd C/E/F/H/I"`) to buildBracketProjection() map keys (`"Winner Group A"`, `"best-third-r32-m7"`). **Bug fixed:** without this translator, bracket projection silently returned null for every slot. `styles/match-centre.css` created (`mc-` namespace). | **COMPLETE** |
| Sprint 27 | Tournament Intelligence. `data/annex-c.json` — 246 FIFA Annex C combinations (one-shot generated by `scripts/gen-annex-c.mjs`). `js/tournament-state.js` — new pure utility module (no DOM, no fetching): `rankBestThirds()`, `getAdvancingThirdGroups()`, `lookupAnnexC()`, `getGroupProjection()`, `buildBracketProjection()`, `getMatchImplication()`. DataManager: `#loadRaw()` for object-valued JSON, `loadAnnexC()`, `invalidateLive()`, `LIVE_KEYS`. TournamentCentre: 50s `setTimeout` polling loop, Page Visibility API pause, in-place DOM updates for snapshot/strip/rail; snapshot 4 stats (Qualified/Eliminated/Played/Remaining); `● Live / Updated HH:MM BST` indicator. GroupCarousel `update(standings, fixtures)` API (saves/restores scrollLeft). KnockoutBracket `update()` API + full Annex C projected bracket + confirmed slot styling (green border + ✓) + round date ranges + split confidence badges (confirmed/likely/open). `js/modules/best-thirds.js` + `styles/best-thirds.css` — `#best-thirds` page: ranked table, position-9 cutline, tiebreaker note, 8 slot assignment cards linking to Match Centre. Match Centre V2 — 7 enrichment sections: form strips, What's at stake (chip + position line + W/D/L scenario rows), group standings, managers, captains, radars (post-innerHTML pattern). `getMatchImplication()` upgraded to `{status, text}` return. | **COMPLETE** |
| Sprint 29 | Match events data model + broadcaster icons. **`data/match-events.json`** — object-envelope file keyed by fixture ID; `events[]` array with `type` discriminator; minute stored as string ("45+2"). 78/104 fixtures populated (Group K rate-limited, Group D R2-R3 incomplete template). **`scripts/gather-match-events.mjs`** — Wikipedia scraper for `{{#invoke:football box\|main}}` templates; 429 retry with 5/10/15s backoff; per-box result categories (populated/skipped/rate_limited/incomplete_template/no_fixture_match/unknown_fifa_code); summary table at end of run. **`js/broadcasters.js`** (new shared module) — `BROADCASTERS` config object + `broadcasterBadge(broadcaster, status, opts)` helper; FT matches return `''`; `stopProp` option for nested-link cards. **`styles/broadcasters.css`** (new) — `.bc-badge`, `.bc-badge__logo` (height 22px, width auto), `.bc-badge--live` pulse animation, "Watch Live" chip; context overrides for rail/strip cards (18px) and Match Centre header (26px). **`assets/broadcasters/bbc-iplayer.svg`** + **`itvx.svg`** — SVG brand marks (BBC three-block B/B/C; ITVX navy "itvX" italic). Match Centre V3: goals timeline section (`#buildGoalsSection`, `#buildGoalRow`) and MOTM section (`#buildMotmSection`) rendered for FT matches. Statistics page: tournament top scorers section (`#renderTournamentScorers`) added at top — aggregates goals from match-events, shows top 20 by goals scored. TournamentCentre + MatchCentre both updated to import from `js/broadcasters.js` (removed per-module `#broadcasterHtml()` methods). DataManager: `loadMatchEvents()` via `#loadRaw()`. All R32 matches have `broadcaster` populated in `knockout.json`. | **COMPLETE** |
| Sprint 30 | Knockout bracket absolute positioning + SVG connectors. Bracket cards use JS-computed absolute positions rather than CSS flexbox, enabling pixel-accurate connector lines drawn as SVG overlays. | **COMPLETE** |
| Sprint 31 | Match Centre deep enrichment. **Completed matches:** full events timeline (`#buildEventsSection`) — goals + yellow/red cards + substitutions in three-column Home\|Minute\|Away grid layout, with CSS card icons (10×13px amber/red `<span>`). Man of the Match section. **Upcoming matches:** previous starting XI + derived formation (`#buildPreviousLineupSection`); yellow card suspension tracker (`#buildSuspensionSection` — Group + R32 + R16 phases only, resets before QF). **All matches:** head-to-head World Cup history callout (`#buildHeadToHeadSection`); captain bio snippet when populated. **New data scripts:** `scripts/gather-head-to-head.mjs` → `data/match-previews.json` (88 entries, group + R32); `scripts/gather-guardian-bios.mjs` (manual DevTools fallback required — bios remain empty until user extracts `__NEXT_DATA__`). **Enhanced `gather-match-events.mjs`:** now parses Wikipedia lineup tables for formations, starting XIs, yellow/red cards, substitutions — all four event types populated. **New data file:** `data/match-previews.json`. **Group K gap:** still rate-limited — re-run `npm run gather-match-events`. | **COMPLETE** |

---

## WHAT IS IMPLEMENTED

### JS modules (`js/`)

| File | Status | Notes |
|------|--------|-------|
| `app.js` | Complete | Entry point — ThemeManager, Nav, Router.init(), SearchOverlay.init() |
| `router.js` | Complete | Hash routing, all current routes wired. **Sprint 26:** `match/` route added (before player deep-link loop). **Sprint 27:** `best-thirds` route added. Nav active state now treats `match/*` and `best-thirds` as Tournament Centre (highlights `#tournament` nav link). |
| `data.js` | Complete | DataManager singleton, #cache Map, all loaders. **Sprint 25:** `#loadLive(key, staticUrl, type)` tries `/api/live?type={type}` on production (IS_LIVE = hostname is not localhost/127.0.0.1), falls back to static file if that fails or is not yet populated. `loadFixtures/loadStandings/loadKnockout` now route through `#loadLive`. All other loaders (countries, groups, clubs, leagues etc.) continue to use `#load` against static files. `loadPlayerPhotos()` (returns Object not array — custom loader, not #load()), `loadAllPlayers()` (parallel fetch all 48 squads, annotates each player with `countryId`, caches under `'all-players'`), `loadManagers()` (returns Object keyed by countryId — custom loader, same pattern as loadPlayerPhotos), `loadManager(countryId)` (calls loadManagers(), returns single entry or null). **Sprint 27:** `#loadRaw(key, url)` — stores full JSON object without `data ?? []` unwrapping (used for object-valued files like annex-c.json). `loadAnnexC()` uses `#loadRaw`. `invalidateLive()` evicts `LIVE_KEYS = ['fixtures','standings','knockout']` from cache — called by TournamentCentre poll cycle. **Sprint 31:** `loadMatchPreviews()` via `#loadRaw('match-previews', 'data/match-previews.json')` — returns full envelope `{ version, lastUpdated, data: { [fixtureId]: { headToHead, source } } }`. |
| `tournament-state.js` | **New (Sprint 27)** | Pure utility module — no DOM, no fetching. Full function list: `deriveRecentForm(teamId, fixtures, maxResults=5)` — derives W/D/L form from live fixtures array (each result includes `{ result, opponentId, scored, conceded, kickoff }`); replaces the static `recentForm` field in countries.json for match-centre display. `deriveQualificationStatus(entry, allGroupStandings)` — rule-based derivation of `'qualified' | 'eliminated' | null` when the stored field is null (used by TournamentCentre snapshot, buildBracketProjection). `rankBestThirds(standings)` — returns 3rd-place entries sorted by points → GD → GF. `getAdvancingThirdGroups(standings)` — top 8 group letters. `lookupAnnexC(annexCData, advancingGroups)` — key is 8 sorted group letters joined (e.g. `"ABCDFGIL"`), returns `{ [matchId]: groupLetter }` or null. `getGroupProjection(groupStandings)` — `{ winner, runnerUp, complete }`. `buildBracketProjection(standings, annexCData)` — returns Map of slot label → `{ teamId, confidence }` for all R32 slots. `getMatchImplication(team, groupStandings, allGroupStandings?)` — returns `{ status, text } | null`; status: `'qualified' | 'eliminated' | 'leading' | 'contention' | 'danger'`; optional third arg provides cross-group context for deriveQualificationStatus. |
| `time.js` | Complete | `formatKickoff()`, `isToday()` |
| `utils.js` | Complete | `escapeHtml()` |
| `theme.js` | Complete | localStorage, data-theme attribute toggle |
| `bio.js` | Stub | 10-line runtime fallback only |
| `charts.js` | Complete | `Charts.renderRadar(container, data)` — 5-axis SVG spider chart. `data`: `{ attack, midfield, defence, goalkeeping, depth }` all 0–100. |
| `modules/nav.js` | Complete | Top nav, hash-based active link, #search-trigger wired |
| `modules/team-page.js` | Complete | TeamPage — 4-tab shell, tab switching, `scrollToPlayer` param |
| `modules/squad-tab.js` | Complete | Squad tab — position groups, Auto-Focus IntersectionObserver |
| `modules/profile-panel.js` | Complete | Singleton panel — player stats, club badge, bio, similar players |
| `modules/overview-tab.js` | Complete | Hero cards, captain highlight, fixture strip, group standing. Imports `DataManager` — calls `DataManager.loadManager(country.id)` in `render()`. Manager profile section (Sprint 21+22): `#renderManager(country, managerData)` renders 72px photo + name / nationality · age · former-position meta line + tenure in accent colour + bio. `#renderManagerAccordion(data)` renders `<details>/<summary>` "Career & Honours" element: managerial career list (years column + club), player clubs paragraph, honours list with Manager/Player role chips. `#managerAge(dob)` computes age at tournament start (June 11 2026). Photo keyed as `manager-{countryId}` in photoMap. Initials fallback via `getInitials()`. |
| `modules/stats-tab.js` | **Complete** | Experience (caps leaderboard), International Goals (scorers), Squad Profile (avg age, youngest/oldest, by-position age). Constructor: `(container, country, players)` — all computation inline, no DataManager calls. |
| `modules/fixtures-tab.js` | Complete | Group-stage results + W/D/L indicators, TC deep-links (#group-x, #knockout), knockout pending state |
| `modules/tournament-centre.js` | Complete | 2-tab shell (Group Stage / Knockout Stage) — Today's Matches tab removed (Sprint 24). `#renderSnapshot()` counts both group + knockout played/remaining. Desktop: sticky ~240px fixture rail via `#renderRail()` showing Live → Today → Recent → Coming Up sections (`#railCard()`). Mobile: horizontal scrolling strip above tabs via `#renderFixtureStrip()` / `#stripCard()`. Default tab: groups. `#allFixturesWithKickoff()` merges group fixtures + knockout matches with a kickoff date. **Sprint 27:** 50s `setTimeout` polling loop (`POLL_INTERVAL_MS = 50_000`), Page Visibility API pauses when tab hidden. Snapshot updated to 4 stats: Qualified/Eliminated/Played/Remaining (derived from standings). `● Live / Updated HH:MM BST` polling indicator — shows "Updated just now" for 3 s then settles to timestamp. `#snapshotEl.outerHTML = ...` re-renders snapshot in-place; `#pollIndicatorEl` saved and re-queried after each outerHTML swap (outerHTML invalidates the stored ref). Active tab module dispatched via `tabModule.update()` on each poll cycle. **Sprint 29:** Broadcaster badges now use `broadcasterBadge()` from `js/broadcasters.js` — renders SVG logo image inside `<a>` link; `stopProp: true` prevents card navigation when badge is clicked; FT matches get no badge. |
| `modules/group-carousel.js` | Complete | 12 group cards, standings tables, fixture strips, drag/wheel/arrow nav, `scrollToGroup()`. **Sprint 27:** `update(standings, fixtures)` API — saves `scrollLeft`, patches each `.group-card` innerHTML, restores `scrollLeft`. |
| `modules/knockout-bracket.js` | Complete | Horizontal bracket, 5 rounds, seed labels, wheel redirect. **Sprint 26:** bracket cards converted to `<a href="#match/{id}">` links. `#projectionKey(label, matchId)` translates compact knockout.json labels (`"1A"` → `"Winner Group A"`, `"3rd C/E/F/H/I"` → `"best-third-{matchId}"`) to buildBracketProjection() keys. **Sprint 27:** `update()` API (saves/restores scroll position). Full Annex C projected bracket via `buildBracketProjection()`. Confirmed team slots: green left border + `✓` score indicator (`.bracket-team--confirmed`). Round date ranges in column headers via `#roundDateRange()` — parses date-only kickoff strings by string-splitting (avoids UTC midnight timezone issue). Split confidence badges: `bracket-conf--confirmed` (green + border ring) / `--likely` (plain green) / `--open` (amber). "Best third-place teams →" footer link. |
| `modules/match-centre.js` | Complete | **Sprint 26:** `#match/{fixtureId}` page. Resolves fixture from `fixtures.json` then `knockout.json`. Header: large flags, score/time, venue, broadcaster badge. Group standings snapshot (8 cols, participating teams highlighted). **Sprint 27 (V2):** When both teams confirmed, loads squad data (captain) + player photos in a second `Promise.all`. Enrichment sections (hidden for TBD slots): Form strips (W/D/L coloured dots, home right-aligned), What's at stake (chip + `1st · 4 pts · GD +1` position line + W/D/L scenario rows with `#qualNote()` for MD3), Group standings, Managers (name/nationality/tenure), Captains (photo/placeholder, player link, C badge), Team Strength radars. Section order: Form → Stakes → Standings → Managers → Captains → Radar. Radars: rendered post-innerHTML into live DOM via `Charts.renderRadar()`. **Sprint 29 (V3):** `matchEvents` loaded in parallel `Promise.all`. For FT matches: goals timeline (`#buildGoalsSection` — chronological, home/away two-column layout, ⚽ + minute + scorer + assist) and MOTM section (`#buildMotmSection`). Broadcaster badge now via `broadcasterBadge()` from `js/broadcasters.js` (SVG logo, not text label). **Sprint 31 (V4):** `matchPreviews` loaded alongside `matchEvents` in `render()`. `#buildEventsSection` replaces `#buildGoalsSection` — three-column CSS grid (`1fr 40px 1fr`), handles all four event types (goal/yellow_card/red_card/substitution). CSS card icons: `<span class="mc-event__yc">` (amber) / `<span class="mc-event__rc">` (red) instead of emoji for reliable cross-platform rendering. `#buildHeadToHeadSection` — World Cup history callout for all matches with confirmed teams, sourced from `matchPreviews`. `#buildPreviousLineupSection` — for upcoming matches: shows last known starting XI + derived formation for each team, sourced from `matchEvents`. `#buildSuspensionSection` — for upcoming matches in Group/R32/R16 phase only: aggregates `yellow_card` events per player across all FT matches, shows at-risk (1 yellow) and suspended (2+ yellows). Phase detection: `inAccumulationPhase = !!(fixture.groupId \|\| roundLabel === 'Round of 32' \|\| roundLabel === 'Round of 16')`. Captain cards: show `captain.bio.slice(0,160)` snippet when bio is populated. |
| `modules/best-thirds.js` | **New (Sprint 27)** | `#best-thirds` page. Loads standings + annex-c + countries + knockout. Ranked table of all 12 groups' 3rd-place teams (points → GD → GF). Position 9 gets `.bt-row--cutline` (thick top border separator). ADV/OUT badges when all groups complete. Tiebreaker note section. Annex C slot assignment cards: flag, team name link, confidence badge (confirmed/likely/open), kickoff date (from `#fmtDate()` — string-split to avoid timezone issues), "View match →" link to `#match/{matchId}`. `styles/best-thirds.css` — `bt-` namespace, 307 lines, responsive (2-col slots grid at ≤480px). |
| `modules/search-overlay.js` | **Complete** | Ctrl+K or nav button trigger, relevance-scored results (exact→prefix→contains→word-prefix→subsequence→Levenshtein), diacritic normalisation, team/player results, player deep-link nav |
| `modules/compare-view.js` | **Complete** | Two `<select>` dropdowns grouped by optgroup (Group A–L). URL scheme `#compare/teamA/teamB` via `history.replaceState`. Sections: Experience, International Goals, Squad Profile, Squad Makeup, Team Strength (radar, conditional on teamStrength). Winner highlighting for Experience/Goals. Silent failure fixed (Sprint 19): if `#runComparison()` can't find countryA/B in `this.#countries`, it now resets `#cv-result` to the prompt state rather than leaving "Loading comparison…" forever. |
| `modules/countries-page.js` | **Complete** | 48 nations grouped by tournament group A–L, sorted within each group, 4-wide card grid with flag + FIFA ranking + confederation. Reuses `cp-` CSS namespace from countries.css. |
| `modules/statistics-page.js` | **Complete** | Tournament-wide stats. **Sprint 29:** First section is Tournament Top Scorers — loads `matchEvents`, aggregates goals by `scorer::teamId` key across all matches, renders top 20 in ranked list with flag + name + goals count (stat cards: total goals, scorers count). Subsequent sections: Squad Experience (caps leaderboard, top 10 squads + top 15 players), Career International Scorers (caveat: career goals, not WC 2026 goals), Tournament Demographics, Club & League Representation. Uses `loadAllPlayers()` + `loadMatchEvents()`. CSS namespace `sp-`. Player rows are `<a href="#playerId">` links. |
| `modules/continents-page.js` | **Complete** | 48 nations grouped by confederation (UEFA, CONMEBOL, CAF, AFC, CONCACAF, OFC) sorted by FIFA ranking within each section. Team count badge on each section heading. Reuses all `cp-` CSS classes. |
| `modules/league-explorer.js` | **Complete** | Ranked list of all 86 leagues by player count. 3 summary stat cards. Real-time search filters by league name + country. Click-to-expand rows show all clubs sorted by player count with nation flag strips (up to 8 flags + overflow). One expanded at a time. Confederation colour-coded badges. CSS namespace `le-`. |
| `modules/club-explorer.js` | **Complete** | ~452 clubs ranked by player count (clubs currently referenced by 48 squads). Search-first (real-time name filter). 2+/all toggle (default: 231 clubs with 2+ players; active search overrides toggle). Nation flags per club (up to 8, each an `<a href="#countryId">` linking to team page), +N overflow. Empty state with clear button. CSS namespace `ce-`. |

### Netlify Functions (`netlify/functions/`)

| File | Role |
|------|------|
| `live-data.mjs` | On-demand HTTP endpoint at `/api/live?type=fixtures\|standings\|knockout`. **Primary data pipeline — cache-aside pattern.** On each request: (1) reads Blob Store for the requested type; (2) returns immediately if cached data is < 90 s old (based on `lastUpdated`); (3) if stale or missing, fetches from football-data.org API (`/competitions/WC/matches` + `/standings`), fetches static base files from the live site, merges all three data types using inline merge functions, writes all three to Blob Store, then returns the requested type. Cache-Control: `no-store`. Falls back to stale Blob data if the API call fails; returns 503 only when Blob Store is empty AND the API is unavailable. Requires `FOOTBALL_DATA_API_KEY` + `URL` env vars. Logs `"live-data: refreshed — N FT, N live, N KO completed"` on each refresh. |
| `sync-tournament.mjs` | Scheduled Function — runs every 2 min (`*/2 * * * *` cron). **Currently effectively disabled.** Fails early in its guard checks because `BLOBS_TOKEN` env var is intentionally not set. Makes no API calls and writes nothing. Left in the codebase as a reference and in case explicit-credential Blob writes become necessary in future. **Root cause of disablement:** Netlify does not inject `NETLIFY_BLOBS_CONTEXT` into scheduled functions (only HTTP-triggered functions receive it), so `getStore()` calls from a scheduled function are silent no-ops that write nothing to the real Blob Store without throwing errors. All live data work is handled by `live-data.mjs`. |

### CSS files (`styles/`)

All files exist and are fully implemented unless noted:
- `main.css` — custom properties, CSS reset
- `theme.css` — light/dark colour tokens
- `layout.css` — page grid, `.page-content` max-width
- `nav.css` — top nav bar
- `team-page.css` — TeamPage tabs, squad layout, manager accordion styles (`.tp-manager__tenure`, `.tp-manager__details`, `.tp-manager__toggle`, `.tp-manager__expanded`, `.tp-mgr-career`, `.tp-mgr-honours`, `.tp-mgr-honour__role--manager/--player`)
- `squad.css` — squad cards, position group headers
- `profile-panel.css` — sticky side panel
- `tournament-centre.css` — snapshot, tabs, match cards, group leaders. Sprint 24 additions: `.tc-layout` (flex row), `.tc-main`, `.tc-rail` (sticky 240px, desktop), `.tc-rail__inner/section/label/label--live/empty`, `.tc-rail-card/--live/__teams/__team/__score/__time/__meta`, `.tc-fixture-strip` (hidden desktop, flex on mobile), `.tc-strip-card/--live/__row/__team/__score/__time/__badge/--live`
- `carousel.css` — GroupCarousel, standings table, fixture strip, broadcaster badges
- `knockout.css` — horizontal bracket, round columns, team slots. **Sprint 27:** `.bracket-round__header` flex-column with `.bracket-round__dates` sub-line. `.bracket-team--confirmed` (green left border + subtle bg). `.bracket-team__score--confirmed` (green ✓). `.bracket-conf--confirmed` (green + border ring) / `--likely` (plain green) / `--open` (amber). `.bracket-footer` + `.bracket-footer__link`.
- `broadcasters.css` — **New (Sprint 29).** Shared broadcaster badge styles. `.bc-badge` (inline-flex, opacity 0.92, hover brightness). `.bc-badge__logo` (height 22px, width auto). `.bc-badge--live` pulse animation on logo (2.5s opacity cycle). `.bc-badge__live` "Watch Live" chip (hidden by default, shown on `--live`). Context overrides: rail/strip cards 18px, Match Centre header 26px. Legacy `.badge--bbc/.badge--itv` text badge classes preserved.
- `match-centre.css` — **New (Sprint 26), V2 (Sprint 27), V3 (Sprint 29), V4 (Sprint 31).** `mc-` namespace. Base: page wrapper, back link, header, teams/flags, score/time, meta. Sprint 27 V2: `.mc-section` (border-top sections), form strips (`.mc-form__dot--w/d/l`), stake cards (`.mc-stake__card`, `.mc-stake__pos`, `.mc-stake__scenarios`, `.mc-stake__scenario--win/draw/loss`, `.mc-stake__chip--qualified/eliminated/leading/contention/danger`), radars (`.mc-radars` 2-col, stacks 1-col ≤480px), managers, captains. `.mc-standings` has `padding-bottom` (moved to mid-page in V2 reorder). Sprint 29 V3: `.mc-goals`, `.mc-goal-row` (2-col grid home/away), `.mc-goal-row__home/away`, `.mc-goal__assist`, `.mc-goals__none`, `.mc-motm`. Sprint 31 V4: `.mc-event-row` (3-col grid `1fr 40px 1fr`), `.mc-event-row__home/min/away`, `.mc-event-row--goal/yellow-card/red-card/substitution`, `.mc-event__yc` (amber CSS square 10×13px), `.mc-event__rc` (red CSS square 10×13px), `.mc-event__sub-on/sub-off/name`, `.mc-hth` (left-bordered italic blockquote), `.mc-lineups` (2-col grid), `.mc-lineup__pos-group/pos-label/players`, `.mc-susp` (2-col grid), `.mc-susp__player/at-risk/suspended`, `.mc-captain__bio` (xs italic muted text).
- `best-thirds.css` — **New (Sprint 27).** `bt-` namespace: page, back link, header/status badges, section titles, rankings table (`.bt-row--advancing`, `.bt-row--cutline` thick top border), rank/ADV/OUT badges, tiebreaker section, slot grid (`auto-fill minmax(200px,1fr)`), slot cards with confidence badges (`.bt-slot__conf--confirmed/--likely/--open`), match links. 2-col slots grid at ≤480px.
- `compare.css` — **Complete** (selectors, duel rows, headers, radar section, responsive). Sprint 24: `.cv-page` padding removed (now inherits from `.page-content`); `.cv-title` font-size corrected to `var(--font-size-3xl)`.
- `search.css` — **Complete** (overlay, modal, result groups, empty state, responsive)
- `countries.css` — **Complete** (`cp-` namespace: page, group sections, 4-wide card grid, flag + meta cards, responsive breakpoints at 960px/640px)
- `stats-global.css` — **Complete** (`sp-` namespace: page, header, loading state, two-col layout, player rows, squad rows, caveat note, stat cards)
- `league-explorer.css` — **Complete** (`le-` namespace: header, stat cards, search input, row list, expand/collapse rows, confederation badges with per-conf colours, club rows with flag strips, responsive)
- `club-explorer.css` — **Complete** (`ce-` namespace: header, stat cards, controls row, search input, 2+/all toggle button group, club rows with flag links, empty state, responsive)
- `utilities.css` — badge classes (badge--ft, badge--live, badge--bbc, badge--itv, empty-state)

### Scripts (`scripts/`)

| File | Status | Notes |
|------|--------|-------|
| `sync-data.mjs` | **Complete (Sprint 25)** | One-shot live data sync. Fetches `/v4/competitions/WC/matches` + `/v4/competitions/WC/standings` from football-data.org, maps API numeric team IDs via `data/api-team-map.json`, updates `data/fixtures.json` (group stage scores/statuses), `data/standings.json` (full table, preserves qualificationStatus), `data/knockout.json` (scores + teamIds when API populates them). Run: `npm run sync-data`. Requires Node 18+ (built-in fetch). API key read from `FOOTBALL_DATA_API_KEY` env or falls back to hardcoded token. |
| `gen-annex-c.mjs` | **Complete (Sprint 27, one-shot)** | Generated `data/annex-c.json` from hardcoded raw rows. Already run — do not re-run unless the Annex C data changes. Source: Wikipedia API `action=parse&prop=wikitext` for the FIFA Annex C table. |
| `validate-data.js` | **Complete** | Checks all 48 squads: 26 players, shirts 1–26, 1 captain, valid positions (GK/DF/MF/FW), clubId in clubs.json, DOB 1984–2009, cross-squad duplicate IDs, `_verification` flag reporting. Run: `npm run validate` |
| `generate-search-index.js` | **Complete** | Reads countries.json + clubs.json + all player files → writes data/search-index.json in envelope format. Run: `node scripts/generate-search-index.js` |
| `download-flags.js` | **Complete** | Downloads 48 flag SVGs from `flagcdn.com/{code}.svg` to `assets/flags/{country-id}.svg`. Requires Node 18+. Non-obvious: Scotland→gb-sct, England→gb-eng, DR Congo→cd, Ivory Coast→ci, Curaçao→cw, Cape Verde→cv. Run: `node scripts/download-flags.js` |
| `generate-player-bios.js` | Stub | |
| `generate-rankings.js` | Stub | |
| `update-standings.js` | Stub | |
| `update-knockout.js` | **Complete** | Records a knockout match result + propagates winner to next round. Args: `--match <id> --home <n> --away <n> [--pen-home N --pen-away N] [--dry-run] [--no-propagate] [--force]`. SF losers propagate to 3rd-place automatically. PROPAGATION map verified against Wikipedia bracket (non-sequential R32 paths). |
| `gather-photos.js` | **Complete** | Four modes (set exactly one flag `true`, rest `false`): `RETRY_NULLS=true` (Pass 1 — Search API retry for null player entries); `GATHER_MANAGERS=true` (manager photos — stores as `manager-{countryId}` keys); `WIKIDATA_PASS=true` (Pass 2 — Wikidata P18 fallback for remaining nulls); all false (normal — exact-title lookup for undefined entries). `isSuspicious()` rejects placeholders, logos, crests, SVG thumbnails, federation/association images. `runRetryPass()` + `runWikidataPass()` both have post-batch duplicate-URL rejection. **Critical bug fixed:** `runWikidataPass()` Phase D now builds `existingUrls` from the full photoMap before scanning — prevents re-assigning a URL already held by another player. All flags currently `false`. Manager search uses `"football manager"` qualifier. 45s cooldown + 2s per-request. Run: `node scripts/gather-photos.js`. |
| `gather-match-events.mjs` | **New (Sprint 29), enhanced (Sprint 31)** | Wikipedia scraper for group + knockout match events (goals, MOTM, formations, lineups, cards, substitutions). Fetches `{{#invoke:football box\|main}}` templates from Wikipedia group pages and round pages via `action=parse&prop=wikitext`. Also parses the `{| width="100%"}` lineup table that follows each football box — two inner `{| style="font-size:90%"}` tables (home first, away second) contain starting XIs, yellow/red card templates, and sub templates. **Formation derivation:** counts DEF/MID/FWD position tiers from starters → `"X-Y-Z"` string. Cannot distinguish 4-2-3-1 from 4-5-1 (simple tier counts). **Event parsing from lineup tables:** `{{yel\|N}}` → yellow_card; `{{sent off\|X\|N}}` → red_card; `{{suboff\|N}}`/`{{subon\|N}}` → substitution pairs matched by minute + table order. **Idempotency:** skips when BOTH motm AND homeStarting populated; use `--force` to overwrite. **429 retry:** `fetchWikitext()` retries up to 3× with 5/10/15s backoff. **FIFA code map:** 48-team `FIFA_TO_ID` mapping (extended with CZE, CUW, JOR). **Known gaps:** Group K (6 matches) consistently rate-limited — re-run during off-peak hours; Group D R2-R3 (4 matches) Wikipedia LST issue. Run: `npm run gather-match-events`. Idempotent: re-run to pick up newly available data as tournament progresses. |
| `gather-head-to-head.mjs` | **New (Sprint 31)** | Extracts World Cup head-to-head narrative text from Wikipedia group/round pages. For each `===Team A v Team B===` section heading, extracts the prose paragraph that appears before the `{{#invoke:football box}}` call. Strips wiki markup via `cleanWikiText()` (strips file links first to avoid image caption artifacts, then resolves `[[Link\|Display]]`, template calls, bold/italic, ref tags). Maps country name variants to internal IDs via `NAME_TO_ID` (~50 entries). Writes to `data/match-previews.json`. Idempotent — skips already-populated entries. Run: `npm run gather-head-to-head`. |
| `gather-guardian-bios.mjs` | **New (Sprint 31)** | Attempts to fetch The Guardian's WC 2026 player guide JSON for bio data. CDN and page fetches are all blocked by their anti-bot CDN — **automated fetch always fails**. **Manual fallback (required):** (1) open the Guardian URL in a browser; (2) open DevTools console; (3) run `copy(JSON.stringify(window.__NEXT_DATA__))`; (4) paste into a new file `data/guardian-raw.json`; (5) run `npm run gather-guardian-bios` — script reads the local file, fuzzy-matches player names, writes bio text to `bio` field in each player file. Run: `npm run gather-guardian-bios`. |

**npm scripts** (`package.json`):
```
npm run sync-data            → node scripts/sync-data.mjs              (pull live scores/standings from API)
npm run gather-match-events  → node scripts/gather-match-events.mjs    (Sprint 29/31 — scrape Wikipedia match events, lineups, cards, subs)
npm run gather-head-to-head  → node scripts/gather-head-to-head.mjs   (Sprint 31 — scrape Wikipedia h2h narrative → match-previews.json)
npm run gather-guardian-bios → node scripts/gather-guardian-bios.mjs  (Sprint 31 — parse guardian-raw.json → player bio fields)
npm run validate             → node scripts/validate-data.js
npm run pre-deploy           → validate && generate-bios && generate-rankings && build-search-index
```
After any squad data change: `node scripts/generate-search-index.js` then `npm run validate`.

**Dependencies** (`package.json`): `@netlify/blobs ^8.1.0` added (Sprint 25) — used by Netlify Functions only, not the SPA itself.

---

## DATA FILES — CURRENT STATE

| File | Status |
|------|--------|
| `countries.json` | Complete — all 48 teams, all 48 managers. Manager fields: `manager`, `managerNationality`, `managerDob`, `managerBio`, `managerTenure` (e.g. `"2018–present"`), `managerFormerPosition` (e.g. `"Defender"`, `""` for non-players like Nagelsmann/Rangnick/Tuchel). 14 entries have `_verificationManager` flags. `teamStrength` populated for all 48 teams (Sprint 12). `recentForm` expands as results arrive; constraint: WC 2026 group matches + WC 2026 qualifiers ONLY — no friendlies or other tournaments. |
| `managers.json` | **New (Sprint 22)** — 48 entries, object-keyed by countryId. Each: `career[]` (managerial appointments, chronological, `{ role, club, years }`), `playerClubs[]` (max 3 notable clubs as player, empty array if never played professionally), `honours[]` (major titles only, `{ title, year, role: "Manager"\|"Player" }`). Lazy-loaded per team via `DataManager.loadManager(countryId)`. |
| `groups.json` | Complete — all 12 groups A–L |
| `leagues.json` | **86 entries** — covers all leagueIds referenced by the 48 squads. Expanded during Sprint 9/10. Note: validate-data.js does NOT check leagueId against leagues.json; it only validates clubId against clubs.json. |
| `clubs.json` | **488 entries** — lookup file for all squads. ~452 currently referenced by the 48 squads; remainder are legacy entries from replaced squads retained for stability. |
| `api-team-map.json` | **New (Sprint 25)** — maps football-data.org numeric team IDs to internal country slugs. 48 entries. Used by `scripts/sync-data.mjs` and `netlify/functions/sync-tournament.mjs`. Do not edit unless football-data.org changes its team IDs (unlikely). |
| `annex-c.json` | **New (Sprint 27)** — 246 FIFA Annex C combinations. Schema: `{ version, source, slotGroups, combinations: { "ABCDFGIL": { "r32-m7": "H", ... } } }`. Key is 8 sorted group letters joined. Value maps matchId → group letter for each best-third slot. Loaded via `DataManager.loadAnnexC()` which uses `#loadRaw()` (object-valued — do NOT use `#load()`, it returns `{}` via `data ?? []`). Generated by `scripts/gen-annex-c.mjs` (one-shot, already run). |
| `match-events.json` | **New (Sprint 29), enhanced (Sprint 31)** — object-keyed by fixture ID. ~78 entries with full lineup and event data (goals, yellow/red cards, substitutions). **Group K (6 matches): rate-limited — re-run `npm run gather-match-events` to populate.** Group D R2-R3 (4 matches): Wikipedia LST issue. R16/QF/SF/Final: populate as matches are played. Schema: `{ version, lastUpdated, data: { [fixtureId]: { events[], motm, homeFormation, awayFormation, homeStarting[], awayStarting[], homeSubs[], awaySubs[] } } }`. All four event types now parsed from Wikipedia lineup tables. Loaded via `DataManager.loadMatchEvents()` → `#loadRaw()`. |
| `match-previews.json` | **New (Sprint 31)** — object-keyed by fixture ID. 88 entries (all 48 group fixtures + all 32 R32 matches). R16/QF/SF/Final not yet on Wikipedia. Schema: `{ version, lastUpdated, data: { [fixtureId]: { headToHead: string, source: "Wikipedia" } } }`. Head-to-head narrative extracted from the prose paragraph before each football box in Wikipedia group/round pages. Loaded via `DataManager.loadMatchPreviews()` → `#loadRaw()`. Run `npm run gather-head-to-head` to refresh or pick up new round pages. |
| `fixtures.json` | **72 group fixtures total. R1+R2 FT for all 12 groups (last synced June 24 via sync-data.mjs). R3 (matchday 3) all groups scheduled June 25–27.** From Sprint 25, `lastUpdated` timestamp reflects last sync run, not last manual edit. |
| `standings.json` | **R2 complete for all 12 groups (last synced June 24).** Qualified: mexico, canada, switzerland, usa, germany, netherlands. Eliminated: bosnia-herzegovina, qatar, haiti, turkey. qualificationStatus null for all other teams. From Sprint 25, standings are synced from API — do not manually edit the `played/won/drawn/lost/gf/ga/gd/points` fields as they will be overwritten on next sync. `qualificationStatus` is preserved through syncs and must still be set manually. |
| `knockout.json` | R32 labels corrected against actual Wikipedia bracket (Sprint 13). All `homeTeamId`/`awayTeamId` null (R3 not complete). All 32 matches now have `kickoff` dates and `venue`. See Knockout Bracket section below for R32 structure. |
| `rankings.json` | Empty stub |
| `search-index.json` | **1,296 entries** — envelope format `{ version, lastUpdated, data }`. 48 team entries + 1,248 player entries. Regenerated by generate-search-index.js. |
| `player-photos.json` | **1,296 total entries** (48 manager + 1,248 player keys). 996 with photo URL, 300 confirmed-null (no image or failed QA). History: original 844 → Pass 1 +130 → Audit −22 = 952 → Pass 2 (Wikidata) net +16 = 968 → Sprint 22 squad audit reconcile: −200 orphaned (replaced squad old IDs) → gather-photos normal mode: +200 new player entries → current state. 3 manager gaps remain: Haiti (Migné), Cape Verde (Bubista), Saudi Arabia (Donis). Schema: envelope `{ version, lastUpdated, data: Object }`. Player keys: `"{countryId}-{slug}"`. Manager keys: `"manager-{countryId}"`. Values: URL string or `null`. No `undefined` entries. |
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

**488 entries** in clubs.json (expanded to 488 during Sprint 22 squad audit — new clubs added for replaced squads). `leagueId` values do NOT need to match `leagues.json` — the validator does not enforce this. `leagues.json` has 86 entries covering all leagues in current use, but freeform strings remain valid.

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
  "managerNationality": "French",
  "managerDob": "1968-12-15",
  "managerBio": "...",
  "managerTenure": "2012–present",
  "managerFormerPosition": "Midfielder",
  "recentForm": null,
  "teamStrength": { "attack": 95, "midfield": 88, "defence": 82, "goalkeeping": 90, "depth": 91 }
}
```

`managerTenure`: format `"YYYY–present"` or `"YYYY–YYYY"`. Use the year formally appointed to the current role.

`managerFormerPosition`: playing position as a footballer — `"Goalkeeper"`, `"Defender"`, `"Midfielder"`, `"Forward"`, or `""` for managers with no significant professional playing career (e.g. Nagelsmann, Rangnick, Tuchel). 14 entries have `_verificationManager` flags indicating uncertain data.

`recentForm`: `null | string[]` — last 5 results oldest→newest, e.g. `["W","D","W","W","L"]`. **WC 2026 group matches + WC 2026 qualifiers ONLY — no friendlies or other tournaments.** Set on countries, not players.

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

### Manager (`data/managers.json`)

**Object-keyed** — `data` is an object, NOT an array (unlike every other data file):

```json
{
  "version": "1.0",
  "lastUpdated": "2026-06-22T00:00:00Z",
  "data": {
    "argentina": {
      "career": [
        { "role": "Manager", "club": "Argentina U20", "years": "2018" },
        { "role": "Manager", "club": "Argentina (caretaker)", "years": "2018" },
        { "role": "Manager", "club": "Argentina", "years": "2018–present" }
      ],
      "playerClubs": ["Deportivo La Coruña", "Lazio", "West Ham United"],
      "honours": [
        { "title": "Copa América", "year": "2021", "role": "Manager" },
        { "title": "FIFA World Cup", "year": "2022", "role": "Manager" },
        { "title": "Copa América", "year": "2024", "role": "Manager" }
      ]
    }
  }
}
```

Rules:
- `career`: managerial roles only (no playing career), chronological, most recent last. Include caretaker/interim if notable.
- `playerClubs`: max 3 most notable clubs where the manager played as a professional. Empty array `[]` if they never played professionally.
- `honours`: MAJOR titles only — World Cup, continental trophies (Euro/Copa América/AFCON/etc.), top domestic leagues (PL/Bundesliga/La Liga/Serie A/Ligue 1), UCL. NOT minor cups or lower-league titles. `role` must be exactly `"Manager"` or `"Player"`.
- Loaded via `DataManager.loadManagers()` (caches full object) + `DataManager.loadManager(countryId)` (returns single entry or null).
- **Do NOT route through `DataManager.#load()`** — that assumes arrays and would return `{}` via the `?? []` fallback.

### Match Events (`data/match-events.json`)

**Object-keyed** — `data` is an object, NOT an array. Use `DataManager.loadMatchEvents()` which calls `#loadRaw()`.

```json
{
  "version": "1.0",
  "lastUpdated": "2026-06-29T...",
  "data": {
    "a-r1-mex-rsa": {
      "events": [
        { "type": "goal",        "minute": "14",   "teamId": "mexico",       "scorer": "Lozano",  "assistBy": null },
        { "type": "yellow_card", "minute": "17",   "teamId": "south-africa", "player": "Mokoena" },
        { "type": "red_card",    "minute": "88",   "teamId": "south-africa", "player": "Tau" },
        { "type": "substitution","minute": "66",   "teamId": "mexico",       "offPlayer": "Gutiérrez", "onPlayer": "Mora" }
      ],
      "motm": "Hirving Lozano",
      "homeFormation": "4-3-3",
      "awayFormation": "5-3-2",
      "homeStarting": [
        { "name": "Raúl Rangel", "pos": "GK", "shirt": 1 }
      ],
      "awayStarting": [
        { "name": "Ronwen Williams", "pos": "GK", "shirt": 1 }
      ],
      "homeSubs": [
        { "name": "Gilberto Mora", "pos": "MF", "shirt": 19, "onMinute": "66" }
      ],
      "awaySubs": [
        { "name": "Sibusiso Vilakazi", "pos": "MF", "shirt": 22, "onMinute": "72" }
      ]
    }
  }
}
```

**Minute format:** Always a **string** — `"14"`, `"45+2"`, `"90+6"`. Never a plain integer. Display as `${minute}'` in UI.

**Event types (all four populated from Wikipedia lineup tables as of Sprint 31):**
- `goal`: `{ type, minute, teamId, scorer, assistBy }`
- `yellow_card`: `{ type, minute, teamId, player }`
- `red_card`: `{ type, minute, teamId, player }`
- `substitution`: `{ type, minute, teamId, offPlayer, onPlayer }`

**Lineup fields:**
- `homeFormation` / `awayFormation`: derived string e.g. `"4-3-3"`. Derived from position tier counts (DEF/MID/FWD) of the 11 starters. **Known limitation:** cannot distinguish 4-2-3-1 from 4-5-1 — both produce `"4-5-1"`. This is an accepted approximation.
- `homeStarting` / `awayStarting`: array of `{ name, pos, shirt }` for 11 starters. `pos` uses Wikipedia abbreviations (GK/CB/LB/RB/DM/CM/AM/ST/LW/RW etc.) — NOT the 4-value position set used in player files.
- `homeSubs` / `awaySubs`: array of `{ name, pos, shirt, onMinute }`. `onMinute` is a string or null.

**Lineup data source:** NOT the football box template. The `{| width="100%"}` wiki table that follows each `{{#invoke:football box|main}}` call, containing two inner `{| style="font-size:90%"}` tables (home first, away second).

**Do NOT route through `DataManager.#load()`** — it returns `{}` via `data ?? []` fallback for object envelopes.

---

### Match Previews (`data/match-previews.json`)

**Object-keyed** — `data` is an object, NOT an array. Use `DataManager.loadMatchPreviews()` which calls `#loadRaw()`.

```json
{
  "version": "1.0",
  "lastUpdated": "2026-06-30T...",
  "data": {
    "a-r1-mex-rsa": {
      "headToHead": "Mexico and South Africa had met three times previously at the FIFA World Cup...",
      "source": "Wikipedia"
    }
  }
}
```

**Coverage:** 88 entries — all 48 group stage fixtures + all 32 R32 matches. R16/QF/SF/Final entries will appear once Wikipedia editors create those pages; run `npm run gather-head-to-head` to pick them up.

**Source text:** Extracted from the prose paragraph that precedes each `{{#invoke:football box|main}}` call within each `===Team A v Team B===` section in Wikipedia group/round pages. Markup stripped by `cleanWikiText()` — file links stripped entirely first (avoids image caption artifacts), then `[[Link|Display]]` → Display, template calls removed, bold/italic removed.

**Displayed as:** An italic left-bordered blockquote callout in Match Centre under "World Cup history" heading — shown for all matches where both teams are confirmed.

**Do NOT route through `DataManager.#load()`** — use `DataManager.loadMatchPreviews()`.

---

### Standard data file envelope

All data files use:
```json
{ "version": "1.0", "lastUpdated": "2026-06-20T00:00:00Z", "data": [] }
```

**Exception:** `player-photos.json` and `managers.json` use `data: Object` (not array). Both have custom loaders (`loadPlayerPhotos()`, `loadManagers()`) that do not call `#load()`.

---

## ROUTING — COMPLETE MAP

```
Hash                  Module             Params
─────────────────────────────────────────────────────────────────
(empty) / #tournament TournamentCentre   {}
#today                TournamentCentre   { initialTab: 'today' }  ← DEPRECATED (Sprint 24): Today tab removed; route now falls through to default (groups)
#groups               TournamentCentre   { initialTab: 'groups' }
#group-a … #group-l   TournamentCentre   { initialTab: 'groups', groupId: 'A'…'L' }
#knockout             TournamentCentre   { initialTab: 'knockout' }
#match/{fixtureId}    MatchCentre        { fixtureId: string }   ← Sprint 26
#best-thirds          BestThirds         {}                       ← Sprint 27
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

Match Centre route: `hash.startsWith('match/')` — checked BEFORE the player deep-link loop. `fixtureId` = `hash.slice(6)`. Resolves against `fixtures.json` first, then `knockout.json` rounds.

Best-thirds route: `hash === 'best-thirds'` — checked between `match/` and player deep-link loop.

Nav active state: `match/*` and `best-thirds` both resolve to `#tournament` nav link (they are contextual pages reachable from Tournament Centre).

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

### 11. managers.json — object-keyed, custom loader

`data/managers.json` uses `{ data: Object }` not `{ data: Array }`. **Do NOT load it through `DataManager.#load()`** — that method unwraps via `json.data ?? []`, which would silently return an empty array for an object value.

Use the dedicated loaders:
```javascript
// Load whole map (cached after first call)
const managers = await DataManager.loadManagers();  // { argentina: {...}, france: {...}, ... }

// Load single entry
const data = await DataManager.loadManager('argentina');  // { career, playerClubs, honours } | null
```

This is the same pattern as `loadPlayerPhotos()` — the two files that use object envelopes both have standalone methods outside `#load()`.

### 12. Live data — #loadLive and the IS_LIVE flag

`js/data.js` uses `IS_LIVE = !['localhost', '127.0.0.1'].includes(window.location.hostname)` to decide whether to try the Netlify live endpoint.

- **On production (Netlify):** `loadFixtures/loadStandings/loadKnockout` call `#loadLive()`, which fetches `/api/live?type=fixtures` etc. The live-data function handles freshness internally (cache-aside, 90s TTL in Blob Store). On any failure or error response, `#loadLive()` silently falls through to `#load(staticUrl)`. The fall-through is intentional — it means locally-cached static data is always available as a last resort.
- **On localhost:** `IS_LIVE` is false, `#loadLive()` skips the network attempt entirely and goes straight to the static file. No failing request on localhost.
- **DataManager cache:** A plain Map that persists for the page lifetime. Live data is fetched at most once per page load under normal navigation. The exception is `TournamentCentre`, which runs a 50-second polling loop (via `setTimeout`) that calls `DataManager.invalidateLive()` to evict the three live keys, then re-fetches to trigger an in-place DOM update. Outside of `TournamentCentre`, no other module polls or refreshes live data — the SPA reads fresh data on each page navigation.
- **invalidateLive():** Evicts only `LIVE_KEYS = ['fixtures', 'standings', 'knockout']` from the cache. All other loaders (countries, players, clubs, etc.) are unaffected.
- **Do not add** `IS_LIVE` checks to loaders for static data (countries, squads, clubs, etc.) — those files don't change at runtime.

### 13. Player ID disambiguation
When multiple players on the same squad share a surname, append a suffix:
- `-2` for a second player
- initials: `-g` / `-d` (e.g. `paraguay-gomez-g` vs `paraguay-gomez-d`)
- `-j` / `-l` for first-name initial (e.g. `curacao-bacuna-j` vs `curacao-bacuna-l`)
- `-a` / `-e` for position distinction if needed
Keep IDs globally unique across all 48 squads.

### 14. `#loadRaw()` — object-valued JSON files

`DataManager.#load(key, url)` unwraps via `json.data ?? []` — for object-valued files this silently returns `{}` (matched by `?? []`? No — actually `{}` is truthy, so `json.data ?? []` returns `{}`, but callers that iterate it as an array get nothing). Use `#loadRaw(key, url)` instead — it stores and returns the full JSON object without unwrapping.

Files that use `#loadRaw()`:
- `annex-c.json` → `DataManager.loadAnnexC()` — `{ version, source, slotGroups, combinations: { "ABCDFGIL": {...} } }`
- `match-events.json` → `DataManager.loadMatchEvents()` — `{ version, lastUpdated, data: { [fixtureId]: { events[], motm, homeFormation, awayFormation, homeStarting[], awayStarting[], homeSubs[], awaySubs[] } } }` **(Sprint 29/31)**
- `match-previews.json` → `DataManager.loadMatchPreviews()` — `{ version, lastUpdated, data: { [fixtureId]: { headToHead, source } } }` **(Sprint 31)**

Files with custom loaders (same concept — do NOT route through `#load()`):
- `player-photos.json` → `DataManager.loadPlayerPhotos()` — returns `json.data` as Object
- `managers.json` → `DataManager.loadManagers()` — returns `json.data` as Object

Any new object-envelope data file must use `#loadRaw()` or a custom loader — never `#load()`.

### 15. `Charts.renderRadar()` — must be called after innerHTML is set

`Charts.renderRadar(container, data)` creates SVG elements and appends them to `container`. The container element must already be in the live DOM (attached to the document) when `renderRadar` is called — it uses `getBoundingClientRect()` / layout methods that return zero for detached elements.

```javascript
// CORRECT — set innerHTML first, then query the now-live container, then render
this.#container.innerHTML = buildPageTemplate();
const homeRadar = this.#container.querySelector('.mc-radar--home');
Charts.renderRadar(homeRadar, homeStrength);

// WRONG — storing a ref before innerHTML, then calling renderRadar on a detached element
const homeRadar = document.createElement('div');
// ...
this.#container.innerHTML = buildPageTemplate(); // homeRadar is now detached
Charts.renderRadar(homeRadar, homeStrength);     // renders into void
```

### 16. `outerHTML` reassignment invalidates stored DOM refs

When a module does `el.outerHTML = newHtml`, the original `el` reference becomes a detached node — it is no longer in the document. Any previously stored ref to that element (or its descendants) must be re-queried after the swap.

```javascript
// TournamentCentre polling — snapshot re-render
this.#snapshotEl.outerHTML = this.#renderSnapshot(data);
// this.#snapshotEl is now detached — re-query immediately
this.#snapshotEl = this.#container.querySelector('.tc-snapshot');
// Same for poll indicator inside the snapshot
this.#pollIndicatorEl = this.#container.querySelector('.tc-poll-indicator');
```

This pattern appears in `tournament-centre.js` poll cycle. Any future in-place DOM swap using `outerHTML` must follow the same re-query pattern.

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

**From Sprint 25, scores and standings are automated.** `npm run sync-data` replaces all manual `fixtures.json` and `standings.json` score editing. What remains manual: `qualificationStatus`, best-3rd knockout slot assignment, and `recentForm`.

### Current state as of June 24, 2026
- All 48 matchday 1+2 results: synced via `sync-data.mjs` (June 24). All FT.
- qualificationStatus set: mexico (A), canada + switzerland (B), usa (D), germany (E), netherlands (F). Eliminated: bosnia-herzegovina + qatar (B), haiti (C), turkey (D).
- R3 (matchday 3): all 12 groups play June 25–27 (simultaneous pairs — all 4 teams per group play at once).
- Knockout: labels, kickoffs, venues all populated. All `homeTeamId`/`awayTeamId` null — no confirmed qualifiers yet.

### After R3 completes (~June 27)

1. Run `npm run sync-data` — confirms all 72 group results and updates standings tables.
2. Set `qualificationStatus` manually for all remaining teams in `data/standings.json`:
   - Top 2 per group → `"qualified"`
   - Bottom 2 per group (eliminated from top-2 contention) → `"eliminated"`
   - 3rd-place teams advancing → `"qualified"` (after FIFA Annex C confirmed)
   - 3rd-place teams eliminated → `"eliminated"`
3. Identify the 8 advancing 3rd-place teams from FIFA Annex C. Update their `homeLabel`/`awayLabel` in `knockout.json` from e.g. `"3rd A/B/C/D/F"` to the specific `"3rd X"` seed.
4. The automated sync will populate `homeTeamId`/`awayTeamId` in `knockout.json` as the API assigns teams to R32 slots. Verify these are correct before June 28.
5. Confirm `npm run validate` — zero errors. Snapshot should show "Remaining: 32".

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

### Guardian player bios (manual, one-time)

The Guardian's WC 2026 player guide is blocked by their anti-bot CDN — WebFetch and all automated Node.js fetches fail.

**Manual extraction steps:**
1. Open the Guardian WC 2026 player guide URL in a browser
2. Open DevTools → Console
3. Run: `copy(JSON.stringify(window.__NEXT_DATA__))`
4. Create `data/guardian-raw.json` and paste the copied JSON
5. Run: `npm run gather-guardian-bios`

The script reads `guardian-raw.json`, walks the JSON tree to find the player array, normalises names (diacritic-stripping for fuzzy matching), and writes bio text to the `bio` field in each `data/players/{team}.json` file. Reports matched / unmatched counts.

**Current state:** All player `bio` fields are empty strings `""` — Guardian bios not yet fetched.

### Yellow card suspension rules (WC 2026)

Cards accumulate across **Group Stage + Round of 32 + Round of 16**. Two yellow cards in this accumulation phase = automatic 1-match ban for the next match. Cards **reset before the Quarter-Finals** — a player with 1 yellow heading into the QF has a clean slate.

The Match Centre suspension tracker (`#buildSuspensionSection`) only renders for fixtures in the accumulation phase:
```javascript
const inAccumulationPhase = !!(
  fixture.groupId ||
  roundLabel === 'Round of 32' ||
  roundLabel === 'Round of 16'
);
```

Players with 1 accumulated yellow are shown as "at risk"; 2+ yellows means "suspended".

---

## WHAT'S NEXT — CANDIDATE SPRINTS

**Operating model (binding rule):** Operational track (fixtures/standings/knockout maintenance — short JSON edits) runs in parallel with the feature track and never blocks it. Finish a feature sprint → concise summary → note any pending operational items → immediately identify and begin next highest-value feature sprint. No automatic "prioritization reviews" between sprints unless: major architectural issue arises, significant data quality problem, priorities materially change, or explicitly requested.

---

### Operational (ongoing, not sprint work)

**Live data pipeline is now active and redesigned (Sprint 25+).** `live-data.mjs` is the primary pipeline — it fetches from football-data.org, merges all three data types, writes to Blob Store, and returns data in a single cache-aside request. `sync-tournament.mjs` is effectively disabled (BLOBS_TOKEN not set). Manual `npm run sync-data` is available for immediate one-shot updates to local JSON files.

**Current phase: Round of 32 (began June 28).** R32 matches run June 28 – July 6. Scores and team IDs update automatically via `live-data.mjs`.

**Still requires manual action:**
- Knockout result propagation — run `scripts/update-knockout.js --match <id> --home N --away N` after each R32–Final result to propagate winners to the next round.
- Any corrections to venues or non-score fields.

**Pre-June 28 checklist (HISTORICAL — all completed as of 2026-06-28):**
- [x] All 72 group fixtures FT with correct scores
- [x] All 48 teams have non-null qualificationStatus
- [x] All 16 R32 slots homeTeamId/awayTeamId populated
- [x] Best-3rd assignment confirmed (Annex C lookupAnnexC() verified)
- [x] `npm run validate` — zero errors; Snapshot shows "Remaining: 32"

**Ongoing knockout maintenance (June 28 – July 19):**
Populate R32–Final results as they happen, propagate winners. Use `scripts/update-knockout.js --match <id> --home N --away N`. SF losers auto-propagate to third-place match.

---

### Sprint 28 — complete

**Sprint 28 – Completed 2026-06-28/29:**
- [DONE] Live data pipeline redesign (cache-aside architecture in live-data.mjs)
- [DONE] mergeKnockout reversed home/away key lookup fix
- [DONE] Sprint 6 tournament operations (R3 results, qualificationStatus, R32 bracket population)
- [DONE] Documentation audit (SESSION_HANDOFF, LIVE_DATA_PLAN, DECISIONS, ENGINEERING_PRINCIPLES)

---

### Sprint 31 — complete

**Sprint 31 – Completed 2026-06-30:**
- [DONE] `scripts/gather-match-events.mjs` enhanced — Wikipedia lineup table parsing (formations, starting XIs, yellow/red cards, substitutions); all four event types now populated
- [DONE] `scripts/gather-head-to-head.mjs` (new) — Wikipedia h2h narrative extraction
- [DONE] `data/match-previews.json` (new) — 88 entries (group + R32)
- [DONE] `scripts/gather-guardian-bios.mjs` (new) — Guardian bios pipeline with manual DevTools fallback
- [DONE] `DataManager.loadMatchPreviews()` via `#loadRaw()`
- [DONE] Match Centre V4 — full events timeline (3-col grid, CSS card icons), head-to-head callout, previous XI + formation, suspension tracker, captain bio snippet
- [KNOWN GAP] Group K (6 matches): rate-limited during run — re-run `npm run gather-match-events`
- [PENDING] Guardian bios: manual `__NEXT_DATA__` extraction required before bios populate

---

### Sprint 29 — complete

**Sprint 29 – Completed 2026-06-29:**
- [DONE] `data/match-events.json` — new object-keyed data file for match events
- [DONE] `scripts/gather-match-events.mjs` — Wikipedia scraper with 429 retry, per-box categorised reporting, summary table
- [DONE] `js/broadcasters.js` — shared broadcaster config + `broadcasterBadge()` helper with SVG logos
- [DONE] `styles/broadcasters.css` — shared badge styles, live pulse animation, context overrides
- [DONE] `assets/broadcasters/bbc-iplayer.svg` + `itvx.svg` — SVG brand mark assets
- [DONE] Match Centre V3 — goals timeline + MOTM sections for FT matches
- [DONE] Statistics page — tournament top scorers section (aggregated from match-events)
- [DONE] TournamentCentre + MatchCentre updated to use `broadcasterBadge()` (logo icons, not text labels)
- [DONE] `DataManager.loadMatchEvents()` via `#loadRaw()`
- [DONE] All R32 matches have broadcaster assignments in knockout.json

**Remaining from Sprint 29 scope:**
- Group K (6 matches): rate-limited by Wikipedia — run `npm run gather-match-events` again during off-peak hours
- Group D R2-R3 (4 matches): Wikipedia LST issue — boxes parse as incomplete templates; needs investigation of section-based fetching
- R16/QF/SF/Final events: will populate as games are played + Wikipedia pages update

---

**Candidate feature sprints (next):**

**Knockout maintenance (rolling, now active)**
Populate R32–Final results as they happen (June 28 – July 19). Use `scripts/update-knockout.js --match <id> --home N --away N`. Maintain bracket through Final.

**Photo Pass 3 — manager gap recovery + harder player nulls**
3 managers still null (Migné/Haiti, Bubista/Cape Verde, Donis/Saudi Arabia). ~300 player nulls remain.

**Knockout bracket live updates**
As R32/R16/QF/SF results land, the bracket updates — but there's no visual "just updated" indicator or animation for the user.

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
- ~~`uzbekistan.json` had two players named "Eldor Shomurodov"~~ — **Resolved Sprint 22 squad audit.** Full squad replaced from Wikipedia. Shirt 9 is now Odiljon Hamrobekov (`uzbekistan-hamrobekov`), shirt 14 is Eldor Shomurodov (`uzbekistan-shomurodov`, captain). No duplicates remain.
- `scripts/update-standings.js` and `scripts/generate-player-bios.js`, `scripts/generate-rankings.js` are stubs. `update-knockout.js`, `gather-photos.js`, and `sync-data.mjs` are fully implemented. `update-standings.js` is now superseded by `sync-data.mjs` for score/standings updates — the stub can remain as-is.
- **Group K match events missing (Sprint 31 gap):** Group K (6 matches) was rate-limited by Wikipedia during the Sprint 31 `gather-match-events` run. Match Centre pages for Group K fixtures will show no events timeline. Re-run `npm run gather-match-events` during off-peak hours to populate.
- **Guardian player bios:** All `bio` fields are empty `""`. See Guardian bios manual extraction steps in WIKIPEDIA DATA WORKFLOW section above. One-time action; bios will be populated after manual `__NEXT_DATA__` extraction + `npm run gather-guardian-bios`.
- **Formation derivation approximation:** Match Centre "Previous XI" shows formations like "4-5-1" that may actually be "4-2-3-1" or "4-3-2-1". Simple DEF/MID/FWD tier counts from Wikipedia position codes cannot distinguish these. Accepted limitation.

---

## HOW TO START A SESSION

1. Read this document fully.
2. Read `TASK_BREAKDOWN.md` for the detailed task list with statuses.
3. If implementing a module, read the relevant section of `IMPLEMENTATION_BLUEPRINT.md`.
4. If entering data, read `DATA_ENTRY_GUIDE.md` before touching any JSON.
5. **Run `npm run sync-data`** to pull the latest fixture results and standings from football-data.org into the local JSON files before doing any tournament data work.
6. After any squad data change: run `node scripts/generate-search-index.js` then `npm run validate`.
7. Pick up from the next uncompleted task. Do not re-implement completed work.
