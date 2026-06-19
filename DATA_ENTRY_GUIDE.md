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
| Group C | Brazil        | 12            |
| Group I | France        | 42            |
| Group L | England       | 58            |
| Group A | Mexico        | 2             |
| Group J | Argentina     | 46            |
| Group K | Portugal      | 50            |
(Always verify against a fresh sections fetch)

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

End of DATA_ENTRY_GUIDE.md
