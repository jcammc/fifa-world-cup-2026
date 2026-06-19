# SPEC_AUDIT.md

Version: 1.0
Status: Planning Document — Phase 4
Purpose: Authoritative audit of all 7 specification documents. Findings only — no implementation decisions.

Priority of documents (per 01_PRODUCT_SPEC.md):
  1. 07_ACCEPTANCE_CRITERIA.md
  2. 06_UI_MOCKUPS.md
  3. 01_PRODUCT_SPEC.md
  4. 02_UX_AND_UI_SPEC.md
  5. 03_TECHNICAL_ARCHITECTURE.md
  6. 04_DATA_MODEL.md
  7. 05_IMPLEMENTATION_PLAN.md

Findings are organised as:
  [CONTRADICTION] — two documents conflict
  [AMBIGUITY] — a specification is unclear or underspecified
  [GAP] — required behaviour is not specified
  [SCHEMA GAP] — data model is missing required fields
  [RISK] — a finding that creates implementation risk

All findings include the document(s) responsible and a recommended resolution.

---

# PART 1 — TECHNOLOGY AND ARCHITECTURE

---

## FINDING ARCH-001
Type: [AMBIGUITY]
Severity: HIGH
Documents: 03_TECHNICAL_ARCHITECTURE.md

**Finding:**
The architecture spec says:
"Preferred Stack: HTML, CSS, Vanilla JavaScript. No framework required.
Frameworks may only be introduced if implementation complexity demands it."

This leaves "implementation complexity demands it" entirely undefined.
At ~1,250 players, 48 teams, and complex interactive systems (Auto-Focus via
IntersectionObserver, scroll-snap carousel, hash routing with module lifecycle,
SVG charts), a vanilla JS implementation is viable but becomes harder to maintain
without a lightweight module structure or templating convention.

The spec does not define what threshold triggers the framework allowance.
This risks an early architectural commitment to pure vanilla that becomes
difficult to undo mid-build, or a premature framework introduction.

**Recommendation:**
Formally commit to: Vanilla JavaScript + ES Modules with a defined module
interface pattern. This provides the structure of a framework (component lifecycle,
composability) without adding a dependency. Frameworks remain off-limits unless
a specific feature cannot be reasonably implemented in vanilla.

---

## FINDING ARCH-002
Type: [AMBIGUITY]
Severity: MEDIUM
Documents: 03_TECHNICAL_ARCHITECTURE.md, Owner clarification

**Finding:**
The original architecture spec shows a single `app.js` and single `styles.css`.
The owner clarification amends this: "Use ES modules. You may split JavaScript
and CSS into multiple files."

However, the original single-file structure conflicts with the amended multi-file
approach. The amendment takes precedence, but the architecture spec has not been
formally updated.

**Recommendation:**
The amended file structure (as defined in IMPLEMENTATION_BLUEPRINT.md) is the
authoritative file organisation. The single-file architecture spec entry
should be treated as superseded.

---

## FINDING ARCH-003
Type: [AMBIGUITY]
Severity: MEDIUM
Documents: 03_TECHNICAL_ARCHITECTURE.md

**Finding:**
"Support: Local cache, Last updated timestamp, Graceful offline behaviour.
If refresh fails: Use cached data."

This implies a persistent cache (e.g. localStorage, IndexedDB, or Service Worker).
However, the spec does not specify whether the cache is:
(a) in-memory only (lost on page refresh)
(b) persisted to localStorage
(c) using a Service Worker / Cache API for true offline

For a static site served over HTTP, in-memory caching suffices for the session
but cannot support offline use or rapid refresh.

**Recommendation:**
Clarify: in-memory cache + HTTP browser caching is the minimum.
Offline Service Worker is a future enhancement, not a Sprint 1 requirement.
"Last updated timestamp" can be added to the data files as a metadata field.

---

## FINDING ARCH-004
Type: [AMBIGUITY]
Severity: LOW
Documents: 03_TECHNICAL_ARCHITECTURE.md

**Finding:**
"Search: Under 100ms."

This target applies to search result delivery after the search index is built.
It does not define how long index construction is allowed to take (which happens
once per session and involves processing ~1,250+ player records).
Index construction at this scale may take 50–200ms on low-end devices.

**Recommendation:**
Clarify: "Under 100ms" applies to per-query latency after index is built.
Index construction is a one-time cost (acceptable up to 300ms on first search).
Index should be built lazily (on first search invocation) or on a background task.

---

## FINDING ARCH-005
Type: [AMBIGUITY]
Severity: LOW
Documents: 03_TECHNICAL_ARCHITECTURE.md

**Finding:**
"Render only: Current page, Current team, Current module."
"Avoid mounting all teams simultaneously."

This is clear but creates a question: does "current module" include tournament
data loaded for the Today's Matches panel that appears on all team pages?

If Yes: every team page load triggers a fixtures fetch, which is wasteful if
already loaded.

If No: fixtures data is global/shared and should be pre-loaded once.

**Recommendation:**
Fixtures, standings, groups, and knockout data are tournament-wide (not per-team)
and should be loaded once into DataManager cache, not treated as team-specific.
Per-team data (players) is the only truly lazy-loaded resource.

---

# PART 2 — DATA MODEL

---

## FINDING DATA-001
Type: [SCHEMA GAP] — RESOLVED BY AMENDMENT
Severity: RESOLVED
Documents: 04_DATA_MODEL.md

**Finding:**
Country schema was missing `recentForm` field.

**Resolution:**
Owner amendment adds: `recentForm: ["W", "W", "D", "W", "L"]`

This finding is resolved. The amended schema is authoritative.

---

## FINDING DATA-002
Type: [SCHEMA GAP] — RESOLVED BY AMENDMENT
Severity: RESOLVED
Documents: 04_DATA_MODEL.md

**Finding:**
Country schema was missing `teamStrength` fields.

**Resolution:**
Owner amendment adds:
```
teamStrength: { attack, midfield, defence, goalkeeping, depth }
```
Values are curated externally and stored.

This finding is resolved. The amended schema is authoritative.

---

## FINDING DATA-003
Type: [SCHEMA GAP]
Severity: HIGH
Documents: 04_DATA_MODEL.md

**Finding:**
Player schema uses `country`, `club`, `league` as inline strings.
This means if a club name changes or a club badge path changes,
every player record referencing that club must be updated.

At ~1,250 players and ~400 clubs, this creates significant maintenance overhead.

Additionally, the Country schema uses `youngestPlayer`, `oldestPlayer`,
`mostValuablePlayer` as plain fields without specifying whether they are
IDs or display strings. If strings, they cannot be deep-linked. If IDs,
this is undocumented.

**Recommendation:**
Normalise: use `clubId`, `leagueId`, `countryId` (string IDs) in Player schema.
Clubs and leagues are resolved at render time via DataManager lookup.
Country schema fields `youngestPlayer`, `oldestPlayer`, `mostValuablePlayer`
should be player IDs (`youngestPlayerId`) to enable deep linking.

This is an architecture recommendation. The spec does not require normalisation
but does not prohibit it. This finding is flagged for the RECOMMENDATIONS document.

---

## FINDING DATA-004
Type: [SCHEMA GAP]
Severity: MEDIUM
Documents: 04_DATA_MODEL.md, 01_PRODUCT_SPEC.md

**Finding:**
The Player schema includes `similarPlayers: []` (original spec).
The owner amendment clarifies: store `similarPlayerIds: []` as precomputed.

However, neither the original spec nor the amendment defines:
- The format of entries in this array (player IDs? objects?)
- The maximum number of similar players to display
- Whether similar players must be from the same tournament

The Profile Panel spec says "Display comparable tournament players" —
implying all similar players are within the tournament's 48 squads.

**Recommendation:**
`similarPlayerIds` should be an array of player ID strings, maximum 5 entries,
all referencing players within the tournament dataset.
The profile panel displays a maximum of 3 similar player cards.
This should be formalised in the schema.

---

## FINDING DATA-005
Type: [SCHEMA GAP]
Severity: MEDIUM
Documents: 04_DATA_MODEL.md

**Finding:**
The Ranking schema defines components as:
`{ playerId, transfermarkt, ea, awards, media, form, consensus }`

It does not define:
- The scale of each component (0–100? 0–10? raw values?)
- Whether components are normalised before the weighted average
- What "form" specifically measures (last N matches? FBRef rating?)
- How to handle null components (player with no EA rating)

With the consensus formula (TM 40%, EA 20%, Awards 20%, Media 10%, Form 10%),
null components would reduce the effective total weight unless handled explicitly.

**Recommendation:**
All ranking components should use a 0–100 scale (normalised before storage).
Null component: excluded from weighted average; remaining weights re-normalised
to sum to 100%. This ensures players with incomplete ranking data still receive
a meaningful consensus score.

---

## FINDING DATA-006
Type: [SCHEMA GAP]
Severity: LOW
Documents: 04_DATA_MODEL.md

**Finding:**
Fixture schema uses `broadcaster` as a string field.
No maximum length or format is specified.

For BBC/ITV this is fine. However, some World Cup 2026 matches may be on
multiple broadcasters (e.g. "BBC / ITV") or no confirmed broadcaster.
Current spec handles TBD via fallback but does not specify multi-broadcaster format.

**Recommendation:**
`broadcaster` field supports: a single string (e.g. "BBC"), multi-broadcaster
concatenation (e.g. "BBC/ITV"), or null (displayed as "TBD").

---

## FINDING DATA-007
Type: [AMBIGUITY]
Severity: LOW
Documents: 04_DATA_MODEL.md

**Finding:**
Group schema is:
`{ id, teams: [] }`

This is extremely minimal. No specification of:
- Whether `teams` contains team IDs or team objects
- Whether group schema contains group-level metadata (name, confederation)

**Recommendation:**
`{ id: "A", name: "Group A", teamIds: ["argentina", "canada", "nigeria", "tbc"] }`
Use `teamIds` (array of country IDs) for consistency with normalisation approach.

---

## FINDING DATA-008
Type: [GAP]
Severity: LOW
Documents: 04_DATA_MODEL.md, 01_PRODUCT_SPEC.md

**Finding:**
The spec mentions "Manager" in Team Header and search, but the Player schema
has no equivalent for coaching staff. The product spec mentions:

"Coaching Staff" as part of the Squad tab.

Neither the player schema nor any other schema defines a coaching staff record.
If managers are searchable and coaching staff are displayed, they need a data model.

**Recommendation:**
Add to Country schema: `coachingStaff: [{ name, role, nationality }]`
Roles: "Head Coach", "Assistant Coach", "Goalkeeper Coach", etc.
Manager is the Head Coach. Searchable by name, navigates to country page.
This is a simple extension of the Country schema.

---

# PART 3 — UX AND INTERACTION

---

## FINDING UX-001
Type: [CONTRADICTION]
Severity: MEDIUM
Documents: 01_PRODUCT_SPEC.md vs 06_UI_MOCKUPS.md

**Finding:**
01_PRODUCT_SPEC.md lists the Squad tab as containing:
"Official Squad, Auto-Focus Squad System, Active Profile Panel, Reserves, Coaching Staff"

06_UI_MOCKUPS.md shows:
"▶ Reserves (12)" as a collapsible section, with no mention of Coaching Staff.

07_ACCEPTANCE_CRITERIA.md does not include any acceptance criterion for Coaching Staff.

The Squad tab spec includes Coaching Staff but no other document does.

**Resolution:**
Per document priority order: 07_ACCEPTANCE_CRITERIA.md (highest priority) does not
require Coaching Staff. 06_UI_MOCKUPS.md (second highest) does not show Coaching Staff.

**Finding:** Coaching Staff in the Squad tab is not acceptance-tested.
However, it is specified in the product spec (priority 3).

**Recommendation:**
Include a simple Coaching Staff section in the Squad tab (below Reserves).
Collapsible. Simple list: photo (optional), name, role. No Auto-Focus system needed.
Add coachingStaff to Country schema (see DATA-008).
No AC is violated by including it.

---

## FINDING UX-002
Type: [AMBIGUITY]
Severity: MEDIUM
Documents: 02_UX_AND_UI_SPEC.md

**Finding:**
"When user returns: Last selected player restored."

This describes player selection persistence within a row. However:
- If the user navigates away from the Squad tab and returns, is selection preserved?
- If the user navigates to a different team and back to the first team, is selection preserved?

"Returns" is ambiguous. Within a single Squad tab session (scroll up, scroll back)
is clear. Across tab switches or page navigations is unclear.

**Recommendation:**
Persistence scope: within a single Squad tab instance (same module lifecycle).
If user switches tab (to Fixtures) and back to Squad, the Squad module re-renders
and selection is reset. This is acceptable and matches standard web behaviour.
Across team navigations: selection is not preserved (different team = new module).

---

## FINDING UX-003
Type: [AMBIGUITY]
Severity: MEDIUM
Documents: 02_UX_AND_UI_SPEC.md

**Finding:**
"Profile panel should feel like: A player dossier."
Layout order specified: Photo, Player Details, Ranking Breakdown, Biography, Similar Players.

07_ACCEPTANCE_CRITERIA.md (AC-022) lists:
Photo, Name, Position, Club, Age, Caps, Goals, Height, Biography, Ranking Breakdown, Similar Players.

The order differs: AC-022 puts Biography before Ranking Breakdown.
UX spec puts Ranking Breakdown before Biography.

**Resolution:**
Per priority order: 07_ACCEPTANCE_CRITERIA.md wins.
Layout order: Photo → Name/Details → Biography → Ranking Breakdown → Similar Players.

Wait — re-reading AC-022: it lists components, not necessarily in visual order.
The UX spec (priority 4) explicitly states layout order.

**Recommendation:**
Since AC-022 lists components as a checklist rather than an ordered layout spec,
and 02_UX_AND_UI_SPEC.md explicitly defines layout order as Photo → Details →
Ranking Breakdown → Biography → Similar Players, treat the UX spec order as
authoritative for layout.

---

## FINDING UX-004
Type: [GAP]
Severity: MEDIUM
Documents: 02_UX_AND_UI_SPEC.md, 01_PRODUCT_SPEC.md

**Finding:**
The spec defines search for: Players, Countries, Clubs, Leagues, Managers.
However, no search result is defined for Groups (e.g. "Group A").

If a user searches for "Group A", what happens?
A user may naturally want to search for "Group A" to navigate to that group
in the Tournament Centre.

**Recommendation:**
Add Groups as a search category. Result navigates to Tournament Centre → Group Stage
with Group A pre-scrolled into view. Low complexity addition. Uses existing route logic.

---

## FINDING UX-005
Type: [GAP]
Severity: LOW
Documents: 01_PRODUCT_SPEC.md, 06_UI_MOCKUPS.md

**Finding:**
The spec defines a home/landing page implicitly (application shell mockup shown)
but no landing page content is defined. `#` or `#home` route content is unspecified.

**Recommendation:**
Default route `#` redirects to `#tournament` (Tournament Centre).
This ensures the most timely content (today's matches) is the landing experience.
Alternatively, a purpose-built landing page showing: featured matches + quick team access.
This is an open question (OQ-002) requiring a decision before Sprint 1.

---

## FINDING UX-006
Type: [AMBIGUITY]
Severity: LOW
Documents: 01_PRODUCT_SPEC.md

**Finding:**
"Tournament Snapshot — Must display: ... Broadcaster"

The Broadcaster field refers to the broadcaster for the next match. But what if
the next match has a TBD broadcaster? This is common early in tournament scheduling.

**Recommendation:**
Display "TBD" for broadcaster when null. This is already specified in the data model
fallbacks section. No new spec work required. Flagged here for implementation awareness.

---

## FINDING UX-007
Type: [GAP]
Severity: LOW
Documents: 01_PRODUCT_SPEC.md, 04_DATA_MODEL.md

**Finding:**
The Statistics tab for team pages includes "Experience Distribution" as a chart.
Experience is measured by caps (international appearances).
However, no chart format is specified (bar chart by caps bands? histogram?).

**Recommendation:**
Experience Distribution: bar chart grouped into bands (0–10, 11–25, 26–50, 51–75, 76–100, 100+ caps).
Consistent with Age Distribution approach (bands rather than individual ages).

---

# PART 4 — TOURNAMENT AND FUNCTIONAL

---

## FINDING FUNC-001
Type: [CONTRADICTION]
Severity: LOW
Documents: 01_PRODUCT_SPEC.md vs 04_DATA_MODEL.md

**Finding:**
01_PRODUCT_SPEC.md — Qualification Status:
"Display: Qualified, Qualification Possible, Eliminated"

04_DATA_MODEL.md — qualificationStatus field values:
"qualified, possible, eliminated"

These are consistent in values but the display strings differ (capitalisation,
"Qualification Possible" vs "possible").

**Resolution:**
Data stores lowercase enum: `"qualified"`, `"possible"`, `"eliminated"`.
UI displays: "Qualified", "Possible", "Eliminated" (or full phrase "Qualification Possible").
No contradiction — just a display vs storage distinction. No change required.

---

## FINDING FUNC-002
Type: [AMBIGUITY]
Severity: MEDIUM
Documents: 01_PRODUCT_SPEC.md

**Finding:**
"TODAY'S MATCHES — Purpose: Provide quick daily overview."
"Each match displays: Teams, Kickoff Time, Broadcaster, Match Status"

No specification for what happens between matchdays (rest days).
During the group stage, there are typically 3–4 matches per day.
During the knockout stage, there are typically 2 matches per day.
But there are rest days where no matches are scheduled.

The Today's Matches empty state is now defined (owner amendment):
"Display: 'No matches scheduled today' along with: Next scheduled matchday information."

However, "Next scheduled matchday information" format is unspecified.

**Recommendation:**
Display: "No matches scheduled today. Next matches: {date} ({count} matches)"
With a list of up to 3 upcoming fixtures.

---

## FINDING FUNC-003
Type: [GAP]
Severity: MEDIUM
Documents: 01_PRODUCT_SPEC.md, 06_UI_MOCKUPS.md

**Finding:**
The knockout bracket requires a Round of 32 stage (with 32 teams advancing
from the 12-team group stage). However, group stage third-place team rankings
determine which 8 of the 12 third-place teams advance.

This creates a complex scheduling scenario:
- Not all Round of 32 matchups are known until the group stage concludes
- Some slots may show "Best 3rd-place team from Groups A/B/C"

The spec shows knockout match cards with simple "France vs Switzerland" format.
No provision for multi-group third-place placeholder slots.

**Recommendation:**
Knockout slots should support a `teamLabel` field (override display text):
`{ teamId: "tbc", teamLabel: "Best 3rd - Groups A/B/C" }`
This covers the pre-confirmed-matchup state without schema changes.

---

## FINDING FUNC-004
Type: [GAP]
Severity: LOW
Documents: 01_PRODUCT_SPEC.md

**Finding:**
"Recent Form — Display: Recent match outcomes (W W D W W)"

The spec does not state:
- How many matches shown (the example shows 5)
- Whether this includes all matches or only official internationals
- Whether World Cup group stage results update the form

**Recommendation:**
Display exactly 5 most recent results, stored as an array in country.recentForm.
The array is curated manually or from official data — the application simply
displays it. No algorithm defined for derivation.

---

## FINDING FUNC-005
Type: [AMBIGUITY]
Severity: LOW
Documents: 06_UI_MOCKUPS.md

**Finding:**
Group stage mockup shows:
"Upcoming Fixtures: France vs Iraq, 22 Jun 22:00 BST, ITV"

Group card should only show upcoming fixtures within that group.
Specification does not define maximum number of upcoming fixtures per group card.
Some groups may have 6 upcoming fixtures; showing all 6 would make the card very long.

**Recommendation:**
Show maximum 2 upcoming fixtures per group card to keep card height manageable.
If more upcoming, add "View all" link to Tournament Centre / fixture details.

---

# PART 5 — PERFORMANCE AND TECHNICAL

---

## FINDING PERF-001
Type: [AMBIGUITY]
Severity: MEDIUM
Documents: 03_TECHNICAL_ARCHITECTURE.md

**Finding:**
"Initial Load: Target under 3 seconds."

This target is device-agnostic. On a low-end mobile device on a 3G connection,
loading multiple CSS files, the JS module graph, and the initial JSON data may
exceed 3 seconds regardless of optimisation.

No reference device or network condition is specified.

**Recommendation:**
Define target: 3 seconds on a mid-range Android device on a 4G connection
(roughly equivalent to Lighthouse's simulated mobile conditions).
On desktop/WiFi: target 1 second or less.

---

## FINDING PERF-002
Type: [GAP]
Severity: LOW
Documents: 03_TECHNICAL_ARCHITECTURE.md

**Finding:**
"Broken images never displayed."

The spec requires graceful image fallback but does not specify:
- Whether the fallback is triggered by HTTP errors (404), network errors, or both
- Whether the fallback is applied before or after the broken image briefly appears

**Recommendation:**
Use `onerror` attribute on `<img>` elements. The onerror handler fires before
the browser shows a broken image indicator. Set `src` to placeholder within
the onerror handler. Set `onerror = null` to prevent infinite loop if placeholder fails.
This is standard practice — no spec change required.

---

## FINDING PERF-003
Type: [GAP]
Severity: LOW
Documents: 03_TECHNICAL_ARCHITECTURE.md

**Finding:**
The spec mentions "Scrolling: Target 60fps" but does not address the
potential for layout thrashing in the Auto-Focus Squad System.

IntersectionObserver is async and does not run in the scroll event thread,
so it is inherently safe. However, the profile panel update that follows —
fetching player data and re-rendering the panel — could cause jank if
it involves synchronous DOM reads/writes.

**Recommendation:**
Profile panel updates should batch DOM writes using requestAnimationFrame.
Player data for the active row's adjacent rows should be pre-fetched when
the active row activates (predictive prefetch for the next row's players).
This is a Sprint 7 performance optimisation, not a Sprint 1 concern.

---

# PART 6 — ACCESSIBILITY

---

## FINDING A11Y-001
Type: [GAP]
Severity: MEDIUM
Documents: 03_TECHNICAL_ARCHITECTURE.md, 07_ACCEPTANCE_CRITERIA.md

**Finding:**
AC-071: "Keyboard navigation supported."
AC-072: "Visible focus states present."

No specification for how the Auto-Focus Squad System behaves with keyboard navigation.
The Auto-Focus System is driven by scroll position (IntersectionObserver).
Keyboard users who do not scroll but use Tab to navigate player cards would not
trigger the IntersectionObserver row detection.

This creates a gap: keyboard users may not be able to use the Auto-Focus System
as specified, because they navigate without scrolling.

**Recommendation:**
When a player card receives keyboard focus:
1. Scroll that card into view (if not already)
2. Activate the card's row (triggering Auto-Focus row detection)
3. Show that player's profile

This bridges keyboard and scroll-based Auto-Focus. Implement via `focus` event
listener on player cards (fires before IntersectionObserver would detect).

---

## FINDING A11Y-002
Type: [GAP]
Severity: MEDIUM
Documents: 03_TECHNICAL_ARCHITECTURE.md

**Finding:**
The Group Stage carousel is a core feature with both visual arrows and
drag/wheel scrolling. No specification for keyboard navigation of the carousel.

Without keyboard support, keyboard users cannot navigate between groups.

**Recommendation:**
Group carousel: Left/Right arrow keys navigate between groups when carousel
or its arrow buttons are focused. This is standard carousel keyboard behaviour
(ARIA pattern: roving tabindex or arrow key navigation).
The arrow buttons already provide a keyboard path if they're focusable.

---

## FINDING A11Y-003
Type: [AMBIGUITY]
Severity: LOW
Documents: 03_TECHNICAL_ARCHITECTURE.md (AC-074)

**Finding:**
"Colour not sole status indicator" is required.

The Group Stage cards show qualification status as coloured circles (green/amber/red).
The mockup shows: 🟢 Qualified, 🟡 Possible, 🔴 Eliminated.

Using emoji as indicators is potentially problematic:
- Emoji rendering varies across operating systems and browsers
- Emoji accessibility in screen readers varies
- Emoji colour rendering differs in dark mode

**Recommendation:**
Replace emoji with styled HTML elements:
`<span class="status-dot status-dot--qualified" aria-hidden="true"></span>` +
`<span class="status-label">Qualified</span>`

CSS colours the dot. Text label is always present. Screen reader reads the text.
aria-hidden on the dot prevents redundant announcement.

---

# PART 7 — MOBILE

---

## FINDING MOB-001
Type: [AMBIGUITY]
Severity: LOW
Documents: 02_UX_AND_UI_SPEC.md

**Finding:**
"Mobile: 2 cards per row" for the squad grid.

For phones with very small screens (320px), 2 player cards per row leaves
each card approximately 145px wide. This is enough for a photo, name, and
club badge, but the layout needs careful verification.

No minimum card width is specified.

**Recommendation:**
Minimum player card width: 130px. If screen width < 300px (rare but possible),
fall back to 1 card per row. This is a CSS-only solution using `min()` or
`max-width` on grid columns.

---

## FINDING MOB-002
Type: [GAP]
Severity: LOW
Documents: 01_PRODUCT_SPEC.md

**Finding:**
"Knockout: Mobile Horizontal bracket navigation."
"Snap by round."

The knockout stage has 6 rounds: Round of 32, Round of 16, QF, SF, 3rd Place, Final.
No specification for what a "round slide" looks like on mobile.

Round of 32 has 16 matches. Showing all 16 matches on one mobile screen slide
would require vertical scrolling within a horizontal snap container.

**Recommendation:**
Each round is one horizontally snapped "slide." Within a slide, matches scroll
vertically if they exceed screen height. This is the most natural mobile pattern
and requires no spec change.

---

# PART 8 — OPEN QUESTIONS REQUIRING DECISION

These are questions that audit the specs for missing decisions.
They are restated from PROJECT_ANALYSIS.md for completeness.

**OQ-001 — Players data file splitting**
Single players.json or per-team player files?
Recommendation: per-team (players/france.json) for lazy loading.
Decision needed before Sprint 2.

**OQ-002 — Landing page content**
What does the `#` / `#home` route show?
Recommendation: redirect to `#tournament`.
Decision needed before Sprint 1 completion.

**OQ-003 — Hosting environment**
Static hosting environment affects ES module CORS, cache headers, build step.
Decision needed before Sprint 1.

**OQ-004 — Data update workflow**
Who updates JSON files during the live tournament? Manual? Automated?
Should a "last updated" timestamp display in the UI?

**OQ-005 — Knockout bracket display before group stage ends**
Show TBC placeholders or hide until teams confirmed?
Recommendation: show TBC placeholders.

**OQ-006 — Continent view content**
Spec lists this nav entry but defines no content.
Recommendation: confederation-grouped team cards.

**OQ-007 — Compare Teams team selection UI**
Dropdown or search-style autocomplete?
Recommendation: search autocomplete.

**OQ-008 — Statistics XI display format**
Pitch formation or card grid?
Recommendation: pitch-inspired visual with grid fallback.

**OQ-009 — Groups browse view content**
Separate from Tournament Centre Group Stage, or same content?
Recommendation: same Group Stage carousel as Tournament Centre.

---

# SUMMARY OF UNRESOLVED FINDINGS

| ID         | Type          | Severity | Status    |
|------------|---------------|----------|-----------|
| ARCH-001   | AMBIGUITY     | HIGH     | Open      |
| ARCH-002   | AMBIGUITY     | MEDIUM   | Resolved* |
| ARCH-003   | AMBIGUITY     | MEDIUM   | Open      |
| ARCH-004   | AMBIGUITY     | LOW      | Open      |
| ARCH-005   | AMBIGUITY     | LOW      | Open      |
| DATA-001   | SCHEMA GAP    | -        | Resolved  |
| DATA-002   | SCHEMA GAP    | -        | Resolved  |
| DATA-003   | SCHEMA GAP    | HIGH     | Open      |
| DATA-004   | SCHEMA GAP    | MEDIUM   | Open      |
| DATA-005   | SCHEMA GAP    | MEDIUM   | Open      |
| DATA-006   | SCHEMA GAP    | LOW      | Open      |
| DATA-007   | AMBIGUITY     | LOW      | Open      |
| DATA-008   | GAP           | LOW      | Open      |
| UX-001     | CONTRADICTION | MEDIUM   | Open      |
| UX-002     | AMBIGUITY     | MEDIUM   | Open      |
| UX-003     | CONTRADICTION | MEDIUM   | Open      |
| UX-004     | GAP           | MEDIUM   | Open      |
| UX-005     | GAP           | LOW      | Open      |
| UX-006     | AMBIGUITY     | LOW      | Open      |
| UX-007     | GAP           | LOW      | Open      |
| FUNC-001   | CONTRADICTION | LOW      | Resolved* |
| FUNC-002   | AMBIGUITY     | MEDIUM   | Open      |
| FUNC-003   | GAP           | MEDIUM   | Open      |
| FUNC-004   | GAP           | LOW      | Open      |
| FUNC-005   | AMBIGUITY     | LOW      | Open      |
| PERF-001   | AMBIGUITY     | MEDIUM   | Open      |
| PERF-002   | GAP           | LOW      | Open      |
| PERF-003   | GAP           | LOW      | Open      |
| A11Y-001   | GAP           | MEDIUM   | Open      |
| A11Y-002   | GAP           | MEDIUM   | Open      |
| A11Y-003   | AMBIGUITY     | LOW      | Open      |
| MOB-001    | AMBIGUITY     | LOW      | Open      |
| MOB-002    | GAP           | LOW      | Open      |

* Resolved by document priority rule or owner amendment.

**Findings requiring explicit decisions before coding begins:**
- ARCH-001 (vanilla JS threshold)
- DATA-003 (schema normalisation)
- UX-001 (Coaching Staff in Squad tab)
- FUNC-003 (knockout third-place slot labelling)
- A11Y-001 (keyboard Auto-Focus behaviour)
- OQ-001 through OQ-009 (open questions)

---

End of SPEC_AUDIT.md
