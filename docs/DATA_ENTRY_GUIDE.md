# DATA_ENTRY_GUIDE.md

Version: 2.0  (updated Sprint 2 — reflects live data and confirmed conventions)
Status: Reference Document
Purpose: Conventions and workflow for populating player and team data across all 48 nations.
         Follow these rules without exception. Inconsistent IDs across 1,250 players will break
         search, deep linking, club/league resolution, and similar-player cross-referencing.

---

## SECTION 1 — PLAYER JSON SCHEMA

### Complete player record (all fields)

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

### Field reference

| Field             | Type      | Status      | Notes                                                         |
|-------------------|-----------|-------------|---------------------------------------------------------------|
| id                | string    | Required    | `{countryId}-{name-slug}` — see Section 2                    |
| name              | string    | Required    | Full display name with correct accents (Mbappé, Konaté, etc.)|
| shirt             | number    | Required    | Official squad shirt number (1–26)                           |
| position          | string    | Required    | GK / DF / MF / FW only — see Section 5                      |
| dob               | string    | Required    | ISO 8601: `"1998-12-20"` (YYYY-MM-DD, always)               |
| age               | number    | Required    | Age as of tournament start: June 11, 2026                    |
| caps              | number    | Required    | International appearances at time of squad submission         |
| goals             | number    | Required    | International goals at time of squad submission              |
| clubId            | string    | Required    | Must match an existing `id` in `data/clubs.json`            |
| captain           | boolean   | Required    | `true` for exactly one player; `false` for all others        |
| bio               | string    | Required    | `""` if not written; never null or omitted                   |
| marketValue       | number\|null | Pending  | Transfermarkt value in EUR (e.g. 180000000). null until added|
| similarPlayerIds  | string[]  | Pending     | 0–3 player IDs: `["spain-yamal","england-saka"]`. `[]` until added |
| recentForm        | string[]  | Pending     | Last 5 international results oldest→newest: `["W","D","W","W","L"]` |
| isOfficialSquad   | boolean   | Pending     | `true` for all 26 official members; `false` if replaced     |
| isReserve         | boolean   | Pending     | `false` for official squad; `true` for standby/travel reserve|

**Required vs Pending:** The 11 Required fields must be present in every player record now.
Pending fields should be included as shown (null / [] / false) so they're ready for enrichment.

---

## SECTION 2 — PLAYER ID CONVENTIONS

### Standard pattern

`{countryId}-{name-slug}`

The name slug is the player's most commonly known name, slugified (lowercase, hyphens, ASCII only).

| Player              | Country ID | Name slug       | Full player ID           |
|---------------------|------------|-----------------|--------------------------|
| Kylian Mbappé       | france     | mbappe          | france-mbappe            |
| Harry Kane          | england    | kane            | england-kane             |
| Vinícius Júnior     | brazil     | vinicius-junior | brazil-vinicius-junior   |
| Aurélien Tchouaméni | france     | tchouameni      | france-tchouameni        |
| Bukayo Saka         | england    | saka            | england-saka             |

### Slug rules

- Lowercase only
- Spaces → hyphens
- Remove all diacritics: é→e, ü→u, ñ→n, ç→c, ã→a, ï→i, etc.
- Apostrophes removed: O'Reilly → oreilly, N'Golo → ngolo
- Hyphens in real names kept: Zaïre-Emery → zaire-emery
- Use last name by default; use full name only for disambiguation (see Section 3)

Real examples:
- Aurélien Tchouaméni  → tchouameni
- Warren Zaïre-Emery   → zaire-emery
- N'Golo Kanté         → kante
- Nico O'Reilly        → oreilly
- Jean-Philippe Mateta → mateta (last name, not first)
- Dayot Upamecano      → upamecano
- Ibrahima Konaté      → konate
- Manu Koné            → kone   (different from konate — no clash in France squad)

---

## SECTION 3 — DISAMBIGUATION RULES

When two players in the same squad share the same name slug, extend both IDs with
the first name (or another distinguishing element).

### Pattern for clashing slugs

`{countryId}-{firstname}-{lastname}`

### Real examples from live data (Sprint 2)

| Squad   | Player 1               | Player 2                | ID 1                      | ID 2                       |
|---------|------------------------|-------------------------|---------------------------|----------------------------|
| France  | Lucas Hernández (DF)   | Théo Hernández (DF)     | france-lucas-hernandez    | france-theo-hernandez      |
| England | Dean Henderson (GK)    | Jordan Henderson (MF)   | england-dean-henderson    | england-jordan-henderson   |
| Brazil  | Danilo Luiz (DF, #13)  | Danilo Santos (MF, #18) | brazil-danilo-luiz        | brazil-danilo-santos       |
| Brazil  | Éderson Silva (MF, #2) | Ederson Moraes (GK, #23)| brazil-ederson-silva      | brazil-ederson-moraes      |

### Disambiguation checklist (run before assigning every player ID)

1. Slugify the player's common name
2. Check the current squad file: does any existing `"id"` end with that slug?
3. No clash → use `{countryId}-{slug}`
4. Clash → use `{countryId}-{firstname}-{lastname}` for BOTH the existing and the new player
5. If first+last still clashes (extremely rare) → add position suffix: `brazil-danilo-df`

---

## SECTION 4 — BRAZILIAN SINGLE-NAME CONVENTION

Brazilian players often go by a single internationally recognised name. Use that single
name as the slug when Wikipedia identifies the player by one name only.

### Rule

If Wikipedia's squad table lists the player with a single name → use it as the slug.
If Wikipedia uses a full name → use last name (or full name for disambiguation).

### Reference table from live data

| Single name (slug only)            | Full name needed                       |
|------------------------------------|----------------------------------------|
| Alisson → brazil-alisson           | Bruno Guimarães → brazil-bruno-guimaraes |
| Marquinhos → brazil-marquinhos     | Gabriel Magalhães → brazil-gabriel-magalhaes |
| Casemiro → brazil-casemiro         | Alex Sandro → brazil-alex-sandro      |
| Neymar → brazil-neymar             | Matheus Cunha → brazil-matheus-cunha  |
| Raphinha → brazil-raphinha         | Léo Pereira → brazil-leo-pereira      |
| Bremer → brazil-bremer             | Lucas Paquetá → brazil-paqueta        |
| Fabinho → brazil-fabinho           | Roger Ibáñez → brazil-roger-ibanez    |
| Endrick → brazil-endrick           | Igor Thiago → brazil-igor-thiago      |
| Weverton → brazil-weverton         | Luiz Henrique → brazil-luiz-henrique  |
| Rayan → brazil-rayan               | Danilo (two players — needs suffix)   |

The `"name"` display field must match Wikipedia exactly:
`"name": "Alisson"`, `"name": "Neymar"`, `"name": "Endrick"` for single-name players.

---

## SECTION 5 — POSITION VALUES

Exactly four valid values. Match Wikipedia's squad tables exactly.

| Code | Meaning     | Includes                              |
|------|-------------|---------------------------------------|
| GK   | Goalkeeper  | All GKs                               |
| DF   | Defender    | CB, LB, RB, LWB, RWB                 |
| MF   | Midfielder  | DM, CM, AM, LM, RM, CAM              |
| FW   | Forward     | ST, CF, LW, RW                        |

**Never use:** DEF, MID, FWD, D, M, F, def, mid, fw, GKP, or any other variant.

---

## SECTION 6 — CLUB ID CONVENTIONS

Lowercase kebab-case ASCII. Drop generic suffixes (FC, CF, SC, FK) unless they are
the primary identifier.

| Club name              | Correct ID              | Wrong IDs                         |
|------------------------|-------------------------|-----------------------------------|
| AC Milan               | ac-milan                | milan, ac_milan, acmilan          |
| Paris Saint-Germain    | paris-saint-germain     | psg, paris-sg                     |
| Manchester City        | manchester-city         | man-city, man-city-fc             |
| Manchester United      | manchester-united       | man-utd, man-united               |
| Real Madrid            | real-madrid             | realmadrid, madrid                |
| AS Roma                | roma                    | as-roma, as_roma                  |
| Stade Rennais          | rennes                  | stade-rennais                     |
| Olympique Lyonnais     | lyon                    | ol, olympique-lyonnais            |
| AS Monaco              | monaco                  | as-monaco                         |
| RC Lens                | lens                    | rc-lens                           |
| Grêmio                 | gremio                  | gremio-fbpa                       |
| AFC Bournemouth        | bournemouth             | afc-bournemouth                   |
| Bayer Leverkusen       | bayer-leverkusen        | leverkusen, bayer04               |
| Tottenham Hotspur      | tottenham-hotspur       | tottenham, spurs                  |
| Nottingham Forest      | nottingham-forest       | notts-forest, forest              |

Before using a club ID, verify it exists in `data/clubs.json`. If adding a new club:

```json
{ "id": "club-id", "name": "Full Club Name", "leagueId": "league-id", "country": "Country" }
```

The `leagueId` must reference an existing entry in `data/leagues.json`.

---

## SECTION 7 — CAPTAIN FIELD

- Exactly **one** player per squad: `"captain": true`
- All other players: `"captain": false` (explicit — never omit)
- Source: Wikipedia footnotes the captain with "(c)"

Known captains from live data:

| Country | Captain           | Player ID         | Shirt |
|---------|-------------------|-------------------|-------|
| France  | Kylian Mbappé     | france-mbappe     | 10    |
| England | Harry Kane        | england-kane      | 9     |
| Brazil  | Marquinhos        | brazil-marquinhos | 4     |

---

## SECTION 8 — BIOGRAPHY FIELD

- `"bio": ""` — not yet written; the bio template engine generates one at runtime
- `"bio": "Some text."` — custom override; engine uses this, skips generation
- Only write custom bios for the 5–10 highest-profile players per team
- 2–3 sentences, present tense, factual
- **Never use `null`** — always `""`

---

## SECTION 9 — WIKIPEDIA API WORKFLOW

Wikipedia is the **sole source of truth** for squad composition: names, positions, DOBs,
caps, goals, and clubs. Fetch Wikipedia first, then supplement from other sources.

### Why not FIFA.com

FIFA.com is JavaScript-rendered. Web fetchers receive an empty page. Do not use it
for automated data collection. Wikipedia has equivalent accuracy for squad data.

### Step 1: Get section indices

```
GET https://en.wikipedia.org/w/api.php?action=parse&page=2026_FIFA_World_Cup_squads&prop=sections&format=json
```

Re-run this at the start of each data session — section numbers can shift if Wikipedia
editors add or remove content.

Known indices as of June 2026:

| Group   | Country       | Section index |
|---------|---------------|---------------|
| Group A | Mexico        | 2             |
| Group C | Brazil        | 12            |
| Group E | Germany       | 24            |
| Group F | Netherlands   | 28            |
| Group H | Spain         | 39            |
| Group I | France        | 42            |
| Group J | Argentina     | 48            |
| Group K | Portugal      | 54            |
| Group L | England       | 58            |
(Always verify against a fresh sections fetch — indices shift when Wikipedia editors add/remove content)

### Step 2: Fetch the specific squad section

```
GET https://en.wikipedia.org/w/api.php?action=parse&page=2026_FIFA_World_Cup_squads&prop=wikitext&section=42&format=json
```

Replace `section=42` with the correct index for the target team.

### CRITICAL: Do NOT use anchor URLs

`https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_squads#Group_I` will NOT work.
The page is too large. WebFetch always truncates before Groups C, I, or L are reached.
**Always use the API with explicit section numbers.**

### Step 3: Verify

Spot-check 2–3 players per squad against a secondary source (Sky Sports, ESPN, or the
club's official site) to catch Wikipedia errors.

### Step 4: Supplement for other fields

| Data needed           | Sources                                       |
|-----------------------|-----------------------------------------------|
| Market values         | transfermarkt.com                             |
| Player ratings (EA)   | ea.com/fc/ratings or FUTBIN                   |
| Career bios           | Wikipedia individual player pages             |
| Photos (future)       | Club press packs / Wikimedia Commons          |

---

## SECTION 10 — FILE WRAPPER FORMAT

Every player file must use this envelope:

```json
{
  "version": "1.0",
  "lastUpdated": "2026-06-19T00:00:00Z",
  "data": [
    ...players...
  ]
}
```

Update `lastUpdated` to the actual date when writing.

---

## SECTION 11 — SQUAD FILE CHECKLIST

Before committing a new squad file:

- [ ] File wrapper present: version, lastUpdated, data array
- [ ] Exactly 26 players in the data array
- [ ] All 26 IDs are unique within the file
- [ ] No ID clashes with other squads (search data/players/ for the slug)
- [ ] Shirt numbers 1–26 all present, no duplicates
- [ ] All position values are GK, DF, MF, or FW — nothing else
- [ ] All `clubId` values exist in `data/clubs.json`
- [ ] Exactly one player has `"captain": true`
- [ ] All `bio` fields are `""` (not null, not absent)
- [ ] Source: every name and club confirmed against Wikipedia

---

## SECTION 12 — COMMON MISTAKES

1. **Wrong position code** — `FWD` instead of `FW`, `DEF` instead of `DF`. These will break bio generation and position filters.
2. **Wrong field name** — `shirtNumber` instead of `shirt`. The old guide used shirtNumber; the live schema uses shirt.
3. **Missing club in clubs.json** — player record will silently fail to resolve club data.
4. **Using photoUrl** — this field does not exist in the current schema. Photos are served from `assets/players/{id}.jpg`; the fallback SVG handles missing files automatically.
5. **Setting bio to null** — use `""`. The bio engine checks `if (player.bio)`, which is false for both null and ""; but `""` is the convention for consistency.
6. **Duplicate ID** — two players with the same slug in the same squad. Run the disambiguation checklist before committing.
7. **Wrong recentForm order** — oldest match first, most recent last: `["W","L","D","W","W"]` = most recent result is the final "W".
8. **countryId as a separate field** — the old schema had this; the live schema does not. countryId is derived from the player ID prefix.
9. **leagueId on the player record** — the old schema had this; the live schema does not. League is resolved via clubs.json.

---

## SECTION 13 — FIXTURE AND STANDINGS SCHEMA

### Fixture record (data/fixtures.json)

```json
{
  "id":           "c-r1-bra-mor",
  "groupId":      "C",
  "round":        1,
  "homeTeamId":   "brazil",
  "awayTeamId":   "morocco",
  "kickoff":      "2026-06-13T22:00:00Z",
  "status":       "FT",
  "homeScore":    1,
  "awayScore":    1,
  "venue":        "MetLife Stadium, East Rutherford NJ",
  "broadcaster":  null
}
```

#### Status values — exactly three valid values

| Value       | Meaning                                     |
|-------------|---------------------------------------------|
| `"scheduled"` | Match not yet played; homeScore/awayScore ignored |
| `"live"`      | Match in progress                           |
| `"FT"`        | Full time / completed                       |

**Never use:** `"finished"`, `"complete"`, `"played"`, `"TBD"`, or any other variant.

#### Score fields

Use `homeScore` / `awayScore` (integer or null). NOT `score.home` / `score.away`. Set to `null` for scheduled matches.

#### File envelope

```json
{
  "version": "1.0",
  "lastUpdated": "2026-06-20T00:00:00Z",
  "data": [ ...fixtures... ]
}
```

#### Fixture ID convention

Pattern: `{group-lowercase}-r{round}-{home-3letter}-{away-3letter}`

The 3-letter code is a short, recognisable slug derived from the team ID — not the official FIFA code.

| Team ID             | 3-letter code | Team ID          | 3-letter code |
|---------------------|---------------|------------------|---------------|
| mexico              | mex           | germany          | ger           |
| south-korea         | kor           | curacao          | cur           |
| south-africa        | rsa           | ivory-coast      | civ           |
| czech-republic      | cze           | ecuador          | ecu           |
| canada              | can           | netherlands      | ned           |
| bosnia-herzegovina  | bih           | japan            | jpn           |
| qatar               | qat           | sweden           | swe           |
| switzerland         | sui           | tunisia          | tun           |
| usa                 | usa           | belgium          | bel           |
| paraguay            | par           | egypt            | egy           |
| australia           | aus           | iran             | irn           |
| turkey              | tur           | new-zealand      | nzl           |
| france              | fra           | spain            | esp           |
| senegal             | sen           | cape-verde       | cpv           |
| iraq                | irq           | saudi-arabia     | ksa           |
| norway              | nor           | uruguay          | uru           |
| brazil              | bra           | argentina        | arg           |
| morocco             | mor           | algeria          | alg           |
| haiti               | hai           | austria          | aut           |
| scotland            | sco           | jordan           | jor           |
| england             | eng           | portugal         | por           |
| croatia             | cro           | dr-congo         | cod           |
| ghana               | gha           | uzbekistan       | uzb           |
| panama              | pan           | colombia         | col           |

Examples: `a-r1-mex-rsa`, `b-r2-sui-bih`, `j-r3-jor-arg`

---

### Standings record (data/standings.json)

**NESTED structure — NOT flat per-team array.**

```json
{
  "data": [
    {
      "groupId": "C",
      "teams": [
        {
          "teamId":             "scotland",
          "position":           1,
          "played":             1,
          "won":                1,
          "drawn":              0,
          "lost":               0,
          "goalsFor":           1,
          "goalsAgainst":       0,
          "goalDifference":     1,
          "points":             3,
          "qualificationStatus": null
        }
      ]
    }
  ]
}
```

Key rules:
- `data` is an array of group objects, each with `groupId` and `teams[]`.
- `teams[]` is ordered by `position` (position 1 = current leader at index 0).
- `qualificationStatus`: `null` | `"qualified"` | `"eliminated"` | `"playoff"`.
- Use `teamId` (not `countryId`) — matches `id` field in `data/countries.json`.
- `goalDifference` = goalsFor − goalsAgainst (can be negative).

When reading standings in code: `group.teams[0]` is the group leader.

#### qualificationStatus rules

Only set `"qualified"` or `"eliminated"` when mathematically certain — not just likely.

**`"qualified"`** — the team cannot finish outside the top 2 regardless of all remaining results.
Typical trigger: a team reaches a points total that no third-place team can match even with maximum points.

**`"eliminated"`** — the team cannot finish in the top 2 regardless of all remaining results.
Requires checking both points ceiling AND goal difference when multiple teams share a points ceiling.
Example: Group B after Round 2 — Bosnia-Herzegovina and Qatar both had a points ceiling of 4 (one game left against each other), but Canada (+6 GD) and Switzerland (+3 GD) were already at 4 pts and unreachable on GD even in the best case.

**`null`** — anything that is not yet mathematically settled. Prefer null when in doubt.

**`"playoff"`** — reserved for best third-place playoff scenarios. Do not set until the group stage is complete.

#### Tied-team ordering in standings

When multiple teams are tied on all tiebreakers (points, GD, GF, head-to-head), use Wikipedia's displayed standings order for that group. Do not invent an ordering. Note this as approximate in the sprint report.

---

## SECTION 14 — FIXTURE DATA SOURCING WORKFLOW

Fixtures and standings come from individual group pages on Wikipedia, **not** the squads mega-page. These pages are small enough that direct WebFetch works without the API section-fetch trick.

### Step 1: Fetch the group page directly

```
GET https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_Group_A
```

Replace `Group_A` with `Group_B` through `Group_L` as needed. All 12 group pages exist as separate articles and can be fetched in parallel.

**Do not use** `https://en.wikipedia.org/wiki/2026_FIFA_World_Cup#Group_stage` — the main tournament page truncates before most group data is reached.

### Step 2: Extract match data

Prompt the fetcher to extract:
- Every match: home team, away team, score (or "scheduled"), date, local time with UTC offset, venue
- Current standings table: team, played, won, drawn, lost, GF, GA, GD, points

### Step 3: Convert local times to UTC

Wikipedia gives local times with a UTC offset (e.g. "3:00 PM UTC-4"). Add the absolute offset value to the local time to get UTC.

Formula: `UTC = local_time + |offset|`

Example: 3:00 PM UTC-4 → 15:00 + 4 = 19:00 → `T19:00:00Z`
Example: 8:00 PM UTC-7 → 20:00 + 7 = 27:00 → rolls to next day T03:00:00Z

See Section 15 for a venue-to-offset reference.

### Step 4: Verify arithmetic

After entering standings, verify: `goalDifference = goalsFor - goalsAgainst` and `points = (won × 3) + drawn` for every team.

---

## SECTION 15 — VENUE TIMEZONE REFERENCE

All 2026 World Cup venues and their UTC offsets during the tournament (June–July, all in daylight saving time):

| Venue | City | UTC offset |
|-------|------|------------|
| MetLife Stadium | East Rutherford NJ | UTC-4 (EDT) |
| Gillette Stadium | Foxborough MA | UTC-4 (EDT) |
| Lincoln Financial Field | Philadelphia PA | UTC-4 (EDT) |
| Hard Rock Stadium | Miami Gardens FL | UTC-4 (EDT) |
| Mercedes-Benz Stadium | Atlanta GA | UTC-4 (EDT) |
| BMO Field | Toronto ON | UTC-4 (EDT) |
| AT&T Stadium | Arlington TX | UTC-5 (CDT) |
| NRG Stadium | Houston TX | UTC-5 (CDT) |
| Arrowhead Stadium | Kansas City MO | UTC-5 (CDT) |
| SoFi Stadium | Inglewood CA | UTC-7 (PDT) |
| Lumen Field | Seattle WA | UTC-7 (PDT) |
| BC Place | Vancouver BC | UTC-7 (PDT) |
| Levi's Stadium | Santa Clara CA | UTC-7 (PDT) |
| Estadio Azteca | Mexico City | UTC-6 (CDT MX) |
| Estadio Akron | Zapopan | UTC-6 (CDT MX) |
| Estadio BBVA | Guadalupe NL | UTC-6 (CDT MX) |

Note: Mexico uses "Central Daylight Time" (CDT) like US Central, but Wikipedia sometimes labels these venues as UTC-6 explicitly. Always use the offset stated by Wikipedia for that specific match — do not infer from city alone.

Venue name format in JSON: `"{Stadium Name}, {City} {State/Province}"` — e.g. `"NRG Stadium, Houston TX"`, `"BMO Field, Toronto ON"`, `"Estadio Azteca, Mexico City"` (Mexican venues omit state).

---

## SECTION 16 — MANAGER FIELD SOURCING WORKFLOW

The `manager` field in `data/countries.json` holds the full name of the head coach for each of the 48 teams. This section documents the correct source and method.

### Source: individual group Wikipedia pages

**Do NOT use** `https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_squads` for manager data. That page is too large and WebFetch truncates it before reaching most groups.

**Use the individual group pages** instead — these are small, fetch completely, and include coach names in match report infoboxes:

```
https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_Group_A
https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_Group_B
... (Group_C through Group_L)
```

Fetch all 12 group pages in parallel. Each page lists all match infoboxes for that group, and each infobox shows `Managers: [Name] · [Name]`.

### Extracting the coach name

Look for a line in each match infobox such as:

```
Managers:  Javier Aguirre · Hugo Broos
```

Take the full name exactly as Wikipedia shows it. Do not abbreviate, translate, or anglicise.

### Format rules

- Full name as shown on Wikipedia: `"Julian Nagelsmann"`, `"Didier Deschamps"`, `"Julen Lopetegui"`
- Include accents if Wikipedia uses them: `"Ståle Solbakken"`, `"Sébastien Migné"`, `"Néstor Lorenzo"`
- Single-name coaches: use exactly what Wikipedia shows — e.g. `"Bubista"` for Cape Verde
- Do not add titles (Coach, Manager, etc.)

### Field location in countries.json

```json
{ "id": "germany", "name": "Germany", ..., "manager": "Julian Nagelsmann", ... }
```

Update `lastUpdated` on `data/countries.json` when any manager field changes.

### Verification tip

Managers can change between qualification and the tournament. Wikipedia's group pages reflect the coach actually in charge at match time, making them the most reliable source for tournament-specific data. Cross-check against a secondary source (BBC Sport, ESPN) if any name is unfamiliar or surprising.

---

## SECTION 17 — SEARCH INDEX MAINTENANCE

`data/search-index.json` is the source of truth for the search overlay. It is maintained manually — there is no build step.

### When to update

Update the search index whenever any of the following changes:

| Event | Action |
|-------|--------|
| New squad file created (e.g. `data/players/japan.json`) | Add all 26 player entries |
| Player transferred to a new club mid-tournament | Update `meta` field for that player |
| Country data changes (group reassignment, name change) | Update the relevant team entry |

### Entry format

**Team entry:**
```json
{ "type": "team", "id": "france", "label": "France", "meta": "Group I · UEFA", "href": "#france" }
```

**Player entry:**
```json
{ "type": "player", "id": "france-mbappe", "label": "Kylian Mbappé", "meta": "France · FW · Real Madrid", "href": "#france-mbappe" }
```

- `label` — display name (exact spelling with accents, e.g. `"Kylian Mbappé"`)
- `meta` — `"{Country} · {Position} · {Club display name}"` using club name from `data/clubs.json`
- `href` — always `"#${player.id}"` — must exactly match the player's `id` field in the squad JSON

### Adding a new squad

After creating `data/players/{countryId}.json`:

1. Open `data/search-index.json`
2. After the last existing player block, add 26 new player entries
3. `meta` format: `"CountryName · POSITION · Club Name"` — use the `name` field from `data/clubs.json` for the club, NOT the clubId
4. Update `lastUpdated` timestamp

### Diacritics

Write diacritics in `label` and `meta` exactly as they appear in the squad file and clubs.json. The search overlay normalises both query and index at search time, so `"mbappe"` will find `"Kylian Mbappé"` without any extra work on the data side.

### Clubs not yet in clubs.json

If a player's club is not in `data/clubs.json`, add the club there first (see Section 6), then use the club's `name` value in the search index `meta`.

---

## SECTION 18 — HEAD-TO-HEAD STATS SCHEMA & MANUAL SUPPLEMENT WORKFLOW (Sprint 36)

`headToHeadStats` lives on each fixture's entry in `data/match-previews.json`, alongside the existing Wikipedia-sourced `matchStory`/`headToHead` prose fields (Sprint 31) — it's a **complementary structured-stats addition, not a replacement** for that prose. Populated and maintained by `scripts/gather-head-to-head-stats.mjs`.

### Why a manual-supplement path exists at all

The automated source (football-data.org's `/matches/{id}/head2head` subresource — already-authenticated, zero acquisition risk) caps at the 2 most recent meetings across all competitions on our current plan. That's usually fine — most 2026 fixture pairs have 0-2 all-time meetings, which the API returns completely and correctly — but for pairs with real history, the API's own response tells us it's incomplete: `aggregates.numberOfMatches` (the true total) exceeds the number of match objects actually returned. The gather script computes this per fixture and marks it in `meta.autoCapped`. A separate WorldFootball.net-based approach was investigated and explicitly ruled out as a primary source (see `docs/ROADMAP.md` Sprint 36 retrospective) after a Cloudflare block proved persistent, not just a pacing issue — so capped pairs get a **manual, cited research pass**, not a second automated scrape.

### Schema (per fixture, in `match-previews.json`)

```json
"headToHeadStats": {
  "teams": { "home": "portugal", "away": "croatia" },
  "worldCup": { "meetings": 2, "homeWins": 1, "awayWins": 0, "draws": 1, "homeGoals": 3, "awayGoals": 2, "lastMeeting": "2026-07-02" },
  "allTime":  { "meetings": 10, "homeWins": 7, "awayWins": 1, "draws": 2, "homeGoals": 19, "awayGoals": 8, "lastMeeting": "2026-07-02" },
  "matches": [ { "date": "2026-07-02", "competition": "FIFA World Cup", "homeTeam": "Portugal", "awayTeam": "Croatia", "homeScore": 3, "awayScore": 2 } ],
  "meta": {
    "autoSource": "football-data.org",
    "autoFetchedAt": "2026-07-02T20:00:00.000Z",
    "autoCapped": { "allTime": false, "worldCup": false },
    "manualSupplement": null
  }
}
```

- `teams.home`/`.away` — **this fixture's** home/away assignment (from `fixtures.json`/`knockout.json`), used to reorient historical W/D/L consistently regardless of which side a team played on in any given past meeting. `js/modules/match-centre.js`'s `#buildH2HStatsGrids()` reads this to render correctly no matter which side is home in the current match.
- `worldCup` / `allTime` — same shape, one filtered to `competition.code === 'WC'`, the other unfiltered. Either can be `{ "meetings": 0 }` when there's no history — a legitimate, common value (most 2026 debutant pairings), not an error.
- `matches` — raw list actually returned by the automated source (may be partial if capped — see `meta.autoCapped`). Not currently rendered directly in the UI; kept for future use (e.g. a "recent meetings" list).
- `meta.autoCapped` — **the provenance signal.** `true` means the automated pass could not confirm completeness for that scope. Always computed, never guessed.
- `meta.manualSupplement` — `null` when the automated data was used as-is. When a capped pair has been manually researched, this becomes `{ "scopes": [...], "source": "...", "suppliedAt": "...", "note": "..." }` recording exactly which scope(s) were hand-corrected and why. **This is the field that makes provenance unambiguous** — anyone reading a fixture's data can tell at a glance whether every number came from the API or whether part of it was manually verified.

### The manual-supplement workflow

1. Run `node scripts/gather-head-to-head-stats.mjs`. Its summary reports how many pairs are capped and not yet supplemented.
2. For each capped pair worth correcting (prioritise fixtures with real historical depth — a capped debutant pairing with 0-2 meetings isn't actually missing anything meaningful), research the true record from a citable source: Wikipedia's head-to-head sections, press coverage confirming a specific record (e.g. "Brazil have 8 wins, 2 draws, 0 losses against Scotland"), or another citable stats source. Prefer a source you can name, not an aggregate guess.
3. Add or update an entry in `data/h2h-manual-overrides.json`, keyed by fixture ID:
   ```json
   "c-r3-sco-bra": {
     "scopes": ["allTime"],
     "source": "https://www.worldfootball.net/match-report/co139/fifa-world-cup/ma10713809/scotland_brazil/head-to-head/ (cross-checked against press coverage of the 2026 fixture)",
     "suppliedAt": "2026-07-02",
     "note": "Scotland have never beaten Brazil in 10 meetings",
     "data": {
       "allTime": { "meetings": 10, "homeWins": 0, "awayWins": 8, "draws": 2, "homeGoals": 3, "awayGoals": 16, "lastMeeting": "2026-06-24" }
     }
   }
   ```
   `scopes` lists which of `worldCup`/`allTime` this override replaces — only include the scope(s) you actually corrected; anything not listed keeps its automated value. `data` must contain a full replacement object for each listed scope (same shape as the automated scope object), not a partial patch.
4. Re-run `node scripts/gather-head-to-head-stats.mjs` — it's idempotent and will merge the override on top of the freshly-fetched automated data, setting `meta.manualSupplement` accordingly.
5. Spot-check the fixture's Match Centre page — both the "World Cup" and "All-time" grids should reflect the corrected numbers, and nothing else about the page should change.

### Adding new fixture pairs (ongoing maintenance)

As later knockout rounds resolve (R16 → QF → SF → Final), previously-unknown pairings become real fixtures with a resolvable `football-data.org` match ID. Re-running the gather script picks these up automatically — no separate step needed. Fold this into the same Sprint 34 maintenance cadence already used for `gather-match-events.mjs`/`gather-head-to-head.mjs` (once per completed knockout round), checking the capped-pair count each time in case any newly-revealed pairing needs its own manual supplement.

---

## SECTION 19 — BROADCASTER FIELD: MANUAL ENTRY WORKFLOW (Sprint 43)

`broadcaster` on each `data/knockout.json` match (and `data/fixtures.json` fixture) is a **manually-maintained field, not an automated pipeline** — a deliberate, evidence-based decision, not a gap left for later.

### Why this one is manual, not automated

Sprint 43 investigated six candidate automated sources for UK broadcaster assignment (BBC vs. ITV) before concluding none clear the bar (full investigation and reasoning in `docs/ROADMAP.md` Sprint 43):

- `sportsmole.co.uk` has a clean, structured `schema.org` `BroadcastEvent` data block covering all 104 matches — but only the 72 **group-stage** matches carry the precise channel assignment; all 32 **knockout-stage** matches (the only ones that ever actually need this — see below) fall back to a generic, non-specific description listing every platform, not the one assigned channel. Verified against a match we already know the true answer for.
- `101greatgoals.com` has real per-round precision, but scoped to England's own path through the bracket, not a general answer for any of the 48 teams.
- `livesoccertv.com` is WAF-blocked (HTTP 403). Wikipedia's dedicated broadcasting-rights article is country-level only, and the `{{football box}}` template already parsed by `gather-match-events.mjs` has no broadcaster field at all.

In short: the one source with full match coverage is structurally blind to the round we need; the one source with real precision only covers one team. Building a scraper against either would be fragile or narrow. **Do not resurrect automated broadcaster acquisition without a fresh evaluation** — this was a considered decision, not an oversight.

### Why only some matches ever need a value at all

`js/broadcasters.js`'s `broadcasterBadge()`/`broadcasterIcon()` both return `''` once a match's `status` is `'FT'` — a completed match never renders the broadcaster badge, regardless of the data. Group-stage fixtures are all FT already, so their `broadcaster: null` is permanent and harmless — **do not spend time backfilling `data/fixtures.json`**, it would have zero visible effect. Only **non-FT knockout matches with a confirmed matchup** (both `homeTeamId` and `awayTeamId` set) ever need a real value.

### Detection: `npm run validate` tells you when one is needed

`scripts/validate-data.js`'s `validateBroadcasters()` flags any knockout match where `status !== 'FT'`, both teams are confirmed, `broadcaster` is still `null`, and kickoff is within `BROADCASTER_WARN_DAYS` (currently 7) — printed as a non-fatal warning block, same severity as the squad DOB warning; it never fails `VALIDATION PASSED`. Example output:

```
Broadcaster gaps (2) — non-fatal, see docs/DATA_ENTRY_GUIDE.md §19:
  ⚠ qf-m1: france v morocco (2026-07-09T20:00:00Z) — no broadcaster set
  ⚠ qf-m3: norway v england (2026-07-11T21:00:00Z) — no broadcaster set
```

This is the same "detect an incomplete case, print it clearly, point at the fix" idiom Sprint 36 established for `headToHeadStats` (`gather-head-to-head-stats.mjs`'s capped-pair summary) — reused deliberately. **What's different here, on purpose:** there's no separate overrides file or merge script. Sprint 36's file-based override exists specifically to protect a manual correction from being overwritten by an *automated* pipeline that re-runs periodically. Broadcaster has no automated writer to protect against — a human edits the field directly.

### How to fill in a flagged match

1. Run `npm run validate` (or just check the last Sprint 34 pass's output — this check rides along automatically, no separate command needed).
2. For each flagged match, research the true channel from a citable source: the official BBC/ITV schedule pages, or cross-check against the aggregator sites investigated above (useful as a human reference even though none are reliable enough to automate).
3. Edit `data/knockout.json` directly — set `"broadcaster"` to `"BBC"` or `"ITV"` (matching the keys in `js/broadcasters.js`'s `BROADCASTERS` config) for the relevant match. No other file needs touching; no script needs re-running.
4. Re-run `npm run validate` to confirm the warning is gone.

### Adding a new broadcaster value (if the UK rights split ever changes)

Add a new entry to `BROADCASTERS` in `js/broadcasters.js` (logo, label, links — see that file's own header comment: "Adding a broadcaster = one new entry in `BROADCASTERS`. No rendering code to touch."). No change needed in `validate-data.js` or this workflow.

---

End of DATA_ENTRY_GUIDE.md
