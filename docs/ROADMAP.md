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

### Pass 2 retrospective (2026-07-06)

**Trigger:** run as a deliberate prerequisite before the Sprint 37 knockout-bracket architecture investigation, so verification of those fixes wouldn't be confounded by stale data. All 6 remaining R32 matches (m11–m16) had completed since Pass 1; Round of 16 matchdays 1–2 (m1–m4) had also completed.

**What changed:**
- `npm run sync-data`: `fixtures.json`/`standings.json` unchanged (group stage already 72/72 FT). `knockout.json` — 13 matches updated: all 6 remaining R32 results (Portugal 2–1 Croatia, Spain 3–0 Austria, Switzerland 2–0 Algeria, Argentina 3–2 Cape Verde, Colombia 1–0 Ghana, Australia 3–5 Egypt) plus 4 R16 results (Paraguay 0–1 France, Canada 0–3 Morocco, Brazil 1–2 Norway, Mexico 2–3 England). Notably, `sync-data.mjs`'s own opportunistic team-matching (`syncKnockout()`) auto-resolved `r16-m5` (Portugal v Spain) and `qf-m1` (France v Morocco) correctly on its own, since those dates didn't collide with another still-TBD slot.
- **Live confirmation of the date-fallback ambiguity found during the Sprint 37 investigation:** `r16-m7`/`r16-m8` (both kickoff `2026-07-07`, same UTC date) and `qf-m3` (shares kickoff date `2026-07-11` with `qf-m4`) stayed fully TBD after `sync-data` despite their feeder matches already being complete — `syncKnockout()`'s single-candidate-per-date fallback couldn't disambiguate. This is the same fragility documented in `netlify/functions/live-data.mjs`'s `mergeKnockout()`, confirmed live in the offline path too, not just hypothesized.
- `scripts/update-knockout.js --force` (dry-run reviewed first, then applied — same procedure as Pass 1): run for all 10 newly-FT matches (6 R32 + 4 R16). Propagated: `r16-m5` (portugal/spain — already correct, no-op), `r16-m7` (argentina/egypt — **this is the slot the automated sync couldn't resolve**), `r16-m8` (switzerland/colombia — **also unresolved by sync**), `qf-m1` (france/morocco — already correct, no-op), `qf-m3` (norway/england — **also unresolved by sync**). Round of 16 is now **fully populated** (8/8 matches have both teams); Quarter-finals has 2/4 resolved (`qf-m1`, `qf-m3`), the other 2 correctly still TBD pending `r16-m5`/`m6`/`m7`/`m8` results.
- `npm run gather-match-events`: 6 newly populated (the 6 R32 matches — goals, cards, subs, lineups, MOTM). R16/QF/SF Wikipedia pages don't exist yet (expected — those rounds are still in progress). Group D's known incomplete-template gap unchanged.
- `npm run gather-head-to-head`: 6 `headToHead` → `matchStory` migrations (the 6 newly-FT R32 matches) plus 1 new entry (`k-r3-cod-uzb`, a previously rate-limited Group K gap that resolved this run). R16/QF/SF pages still don't exist, as expected.
- `node --env-file=.env scripts/gather-head-to-head-stats.mjs`: resolvable-fixture count rose from 93 to 98 (R16 `m5`–`m8` and QF `m1`/`m3` became resolvable now that their teams are known). All 7 Sprint 36 manual overrides re-merged correctly. Capped count rose from 29 to 31 (new fixtures inherit the same capping signal); still 24 unsupplemented (up from 22 — the newly-resolvable fixtures added their own capped pairs to the backlog, not a regression).
- `npm run validate` — clean pass throughout (same pre-existing warnings as before, unrelated to this pass).

**Browser verification (Playwright/Chromium):** `r32-m11` (Portugal 2–1 Croatia, newly FT) renders full match events. `r16-m4` (Mexico 2–3 England, newly FT) renders Match Story + Head-to-Head History + Recent Form. `qf-m1` (France v Morocco, newly resolved, still upcoming) renders its Head-to-Head/World Cup section — a fixture that only became resolvable during this pass. Confirmed the Round of 16 column on `#knockout` now shows the round-level "All confirmed" banner with zero individual ticks (proving `allTeamsSet` is now `true` for R16), while the Quarter-finals column shows exactly 4 individual ticks (France/Morocco/Norway/England) and no round banner (`qf-m2`/`qf-m4` still TBD) — a live, real-data confirmation of the Sprint 37 root-cause diagnosis: the round-level gating bug hasn't been fixed, it has simply moved down to the next partially-resolved round, exactly as predicted. Zero console/page errors across all navigations.

**Remaining gaps after this pass:** Group D (4 fixtures) and Group K (match-events fully closed this pass) — Group D's incomplete-template issue is the only surviving match-events gap. `headToHeadStats` manual-supplement backlog: 24 pairs (up from 22, expected — new fixtures became resolvable). R16 `m5`–`m8` results, and QF `m2`/`m4` pairings, will need this same cadence once played.

**Next pass trigger:** after Round of 16 matchdays 3–4 (`m5`–`m8`) complete, or once the Quarter-finals Wikipedia page appears (whichever comes first).

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
**Category:** New feature completion (existing UI scaffold, new data source) · **Status:** COMPLETE (2026-07-03); self-inclusion bug found + fixed and 7/29-pair manual-supplement pass done (2026-07-05); 22-pair backlog remains open

**Goal:** Populate `headToHeadStats` so the Match Centre renders real World Cup and all-time head-to-head content, showing both as complementary views (not a replacement for the existing Wikipedia-sourced `matchStory`/`headToHead` prose).

### Retrospective

**What was investigated before any implementation:** this sprint began with `thesoccerworldcups.com` as the assumed source (per the original scope below), but a from-scratch architecture investigation — raw HTML inspection, robots.txt/WAF characterization, and a live comparison against `football-data.org`, WorldFootball.net, RSSSF, FIFA's own data-centre, Transfermarkt, and FBref — found:
- `thesoccerworldcups.com`'s robots.txt blocks a long list of named crawlers including `ClaudeBot`, and it actively WAF-blocks non-browser clients (415→403 within two requests) regardless of headers. Not pursued further.
- `Transfermarkt` and `FBref` also explicitly block `ClaudeBot`/aggressive Cloudflare challenges — deprioritized on the same grounds.
- `FIFA`'s data-centre head-to-head tool is a client-side picker whose real data comes from `/api/`, which their own robots.txt disallows — authoritative but not acquirable within their stated policy.
- `RSSSF`'s head-to-head compilation is explicitly European-only and curated, not systematic — fails coverage for this tournament's many non-European/debutant nations.
- `WorldFootball.net` had by far the best data model (uncapped, explicitly competition-tagged, correct in every manual test — deep rivalries, debutants, upcoming matches) and the most inviting robots.txt (`Content-Signal: use=reference`) — but a **Sprint 36A pilot** (20 fixture pairs, deliberately paced) hit a Cloudflare managed challenge that **persisted across a real time gap**, not just rapid requests, ruling it out as a primary source despite its data quality.
- `football-data.org` — already authenticated in this project — has a real completeness limitation (caps at however many meetings it chooses to return per pair, sometimes 1, sometimes 2, not a flat rule; its own `aggregates.numberOfMatches` reliably reports the true total regardless), but zero acquisition risk.

**Adopted architecture (a deliberate hybrid, not the first viable source found):** football-data.org's `head2head` subresource as the automated source for every fixture, with the API's own aggregates-vs-returned-matches mismatch used as an objective signal that a pair needs a manual research pass — never a guess. See `docs/DATA_ENTRY_GUIDE.md` Section 18 for the full schema and manual-supplement workflow, and `scripts/gather-head-to-head-stats.mjs` for the implementation.

**What was built:**
- `data/match-previews.json` entries gained a `headToHeadStats` object per fixture: `teams` (this fixture's home/away, used to reorient historical results regardless of which side a team played on historically), `worldCup`/`allTime` scopes (meetings/wins/draws/goals/lastMeeting), raw `matches` list, and a `meta` block recording provenance (`autoSource`, `autoCapped` per scope, `manualSupplement` — `null` unless a human-researched correction was applied, in which case it names the scope(s), source, and date).
- `scripts/gather-head-to-head-stats.mjs` — resolves each of our fixtures to a football-data.org match ID (reusing `data/api-team-map.json`, the same mapping `sync-data.mjs` already relies on), fetches head2head, computes both scopes itself (the API doesn't reliably compute its own W/D/L), flags capped scopes, and merges any entry from `data/h2h-manual-overrides.json` on top.
- `js/modules/match-centre.js` — `#buildH2HStatsGrid()` (singular, WC-only) replaced with `#buildH2HStatsGrids()` (plural) rendering both scopes as separate labelled blocks, each correctly reoriented to whichever team is home in the *current* fixture. A real bug was caught and fixed during verification: a capped-and-zero-returned scope (a pair where football-data.org's own aggregates confirm history exists but returned no rows — common for upcoming knockout matches) was being treated identically to a genuine zero-history pair and the whole section silently disappeared. Fixed to distinguish the two: genuine zero-history pairs show "No prior meetings on record"; capped-empty pairs show "Prior meetings exist but full detail isn't available yet" rather than nothing.
- `styles/match-centre.css` — `.mc-h2h-block`/`.mc-h2h-block__title`/`.mc-h2h-empty` added for the two-block layout.
- `docs/DATA_ENTRY_GUIDE.md` Section 18 — full schema reference and the manual-supplement workflow (how to research and add a correction, how it's merged, how to verify it rendered).

**Verification performed:**
- `npm run validate` passes clean throughout (headToHeadStats isn't yet part of that validator's own checks — a possible future addition, not required for this sprint).
- Full pipeline run: 93 of 104 known fixtures resolved to a football-data.org match ID (72 group stage + 21 knockout — R32 fully, R16 partially, as later rounds aren't fully known yet); 92 fetched on the first pass, the 1 transient failure patched individually. 29 of 93 flagged capped (data incomplete per the API's own signal), 0 manually supplemented so far — this is a real, open backlog, not a hidden gap (see below).
- Playwright/Chromium checks across three fixture types — a capped pair with data (Scotland v Brazil, shows "1" pending correction), a capped pair with zero returned rows (Portugal v Croatia, upcoming R32 — correctly shows the new "prior meetings exist but not yet available" message on both scopes, while the existing Wikipedia prose alongside it already states the true count), and a genuine single-meeting pair (Czechia v Mexico, first-ever meeting, correctly shows "1" for the match itself) — all render correctly, zero console errors.

**What was learned:**
- **A background command accidentally re-triggered mid-session** when a one-off inline script `import()`-ed the gather script module to reuse a helper — the script has no `isMain`-style guard (unlike `gather-guardian-bios.mjs`, which does, from Sprint 35). No harmful effect this time (football-data.org has no rate-limit risk at this scale), but worth guarding in any script meant to be reused as a module.
- **The free tier's cap is not a flat "2 most recent"** as originally characterized during the architecture investigation (based on a single example) — different pairs return 0, 1, or 2 raw matches with no consistent rule identified. The `aggregates.numberOfMatches`-vs-returned-length comparison is robust regardless of the exact rule, which is why the architecture was designed around detecting incompleteness rather than predicting it.
- **The existing Wikipedia-sourced `headToHead` prose (Sprint 31) is a free, already-present cross-check for manual supplementation** — several capped pairs' true head-to-head counts are already stated in that prose (e.g. Portugal v Croatia: "met 10 times before, with Portugal winning seven"), meaning some of the 29-pair backlog may not need fresh research at all, just transcription with citation.

**Remaining gap — the manual-supplement backlog (deliberately not actioned without a decision):** 29 fixtures are flagged capped and not yet supplemented. This is bounded and documented (see `data/h2h-manual-overrides.json` and `docs/DATA_ENTRY_GUIDE.md` §18), not hidden, but represents real remaining effort — prioritising which of the 29 are worth a manual research pass (vs. leaving lower-stakes ones as-is) is a judgement call for a future session, not resolved as part of this sprint.

### Sprint 36 follow-up (2026-07-05) — self-inclusion bug found and fixed, 7-fixture manual-supplement pass

**Bug found during a routine cross-check, not a fresh audit:** while researching a manual-supplement override for `c-r3-sco-bra`, the automated `allTime` value for that (already-completed) fixture showed `meetings: 1` with the fixture's *own* result (2026-06-24, Scotland 0–3 Brazil) listed as the "previous" meeting. Root cause: `gather-head-to-head-stats.mjs` calls football-data.org's `/matches/{id}/head2head` endpoint for a match — but once that match has actually been played, the API's own head2head response for it includes the match itself as the most recent meeting between the two teams. The script had no filter excluding it. Checked systematically: **all 82 completed fixtures with `headToHeadStats`** carried this bug — every one's history included its own result, inflating `meetings` by 1 and replacing the true `lastMeeting` with the match's own date/score. Upcoming fixtures were unaffected (the reference match can't appear in its own head2head response before it's been played).

**Fix:** `fetchHeadToHead()` in `scripts/gather-head-to-head-stats.mjs` now filters `data.matches` to exclude any entry whose `id` equals the reference `fdMatchId` before computing scopes, and decrements the API's own `aggregates.numberOfMatches` total by 1 when the self-match was present, so the `autoCapped` comparison (`trueTotal > returned`) stays correct rather than getting knocked off by one. `id` is football-data.org's own primary key for the match resource — the most robust identifier available, more reliable than comparing team-ID pairs or dates.

**Full pipeline re-run performed** (not just a code fix left for later): `node --env-file=.env scripts/gather-head-to-head-stats.mjs` re-fetched all 93 resolvable fixtures. Confirmed via the run summary: capped count held steady at 29 (7 now resolved by manual supplement, 22 remaining) — consistent with the fix's design, since the self-match was being double-counted on both sides of the `capped` comparison and removing it from both leaves the boolean unchanged. `npm run validate` passed clean. Playwright/Chromium re-verification across three cases: the manually-supplemented `c-r3-sco-bra` now shows `lastMeeting: 1998-06-10` (the true prior WC meeting) instead of its own 2026 result; a genuine zero-history pair (`a-r1-kor-cze`) correctly shows "No prior meetings on record" for both scopes; a capped-but-unsupplemented pair correctly shows "Prior meetings exist but full detail isn't available yet." Zero console errors.

**7 of the 29-pair manual-supplement backlog closed in this pass** (down to 22 remaining), each hand-researched and cross-checked against independent secondary sources (Wikipedia group-stage pages, ESPN/FIFA match reports) rather than derived from the in-app prose alone: `c-r2-sco-mor`, `i-r1-fra-sen`, `j-r3-alg-aut`, `l-r3-pan-eng`, `e-r3-ecu-ger` (all — single or double lifetime meeting, fully resolved both scopes); `c-r3-sco-bra`, `h-r3-uru-esp` (World Cup scope only — the all-time scope for these two needs more research than was available and is intentionally left capped). See `data/h2h-manual-overrides.json` for full citations per entry. The remaining 22 were left alone deliberately — their prose either lacked an explicit, citable meeting count or required confirming individual historical scorelines beyond what was readily available.

**Superseded original scope (kept for history):** the original plan below assumed `thesoccerworldcups.com` as the source; superseded by the architecture investigation above.

~~**Goal:** Populate `headToHeadStats` so the already-built `#buildH2HStatsGrid()` (`js/modules/match-centre.js`) renders real content, using `thesoccerworldcups.com` as the source.~~

~~**Confirmed via live fetch:** `thesoccerworldcups.com/head_to_head/{team1}_vs_{team2}.php` has total meetings, W-D-L, goals for/against, and a chronological match list (date, stage, score), full country names, predictable URL pattern. AI-summarized fetch only — raw HTML/selector inspection still needed before writing a scraper.~~

---

## Sprint 37 — Regression-Prevention Test Coverage
**Category:** Architectural improvement · **Status:** COMPLETE (2026-07-06)

**Goal:** Narrow, high-value automated coverage so a bug shaped like Sprint 33's cannot ship silently again.

**Tooling decision (resolved 2026-07-06):** `node:test` (built into Node 18+, zero new dependencies, fits the project's no-build-step philosophy) plus **`jsdom`** as a single lightweight devDependency, added only because the router-resolution test needs real `document`/`location` APIs. Vitest/Jest rejected — both would require a config file and transform pipeline, contrary to this project's zero-build-step identity, and are overkill for three deliberately capped tests.

**Sequencing decision (resolved 2026-07-06):** rather than treating this as a strict prerequisite for Sprint 42, write a targeted regression test alongside *each* of Sprint 42's four implementation steps as it lands (e.g. a test asserting connector-derived pairs match `js/bracket-topology.js` for a known bracket state; a test reproducing the exact R16/QF same-date collision against the consolidated merge function), then fold those into this sprint's permanent suite afterward. This gets Sprint 42's actively-recurring propagation pain fixed without an unrelated, not-yet-started test-infrastructure sprint gating it.

**Scope:** Three tests: (1) Match Story regression test on a known-populated FT fixture, (2) `npm run validate` smoke test, (3) router-resolution test for every named route — plus whatever Sprint 42-alongside tests get folded in per the sequencing decision above. Capped scope — no coverage-percentage chasing.
**Dependencies:** First test needs Sprint 33 landed (it has).
**Complexity:** Medium (first test in the project costs more than subsequent ones).
**Completion criteria:** Tests exist, pass, runnable via `npm test`; the regression test specifically fails if Sprint 33's fix is reverted.
**Tournament timing:** Evergreen.

### Retrospective (2026-07-06)

**What was built:** 24 tests across 6 files, all passing via `npm test` (`node --test`, zero config). `jsdom` installed as the only new devDependency, needed only where a module's import chain transitively touches `window`/`document` (three of the six files).

**A design tension surfaced immediately: two of the three originally-planned tests (Match Story, router resolution) target logic buried in private class methods that depend on either a live fetch pipeline or 11 other page modules' own data dependencies to reach.** Rather than build a heavy DOM+fetch-mocking harness (high effort, fragile, and conflates unrelated modules' bugs with the router's own), each was resolved the same way: **extract the exact regression-prone logic into a small, pure, exported module-level function** — same code, same behavior, just parameterized instead of reading instance state (`this.#countryMap` → a `countryMap` argument, etc.). This is a well-established testability pattern, not a functional change; each extraction was verified as behavior-preserving via `node --check` and a full browser regression sweep afterward.

**Four extractions, all mechanical (move + parameterize, no logic changes):**
- `js/modules/knockout-bracket.js`: `#buildMatch`/`#buildTeamSlot`/`#buildMeta`/`#projectionKey` → exported `buildMatch`/`buildTeamSlot`/`buildMeta`/`projectionKey`. Enables direct testing of Defect 1's per-match tick fix.
- `js/modules/match-centre.js`: `#buildHeadToHeadSection`/`#buildH2HStatsGrids`/`#buildOneH2HGrid` → exported equivalents. Enables direct testing of the Sprint 33 regression without mocking MatchCentre's ~8 DataManager dependencies.
- `js/router.js`: `#parseRoute(hash)` → exported `resolveRoute(hash, countryIds)`; `PlaceholderModule`/`NotFoundModule` also exported (previously module-local only) so tests can assert against them directly. Enables testing all ~19 named routes' Module resolution without instantiating the Router singleton or any of the 11 page modules it can route to.

**Test files, mapped to what each locks in:**
- `test/bracket-topology.test.mjs` (5 tests) — `getFeederMatchIds` correctness for all 16 destination matches (Defect 2's data contract); `deriveWinnerId`/`deriveLoserId` including the penalty-shootout branch; `resolvePropagatedSlots` reproducing the exact `r16-m7`/`r16-m8` same-date collision and its idempotency; winner+loser propagation into Final/3rd-place (Defect 3).
- `test/knockout-merge.test.mjs` (4 tests) — the consolidated `mergeKnockoutMatches` resolving the same collision via local propagation with zero API data, team-pair matching, the home/away-swap handling `sync-data.mjs` previously lacked, and group-stage exclusion.
- `test/knockout-bracket-tick.test.mjs` (4 tests) — all three tick states (fully resolved/no tick, fully unresolved/TBD, **partially resolved/tick on the known side only** — the exact state Defect 1's fix targets) plus the played-match case.
- `test/match-story.test.mjs` (4 tests) — the Sprint 33 regression itself (empty `matchStory`, populated legacy `headToHead`, must still render), matchStory-preferred-when-both-present, genuine-empty case, and the upcoming-match branch staying unaffected.
- `test/router.test.mjs` (6 tests) — all ~19 named routes resolve to the correct Module, plus param extraction (group letter, compare team slugs, match fixture id, player-vs-country disambiguation) and the unrecognized-prefix fallback.
- `test/validate-smoke.test.mjs` (1 test) — `scripts/validate-data.js` exits clean.

**Verification performed:**
- `npm test` — 24/24 passing.
- `npm run validate` — clean, unaffected by the refactors.
- Full browser regression sweep (Playwright/Chromium) across all three refactored files' real render paths: knockout bracket (tick/banner/connector state re-confirmed byte-identical to pre-refactor), two Match Centre pages (completed and upcoming), a team page, a player deep-link, Compare Teams, best-thirds, and a 404 route. Zero console/page errors. One apparent anomaly investigated and confirmed NOT a regression: `r16-m4`'s Match Story section has no prose blockquote (`.mc-hth` absent) because that fixture's data genuinely has no `matchStory`/`headToHead` populated yet (R16's Wikipedia page didn't exist when `gather-head-to-head` last ran) — the section itself, with its stats grid, still correctly renders.

**No architectural issues found** — the three extractions were the only design decision needed, and none revealed a deeper problem; they were a means to test existing, already-correct code, not a discovery of new bugs.

---

## Sprint 38 — Ranking System Design (design deliverable, no code)
**Category:** Product/architecture design · **Status:** COMPLETE (2026-07-06) — design document written and committed, no code written

**Goal:** Produce and get sign-off on a full ranking-system design before any data sourcing begins.

**Full design:** [`docs/plans/2026-07-06-ranking-system-design.md`](plans/2026-07-06-ranking-system-design.md) — produced via a dedicated `/brainstorming` session (not an inline draft, per the process decision below), refined across several `/evaluate` rounds that each ground-truthed a specific claim against the live codebase rather than accepting it on assertion.

**Deliverable — answers, all resolved (see the linked design for full reasoning):**
- **What gets ranked:** players only. Adopted the original spec's existing formula/weights/component sources (`Consensus = TM×0.40 + EA×0.20 + Awards×0.20 + Media×0.10 + Form×0.10`, found already fully specified in `docs/DATA_ACQUISITION_STRATEGY.md` §4) rather than designing from scratch — but re-scoped for a mid-tournament, already-launched app rather than the original pre-launch phasing.
- **Scope:** the 12 currently-alive teams' full squads (~312 players), a one-time cut, all 5 components sourced together (no phased component rollout).
- **The one real design change from the original plan:** Form is computed from this project's own `data/match-events.json` (starts, sub-appearances, goals, assists, MOTM — broadened from "goals+assists" so it's meaningful across all positions, not just attackers) instead of an external manual lookup. This was verified against real tournament data during the session, which also surfaced a genuine name-matching bug (a real player's stats silently split across two name variants) that's now a required regression-test fixture, not just a lesson noted in the doc.
- **Normalization:** percentile rank, not min-max — chosen based on the actual (heavily right-skewed) score distribution measured from real data during the session, not asserted.
- **Determinism:** a hard requirement — unresolved player names are reported and skipped, never guessed, reusing `gather-guardian-bios.mjs`'s already-proven, already-deterministic matching chain rather than inventing new fuzzy logic.
- **Where rankings surface:** Hero Cards (fixing a pre-existing gap versus the original spec — cards were always showing caps, never the "Consensus Score" the spec actually called for), a new Profile Panel "Ranking Breakdown" section, and Club/League Explorer's "Average Consensus Rating."

**Process decision (resolved 2026-07-06):** confirmed as a dedicated design session (`/brainstorming`), not an inline discussion — see the linked design doc's "Decisions log" for the full, itemized record of every choice made and why.

**Dependencies:** None to start; fully blocks Sprint 39 (still blocked — no implementation has started).
**Completion criteria:** written design, reviewed and approved, with an explicit v1 scope boundary. **Met.**
**Tournament timing:** Evergreen.

---

## Sprint 39 — Rankings Phase 1 Implementation
**Category:** Genuinely new feature (data sourcing + build) · **Status:** **PAUSED (2026-07-09)** — by explicit user direction, to prioritize Sprint 44 (Knockout Bracket Wallchart Redesign). Resume the EA ratings manual CSV import phase once Sprint 44 lands. Infrastructure COMPLETE (2026-07-06/07): pipeline, schema, generation script, all three UI surfaces, validation, and tests are built and verified. Of the 4 manual components, **Transfermarkt is complete (286/286, all 11 teams — 2026-07-08)** and **Awards is complete (260/286 players, all 11 teams — 2026-07-07, confirmed on a second bounded audit pass)**; **EA remains untouched** — an agent-side automated-fetch attempt (Playwright against ea.com/games/ea-sports-fc/ratings) was tried and confirmed not to work (2026-07-08), so EA stays gated on the user supplying raw values via the same team-by-team CSV workflow used for Transfermarkt. Every in-scope player is still `provisional` until all 4 components land.

**Goal:** Implement the ranking system exactly per the approved design: `scripts/generate-rankings.js` + `scripts/lib/ranking-formula.mjs`, `data/ranking-scope.json`, manual entry of the 4 static components for the ~312 in-scope players, the three UI surfaces (Hero Cards, Profile Panel Ranking Breakdown, Club/League Explorer), and the new `validate-data.js` completeness check.

**Complexity:** Likely high — real manual data-sourcing effort is still the expensive part (4 manual components × 286 players, down from the original ~1,250-player estimate now that scope is stable-alive teams only). Treat as its own multi-session initiative, not a single bounded sprint. Form itself is now fully automated (no manual sourcing needed for that component), which reduces the total manual burden versus the original 5-component plan.
**Completion criteria:** defined in `docs/plans/2026-07-06-ranking-system-design.md` §6 (unit tests, real-data sanity check reproducing the design session's own top-player result, browser regression across 3 team states).
**Tournament timing:** the scope is locked from freshly-refreshed data at implementation time (11 teams — Portugal was eliminated between the Sprint 38 design session and Sprint 39 build, confirming the design's own "lock from current state, not the design snapshot" decision), so there's no urgency pressure from the tournament clock beyond "earlier means more of the tournament's remaining matches benefit from a working Form component."

### Implementation retrospective (2026-07-06/07) — infrastructure only

**What was done:**
- Refreshed tournament data via the Sprint 34 cadence (`sync-data` → `update-knockout` → `gather-match-events`/`gather-head-to-head*` → `validate`) before locking scope, per the approved plan.
- **Found and fixed a real bug while refreshing data**, unrelated to Sprint 39's own design: `mergeKnockoutMatches()` (`scripts/lib/knockout-merge.mjs`, Sprint 42) only ran `resolvePropagatedSlots()` once, before the API-result loop, so a same-run newly-FT result (Portugal 0-1 Spain) wouldn't propagate Spain into the next round until a second script run. Fixed by calling it again after the API loop.
- Locked `data/ranking-scope.json` from the post-refresh alive-team list: **11 teams** (Portugal eliminated since the design session's 12-team snapshot).
- Built `scripts/lib/ranking-formula.mjs` (pure functions: name normalization/matching, Form aggregation, percentile ranking, consensus computation) and `scripts/generate-rankings.js` (orchestrator — seeds stub entries, computes Form + consensus, reports unmatched names).
- Added `validateRankings()` to `scripts/validate-data.js` — non-fatal completeness report, same idiom as Sprint 43's broadcaster check.
- Wired all three approved UI surfaces: Hero Cards (`overview-tab.js` — consensus-first with caps fallback, explicit "Consensus N"/"N caps" stat line), Profile Panel Ranking Breakdown (`profile-panel.js` — placed after the bio block; the design doc's "before Similar Players" framing didn't apply since no such section exists in the actual code), and Club/League Explorer average consensus rating (omitted entirely, not shown as N/A, when a club/league has zero non-provisional ranked players).
- Wrote `test/ranking-formula.test.mjs` (Sprint-37-style, `node:test`, no mocking) covering name-matching (including the three real bugs found below as fixtures), Form aggregation, percentile tie-breaks, and consensus renormalization. Full suite: 38/38 passing.

**Three real-data bugs found and fixed while building the formula (all now locked in as regression tests):**
1. **Messi name fragmentation** — naive exact-string matching split "Lionel Messi" (starting lineup/MOTM) from "Messi" (goal scorer) into two stat entries. Fixed with a generalized unambiguous-suffix-match rule.
2. **Compound-surname matching gap** (Lo Celso, De Bruyne) — the same suffix-match rule, generalized rather than assuming a surname is always one token, fixed both.
3. **MOTM-via-substitute** (Switzerland's Manzambi) — only starting lineups were checked to resolve which team a MOTM played for, missing subs. Fixed by building a combined starters+subs roster per fixture.

11 event names remain genuinely unresolved (abbreviations, nicknames, and at least one likely pre-existing misattribution) — deliberately left reported-and-skipped per the design's determinism requirement, not chased further.

**Recommendation for phasing the manual data-entry work (4 components × 286 players):** do it **one component at a time across all 286 players**, not one player at a time across all 4 components — each component has a single consistent source (Transfermarkt market value, EA ratings, awards voting, media mentions), so batching by source minimizes context-switching and lets `npm run generate-rankings` + `npm run validate` re-run after each full pass to show shrinking provisional counts as concrete progress. Suggested order: Transfermarkt first (highest weight, most objectively sourceable), then EA, then Awards, then Media. Each pass is independently stoppable/resumable — provisional entries stay fully visible and ranked throughout, just excluded from hero-card selection until complete.

### Acquisition strategy revision (2026-07-07) — before the manual pilot began

Before starting the manual data-entry phase, each of the four components' planned source was tested directly (not assumed) against the live sites. Three of four didn't hold up — **Transfermarkt** (403/WebFetch hard error, same failure class as the already-ruled-out WorldFootball.net), **EA ratings** (static fetch only surfaces ~15-20 global superstars; FUTBIN/SoFIFA mirrors both 403), and **Media/Instagram** (login-walled, no follower count visible even for a control superstar profile). Only **Awards** (Wikipedia) held up as originally planned — with one further limitation found while implementing it: individual-award tiers (Ballon d'Or, FIFA Best, etc.) live in free prose, not a structured field, and aren't reliably auto-parseable, whereas team-competition results (World Cup winner) are, via the infobox's structured `medaltemplates` field.

**Resulting architecture change**, detailed in `docs/plans/2026-07-06-ranking-system-design.md` §0/§3a: a new "raw data in, derived scores out" principle. `data/rankings.json`'s schema gained four raw fields (`transfermarktValueEUR`, `eaRatingRaw`, `awardsRaw`, `mediaPageviews`); four new pure `derive*Score()` functions in `ranking-formula.mjs` compute the 0–100 scores from them (percentile-rank for Transfermarkt/Media, direct passthrough for EA, rubric-based for Awards); `generate-rankings.js` now recomputes all four derived scores fresh every run instead of treating them as hand-maintained fields — the same treatment `form` already got. `computeConsensus()` itself is unchanged, so all 12 pre-existing unit tests stayed valid; 12 new tests cover the four derive functions (46 total, all passing).

**New script, `scripts/gather-rankings-signals.mjs`** (`npm run gather-rankings-signals`), automates the two components that turned out to be genuinely fetchable: Wikimedia Pageviews for Media, and World-Cup-winner detection for Awards. Run for real against the full 286-player scope: **285/286 got a Media score** (one player, Morocco's Marwane Saadane, has no resolvable Wikipedia article — reported, not guessed), **5 Argentina players** correctly flagged `worldCupWinner: true`. One real bug found and fixed during this run: the first pass returned only 30/286 media scores and 1/5 World Cup winners — diagnosed as Wikipedia/Wikimedia rate-limiting transient failures being silently treated as "page doesn't exist" (no retry logic, no descriptive User-Agent header). Fixed with a retry-with-backoff wrapper and a proper UA header (matching the retry convention already used in `gather-head-to-head-stats.mjs`); the corrected re-run produced the 285/286 result above. A second, smaller bug (the Pageviews API's date-window calculation used a fixed "day 28" as the end-of-month proxy, which the API rejects with "no full months between dates" for any month with more than 28 days) was caught and fixed the same way, verified against the real API before the full run.

**Manual work still remaining, unchanged in shape:** Transfermarkt and EA raw values (and the non-World-Cup-winner parts of `awardsRaw`) still need a human to supply them directly into `data/rankings.json`, per the phasing recommendation above — that data-entry phase has not yet started.

### Acquisition workflow refinements (2026-07-08) — before the manual pilot began, round 2

Three refinements, requested after reviewing the above: (1) check whether Awards automation could be extended further, (2) build a proper bulk-import mechanism instead of hand-editing JSON for the remaining manual fields, (3) add provenance to manually-entered values from the start.

**Wikidata extension.** Found and verified a further automatable Awards signal: Wikidata's structured `P166` ("award received") claims, queried via an exact sitelinks lookup against the article titles `gather-rankings-signals.mjs` already resolves (no new name-matching risk). Initially mapped four fields — `ballonDorTier` (winner tier), `fifaBestPlayer`, `uefaPoty`, `wcGoldenBall`.

**Real bug found and reverted the same day:** `fifaBestPlayer` produced a confirmed false positive — Egypt's Mohamed Salah shows a `P166` claim for "The Best FIFA Men's Player" despite only finishing 3rd (2018, 2021; confirmed against the actual Wikipedia prose). Wikidata includes podium finalists under "award received" for this specific award with no queryable qualifier distinguishing a finalist from a winner. Spot-checked the other three mappings against real non-winners already in scope (Ballon d'Or: Mbappé; UEFA POTY: Bellingham and Kane; World Cup Golden Ball: Mbappé again) — all clean, so the issue was isolated to `fifaBestPlayer`, not systemic (one unrelated false *negative* also surfaced: Spain's Rodri's genuine 2023-24 UEFA POTY win isn't yet in Wikidata — an acceptable gap, since under-detection just defers to manual entry). Per this project's determinism principle, `fifaBestPlayer` was removed entirely rather than patched with an unverified heuristic, and the two already-written values (Messi, Salah) were stripped from `data/rankings.json` — including Messi's, even though it happened to be correct by coincidence. Final automated coverage after the fix: `worldCupWinner`, `ballonDorTier` (winner-only), `uefaPoty`, `wcGoldenBall`.

**Bulk-import mechanism.** New `scripts/import-ranking-raw.mjs` (`npm run import-ranking-raw`) — bulk-imports one team's researched values at a time from a pasted CSV via stdin, instead of hand-editing 286 players' worth of nested JSON. Conservative by default (never overwrites a non-null raw field without `--force`); a player's row appearing in an Awards import at all marks `awardsRaw` as researched even when every optional column is blank, so "checked, has none" correctly resolves to a real 0, not stuck on `null`.

**Lightweight provenance, added from the outset.** Every entry can now carry a `rawProvenance` object recording `{source, enteredAt}` per raw-field-group (`transfermarktValueEUR` / `eaRatingRaw` / `awardsRaw`) for manually-supplied values — matching this project's `h2h-manual-overrides.json` convention of tracking where a hand-entered value came from, without retrofitting it after hundreds of entries exist.

Full design detail in `docs/plans/2026-07-06-ranking-system-design.md` §0b. 56/56 tests passing, `npm run validate` clean.

**Manual work still remaining, unchanged in shape:** Transfermarkt and EA raw values, plus `fifaBestPlayer` and the remaining `awardsRaw` sub-fields Wikidata/Wikipedia can't reach, still need a human to supply them — now via `scripts/import-ranking-raw.mjs` rather than hand-editing JSON. That data-entry phase has not yet started. *(Superseded below — the Awards portion of this is now done.)*

### Awards manual data-entry phase (2026-07-07) — complete for all 11 teams

Worked one team at a time via a new research aid, `scripts/dump-player-honours.mjs` (`npm run dump-player-honours`) — pulls each in-scope player's raw Wikipedia Honours-section text for reading/transcription (not an extraction script; never parses or guesses a value itself). Per team: dump → read → hand-tabulate `ballonDorTier`/`fifaBestPlayer`/`uefaPoty`/`totyEaFc`/`clWins`/`domesticTitles` against a small set of conventions established on the first team and applied consistently after (`clWins` = UEFA Champions League wins only, excluding CAF/Copa Libertadores/AFC continental equivalents; `domesticTitles` = top-flight league championships only, excluding cups, second-tier leagues, MLS Cup/Supporters' Shield, and sub-national competitions like Brazil's Campeonato Carioca/Paulista) → CSV → `import-ranking-raw.mjs` → `generate-rankings` → `validate` → `npm test` → commit. **Final result: 260/286 players researched across Argentina, Belgium, Colombia, Egypt, England, France, Morocco, Norway, Spain, Switzerland, USA** (roughly one commit per team, several small follow-up commits — see git log for `Sprint 39: Awards manual research batch`). The remaining 26 gaps are confirmed genuine absences (no Honours section exists on the player's own article) after a second, independent audit pass — see below.

**Bounded re-audit (2026-07-07), after the resolver fixes:** re-checked all 32 players flagged "no Honours section found" against the improved resolver (§ above) and a Honors/Honours-tolerant extraction regex, to see whether any were resolver casualties rather than genuine gaps. **6 of 32 were recoverable** — none were resolver bugs this time (all 6 resolve directly to their own correct article); they were simply missed during each team's original fast per-player read, most often because their real Honours content is thin or entirely youth-level and easy to undercount as "nothing there." Two (Egypt's Haissem Hassan, Morocco's Issa Diop) have real sections containing only youth-competition content, which this project's convention excludes — correctly resolve to a real `0`, not left `null`. England's Anthony Gordon has real content, but every honour is a cup win, a youth cap, or a national-team runner-up finish — none of which count under the established scoping rules, also a genuine `0`. The other three carry real qualifying honours: France's Théo Hernández (clWins=1, domesticTitles=1) and Lucas Hernández (clWins=3, domesticTitles=7), and Morocco's Brahim Diaz (clWins=1, domesticTitles=4 — his AFCON 2025 Golden Boot/Team of the Tournament are continental national-team awards, not applicable to any tracked field). No code or test changes were needed — pure data entry through the already-tested pipeline. **The remaining 26 gaps are now confirmed genuine on two independent passes** — Awards manual research is complete.

**The 26 confirmed-genuine gaps, by team:** Argentina 1 (Barco), Belgium 2 (Theate, Ngoy), Colombia 3 (Portilla, Machado, Gómez), Egypt 5 (Abdelkarim, Ziko, Saber, Tarek Alaa, Mohamed Alaa), France 0, Morocco 6 (Saadane — unresolvable, no Wikipedia article at all; Bouaddi, El Mourabet, Sbai, Amaimouni, Halhal), Norway 6 (Thorsby, Tangvik, Selvik, Aasgaard, Langås, Ryerson), Switzerland 3 (Muheim, Elvedi, Vargas). All are fringe/reserve squad players whose Wikipedia articles either don't exist, or exist but genuinely carry no Honours section — verified by direct resolution and content check, not assumed from the original per-team research pass.

**Three real bugs found and fixed while researching USA specifically, all with regression tests:**
1. **`resolveArticleTitle()` accepted disambiguation pages as real matches.** A `{{Nickname}}`/`{{disambig}}`/`{{Surname}}`-style list page counts as a successful fetch (no `missingtitle` error), so it could win before a more-specific fallback ever ran. Fixed with content-based detection (`isDisambiguationWikitext()` in `gather-rankings-signals.mjs`, applied at every resolution stage) plus `redirects=1` on both wikitext fetchers, since one collision (Rodri) turned out to have its `_(footballer)` fallback redirect back to the very disambiguation page it was meant to escape.
2. **American players' Wikipedia articles use the US spelling "Honors," not "Honours."** A 100% false-negative rate across USA's entire squad — Christian Pulisic's article literally carries an editorial comment enforcing the US spelling. Fixed in `dump-player-honours.mjs`'s section-extraction regex, including a follow-up fix for an HTML comment embedded inline in the heading itself.
3. **American players use `(soccer)` as their Wikipedia disambiguator, not `(footballer)`.** Added as a new resolver fallback stage; one case (Mark McKenzie) still needed an explicit override on top of that, since both his direct title and the `(soccer)` suffix are themselves disambiguation pages.

**This had already contaminated committed production data.** A bounded audit (triggered by finding Spain's Eric García mid-collision) checked every already-researched team's `mediaPageviews` for implausibly low values and found 13 more real collisions this way — most notably Spain's Rodri (the reigning real-world Ballon d'Or winner), whose `mediaPageviews` had been silently pulled from a disambiguation page's own traffic (91) rather than his real article's (185,529). Corrected all 13, added `KNOWN_TITLE_OVERRIDES` entries for the handful the automatic fallback chain still couldn't disambiguate on its own (Suárez, Rodri, Trézéguet, Mark McKenzie, Eric García, Luis Díaz, Nicolás González, Álvaro Montero, Tarek Alaa — each confirmed via real wikitext content before touching anything, never guessed), and completed the Awards research for those players too as a follow-up once their articles resolved correctly.

**Manual work still remaining:** Transfermarkt and EA raw values only. Both are gated on the user supplying real per-team CSVs (`scripts/import-ranking-raw.mjs --field transfermarkt|ea`) — agent-side fetching for both was tested and confirmed blocked (§0 above). That data-entry phase has not started.

### Transfermarkt manual data-entry phase (2026-07-08) — complete for all 11 teams

Worked one team at a time via `scripts/import-ranking-raw.mjs --field transfermarkt`: user pasted each team's Transfermarkt squad-value table, values were converted from Transfermarkt's display format (`€180.00m`, `€800k`) to plain EUR integers, matched to roster player IDs by shirt number, imported, then verified with the same chain used throughout Sprint 39 (`generate-rankings` → `validate-data.js` → `npm test` → a monotonic-percentile/tie-handling sanity check → a cross-team leakage check) before each commit. **Final result: 286/286 players — Transfermarkt raw-value coverage is complete.** No architectural or schema changes were required; `deriveTransfermarktScore()`'s cross-team percentile-rank design (confirmed correct in production as the pool grew) worked as designed throughout.

Three pasted squads were caught and rejected before import because they were the wrong page — England's and Switzerland's first pastes were historical/retired-era rosters, and France's first paste was an accidental repeat of the just-completed USA squad — in each case the mismatch was flagged and the user resent the correct current squad, no guessing involved. Two individual name matches were ambiguous enough to require independent verification rather than assumption: Egypt's "Nabil Dunga" (confirmed as `egypt-emad` via the player's own bio text) and Morocco's "Munir El Kajoui" (confirmed as `morocco-mohamedi` via an exact DOB/club/birthplace match on ESPN and Wikipedia).

**Current rankings coverage after this phase: Transfermarkt 286/286, Awards 260/286, Media 285/286, EA 0/286.**

**Manual work still remaining:** EA ratings only, gated on the user supplying per-team CSVs (`scripts/import-ranking-raw.mjs --field ea`, format `playerId,ratingRaw` 0–99 direct passthrough). That phase starts next, using the same proven team-by-team workflow.

---

## Sprint 40 — Documentation & Process Debt Cleanup
**Category:** Documentation + minor technical debt · **Status:** COMPLETE (2026-07-06) — the four mechanical cleanup actions below; the content refresh remains separate, unstarted

**Goal:** Bring `docs/08_PROJECT_STATUS_REVIEW.md` back in line with reality; remove misleading tooling signals.

**Scope, with decisions resolved 2026-07-06:**
- **Delete the confirmed-dead stub scripts:** `scripts/generate-player-bios.js`, `scripts/update-standings.js`, `scripts/lib/bio-templates.js` — **and `scripts/lib/ranking-formula.js`**, found in the identical state while verifying this decision (`computeConsensus()` returns `null`, unimported anywhere — not in the original list, but the same situation exactly). All four are confirmed zero-risk to delete: bare stubs or unimported dead code, fully superseded (`generate-player-bios.js` by `gather-guardian-bios.mjs`, `update-standings.js` by `sync-data.mjs`), preserved in git history regardless.
- **Remove the false precedence claim** in `docs/08_PROJECT_STATUS_REVIEW.md` (line 9: *"When these documents conflict on feature status, this document takes precedence"* over `SESSION_HANDOFF.md`) — **immediately, not gated on the full content refresh.** These are two separable tasks; the one-line correction shouldn't wait on the larger audit.
- **Remove the two no-op `pre-deploy` steps** (`generate-bios`, `generate-rankings`) now, since they call the stub files being deleted above. Re-add real invocations once Sprint 39 actually implements ranking generation. (Also worth fixing in the same pass: `gather-guardian-bios.mjs`, which is fully implemented and already in use, currently isn't part of the `pre-deploy` chain at all.)
- **Delete `netlify/functions/sync-tournament.mjs`** — confirmed safe: its implementation knowledge is fully preserved in **`docs/LIVE_DATA_PLAN.md` §11 ("Architecture Redesign — Cache-Aside Pipeline")** and in `docs/ENGINEERING_PRINCIPLES.md` (which uses this exact incident as its canonical "silent success ≠ correctness" example). Nothing is lost by deleting the code file; it stops a real, ongoing cost too — the `netlify.toml` schedule still triggers this function every 2 minutes for a guaranteed no-op, which is quota/log noise on the Netlify account, not just a tidiness issue.
- Refresh `docs/08_PROJECT_STATUS_REVIEW.md` content itself (best after 33/34/35/36/42 land — the first four already have).

**Dependencies:** Best after 33/34/35/36 (satisfied). **Complexity:** Low.
**Tournament timing:** Evergreen, best done last among whichever sprints run first.

### Implementation retrospective (2026-07-06)

**What was done — exactly the four decided actions, scope deliberately not expanded:**
- Deleted `scripts/generate-player-bios.js`, `scripts/update-standings.js`, `scripts/lib/bio-templates.js`, `scripts/lib/ranking-formula.js`.
- Removed the false precedence sentence from `docs/08_PROJECT_STATUS_REVIEW.md` line 9, replacing it with an accurate statement that `docs/ROADMAP.md`/`docs/SESSION_HANDOFF.md` are the actively-maintained sources of truth and this document is a periodic snapshot (the operational-procedure precedence in favor of `SESSION_HANDOFF.md`, which was never flagged as false, was left as-is).
- `package.json`: removed the `generate-bios` and `update-standings` npm scripts entirely (not just from `pre-deploy` — their target files no longer exist, so leaving the script entries would have created new dangling references); removed `generate-bios`/`generate-rankings` from the `pre-deploy` chain and added `gather-guardian-bios`, per the decision. `generate-rankings` (the npm script) was deliberately left defined, since `scripts/generate-rankings.js` was never part of this deletion batch (see note below).
- Deleted `netlify/functions/sync-tournament.mjs` and its `[functions.sync-tournament]` schedule block in `netlify.toml`.

**One inconsistency noticed during execution, deliberately not acted on (kept in scope discipline):** `scripts/generate-rankings.js` is in the identical bare-stub state as the three deleted "dead" scripts (prints "not yet implemented", never wired to its own `ranking-formula.js` helper — which *was* deleted). The difference: `generate-rankings.js` isn't superseded by a working replacement the way `generate-player-bios.js` (→ `gather-guardian-bios.mjs`) and `update-standings.js` (→ `sync-data.mjs`) are — it's a placeholder for Sprint 39's not-yet-built ranking feature. Whether it should also be deleted (on the same "Sprint 39 will write fresh code against Sprint 38's design anyway, not resurrect this stub" reasoning already applied to `ranking-formula.js`) or kept as a reserved placeholder is a real, undecided question — flagged here rather than resolved unilaterally, since this pass's instruction was to stay within the four already-decided actions only.

**One stale comment found and fixed while checking for dangling references:** `netlify/functions/live-data.mjs`'s header comment referenced "the scheduled sync-tournament function" in present tense, describing code that no longer exists after this sprint's own deletion. Updated to past tense with a pointer to the two docs (`LIVE_DATA_PLAN.md` §11, `ENGINEERING_PRINCIPLES.md`) that preserve the lesson.

**Verification performed:**
- `grep`ed the entire codebase (excluding `node_modules`) for every deleted filename/function name — the only hit was the stale `live-data.mjs` comment above, now fixed. No other dangling references.
- Confirmed every remaining `package.json` script resolves to a file that actually exists.
- `npm run validate` — clean, `VALIDATION PASSED`, broadcaster gaps section unaffected (still correctly flags the same 6 matches from Sprint 43).
- `npm test` — all 24 Sprint 37 tests still pass, confirming none of the deleted files or moved config were load-bearing anywhere in the test suite either.
- Did **not** run `npm run pre-deploy` itself (it performs real network fetches and file writes — `gather-guardian-bios`, `build-search-index` — out of scope for a verification pass); instead verified the chain's structure and every referenced script's file existence directly.

---

## Sprint 41 — Remaining Photo Gaps (optional, explicitly the user's call)
**Category:** Operational/data-maintenance, evergreen · **Status:** COMPLETE (2026-07-09)

**Goal:** Another recovery pass for 300 remaining null player photos + 3 manager photos (Haiti, Cape Verde, Saudi Arabia).
**Scope:** `node scripts/gather-photos.js` with `RETRY_NULLS=true`, then `WIKIDATA_PASS=true` (same pattern as Sprint 20-21).
**Completion criteria:** coverage improves measurably from 76.9% (996/1,296).
**Tournament timing:** Evergreen, no urgency. Deferred on 2026-07-06 in favor of higher-leverage work in flight at the time (Sprint 42/44); run once that settled.

### Implementation retrospective (2026-07-09)

**What was done, same pattern as Sprint 20-21:**
- Pass 1 (`RETRY_NULLS=true`): Search API retry for 277 confirmed-null players. Recovered 87, 2 correctly auto-skipped as suspicious (left null for Pass 2).
- Pass 2 (`WIKIDATA_PASS=true`): Wikipedia re-search + Wikidata P18 fallback for the remaining 191 nulls. Recovered 3 (one of which was a false positive caught in manual review, see below).
- Manager gaps: `runManagerPass()`'s `undefined`-only filter doesn't retry entries already marked `null`, so the 3 known manager gaps (Haiti/Migné, Cape Verde/Bubista, Saudi Arabia/Donis) needed a direct one-off search + pageimages + Wikidata P18 check rather than a normal script run. Cape Verde's Bubista now has a Wikipedia lead image that didn't exist at Sprint 21 — recovered. Haiti and Saudi Arabia confirmed to still have neither a Wikipedia lead image nor a Wikidata P18 claim for either manager — genuinely unavailable via automation, left null.
- Script constants (`RETRY_NULLS`/`WIKIDATA_PASS`) reset to `false` after use, per the established convention (Sprint 21 note).

**One false positive found in manual review, not caught by `isSuspicious()`:** Cape Verde's Mércio Rosa (`cape-verde-mario-rosa`) deterministically matches to "Campeonato Carioca" (an unrelated Brazilian league article) on Wikipedia's search API — reproduced identically on both Pass 1 and Pass 2's independent search calls, so it's a persistent property of how this specific name matches that index, not a one-off fluke. `isSuspicious()` only filters by *image type* (logos/crests/placeholders via filename keywords) — it has no way to detect a *topically wrong article*, so this slipped through the script's own safety net both times. Caught by manually cross-checking every newly-recovered title against the player's actual name (all 87+3 recoveries), not by the script. Reverted to `null` and left there — not worth a third automated attempt against the same deterministic mismatch; would need manual research to close.

**Verification performed:**
- Downloaded and visually inspected the 3 photos that came from the least-trusted paths (a merged-caption World Cup crop for Sweden's Elliot Stroud, a Wikidata P18 candid for Uzbekistan's Azizjon Ganiev, and Cape Verde's Bubista) — all three confirmed as correct, clearly-isolated individual photos of the right person.
- `npm test` — 74/74 passing (photo data isn't covered by the test suite; this confirms the change didn't break anything else).
- `npm run validate` — clean, `VALIDATION PASSED`.

**Final coverage:** players 950 → 1,038/1,248 (76.1% → 83.2%); managers 45 → 46/48 (95.8%); combined 995 → 1,084/1,296 (76.8% → 83.6%). Two manager gaps (Haiti, Saudi Arabia) and 208 player gaps remain — confirmed genuinely unavailable via Wikipedia/Wikidata automation, not a script limitation. No further automated pass is expected to close these; closing them would require manual research, which is out of scope for this operational sprint.

---

## Sprint 42 — Knockout Bracket Architecture Fixes
**Category:** Architectural bug fix (rendering + data-pipeline consolidation) · **Status:** COMPLETE and verified (2026-07-06)

**Goal:** Fix two confirmed architectural defects in the knockout bracket — a round-level "confirmed" gate that should be per-match, and a bracket connector-line algorithm that positions cards by array order instead of actual propagation relationships — without a visual redesign.

### Background — how this was found

Triggered by a user report of the bracket showing wrong-looking results (paraphrased as "France beat Sweden but Brazil appeared in the downstream slot"). A full read-only investigation (see conversation history, 2026-07-06) traced `js/modules/knockout-bracket.js`, `scripts/update-knockout.js`, `scripts/sync-data.mjs`, and `netlify/functions/live-data.mjs` against the live `data/knockout.json`, and found **two confirmed, independent defects** — neither of which was the original literal example (which didn't reproduce from the data at the time), but both real and evidenced. A Sprint 34 Pass 2 data-maintenance run (see above) then live-confirmed both diagnoses against real, current tournament data before any code changed.

### Defect 1 — round-level "confirmed" tick gate (should be per-match)

**Current behavior** (`js/modules/knockout-bracket.js:73-95, 142-161`): `#buildRound()` computes `allTeamsSet = round.matches.every(m => m.homeTeamId && m.awayTeamId)` — once per round — and passes it to every match in that round as `hideUnplayedTick`. The green `.bracket-team--confirmed` tick is suppressed only when **every** match in the round is fully resolved.

**Why this is wrong:** a round doesn't resolve all-at-once — R32 does (roughly, since it's gated by group-stage completion), but R16/QF/SF each fill in match-by-match over several real days as individual feeder matches conclude. Any single still-unresolved match in a round keeps the tick showing on every other match in that round, including ones resolved days earlier. **Live-confirmed in Pass 2:** with R16 now 8/8 resolved, the round shows its "All confirmed" banner and zero ticks (correct); with QF now 2/4 resolved (`qf-m1`, `qf-m3`), the round shows 4 individual ticks and no banner (`qf-m2`/`qf-m4` still TBD) — the exact symptom, now on the next round, as predicted.

**Fix:** compute the "hide tick" decision **per match**, not per round: `const matchFullySet = m.homeTeamId && m.awayTeamId` inside `#buildMatch()`, used in place of the round-wide `hideUnplayedTick` parameter. A team's tick disappears as soon as *its own match* has both sides known — independent of sibling matches in the same round.

**What happens to the round-level "All confirmed" banner:** keep it, but decouple it entirely from the per-match tick decision. It becomes a standalone milestone indicator (shown once literally every match in the round has both teams, same computation as today) with no bearing on individual tick visibility. This avoids the awkward case where every visible slot looks individually "confirmed" via the new per-match rule, yet the banner doesn't show because of a genuinely-still-open sibling match — that's fine and not confusing, since the banner and the ticks are now answering different questions ("is the whole round done" vs. "is this specific matchup known").

### Defect 2 — connector/positioning algorithm uses array order, not the actual propagation graph

**Current behavior** (`js/modules/knockout-bracket.js:294-297`): `#positionBracket()` computes each card's vertical center as `(prev[i*2] + prev[i*2+1]) / 2` — i.e., it assumes round *r*'s card at array index *i* is fed by round *r-1*'s cards at array indices `2i` and `2i+1`. This is never checked against real feeder relationships.

**Verified mismatch** against `scripts/update-knockout.js`'s `PROPAGATION` map: 7 of 8 R16 slots and 2 of 4 QF slots are positioned/connected incorrectly by this assumption (full table in the investigation notes). Only `r16-m4` and `qf-m1`/`qf-m4` align correctly, by coincidence of array order. **Team names inside each card are always correct** (rendered directly from `match.homeTeamId`/`awayTeamId`, unaffected) — it's the **SVG connector line** between columns that draws the wrong "this feeds that" relationship for most slots. This is very likely the real mechanism behind "traced a line from the France/Sweden result and it visually led to Brazil's box" even though the underlying JSON has always been correct.

**Fix:** derive feeder relationships from the actual propagation topology instead of array position. Concretely:
1. Extract `update-knockout.js`'s `PROPAGATION` map into a small, dependency-free shared module — e.g. `js/bracket-topology.js`, following the existing pattern of `js/tournament-state.js` (pure data/logic, no DOM, no fetching, no Node-only APIs) — so it's importable from both browser code and Node scripts without a build step, consistent with this project's zero-build-step architecture.
2. `update-knockout.js` imports `PROPAGATION` from that module instead of defining it inline (single source of truth — currently the map only exists in one place, which is good, but it's Node-only and the renderer has no way to consult it).
3. `#positionBracket()` in `knockout-bracket.js` uses the same topology to find each match's true two feeder match IDs, looks up their DOM elements/centers by match ID (not array index), and computes the midpoint from those — the connector lines then always represent the real relationship, and the layout keeps working correctly regardless of the order matches happen to appear in `knockout.json`.

**No visual redesign implied by this fix** — same columns, same card style, same overall bracket shape. Only the *derivation* of which two cards a connector line joins changes from "array position" to "graph lookup."

### Defect 3 (found investigating Defect 2's blast radius) — duplicated, fragile propagation-matching logic in two data-sync paths

**Found:** `scripts/sync-data.mjs`'s `syncKnockout()` (lines 128-200) and `netlify/functions/live-data.mjs`'s `mergeKnockout()` (lines 101-157) independently re-implement near-identical logic: match an API result to a local slot by team-ID pair, falling back to "exactly one local slot shares this UTC calendar date" when the slot is still TBD. **This fallback is fragile and already misfired live**, twice, during Sprint 34 Pass 2: `r16-m7`/`r16-m8` (same kickoff date) and `qf-m3`/`qf-m4` (same kickoff date) could not be auto-resolved by either script even though their feeder matches were already complete — both required the manual `update-knockout.js --force` step to fill in.

**Recommendation — consolidate, and mostly supersede the date fallback rather than just hardening it:**
- Extract a single shared `mergeKnockoutData(existingKnockout, apiMatches, teamMap)` function (e.g. `scripts/lib/knockout-merge.mjs`) used by both `sync-data.mjs` (Node CLI) and `netlify/functions/live-data.mjs` (Netlify Function) — both already run in Node/ESM, so a shared import needs no new tooling. This directly answers "should they share a canonical implementation": **yes** — maintaining two hand-copies of the same fallback logic is exactly how a fix to one and not the other reintroduces this defect later.
- Once the `js/bracket-topology.js` propagation graph from Defect 2 exists, the shared merge function can use it as a **third, deterministic resolution path**: for any local slot still TBD, check whether the topology says its two feeder matches are already FT in local data — if so, the winners are already knowable *without needing anything from the API's date field at all*. This isn't available for the very first round (R32, fed by group-stage qualification, not by another knockout match) but covers R16 onward entirely, which is exactly where the date-collision fragility lives today.
- **Explicit decision on the date-based fallback (per the plan requirement to not leave this implicit):** keep it, but demote it to a last-resort path used only when neither team-pair matching nor the propagation-graph resolution applies (in practice, this becomes rare — mostly moot once the graph-based path is added for knockout rounds). Do not attempt to "harden" the date comparison itself (e.g. normalizing UTC-vs-local calendar day) as a primary fix — the propagation graph is a strictly better, deterministic source of truth wherever it applies, and investing in a smarter date heuristic would be solving the wrong layer of the problem.

### Explicitly out of scope for this sprint

**Visual/layout redesign.** The underlying bracket *topology* is correct and matches FIFA's real structure (verified: the two Sprint-27-established halves of 8 R32 matches each cleanly feed separate semifinal paths, with no crossover until the Final, and the existing 3rd-place-branch positioning in `#positionBracket()`'s final-round handling is already correct). Nothing found in this investigation motivates a different visual layout — only the connector *derivation logic* needs fixing. Revisit a possible layout modernization only after Defects 1–3 are implemented and verified, as a separate, later decision.

**Regression test coverage** for these fixes belongs naturally in Sprint 37 (Regression-Prevention Test Coverage, already scoped above) — e.g. a test asserting connector-derived pairs match the topology module for a known bracket state, and a test reproducing the exact R16/QF same-date collision scenario against the consolidated merge function.

**Recommended implementation order:** (1) extract `js/bracket-topology.js` and point `update-knockout.js` at it — pure refactor, no behavior change, easiest to verify in isolation; (2) fix the per-match tick rule (Defect 1) — small, independent, low-risk; (3) fix connector derivation (Defect 2) using the new topology module; (4) consolidate `sync-data.mjs`/`live-data.mjs` into a shared merge function and add the graph-based resolution path (Defect 3) — largest change, do last once 1-3 are settled and verified.

**Dependencies:** None blocking — can start independently of Sprint 37, though sequencing test coverage alongside these fixes (rather than after) would let the tests double as the verification evidence.
**Complexity:** Medium — three related but separable fixes, each individually small; the consolidation in Defect 3 is the largest single piece.
**Completion criteria:** Per-match tick verified correct on a round with mixed resolved/TBD slots; connector lines verified to match the topology graph for every current bracket slot; `sync-data.mjs` and `live-data.mjs` share one merge implementation; a reproduction of the exact R16-same-date collision scenario resolves correctly without manual `update-knockout.js` intervention.
**Tournament timing:** Time-sensitive in the sense that every future round transition (QF→SF, SF→Final) will keep re-exposing Defect 1 and re-testing Defect 3's fallback until fixed — the sooner this lands, the fewer more manual `update-knockout.js` catch-up passes are needed for the same reason.

### Post-implementation verification pass — completed 2026-07-06

All four steps were implemented in the agreed order: (1) extracted `js/bracket-topology.js` (PROPAGATION map + a derived `getFeederMatchIds()` lookup), verified as a pure no-op via dry-run comparison; (2) fixed the confirmation-tick gate to per-match in `js/modules/knockout-bracket.js`, keeping the round-level banner as a decoupled milestone indicator; (3) rewrote `#positionBracket()`/`#drawConnectors()` to derive feeder relationships from the topology graph instead of array order; (4) consolidated `sync-data.mjs`'s `syncKnockout()` and `live-data.mjs`'s `mergeKnockout()` into a shared `scripts/lib/knockout-merge.mjs`, adding `resolvePropagatedSlots()` (in `bracket-topology.js`) as a new deterministic resolution path that fills a TBD slot from already-FT local feeders before falling back to the fragile same-date matching.

**Unexpected finding, resolved in-scope (no scope expansion needed):** while consolidating, found that `live-data.mjs`'s `mergeKnockout()` already had home/away-swap handling (tries both `homeId:awayId` and `awayId:homeId` team-pair keys) that `sync-data.mjs`'s `syncKnockout()` was missing entirely — a real, previously-unnoticed inconsistency between the two beyond what the original investigation identified. The consolidation naturally fixes this: `sync-data.mjs` now inherits the swap handling for free.

**Verification results, all five checklist items:**
1. **Connector topology correct** — verified geometrically (exact pixel-center comparison, not just visual inspection) across all four round transitions (R32→R16, R16→QF, QF→SF, SF→Final): every connector line now lands exactly on its true feeder's rendered center. Confirmed all 7 previously-wrong R16 slots and 2 previously-wrong QF slots (`qf-m2`/`qf-m3`, which were swapped with each other) are now correct.
2. **Propagation works correctly** — verified against real data (R32→R16→QF, already resolved) and a synthetic end-to-end test simulating both semi-finals completing (one on normal time, one on penalties), confirming `final-m1` and `3rd-place` both resolve correctly, including the previously-untested loser-propagation path and penalty-shootout branch.
3. **Confirmation indicators behave correctly** — verified all three possible states: fully resolved (no tick — R32/R16 in current data), fully unresolved (TBD placeholder — `qf-m2`/`qf-m4`), and partially resolved (tick on the known side only). The third state doesn't occur naturally in the current bracket data (every match is currently either fully known or fully unknown), so it was verified via a temporary injected test fixture (`qf-m4` with only the home side populated), confirmed correct, then reverted — real data was never left altered.
4. **Automatic advancement works correctly** — reproduced the exact `r16-m7`/`r16-m8` same-kickoff-date collision that required manual `update-knockout.js` intervention during Sprint 34 Pass 2, and confirmed the new consolidated merge resolves it with **zero API or date dependency** (tested by calling the merge function with an empty API match list — it still correctly resolves both slots from local data alone). Also ran the real `sync-data.mjs` end-to-end against live production data with no errors.
5. **No regressions** — `npm run validate` clean; zero console/page errors across a full browser sweep (Match Centre for a completed R32 match, a completed R16 match, and an upcoming QF match; Tournament Centre's knockout and today tabs; the best-thirds page; a team page; Compare Teams).

---

## Sprint 43 — Broadcaster Schedule Data (detection + manual workflow)
**Category:** Data maintenance (detection + manual workflow, not an acquisition pipeline) · **Status:** COMPLETE (2026-07-06)

**Trigger:** user report that upcoming knockout fixtures show no "Watch on BBC/ITV" badge. Investigated read-only (no files changed) before any implementation, per the same discipline used for Sprint 42.

### Current state and root cause

**Not a regression — an acquisition gap that was never closed.** Checked `data/knockout.json`: all 16 R32 matches have real `broadcaster` values (`"ITV"`/`"BBC"`); every match from R16 onward (`r16-m1` through `final-m1`, 22 matches) has `broadcaster: null`. Checked `data/fixtures.json`: **all 72 group-stage fixtures have `broadcaster: null`, and always have** — this field has never been populated for the group stage at all, only for the 16 R32 matches, apparently via a one-time manual entry during Sprint 29 when the badge-rendering feature was built (ROADMAP's own Sprint 29 entry: *"All R32 matches have `broadcaster` populated in `knockout.json`"*).

**No acquisition pipeline exists.** `grep -ri broadcaster scripts/ netlify/` returns zero hits — not `sync-data.mjs`, not any `gather-*.mjs` script, not `live-data.mjs`. This isn't a bug in an existing pipeline (rendering issue / stale data / merge bug) — no pipeline was ever built. `docs/DATA_ENTRY_GUIDE.md`'s fixture schema example (§13) shows `"broadcaster": null` as the field's own illustrative default, consistent with it always having been a manually-entered-when-known field, never an automated one.

**No evidence the source data exists and simply fails to propagate.** football-data.org's API isn't referenced for broadcaster anywhere in this codebase, and the 16 R32 values (`ITV,BBC,ITV,ITV,ITV,BBC,ITV,BBC,BBC,ITV,BBC,BBC,BBC,ITV,ITV,BBC`) don't follow an obvious derivable rule (not simple alternation) — consistent with one-time hand-entry from a real published UK schedule, not an algorithm or a field this project already has access to.

### Why only upcoming matches are actually affected

`js/broadcasters.js`'s `broadcasterBadge()` and `broadcasterIcon()` both explicitly `return ''` when `status === 'FT'` (lines 29 and 46) — completed matches never render a broadcaster badge, regardless of the underlying data. This means:
- The 4 already-completed R16 matches (`r16-m1`–`r16-m4`) are **not** part of the visible symptom — their `null` broadcaster is invisible by design.
- Retroactively backfilling the 72 already-FT group-stage fixtures would have **zero visible effect** in the UI.
- The actual, narrower, user-visible gap is specifically the genuinely-still-upcoming matches (as of this writing: `r16-m5` onward through `final-m1`).

### Automated-source viability investigation (completed 2026-07-06)

Checked robots.txt and did raw HTTP fetches (mimicking exactly what a Node `fetch()` in a `gather-*.mjs` script would experience — not just an AI-mediated fetch) against every realistic candidate, examining actual data structure and granularity rather than stopping at "does the page load."

- **robots.txt across all 6 candidates (Sports Mole, Goal.com, 101greatgoals, live-footballontv, fanzo, Wikipedia): none block AI crawlers.** Unlike Sprint 36's H2H investigation (`thesoccerworldcups.com` named `ClaudeBot` explicitly), that specific obstacle doesn't recur here.
- **`livesoccertv.com` — ruled out.** HTTP 403, consistent with the WAF-blocking pattern Sprint 36 found on similar aggregator sites.
- **`sportsmole.co.uk` — the most promising-looking candidate, with a decisive, systemic gap.** A raw fetch succeeds cleanly (HTTP 200, real content). The page embeds a genuinely well-structured `schema.org` JSON-LD block (`SportsEvent`/`BroadcastEvent`) covering all 104 matches — far cleaner than HTML-table scraping. But checked precisely: **all 72 group-stage matches carry exact `subjectOf` broadcaster data; all 32 knockout-stage matches (100%, R32 through Final) carry none**, falling back to a generic, non-specific description ("on ITV, BBC, STV and BBC iPlayer" — every tournament platform, not the one assigned channel). Verified against a match we already know the true answer for (South Africa v Canada, R32, confirmed `ITV` in our own data) — even that one lacks structured data on their site. **This is the exact inverse of what's needed**: group stage is 100% FT already and its badge never renders (see above); knockout is the only real gap, and it's precisely where this source goes generic.
- **`101greatgoals.com` — real per-round precision exists, but scoped to one team's path.** Contains an actual table with exact single-channel answers per round, including projected future rounds (e.g. "Round of 16 → BBC," "Quarter-finals → ITV"). But it tracks England's specific route through the bracket — not a comprehensive answer for all 32 knockout fixtures across all 48 teams.
- **Wikipedia — ruled out on two fronts.** The dedicated "2026 FIFA World Cup broadcasting rights" article is country-level only (confirmed by direct fetch: *"Split between BBC and... England: ITV / Scotland: STV"* — no match-level detail). And the `{{football box}}` wikitext template — the same one `gather-match-events.mjs` already parses successfully for goals/lineups/venue — was checked directly and has no broadcaster parameter at all. No way to piggyback on already-proven project infrastructure here.

**Conclusion: no comprehensive, reliable automated source exists for UK knockout-stage broadcaster data.** The one source with full 104-match coverage is structurally blind to the exact round that matters; the one source with real per-round precision only covers a single team's path. Continuing to search for a better automated source was assessed and explicitly deprioritized — not worth further engineering time.

### Architecture options considered

1. **Fully automated (rejected).** No source clears the bar: comprehensive-but-blind (Sports Mole), precise-but-narrow (101greatgoals), or blocked (livesoccertv). Building a scraper against any of these would be fragile against a site's ad-hoc editorial timing, or narrow enough (one team's matches) to leave most of the real gap unaddressed anyway.
2. **Partial automation "where it genuinely adds value" (considered, rejected for now).** The 101greatgoals table could theoretically be scraped for England's own matches specifically. Rejected: it would need bespoke "is England playing in this match" branching logic, adds a real scraper to maintain for a narrow and oddly-shaped payoff (a handful of matches per round, not the general case), and still leaves every other match's broadcaster fully manual regardless. Could be revisited later as a small, separately-scoped opportunistic addition, but doesn't belong in this sprint's core recommendation.
3. **Fully manual, no detection (rejected as insufficient alone).** This is effectively the status quo — R32 was populated once, by hand, and nothing since. It works when someone remembers to do it, which is exactly the failure mode that produced this investigation: 28 non-FT knockout matches have sat with `broadcaster: null` with no mechanism ever prompting anyone to notice.
4. **Automatic detection + manual completion — RECOMMENDED.** Combines the reliability of human-verified entry (accurate, sourced from whatever's actually findable at the time — official schedules, the aggregator sites found above, cross-checked) with a mechanism that makes the gap impossible to silently forget, by extending a check that **already runs on its own schedule** rather than building a new one.

### Recommended architecture

**Detection lives in `scripts/validate-data.js`, as a new non-fatal warning check — not a new script, and not the H2H manual-overrides file mechanism (a deliberate, evidence-based adaptation, not a straight copy).**

I checked `validate-data.js` directly: it currently validates squads (`validateSquads`) and group-stage fixtures (`validateFixtures`, reading only `data/fixtures.json`) — **it has zero awareness of `data/knockout.json` today.** It already has the exact right shape for this, though: squads get a non-fatal `warnings` array, printed separately from hard `errors` with a `⚠` prefix, that doesn't fail the overall `VALIDATION PASSED`/`FAILED` verdict (see the existing `scotland-gordon` DOB warning). Adding a broadcaster check means: a new function that reads `data/knockout.json` (new for this script), and a new warnings section in `main()` mirroring the squad pattern.

**Detection rule:** flag any knockout match where `status !== 'FT'` (matches the FT-suppression finding — a played match's gap is invisible and not worth flagging) **and** `homeTeamId && awayTeamId` are both set (no point flagging a still-TBD pairing before there's even a matchup to research) **and** `broadcaster === null`, optionally gated by a small tunable constant (e.g. `BROADCASTER_WARN_DAYS`, matching the existing tunable-constant convention used elsewhere in this codebase — `CACHE_TTL_MS`, `DELAY_MS`) so a match 3 weeks out doesn't get flagged before the information is realistically findable.

**Why not reuse `h2h-manual-overrides.json`'s file-plus-merge-script mechanism:** that mechanism exists specifically to let a human correction survive being overwritten by an *automated* pipeline that re-runs periodically (`gather-head-to-head-stats.mjs`). Broadcaster has no automated writer at all — there's nothing to protect a manual edit from. A human just edits the `broadcaster` field directly in `data/knockout.json`, the same way `venue` or other hand-curated fields already are. **What genuinely is reused from the H2H pattern is the reporting idiom** — Sprint 36 already established exactly this "detect an incomplete case, print it clearly, point at the fix, don't auto-resolve" shape (`gather-head-to-head-stats.mjs`'s *"N pair(s) are capped but NOT yet manually supplemented. See data/h2h-manual-overrides.json header comment for the workflow."*). The broadcaster warning should read the same way: e.g. *"3 upcoming knockout match(es) still need a broadcaster: r16-m7 (Argentina v Egypt, 7 Jul), qf-m2 (TBD), .... See docs/DATA_ENTRY_GUIDE.md §19 for how to fill these in."*

**Non-interactive, per your direction** — a printed report, not a blocking CLI prompt. Confirmed this matches every existing script in this project: `grep`ing for `readline`/`inquirer`/interactive prompts across `scripts/` returns nothing; `sync-data.mjs`, `gather-head-to-head-stats.mjs`, and `update-knockout.js` all run to completion and print a report for a human to act on afterward.

**Documentation:** a new short section in `docs/DATA_ENTRY_GUIDE.md` (§19, following §18's H2H pattern) explaining the `broadcaster` field's schema (a flat string matching `js/broadcasters.js`'s `BROADCASTERS` keys — currently `"BBC"`/`"ITV"`), where to research a value when flagged (official BBC/ITV schedule pages; cross-check against aggregator sites like the ones found in this investigation, since none are reliable enough to automate but remain useful as a human reference), and that comprehensive automation was investigated and explicitly rejected (pointing back to this section for the full reasoning, so nobody re-litigates it later without knowing it was already tried).

### Why this integrates into the existing maintenance cadence for free

`npm run validate` is already the last step of every Sprint 34 maintenance pass — every retrospective this session (Pass 1, Pass 2) ends with it. Extending `validate-data.js` means the broadcaster check **rides along automatically, with no new step added to the Sprint 34 runbook at all.** There's no ongoing acquisition script to schedule, because there's no acquisition — just a check that already runs whenever validate runs, which is every single pass, by convention, already. This is a materially simpler answer than the original tentative proposal (which assumed a new recurring script akin to `gather-head-to-head-stats.mjs` would eventually need its own slot in the cadence) — there is no new recurring job to add anywhere.

**No schema or rendering changes needed** — `js/broadcasters.js`'s `BROADCASTERS` config and `broadcasterBadge()`/`broadcasterIcon()` are already fully built and correctly wired into Match Centre, the Tournament Centre rail/strip, and the knockout bracket. This sprint only touches `scripts/validate-data.js` and adds a documentation section — zero application code changes.

**Dependencies:** None blocking. **Complexity:** Low — one new function in an existing script, one new warnings-printing block matching an existing pattern, one doc section.
**Completion criteria:** `npm run validate` clearly lists every non-FT knockout match still missing a broadcaster, without failing validation; a human can act on the report using the new doc section; zero application/rendering code touched.
**Tournament timing:** Value decays as the tournament progresses — fewer knockout matches remain to ever need this the closer the tournament gets to the Final — so implementing this sooner rather than later captures more of its value.

### Implementation retrospective (2026-07-06)

**What was built, exactly as recommended:**
- `scripts/validate-data.js`: new `BROADCASTER_WARN_DAYS = 7` constant; new `validateBroadcasters()` function reading `data/knockout.json` and flagging any match where `status !== 'FT'`, both `homeTeamId`/`awayTeamId` are set, `broadcaster` is `null`, and kickoff is within the warning window; wired into `main()` as a new non-fatal warnings block (same severity tier as the squad DOB warning — never affects `VALIDATION PASSED`/`FAILED`).
- `docs/DATA_ENTRY_GUIDE.md` §19: documents why broadcaster is manual (the investigation findings, condensed), why only non-FT knockout matches ever need a value (the FT-suppression rule), how the detection works, the 4-step manual fill-in workflow (research → edit `data/knockout.json` directly → re-validate), and how to add a new broadcaster value if the UK rights split ever changes.
- **No application or rendering code touched** — confirmed by design (the schema and `js/broadcasters.js` were already complete) and by the diff itself (only `scripts/validate-data.js` and one doc file changed).

**Verification performed:**
- `npm run validate` against live current data: correctly flagged exactly 6 matches (`r16-m5`, `r16-m6`, `r16-m7`, `r16-m8`, `qf-m1`, `qf-m3` — every non-FT knockout match with a confirmed pairing) and correctly excluded the 4 FT R16 matches, the 2 QF matches with still-TBD pairings, and both SF/Final/3rd-place slots (all still TBD). `VALIDATION PASSED` unaffected by the new warnings, confirming the non-fatal severity is correct.
- `npm test` — all 24 existing tests (Sprint 37) still pass unchanged, including `validate-smoke.test.mjs`, which re-runs `validate-data.js` and asserts on `VALIDATION PASSED` — confirms the new check doesn't break the existing smoke coverage. No new dedicated test was written for `validateBroadcasters()` itself (a deliberate scope call, not an oversight — this sprint's ask was the detection + docs, not new test coverage; a targeted test could be added cheaply later given Sprint 37's infrastructure already exists, if wanted).

**No architectural issues found during implementation** — the plan from the evaluation/recommendation phase matched the actual code shape exactly (confirmed `validate-data.js`'s squad-warnings pattern was there to mirror, confirmed knockout.json's schema needed no changes).

---

## Sprint 44 — Knockout Bracket Wallchart Redesign
**Category:** Visual/structural redesign (flagship feature) · **Status:** COMPLETE (2026-07-09)

**Trigger:** user provided two reference images — the current live bracket (single left-to-right cascade, R32 through Final in one column sequence) versus a target layout (a classic symmetric double-sided "wallchart" bracket: Round of 32 on both far edges, rounds nesting inward toward the center, Final + Champion + Third Place converging in the middle). Full design in `docs/plans/2026-07-09-knockout-bracket-wallchart-design.md`.

**Root cause of the current layout's sparseness:** total column height is dictated by Round of 32's 16 matches; Quarter-finals (4)/Semi-finals (2)/Final (2) each float at their feeder-midpoint inside a mostly-empty column. The positioning math itself is correct — this is a layout-shape problem, not a data bug. (Separately, the screenshot that prompted this investigation was confirmed to be from production, which was 38 commits behind local and still running the pre-Sprint-42 connector bug at the time — fixed by pushing to `origin/master` on 2026-07-09, before this redesign began.)

**Approach, confirmed via `js/bracket-topology.js`'s existing `PROPAGATION` map:** the bracket already splits cleanly into two symmetric 8-match halves (one feeding `sf-m1`, one feeding `sf-m2`). New `getBracketSide()`/`getSidePartition()` helpers derive this split purely from `PROPAGATION` — no hardcoded match-ID lists. Rendering becomes 9 column descriptors (`R32-L, R16-L, QF-L, SF-L, CENTER, SF-R, QF-R, R16-R, R32-R`) in one horizontally-scrollable row (all viewport sizes, no separate mobile layout). The vertical-centering algorithm is direction-agnostic and runs unchanged, called once per half. Connector-line geometry is extracted into one pure, parameterized function (`computeConnectorGeometry({ ..., mirrored })`) shared by both halves rather than maintained as two implementations. A new Champion box sits in the center column (part of that column's normal content, not a bolted-on overlay), using the existing `deriveWinnerId()` — no new winner-derivation logic. Spacing constants (`CARD_GAP`, new champion-box gap) move from hardcoded JS numbers to CSS custom properties. Existing app theme/card style is kept as-is (flags, live scores, FT badges, confirmed ticks) — no separate visual style adopted from the reference image's cream/gold wallchart look.

**Dependencies:** None blocking. Builds on top of Sprint 42's topology/connector-correctness work (reused, not rebuilt). **Complexity:** Medium — mostly a refactor of existing positioning/connector code into a shared, parameterized form, plus one new small component (Champion box).
**Completion criteria:** per `docs/plans/2026-07-09-knockout-bracket-wallchart-design.md` §6 — new unit tests for `getBracketSide()`/`getSidePartition()` (including a propagation-integrity/partition test), `computeConnectorGeometry()`, and `buildChampionBox()`; manual Playwright verification across three states (current live partial data, a synthetic fully-resolved bracket, the pre-group-stage empty state).
**Tournament timing:** No urgency pressure from the tournament clock itself, but the current production layout is visibly broken-looking to the user right now, so this is the active priority over Sprint 39's resumption.

### Implementation retrospective (2026-07-09)

**What was built, exactly per the design doc:**
- `js/bracket-topology.js`: `getBracketSide()` (forward-walks `PROPAGATION` to `'left'`/`'right'`/`null`, no hardcoded lists) + `getSidePartition()`.
- `js/modules/knockout-bracket.js`: 9-column pipeline (`#buildColumns()`), `#computeHalfCenters()` as one shared per-half positioning algorithm called twice (left half in DOM order, right half in reversed/data-flow order), `#positionCenterColumn()` for Final/3rd Place/Champion, `#drawConnectors()` reduced to a thin wrapper around the new pure `computeConnectorGeometry()`, and `buildChampionBox()` built solely on the existing `deriveWinnerId()`.
- `styles/knockout.css`: `--bracket-card-gap`/`--bracket-champion-gap` custom properties (replacing a hardcoded JS constant), `.bracket-champion` styles, 9-column width selectors.
- Tests: `getBracketSide()` coverage + the propagation-integrity/partition test in `test/bracket-topology.test.mjs` (built from `PROPAGATION`'s own keys, not a hand-typed copy); `test/knockout-bracket-wallchart.test.mjs` (new) covering `computeConnectorGeometry()` (mirrored is an exact coordinate flip of the non-mirrored case, which itself reproduces Sprint 42's original verified math) and `buildChampionBox()` (placeholder, resolved-winner, and the FT-but-no-derivable-winner edge case).

**One real, pre-existing bug found and fixed during visual verification, out of this sprint's original scope but directly visible in the exact feature being built:** `roundDateRange()`'s date parser (`s.split('-').map(Number)`) broke on full ISO kickoff timestamps (`"2026-06-28T19:00:00Z"` → day parsed as `NaN`), rendering every Round of 32/Round of 16 column header as "NaN Jun–NaN Jul". This logic was copied verbatim from the pre-Sprint-44 code, not introduced by this redesign — but since it was now visible in every screenshot of the new layout, it was fixed in place (strip any time component before splitting) rather than shipped broken. No test previously depended on the buggy behavior.

**Verification performed:**
- `npm test` — 74/74 passing (9 new: `getBracketSide` + propagation-integrity in `bracket-topology.test.mjs`, `computeConnectorGeometry` + `buildChampionBox` in the new `knockout-bracket-wallchart.test.mjs`).
- `npm run validate` — clean, unaffected (this sprint touches rendering only, no data files).
- Manual Playwright verification (Chromium, local static server — no dev-server script exists in this project, same gap noted since Sprint 33) across three states, `data/knockout.json` temporarily swapped and restored byte-for-byte after each (confirmed via `git status`/`git diff` showing zero changes to the file post-verification):
  1. **Current live partial data** — correct 9-column order, TBD placeholders, per-match confirmed ticks (Sprint 42 behavior preserved), live-match rail entry, Champion placeholder shown. Zero console errors.
  2. **Synthetic fully-resolved bracket** (temporary fixture, same technique Sprint 42 used) — all 9 columns populated 8/4/2/1/2/1/2/4/8, 8 connector SVGs drawn (4 gaps × 2 halves), left/right R32 columns measured to an identical total height (806.375px, confirming the two halves share one coordinate scale), zero confirmed-tick glyphs remaining (correct — everything has a real score), Champion box correctly resolved to France via `deriveWinnerId()`, 3rd Place positioned below the Final.
  3. **Pre-group-stage empty state** (`data: []`) — unchanged empty-state message renders correctly, zero console errors, confirming this sprint's changes didn't touch that path.

**No architectural surprises** — the design doc's plan (shared per-half algorithm called twice, pure connector-geometry extraction, champion box as ordinary center-column content) matched the actual implementation shape with no deviations.

### Post-ship fix: R32 sibling-scattering (2026-07-09)

User reported the wallchart looked asymmetric — screenshotted the live bracket and pointed out that, splitting the R32-L and R32-R columns into top/bottom quadrants, two quadrants looked visually "crossed" while the other two looked clean. Root-caused precisely (two independent read-only investigations, then a design-review pass that caught a flawed first fix attempt before it shipped): `#buildColumns()`'s `sideMatches()` filtered each side's matches but never sorted them, so display order was `data/knockout.json`'s raw file order — the real tournament's official match numbering (M73–M88) — which does not track bracket-tree adjacency. Two R32 matches feeding the same R16 slot could end up with an unrelated match visually between them.

A first proposed fix (sort by each match's own official number) was caught as a no-op before implementation — the array is already in that order. The corrected fix: new `bracketSortKey()` in `js/bracket-topology.js`, derived by a depth-first walk **down** from each side's semifinal through the existing `getFeederMatchIds()` (siblings are visited consecutively at every level, so they always land adjacent once sorted) — fully derived from `PROPAGATION`, no hardcoded match-ID lists. Wired into `sideMatches()` and the center column's Final/3rd-Place ordering.

Hand-verified against the full `PROPAGATION` map before implementation (R16/QF order confirmed unchanged, both broken R32 quadrants confirmed fixed — one side's "already correct" quadrant also shifts position on screen as a side effect of one consistent rule replacing incidental match numbering, which is expected, not a regression). Two new tests in `test/bracket-topology.test.mjs`: an exact key-value table for every match ID, and an order-lock regression test using `getSidePartition()` that pins the corrected R32-L/R32-R order and confirms R16-L/R16-R/QF-L/QF-R are unchanged. `npm test` (76/76) and `npm run validate` clean; confirmed live via Playwright that R32-L/R32-R DOM order matches the derived order exactly, zero console errors.

### Post-ship fix: broadcaster data gap (2026-07-09)

Separately, user reported still not seeing BBC/ITV broadcaster badges for upcoming knockout matches. Not a rendering bug — every broadcaster-aware surface (`js/broadcasters.js`, called from the Tournament Centre rail/strip and Match Centre header) was already correctly wired; Sprint 43's "detection + manual completion" design had only ever gotten the detection half done. The 5 matches `npm run validate` had been flagging (`r16-m6`, `r16-m7`, `r16-m8`, `qf-m1`, `qf-m3`) still had `broadcaster: null`. Sourced real values via web search (USA v Belgium = BBC; Argentina v Egypt, Switzerland v Colombia, Norway v England = ITV — the last cross-confirmed against a second independent source) and the user directly (France v Morocco = ITV, after an initial search attempt returned contradictory results across sources — noted as feedback to search harder/more directly before concluding a fact is unfindable). Edited `data/knockout.json` directly per the existing documented workflow (`docs/DATA_ENTRY_GUIDE.md` §19) — no code changes needed. Confirmed live via Playwright: all 4 still-upcoming matches now show a working badge in the Tournament Centre rail. Also confirmed as a separate, pre-existing, non-regression fact during this investigation: the knockout bracket page itself has never rendered broadcaster badges on any match card (never built there) — left out of scope for this pass at the user's explicit direction.

**Follow-up the same day:** user reported production still showed gaps in the "Coming Up" rail. Root cause: production's live data (via `live-data.mjs`'s cache-aside API) had progressed since the fix above — `r16-m6/m7/m8` finished (Belgium, Argentina, Switzerland won), propagating two brand-new team pairings into `qf-m2` (Spain v Belgium) and `qf-m4` (Argentina v Switzerland) that didn't exist yet when the original 5-match fix was researched, so neither was in scope at the time. Ran `npm run sync-data` to catch local data up, sourced `qf-m2` = BBC and `qf-m4` = ITV (each cross-confirmed against two independent sources this time, after the earlier single-source misses), filled them in the same way. `npm run validate` now reports zero broadcaster gaps. Lesson for next time: a live, continuously-advancing tournament means a "fix the current gaps" pass can be outdated within days as new matches resolve into previously-TBD slots — worth checking `npm run sync-data` first when this class of report recurs.

---

## Sprint 45 — Match Centre Post-Ship Bug Batch
**Category:** Bug fixes + small visual redesign · **Status:** COMPLETE (2026-07-09)

Three user-reported Match Centre issues, fixed as separate commits:

**1. Played date/time missing on completed matches.** The header showed only score + "FT" for completed matches, no indication of when the match was played, even though `formatKickoff()` (already used for upcoming matches) works fine on a past timestamp and the data already has full ISO kickoff timestamps on every FT match. Extracted the header's meta-row construction to a new exported `buildMatchMeta(fixture)` in `js/modules/match-centre.js`, following this file's established pure-function-extraction convention — date only shows for FT matches, since upcoming matches already show their kickoff time prominently elsewhere in the header.

**2. Tab clicks showed "Page not found."** The `.mc-tab-strip`'s `<a href="#mc-group-X">` same-page anchors collided with this app's single global hash router — any hash change (including an ordinary same-page anchor click) triggers the router's `hashchange` listener, and `mc-group-match`/`mc-group-context`/etc. don't match any known route, so every tab click tore down the whole page and replaced it with `NotFoundModule`. Affected all four tabs in both FT and upcoming states. Fixed with a new `attachTabScrollHandlers()` that intercepts the click, `preventDefault()`s the hash change, and scrolls manually — `.mc-tab-group` already had `scroll-margin-top` set in CSS, apparently built anticipating exactly this, so no extra sticky-header offset math was needed.

**3. Previous-XI lineup redesigned to a jersey-icon style, fixing an unreadable-text bug.** User provided a buildlineup.com-style reference image. Investigation found `Charts.renderLineup()`'s surname label used `fill="var(--color-text)"` — a CSS custom property that doesn't exist anywhere in `styles/theme.css` (real vars are `--color-text-primary`/`-secondary`/`-muted`) — silently falling back to SVG's default black fill, unreadable against the dark-green pitch. Replaced the plain-circle player nodes with a hand-drawn white jersey silhouette (shirt number in bold pitch-green text on the jersey) and the surname in larger (10px, was 6.5px), bold white text with a dark halo stroke — literal colors, not another CSS var, since the pitch is dark green in both site themes (matching this same function's existing halfway-line/penalty-box strokes, which already use literal colors for the identical reason — swapping in a different var would have just failed differently in light mode). Long surnames get `textLength` compression so a 5-wide tier can't overlap. Added a center circle/spot and goal boxes to the pitch markings; skipped corner arcs as disproportionate for the visual payoff. Layout constants grew modestly (`240×340` → `260×400`) to fit the larger node footprint, verified against the worst-case 5-row formation.

**Verification:** `npm test` (88/88, 10 new tests across `test/match-story.test.mjs` and new `test/charts-lineup.test.mjs`), `npm run validate` clean throughout. Manual Playwright verification: all four tabs clicked in both an FT and an upcoming match's Match Centre, confirmed hash never changes and "Page not found" never appears; lineup screenshot (France v Morocco QF preview) confirmed jerseys, numbers, and names all render clearly.

### Follow-up: tab strip still broken in practice (2026-07-09)

The tab-click fix above stopped the "Page not found" crash, but using it surfaced four more real bugs — the strip's sticky header was invisible (scrolled content bled through it instead of being hidden underneath), and active-tab highlighting was fully broken in several ways (the jersey redesign's much taller "Lineups" section never highlighted, the first tab lost its highlight on load, and clicking a tab lit up the *previous* tab instead of the one just clicked).

Root causes, confirmed via direct code reading and live browser instrumentation (not guesswork):

1. `.mc-tab-strip`'s `background: var(--color-bg)` referenced an undefined CSS custom property (real vars are `--color-bg-primary`/`-secondary`/`-card`/`-elevated`) and silently fell back to transparent — the exact same bug class as this sprint's `var(--color-text)` fix in `js/charts.js`, just in a different file. Two more instances of the identical pattern found and fixed in the same pass (`.mc-tab:hover`, `.mc-hth-details__toggle`).
2. `top: var(--nav-height)` assumed the strip needed to clear the main nav bar, but `#app-content` (the real scroll container) is a sibling grid area of the nav, never its descendant — the nav was never in that scrollport to begin with. Now `top: 0`.
3. The highlighting logic was originally built on `IntersectionObserver`, which turned out to be the wrong tool for this job: confirmed via direct instrumentation that it only fires at *threshold crossings*, not continuously — once a section starts intersecting it goes silent for the rest of a scroll that keeps it intersecting, so its reported position goes stale mid-animation (exactly why a freshly-clicked tall section's true landing position was never observed). Replaced with a scroll+`requestAnimationFrame` listener that measures each section's real position on every tick.
4. The winning-section algorithm itself needed two iterations to get right: "topmost of whatever's currently active" (an `IntersectionObserver`-era idea) picked the wrong section whenever a click landed on a lower section that still geometrically overlapped with the one above it. The final algorithm — the *last* (bottommost, in document order) section whose top has reached a shared trigger line — has no such ambiguity, since sections are contiguous. That trigger line uses the exact same offset CSS uses for `scroll-margin-top` (published once by JS as `--mc-tab-scroll-offset`), so the two can never independently drift apart the way `--nav-height` did in bug 2.

New exported `pickActiveGroupId()` (pure, unit tested) encapsulates the selection logic. Verified extensively via Playwright: click-driven navigation in both match states, manual scroll-driven highlighting in both directions, scroll-to-bottom and scroll-back-to-top edge cases, and visually that the strip now sticks flush with an opaque background. `npm test` 94/94.

---

## Sprint 46 — Post-Review Maintenance Pass (knockout data + doc drift)
**Category:** Data maintenance + documentation cleanup · **Status:** COMPLETE (2026-07-16)

**Trigger:** a full `project-status-review` audit (2026-07-16) found the committed tournament data ~2 days stale, three prior commits missing from this roadmap, and `docs/CONTRIBUTING.md` describing a `package.json` that no longer exists. Rankings re-scoping and EA ratings data entry were also surfaced by the same review but explicitly deferred by the user — parked, not forgotten; see "Decisions still needed" below.

**Retroactive log — work shipped earlier in the same session with no prior Sprint entry:**
- Knockout bracket "confirmed" tick/banner rescoped to R32-only, permanently retiring once the knockout stage starts — three prior fix passes (Sprint 28, 42, 44) had each treated it as a recurring per-round feature and never revisited whether it belonged outside R32 at all. Commit `361d385`.
- H2H "History" sections redesigned from a single paragraph of Wikipedia prose to a real match-results table (date, competition badge, result with winner bolded), shared between the upcoming- and completed-match branches via one `buildMatchHistoryList()`. Commit `97a1df1`.
- Following user feedback that a "not yet available" placeholder wasn't good enough, manually researched and cross-verified real head-to-head history for all 16 knockout-stage pairs still missing individual match rows (every claim checked against a second independent source, after catching a search tool confidently reporting a fabricated Germany–Paraguay 2010 World Cup meeting that never happened). `allTime` overrides extended to every resolved pair so the aggregate stats grid never contradicts the match-history table beneath it. Commit `45f2265`.

**This sprint's own work:**
- Re-ran the Sprint 34 cadence (`sync-data` → `gather-match-events` → `gather-head-to-head` → `gather-head-to-head-stats` → `validate`) to bring both semifinals current: `sf-m1` (France 0–2 Spain) and `sf-m2` (England 1–2 Argentina) are now FT with full lineups/events, and the Final (Spain v Argentina) / 3rd-Place (France v England) matchups have propagated correctly. `headToHeadStats` re-fetched for all 104 resolvable fixtures (0 failures) now that the Final/3rd-Place team pairs are known.
- Fixed `docs/CONTRIBUTING.md`: removed references to `npm run generate-bios` and `npm run update-standings`, neither of which has existed since Sprint 40; corrected the mischaracterization of `npm run generate-rankings` as a "stub — no-op" (it is the real, fully-built Sprint 39 ranking engine, not a stub); corrected the documented `pre-deploy` chain to match `package.json` exactly (`validate` → `gather-guardian-bios` → `build-search-index`); corrected the squad-addition workflow's bio-fill step to reference the real pipeline.
- Added this Sprint 46 entry.

**Verification:** `npm run validate` and `npm test` (111/111) both clean after the data refresh; `data/knockout.json`'s `lastUpdated` now postdates both real kickoffs.

---

## Decisions resolved (2026-07-06)

1. ~~Sprint 38 scheduling~~ — **dedicated design session**, not inline.
2. ~~Sprint 36 scope~~ — **both** all-time and WC-only, resolved when `headToHeadStats` was implemented.
3. ~~Sprint 40 — three confirmations~~ — **decided and executed**: deleted the 4 dead stub files; removed the doc precedence claim; fixed the `pre-deploy` chain; deleted `sync-tournament.mjs` + its `netlify.toml` schedule block. `npm run validate`/`npm test` clean. One undecided question surfaced during execution and left open: whether `scripts/generate-rankings.js` (same bare-stub state, but a placeholder for Sprint 39 rather than superseded dead code) should also go.
4. ~~Sprint 37 tooling~~ — **`node:test` + `jsdom`**, not Vitest/Jest.
5. ~~Sprint 41~~ — **deferred**, not skipped.
6. ~~Sprint 42~~ — **fully greenlit**, in the recommended order (topology module → per-match tick → connector fix → sync/live-data consolidation), with a required post-implementation verification pass before the next major feature.
7. ~~Sprint 43~~ — investigated 6 candidate automated sources (none comprehensive/reliable), decided and **implemented automatic detection + manual completion**: `validateBroadcasters()` in `scripts/validate-data.js` flags non-FT knockout matches missing a `broadcaster` as a non-fatal warning, riding along on the already-existing `npm run validate` step (last step of every Sprint 34 pass) — no new recurring script. `docs/DATA_ENTRY_GUIDE.md` §19 documents the manual fill-in workflow. Verified: correctly flags exactly the 6 current gaps, all 24 Sprint 37 tests still pass.

## Decisions still needed from the user (not yet resolved)

1. **Rankings re-scope + EA data entry (surfaced 2026-07-16, deliberately deferred).** `data/ranking-scope.json` is locked to 11 teams from Sprint 39; only 4 remain alive (France, Spain, England, Argentina) as of Sprint 46. Re-locking scope will cause `scripts/generate-rankings.js` to prune the other 7 teams' ~200 players from `data/rankings.json` on its next run (confirmed by reading the script — it filters output to `inScopeIds` derived from the scope file, with no separate archive). Separately, EA ratings remain at 0/286 — not agent-fetchable (confirmed in Sprint 39's own investigation), requires user-supplied CSVs via `scripts/import-ranking-raw.mjs --field ea`. User explicitly asked to set Rankings aside for now and focus on other Sprint 46 items; revisit as its own sprint whenever ready, including whether to snapshot the 7 eliminated teams' partial data before pruning.
