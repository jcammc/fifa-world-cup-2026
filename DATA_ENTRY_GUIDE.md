# Data Entry Guide

Plain-English guide for populating squad data. Read this before touching any JSON files.

---

## Step-by-Step: Adding a Team's Squad

### Step 1 — Create the player file

Create `data/players/{countryId}.json`. Use the country's ID exactly as it appears in `data/countries.json`.

Example: France → `data/players/france.json`

### Step 2 — Use the correct file wrapper

Every player file must start and end like this:

```json
{
  "version": "1.0",
  "lastUpdated": "2026-06-19T00:00:00Z",
  "data": [
    ...players go here...
  ]
}
```

Update `lastUpdated` to today's date in ISO format.

### Step 3 — Add each player

Here is a complete example of one player record with every field explained:

```json
{
  "id": "france-mbappe",
  "countryId": "france",
  "name": "Kylian Mbappé",
  "position": "FWD",
  "shirtNumber": 10,
  "age": 27,
  "clubId": "real-madrid",
  "leagueId": "la-liga",
  "caps": 98,
  "goals": 48,
  "marketValue": 180000000,
  "photoUrl": "https://img.fifa.com/image/upload/...",
  "bio": null,
  "recentForm": ["W","W","D","W","L"],
  "similarPlayerIds": ["spain-yamal","england-saka"],
  "isOfficialSquad": true,
  "isReserve": false
}
```

**Field-by-field explanation:**

| Field | What to enter | Where to find it |
|-------|--------------|-----------------|
| `id` | `{countryId}-{lastnameslug}` — lowercase last name, no accents | Derive it yourself |
| `countryId` | Must match exactly the country's `id` in countries.json | countries.json |
| `name` | Full name with correct accents (é, ñ, ü etc.) | FIFA.com squad page |
| `position` | One of: `GK` `DEF` `MID` `FWD` | FIFA.com / team website |
| `shirtNumber` | Official tournament squad number | FIFA.com official squad |
| `age` | Age at tournament start (June 11, 2026) | Calculate from DOB |
| `clubId` | Must match a club `id` in clubs.json | clubs.json |
| `leagueId` | Must match a league `id` in leagues.json | leagues.json |
| `caps` | Total international appearances | Transfermarkt, Wikipedia |
| `goals` | Total international goals | Transfermarkt, Wikipedia |
| `marketValue` | Transfermarkt value in EUR, as a number | transfermarkt.com |
| `photoUrl` | Official photo URL — for gather-photos.js ONLY | FIFA.com / team website |
| `bio` | Always enter `null` — script will fill it | N/A |
| `recentForm` | Last 5 international results, oldest first: `["W","L","D","W","W"]` | Transfermarkt match history |
| `similarPlayerIds` | 0–3 player IDs of comparable players (same position, similar style) | Your judgement |
| `isOfficialSquad` | `true` for all 26 official squad members | FIFA official announcement |
| `isReserve` | `false` for official squad; `true` for standby players | FIFA official announcement |

### Step 4 — Add any new clubs/leagues

Before committing, check: do all `clubId` values exist in `data/clubs.json`? All `leagueId` values in `data/leagues.json`?

If not, add them. Club entry example:

```json
{
  "id": "real-madrid",
  "name": "Real Madrid",
  "leagueId": "la-liga",
  "country": "Spain"
}
```

### Step 5 — Validate

```bash
npm run validate
```

Fix any errors before continuing.

### Step 6 — Generate bios and rebuild search index

```bash
npm run generate-bios
npm run build-search-index
```

### Step 7 — Commit and push

```bash
git add data/
git commit -m "feat: add {CountryName} squad data ({N} players)"
git push
```

---

## Valid Position Values

| Code | Position |
|------|----------|
| `GK` | Goalkeeper |
| `DEF` | Defender (CB, RB, LB, RWB, LWB) |
| `MID` | Midfielder (DM, CM, AM) |
| `FWD` | Forward (RW, LW, CF, ST) |

Only these four values are accepted. Do not use `CB`, `ST`, `AM`, etc.

---

## Common Mistakes

1. **Wrong ID format** — `mbappe` instead of `france-mbappe`. Always include the country prefix.
2. **Typos in clubId/leagueId** — `realMadrid` instead of `real-madrid`. Always use lowercase-hyphen.
3. **Missing club in clubs.json** — player entry will fail validation.
4. **Using photoUrl at runtime** — this field is for the download script only. Don't reference it in JS.
5. **Overwriting an existing bio** — if a player already has a non-null `bio`, leave it exactly as-is.
6. **Wrong recentForm order** — oldest match first, most recent last: `["W","L","D","W","W"]` means the most recent result is the second "W".
7. **Setting bio to a string** — always enter `null`. The script generates the bio.

---

## Where to Find Data

| Data point | Source |
|-----------|--------|
| Official squad numbers | FIFA.com → Teams → Squad |
| Caps and goals | Transfermarkt → Player → International career |
| Market value | Transfermarkt → Player → Market value |
| Club | Transfermarkt → Player → Club |
| Player photos | FIFA.com player profile → right-click image → copy URL |
| Recent form | Transfermarkt → Player → Achievements → International |
| Age | Calculate: tournament start June 11, 2026 |
