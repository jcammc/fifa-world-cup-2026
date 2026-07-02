# ROADMAP.md — Post-Sprint-32 Implementation Roadmap

**Status:** Active. Adopted 2026-07-02, following a full `project-status-review` audit.
**Source:** converts the audit's findings into an ordered, dependency-aware sprint sequence. Continues the project's real sprint numbering — **Sprint 33 onward** — rather than restarting at 1.
**Maintenance:** update this file as sprints complete or scope changes. Treat it as the current plan of record until superseded by a newer version of this document.

---

## How this roadmap came to be

A comprehensive read-only audit (`project-status-review` skill) was run against the repository as it stood after Sprint 32. It found the application substantially built and usable, but surfaced:
- one confirmed shipped regression (Match Story section renders empty on every completed match — `js/modules/match-centre.js:341`),
- a content pipeline with zero real output (player bios/descriptions — `bio`/`description` fields empty on all 1,248 players),
- an unbuilt-but-scaffolded feature (H2H stats grid — UI exists, zero producer code anywhere),
- an entirely unbuilt planned feature (Rankings — 0% at every layer),
- stale internal documentation (`docs/08_PROJECT_STATUS_REVIEW.md`, last refreshed 2026-06-20, claims false precedence over this document's sibling `docs/SESSION_HANDOFF.md`),
- and process debt (`npm run pre-deploy` silently no-ops two of its four steps; a scheduled Netlify function runs every 2 minutes doing nothing).

The full review findings are not reproduced here — see the conversation history / prior session for the complete audit (Executive Summary, Feature Inventory, Data Coverage, Completion Estimates, Major Findings, Technical Debt Register, Risk Assessment, Open Decisions). This document is the **execution plan that followed it**, refined through a planning conversation that resolved several open decisions:

- **Guardian bios:** proceed with completing the pipeline as originally intended (not abandon it) — try automated fetch first, then a manual DevTools extraction if needed.
- **Rankings:** proceed with a full build, but design the ranking model (what's ranked, what categories, what sources, weighting, static-vs-evolving values, where it surfaces in the app) *before* sourcing any data — not the reverse.
- **H2H stats grid:** build it, using `thesoccerworldcups.com/head_to_head/{team}_vs_{team}.php` as a concrete source — verified via live fetch to contain structured total-meetings/W-D-L/goals/per-match-history data on a predictable URL pattern.
- **Tournament data maintenance:** live incremental re-sync after every knockout round (R32 → R16 → QF → SF → Final), tolerant of transient scraper failures (note and pick up next pass, don't escalate to a feature sprint), followed by one comprehensive archival-quality pass once the tournament ends.

**Standing product note (not yet actioned, just tracked):** over recent sprints Match Centre has become the flagship part of the application. If, while working through Sprints 33-36, the remaining Match Centre UX improvements (navigation/tabs, restructuring long sections, pitch visualisations, richer presentation, etc.) turn out to be substantial, create an explicit dedicated Match Centre UX sprint rather than quietly spreading those changes across unrelated sprints.

---

## Sprint numbering note

Sprint 34 (Tournament Data Maintenance) is not a one-off numbered deliverable — it's a recurring operational cadence that runs in parallel with the rest, for the duration of the live tournament, then converts into a single post-tournament archival pass.

---

## Dependency map

```
Sprint 33 (Match Story bug fix)
   │
   ├──> Sprint 37's first regression test (needs the fix to exist to test against)
   └──> Sprint 36 (H2H stats grid) — soft dependency, same UI section, sequence after

Sprint 34 (tournament data maintenance) ── recurring, runs alongside everything,
   not gated by or gating any other sprint. Shares script family with Sprint 33's
   data half (gather-head-to-head.mjs) — same script, different invocations.

Sprint 35 (Guardian bios) ── fully independent. Needs the user's hands-on
   participation (DevTools extraction) if automated fetch fails again.

Sprint 38 (Rankings design) ── independent, blocks Sprint 39 entirely.
Sprint 39 (Rankings Phase 1 build) ── blocked on Sprint 38 being agreed. Large.

Sprint 36 (H2H stats grid) ── blocked on: (a) confirming exact stat fields wanted
   (all-time vs World-Cup-only vs both), (b) real (non-AI-summarized) HTML
   inspection of the source site for scraping. Soft-sequenced after Sprint 33.

Sprint 40 (docs refresh + process debt) ── best done after whichever of 33/34/35/36
   have landed, so it reflects real end-state rather than needing a second pass.

Sprint 37 (regression test coverage) ── first test depends on Sprint 33 landing.
   Otherwise independent; can run in parallel with 34/35/36/38/39/40.

Sprint 41 (remaining photo gaps) ── fully independent, lowest priority, optional.
```

---

## Recommended sprint order

1. **Sprint 33** — Match Story bug fix. Immediate, small, undoes real live harm.
2. **Sprint 34** — begins alongside Sprint 33, continues as a standing cadence through the tournament.
3. **Sprint 35** — Guardian bios. Cheap to attempt, explicitly requested.
4. **Sprint 36** — H2H stats grid, after Sprint 33 (same UI section).
5. **Sprint 37** — regression test, as soon as Sprint 33 lands; otherwise runs in parallel with everything.
6. **Sprint 38** — Ranking design conversation, whenever ready; doesn't block or get blocked by 33-37.
7. **Sprint 39** — Rankings Phase 1 build, once Sprint 38 is agreed. Likely the largest single item in this roadmap — its own multi-session initiative.
8. **Sprint 40** — docs/process cleanup, once a meaningful subset of the above has landed.
9. **Sprint 41** — whenever, if run at all.

---

## Sprint 33 — Match Centre Regression Fix
**Category:** Bug fix (+ small data-ops step) · **Status:** COMPLETE (2026-07-02)

**Goal:** Restore Match Story / World Cup History rendering for every completed match where the underlying content already exists.

**Why:** Shipped regression, live in production, affecting all 72 completed group matches; grows every day it isn't fixed.

**Scope:**
1. Code: widen the FT-branch guard in `#buildHeadToHeadSection` (`js/modules/match-centre.js:328-356`) so a populated `h2hProse` (legacy `headToHead` field) also satisfies the "something to show" condition, not just `matchStory`/`statsHtml`.
2. Data: re-run `npm run gather-head-to-head` — its existing migration step moves `headToHead` → `matchStory` for FT fixtures with no new Wikipedia calls needed for that part.
3. Manual browser spot-check on ≥5 completed matches.

**Dependencies:** None. **Complexity:** Low.
**Completion criteria:** `matchStory` populated for the ~65 already-known FT fixtures (0/88 → ~65/88); section renders visibly in browser; upcoming-match branch unaffected.
**Tournament timing:** Do now — the fix-later cost only grows.

### Retrospective

**What was built:**
- Widened the FT-branch guard in `#buildHeadToHeadSection` (`js/modules/match-centre.js:339-373`) so a populated legacy `headToHead` field (`h2hProse`) satisfies the "show something" condition, not just the new `matchStory`/`headToHeadStats` fields. The primary blockquote now prefers `matchStory`, falling back to `h2hProse` when `matchStory` isn't yet populated — with logic to avoid rendering the same prose twice (once as the primary blockquote, once inside the collapsed "World Cup History" details).
- Re-ran `npm run gather-head-to-head`, which triggered its existing (previously never-executed) migration step: `headToHead` → `matchStory` for all FT fixtures already in the file, no new Wikipedia calls needed. Also picked up 6 genuinely new entries for pages that had become available since Sprint 31/32.

**Verification performed:**
- `npm run validate` — passes clean (48/48 squads, 72/72 fixtures, same 1 pre-existing benign warning).
- Data measurement: `matchStory` coverage went from 0/88 → 71/88; `headToHead` (now correctly only used for upcoming matches) dropped from 81/88 → 16/88; `headToHeadStats` remains 0/88 as expected (that's Sprint 36's job, not this sprint's).
- Real browser verification (Playwright + Chromium, launched via a local static server on port 5050 — no dev-server script existed in `package.json`, so one was started ad hoc for this session): 5 completed Group A fixtures (`a-r1-mex-rsa`, `a-r1-kor-cze`, `a-r2-cze-rsa`, `a-r2-mex-kor`, `a-r3-cze-mex`) all render a non-empty Match Story blockquote (325-1,377 characters each). Two additional cross-group spot checks (`c-r1-bra-mor`, `r32-m1`) also confirmed correct: the R32 fixture correctly took the *upcoming*-match branch (its locally-stale static data still shows `status: "live"`, not `"FT"`), proving the two branches remain correctly distinguished. Zero console/page errors across all navigations. Visual screenshot of the rendered section confirmed the fix end-to-end, not just DOM presence.

**What was learned:**
- The bug was cheaper to fix than the original audit estimated once the code was actually read: `gather-head-to-head.mjs` already contained a dormant migration path that had simply never been triggered by a script re-run. No new scraping logic was needed for the primary fix.
- The project has no dev-server npm script (`docs/CONTRIBUTING.md` assumes VS Code Live Server for local development) — verifying this SPA end-to-end from a headless/CLI session required standing up a static server and installing Playwright + Chromium on demand. Worth a standing note for future sprints that need real-browser verification.

**Architectural decisions made:**
- Chose defense-in-depth over a data-only fix: the guard now tolerates either field being populated, so a future completed match whose `matchStory` hasn't been migrated yet (e.g. between tournament-maintenance passes) still shows *something* rather than silently rendering nothing again. This directly addresses the root cause of the original regression (a schema migration landing in code before it landed in data) rather than just patching today's symptom.
- **The `headToHead` fallback is a permanent robustness layer, not a temporary migration shim.** It's tempting to read it as "delete once all historical data is migrated," but that framing is wrong: `gather-head-to-head.mjs` only re-runs periodically under Sprint 34's cadence (once per completed knockout round, not once per completed match), so every newly-FT match spends some real time with only `headToHead` populated before the next maintenance pass migrates it to `matchStory`. That lag isn't a one-off historical backlog — it recurs for every match for the rest of the tournament. The fallback should stay in the code indefinitely; there is no future point at which "migration is done" and it becomes safe to remove.

**Documentation updates made:** this retrospective (docs/ROADMAP.md); `docs/SESSION_HANDOFF.md` updated separately to point at `docs/ROADMAP.md` as the current plan of record.

**Remaining gaps (deliberately out of scope for this sprint):**
- 16 upcoming/non-FT fixtures still carry only `headToHead` (correct — that's the intended field for upcoming matches).
- `headToHeadStats` remains fully unpopulated (0/88) — this is Sprint 36's scope, not a regression from this sprint.
- Group D (4 fixtures) and Group K's page still show rate-limiting/gaps in the underlying Wikipedia scrape — this is Sprint 34's ongoing operational scope, unaffected by this fix.

**Recommended next steps:** Sprint 34 (tournament data maintenance) should now begin its recurring cadence, which will naturally continue closing the remaining `matchStory` gaps as more knockout rounds complete. Sprint 37's first regression test should target this exact fix (assert the Match Story section is non-empty for a known-populated FT fixture) to prevent a repeat.

---

## Sprint 34 — Tournament Data Maintenance (Operational Runbook)
**Category:** Operational / tournament-maintenance (recurring, not one-off) · **Status:** Not started

**Goal:** Keep fixtures/standings/knockout/match-events/match-previews current enough that local dev matches production behaviour throughout the live tournament.

**Scope, cadence agreed with user:**
- Re-run `npm run sync-data` + `npm run gather-match-events` + `npm run gather-head-to-head` after each knockout round: R32 → R16 → QF → SF → Final.
- Fix scraper issues as small isolated tasks within this cadence (as happened with Group K, Group D) — don't escalate to a feature sprint.
- Transient failures get noted and picked up next pass, not chased in the moment.
- After the tournament ends: one comprehensive final pass, treating the repo from that point as a permanent historical archive.

**Dependencies:** None. **Complexity:** Low per pass; ongoing nature is the real cost.
**Completion criteria (per pass):** `npm run validate` passes; just-completed round's data reflects real results; gaps logged, not dropped. **Final:** zero known gaps across the full 2026 tournament.
**Tournament timing:** Live now through the Final, then converts to an archival pass.

### Pass 1 retrospective (2026-07-02)

**What changed:**
- `npm run sync-data` (using `FOOTBALL_DATA_API_KEY` from a local, gitignored `.env` — never committed): `fixtures.json`/`standings.json` had no changes (group stage already 72/72 FT). `knockout.json` got 10 R32 matches updated from `scheduled`/`live` to `FT` with real scores: South Africa 0–1 Canada, Germany 4–5 Paraguay, Netherlands 3–4 Morocco, Brazil 2–1 Japan, France 3–0 Sweden, Ivory Coast 1–2 Norway, Mexico 2–0 Ecuador, England 2–1 DR Congo, USA 2–0 Bosnia-Herzegovina, Belgium 3–2 Senegal.
- `scripts/update-knockout.js --force` (run once per newly-FT R32 match, after a dry-run pass confirmed each propagation target): propagated all 10 winners into their correct Round of 16 slots. Verified post-hoc against a pre-propagation backup of `knockout.json` — exactly 5 R16 match objects changed (r16-m1: Paraguay/France, r16-m2: Canada/Morocco, r16-m3: Brazil/Norway, r16-m4: Mexico/England, r16-m6: USA/Belgium), zero unexpected changes anywhere else in the bracket (QF/SF/Final and the 6 still-unplayed R32 matches untouched).
- `npm run gather-match-events`: match-events.json stayed at 84 entries (no new fixtures, just richer data on existing ones) — 6 of the newly-FT R32 matches (m5, m6, m7, m8, m9, m10) went from placeholder/partial to full events + MOTM + lineups (11v11 each). The other 4 newly-FT matches (m1-m4) already had this from a prior pass. Group D's known incomplete-template gap (4 fixtures) is unchanged — still blocked on the same Wikipedia template issue, not a transient rate-limit this time.
- `npm run gather-head-to-head`: `matchStory` coverage rose from 71/88 to 81/88 (the 10 newly-FT R32 matches migrated from `headToHead`). `headToHead` (upcoming-only) dropped from 16/88 to 6/88 correspondingly. `headToHeadStats` unchanged at 0/88 (Sprint 36's scope). Group K remains rate-limited (`✗ Wikipedia gave up after 3 retries`) — logged, not chased, per this pass's scope.
- `npm run validate` — passes clean throughout, no new warnings.

**Browser verification (Playwright/Chromium against a local static server):**
- **Completed match** (`r32-m7`, Mexico 2–0 Ecuador, newly fully populated this pass): header score, MOTM, and full events timeline all render correctly.
- **Upcoming match** (`r32-m11`, Portugal v Croatia, not yet played): correctly takes the upcoming-match branch — "World Cup History" section with collapsed history notes, previous-lineup SVG pitches for both teams, broadcaster badge.
- **Newly-propagated R16 fixture** (`r16-m4`, Mexico v England): displays the real team names and flags (not TBD placeholders), correct venue/date, previous starting XI pitch graphics — confirms the propagation is not just correct in the data file but actually renders end-to-end.
- **Knockout bracket page** (`#knockout`): snapshot correctly shows 82 played / 22 remaining; R32 column shows real scores; R16 column shows Paraguay/France with green "confirmed" checkmarks; right-rail correctly moved the 6 still-unplayed R32 matches into "Today"/"Coming Up".
- Zero console/page errors across all four navigations.

**Newly discovered issue (out of scope for this pass, logged for later):** the knockout bracket page's Round of 32 column header shows a date range of "NaN Jun–NaN Jul" — a date-parsing bug in `#roundDateRange()` (`js/modules/knockout-bracket.js`), unrelated to this pass's data work. Not fixed here per the agreed scope (data maintenance only); worth a small follow-up fix, possibly folded into the standing Match Centre UX sprint note above if that sprint gets created, or as a quick standalone fix whenever convenient.

**Remaining gaps after this pass:** Group D (4 fixtures, incomplete-template issue) and Group K (rate-limited) match-events; `headToHeadStats` still fully unbuilt (Sprint 36); 6 R32 matches (m11-m16) still upcoming, will need this same cadence once they complete.

**Next pass trigger:** after the remaining 6 R32 matches complete, or once the Round of 16 Wikipedia pages start appearing (whichever comes first).

---

## Sprint 35 — Guardian Bios / Player Descriptions
**Category:** Feature completion (existing intended architecture) + data integrity fix · **Status:** COMPLETE (2026-07-02)

**Goal:** Populate real player `description` content via the already-built `scripts/gather-guardian-bios.mjs` pipeline.

**Original scope:** manual DevTools `__NEXT_DATA__` extraction, per the plan written when this sprint was scoped. Superseded during execution — see retrospective.

### Retrospective

**What was built:**
- **Fully automated Guardian pipeline (no DevTools needed).** While looking for `__NEXT_DATA__` in the page (which returned `undefined`), the user found the real data source via the Network tab: `https://interactive.guim.co.uk/docsdata/{spreadsheetId}.json` — a public, unauthenticated static-JSON export of the Guardian's underlying Google Sheets, one per team. The "Teams" sheet (saved as `data/guardian-teams-raw.json`) lists all 48 teams' spreadsheet IDs, so `gather-guardian-bios.mjs` was rewritten to fetch all 48 team sheets directly and match players against each team's own roster file — no manual per-team extraction required, and no longer dependent on the anti-bot-protected page at all.
- **Matching safety redesign.** The original draft used a global, cross-country, unconstrained surname fallback. It produced a real false positive in testing: our Jordan defender "Mohammad Al-Rawabdeh" (shirt 3) matched to Guardian's "Noor al-Rawabdeh" (shirt 8, a different real person, same surname). Matching was rewritten to be scoped per-team (never across countries) and the surname fallback now requires both uniqueness (exactly one same-surname candidate in that roster) and first-initial agreement before accepting a match. Additional safe, exact-match-only fallbacks were added: dropped leading honorific/extra given name, quoted-nickname extraction (`"Ahmed Sayed 'Zizo'"` → `Zizo`), and a small hand-verified `NAME_ALIASES` table (each entry backed by an independent web-search check, e.g. confirming via Wikipedia that "Munir El Kajoui" and "Munir Mohamedi" are the same Morocco goalkeeper) — never a guess.
- **Jordan squad replacement.** See separate write-up below — this became the sprint's final task after the matching work surfaced a real data integrity problem, not a matching gap.

**Verification performed:**
- `npm run validate` — passes clean; only the pre-existing benign Scotland DOB warning plus the new, intentional `jordan-taha` `_verification` note.
- Final coverage: **1,245 / 1,248 players (99.8%)** have a populated `description`. The only three gaps are explained, not bugs: Qatar's "Mohamed Al-Mannai" (a different real player from our roster's "Mohamed Manai" — verified via Wikipedia, deliberately left unmatched), Iraq's "5" (a stray data artifact in Guardian's own sheet, not ours), and Jordan's "Mohammad Abu Ghoush" (see Jordan write-up).
- Playwright/Chromium browser verification against a local static server: Jordan's Overview, Squad, and Match Centre (`#match/j-r3-jor-arg`, the Jordan v Argentina group match) all render correctly — captain badge on the right player, real photo where available, initials fallback elsewhere, bios visible, goal/card/substitution events all resolve to real players. Zero console/page errors (aside from expected 404s for the ~24 Jordan players who don't have photos yet — see known gap below).

**What was learned:**
- **A page returning `undefined` for `__NEXT_DATA__` doesn't mean the data is unreachable** — Next.js pages that fetch data client-side often have a separate, sometimes-public API/CDN endpoint. Checking the Network tab for the actual XHR/fetch request (not just the page's embedded state) should be a standard first move before falling back to manual extraction.
- **An unconstrained "same surname → same person" fallback is unsafe at scale**, especially for naming conventions with common family/tribal surnames (Arabic "Al-" prefixed surnames in particular). Scoping matches to one team's own roster and requiring first-initial agreement turned a live false positive into a caught-before-shipping bug.
- **A script's own match-rate data can double as a data-quality audit.** Cross-referencing all 48 teams against Guardian's independently-sourced roster data revealed that 22 of 23 teams from Sprint 9's "batch 3" bulk-population pass were accurate (100% or near-100% name match), while Jordan was a severe outlier (1/26) — this was enough signal to conclude the Sprint 9 problem was isolated to Jordan without needing a dedicated audit.

**Documentation updates made:** this retrospective (`docs/ROADMAP.md`); `docs/SESSION_HANDOFF.md` updated separately.

**Remaining gaps (deliberately out of scope for this sprint):**
- ~30 players across a handful of teams still lack `description` due to lower-confidence spelling/nickname variants not worth a risky auto-fix; not tracked as a blocker.
- **Jordan photo gap (documented, not actioned this sprint):** replacing Jordan's roster (see below) means most of the old `player-photos.json` entries no longer correspond to any current player ID. Two were salvaged directly (see below); the other ~24 correct players currently render with initials-fallback rather than a photo. A future `gather-photos.js` pass for Jordan's corrected roster would close this gap — intentionally not pulled into this sprint's scope.

---

### Jordan squad replacement (final task of this sprint)

**Why:** While investigating why Jordan's Guardian match rate was 1/26 (vs. 96–100% for every other team), the cause turned out to be a genuine data integrity problem, not a matching gap: `data/players/jordan.json` was populated in `Sprint 9: populate all 48 squads — 23 remaining teams (batch 3)` (2026-06-20) with a roster that doesn't correspond to Jordan's real World Cup squad. One entry (shirt 19) had already been caught and fixed on 2026-06-22 ("Zito Luvumbo" → "Saed Al-Rosan") after a manual Wikipedia check — but that fix was never generalized to the rest of the file. Checking "Zito Luvumbo" independently confirmed he's a real footballer, but Angolan (Cagliari/Mallorca), with no Jordan connection at all — i.e. a fabricated entry, not a spelling variant.

**Isolated-vs-systemic check (light-touch, as scoped):** all 23 of Sprint 9's "batch 3" teams were cross-referenced against Guardian's independently-sourced roster data (already gathered for this sprint). 22 of 23 matched at 100% (Iraq's single gap was a data artifact in Guardian's own sheet, not ours). Jordan was the sole catastrophic outlier. No further audit scheduled — this batch appears to have been reliable except for Jordan specifically.

**What was replaced:** All 26 players in `data/players/jordan.json`, sourced from Wikipedia's `2026 FIFA World Cup squads` article (fetched directly via the MediaWiki API, matching the pattern already used by `scripts/gather-match-events.mjs`), cross-checked against FIFA.com's official squad announcement (2 June 2026) and, for one ambiguous slot, an independent match-day lineup report. Confirmed captain is **Ihsan Haddad** (shirt 23, DF) — our previous data had "Ahmad Haddad" as captain, which was also wrong.
- One roster slot (shirt 18) carries a `_verification` note: Wikipedia's own prose contradicts its cited source and Guardian's independent data over whether the replacement for injured Ibrahim Sabra is "Mohammad Taha" or "Mohammad Abu Ghoush." The structured official squad table plus an independent Jordan v Argentina match-day lineup both confirm **Mohammad Taha** (shirt 18), which is what was used; flagged per the project's existing `_verification` convention rather than silently picked.
- Added one missing club to `data/clubs.json`: `al-shabab-riyadh` (Saudi Arabia's Al-Shabab, distinct from the already-present Jordanian and UAE clubs of similar name).
- `data/player-photos.json`: migrated one correct, already-fetched photo from the old ID (`jordan-al-tamari`) to the new one (`jordan-al-taamari`, same real player — Musa Al-Taamari); nulled one confirmed-wrong photo (`jordan-al-rosan` was pointing at a photo of Zito Luvumbo — a pre-existing bug from the June 22 name-only fix, unrelated to this sprint's roster replacement, caught while reviewing the file).
- Guardian pipeline re-run against the corrected roster: 25/26 Jordan players now have a real `description` (one added `NAME_ALIASES` entry for the captain's spelling: Guardian/FIFA write "Ehsan," Wikipedia's structured table — our source of record — writes "Ihsan").
- `node scripts/generate-search-index.js` re-run; `npm run validate` passes clean.

**Decision on scope:** per explicit direction, the resulting photo gap was documented (above) rather than pulled into this sprint as a photo-recovery pass.

---

## Sprint 36 — H2H Stats Grid
**Category:** New feature completion (existing UI scaffold, new data source) · **Status:** Not started

**Goal:** Populate `headToHeadStats` so the already-built `#buildH2HStatsGrid()` (`js/modules/match-centre.js`) renders real content, using `thesoccerworldcups.com` as the source.

**Confirmed via live fetch:** `thesoccerworldcups.com/head_to_head/{team1}_vs_{team2}.php` has total meetings, W-D-L, goals for/against, and a chronological match list (date, stage, score), full country names, predictable URL pattern. AI-summarized fetch only — raw HTML/selector inspection still needed before writing a scraper.

**Open scope question:** this source is *all-time* record; the existing Wikipedia-sourced `headToHead`/`matchStory` is *World-Cup-only*. Decide: all-time, WC-only, or both, before building.

**Scope:** raw HTML inspection → scope decision → new gather script (or extend `gather-head-to-head.mjs`) → wire into existing render path.
**Dependencies:** Soft-sequenced after Sprint 33 (same UI section).
**Complexity:** Medium. **Risks:** unvetted third-party site (no robots.txt/rate-limit characterization yet); URL ordering needs confirming both directions.
**Completion criteria:** `headToHeadStats` populated for a meaningful share of the 88 current fixtures; grid renders in Match Centre.
**Tournament timing:** Partially time-sensitive, similar to Sprint 34, if fields are framed as "record entering this match."

---

## Sprint 37 — Regression-Prevention Test Coverage
**Category:** Architectural improvement · **Status:** Not started

**Goal:** Narrow, high-value automated coverage so a bug shaped like Sprint 33's cannot ship silently again.

**Scope:** `node:test` (zero new deps, fits the project's no-build-step philosophy) unless a fuller framework is wanted. Three tests: (1) Match Story regression test on a known-populated FT fixture, (2) `npm run validate` smoke test, (3) router-resolution test for every named route. Capped scope — no coverage-percentage chasing.
**Dependencies:** First test needs Sprint 33 landed.
**Complexity:** Medium (first test in the project costs more than subsequent ones).
**Completion criteria:** Tests exist, pass, runnable via `npm test`; the regression test specifically fails if Sprint 33's fix is reverted.
**Tournament timing:** Evergreen.

---

## Sprint 38 — Ranking System Design (design deliverable, no code)
**Category:** Product/architecture design · **Status:** Not started

**Goal:** Produce and get sign-off on a full ranking-system design before any data sourcing begins.

**Deliverable — answers needed:**
- What gets ranked (players only, or teams/managers too)?
- What categories (overall ability, current form, potential, historical legacy, others)?
- Which data source(s) feed each category, and why?
- How does weighting work across categories/sources?
- Which values are static vs. evolve during the tournament (and on what trigger)?
- Where in the app do rankings surface (Profile Panel? Compare Teams? a new leaderboard page? Statistics Dashboard)?

**Recommended process:** run as its own dedicated planning session (e.g. `/brainstorming`), not answered inline in an implementation sprint.
**Dependencies:** None to start; fully blocks Sprint 39.
**Completion criteria:** written design, reviewed and approved, with an explicit v1 scope boundary.
**Tournament timing:** Evergreen.

---

## Sprint 39 — Rankings Phase 1 Implementation
**Category:** Genuinely new feature (data sourcing + build) · **Status:** Not started, blocked on Sprint 38

**Goal:** Implement the ranking system per Sprint 38's agreed design, Phase 1 scope.

**Complexity:** Likely high — real manual data-sourcing effort was always the expensive part of this feature (original spec estimated ~60 min for just the Media component across ~1,250 players; a fuller multi-category design costs more). Treat as its own multi-session initiative, not a single bounded sprint.
**Completion criteria:** defined in Sprint 38's design doc, per category/entity.
**Tournament timing:** Design is evergreen; a "current form" category (if included) benefits from being computed against complete tournament data.

---

## Sprint 40 — Documentation & Process Debt Cleanup
**Category:** Documentation + minor technical debt · **Status:** Not started

**Goal:** Bring `docs/08_PROJECT_STATUS_REVIEW.md` back in line with reality; remove misleading tooling signals.

**Scope:**
- Refresh `docs/08_PROJECT_STATUS_REVIEW.md` (best after 33/34/35/36 land).
- Decide (user's call, not yet decided): keep or remove that doc's stated precedence over this document/`SESSION_HANDOFF.md`.
- Decide (user's call, not yet decided): delete the three confirmed-dead stub scripts (`scripts/generate-player-bios.js`, `scripts/lib/bio-templates.js`, `scripts/update-standings.js`)?
- Decide (user's call, not yet decided): delete `netlify/functions/sync-tournament.mjs` outright, or just remove its `netlify.toml` schedule block and keep the file as reference?
- Fix or remove the two no-op steps (`generate-bios`, `generate-rankings`) from the `pre-deploy` npm script chain.

**Dependencies:** Best after 33/34/35/36. **Complexity:** Low.
**Tournament timing:** Evergreen, best done last among whichever sprints run first.

---

## Sprint 41 — Remaining Photo Gaps (optional, explicitly the user's call)
**Category:** Operational/data-maintenance, evergreen · **Status:** Not started, not yet greenlit

**Goal:** Another recovery pass for 300 remaining null player photos + 3 manager photos (Haiti, Cape Verde, Saudi Arabia).
**Scope:** `node scripts/gather-photos.js` with `RETRY_NULLS=true`, then `WIKIDATA_PASS=true` (same pattern as Sprint 20-21).
**Completion criteria:** coverage improves measurably from 76.9% (996/1,296).
**Tournament timing:** Evergreen, no urgency. Not yet approved to run — ask before starting.

---

## Decisions still needed from the user (not yet resolved)

1. Sprint 38 scheduling — dedicated design session vs. inline draft.
2. Sprint 36 scope — all-time vs. WC-only vs. both for `headToHeadStats`.
3. Sprint 40 — three small confirmations: delete dead stub scripts? keep/remove doc precedence claim? delete `sync-tournament.mjs` outright or keep as reference?
4. Sprint 37 tooling — `node:test` (default) vs. Vitest/Jest.
5. Sprint 41 — greenlight, defer, or skip.
