# Data Schema Reference

**CRITICAL: Read this before entering any data. ID consistency across 1,250 players depends on following these conventions.**

---

## ID Naming Conventions

All IDs: lowercase, hyphen-separated, no spaces, no special characters, no accents.

| Entity | Convention | Examples |
|--------|-----------|---------|
| Country | country name, simplified | `france`, `south-africa`, `united-states`, `ivory-coast` |
| Player | `{countryId}-{lastnameslug}` | `france-mbappe`, `england-bellingham`, `brazil-vinicius` |
| Club | club name, simplified | `real-madrid`, `manchester-city`, `inter-milan`, `al-hilal` |
| League | league name, simplified | `la-liga`, `premier-league`, `serie-a`, `ligue-1` |
| Fixture | sequential | `f-001` through `f-104` |
| Knockout | sequential | `ko-001` through `ko-032` |

**Player ID collisions:** If two players on the same team share a last name, use first initial: `brazil-silva-t`, `brazil-silva-d`.

---

## Country Schema

```json
{
  "id": "france",
  "name": "France",
  "code": "FRA",
  "confederation": "UEFA",
  "fifaRanking": 2,
  "groupId": "E",
  "manager": "Didier Deschamps",
  "teamStrength": {
    "attack": 95,
    "midfield": 88,
    "defence": 82,
    "goalkeeping": 90,
    "depth": 91
  }
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | yes | See ID conventions above |
| name | string | yes | Official FIFA name |
| code | string | yes | 3-letter FIFA code (uppercase) |
| confederation | string | yes | One of: UEFA, CONMEBOL, CONCACAF, CAF, AFC, OFC |
| fifaRanking | number | yes | Current FIFA world ranking |
| groupId | string | yes | One of: A B C D E F G H I J K L |
| manager | string | yes | Head coach full name |
| teamStrength | object | yes | All 5 components, 0–100 |

---

## Player Schema

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
  "photoUrl": "https://img.fifa.com/...",
  "bio": null,
  "recentForm": ["W","W","D","W","L"],
  "similarPlayerIds": ["spain-yamal","england-saka"],
  "isOfficialSquad": true,
  "isReserve": false
}
```

| Field | Type | Required | Valid values / Notes |
|-------|------|----------|---------------------|
| id | string | yes | `{countryId}-{lastnameslug}` |
| countryId | string | yes | Must exist in countries.json |
| name | string | yes | Full display name (include accents) |
| position | string | yes | GK / DEF / MID / FWD |
| shirtNumber | number | yes | 1–99 |
| age | number | yes | Age at tournament start |
| clubId | string | yes | Must exist in clubs.json |
| leagueId | string | yes | Must exist in leagues.json |
| caps | number | yes | International appearances |
| goals | number | yes | International goals |
| marketValue | number | yes | Transfermarkt value in EUR (raw integer) |
| photoUrl | string | null | Source URL for gather-photos.js only — never used at runtime |
| bio | string | null | null = generate on next run; existing text = never overwrite |
| recentForm | array | yes | Last 5 results: W / D / L, most recent last |
| similarPlayerIds | array | yes | 0–3 player IDs; empty array `[]` if none |
| isOfficialSquad | boolean | yes | true = in final 26-man squad |
| isReserve | boolean | yes | true = standby/reserve (not in official 26) |

**Position values:** `GK` `DEF` `MID` `FWD` — no others accepted.

---

## Club Schema

```json
{
  "id": "real-madrid",
  "name": "Real Madrid",
  "leagueId": "la-liga",
  "country": "Spain"
}
```

| Field | Type | Required |
|-------|------|----------|
| id | string | yes |
| name | string | yes |
| leagueId | string | yes |
| country | string | yes |

---

## League Schema

```json
{
  "id": "la-liga",
  "name": "La Liga",
  "country": "Spain",
  "tier": 1
}
```

---

## Fixture Schema

```json
{
  "id": "f-001",
  "groupId": "A",
  "matchday": 1,
  "homeTeamId": "mexico",
  "awayTeamId": "usa",
  "kickoff": "2026-06-11T20:00:00Z",
  "venue": "AT&T Stadium, Arlington",
  "broadcaster": "BBC",
  "status": "finished",
  "score": { "home": 1, "away": 2 }
}
```

| Field | Notes |
|-------|-------|
| status | scheduled / live / finished |
| score | null if not yet played |
| groupId | null for knockout fixtures |

---

## Group Standings Entry Schema

```json
{
  "countryId": "france",
  "groupId": "E",
  "played": 2,
  "won": 2,
  "drawn": 0,
  "lost": 0,
  "goalsFor": 5,
  "goalsAgainst": 1,
  "goalDifference": 4,
  "points": 6,
  "qualificationStatus": "qualified"
}
```

`qualificationStatus`: pending / qualified / eliminated

---

## Knockout Match Schema

```json
{
  "id": "ko-001",
  "round": "R32",
  "homeTeamId": "france",
  "awayTeamId": null,
  "homeTeamLabel": "1st Group E",
  "awayTeamLabel": "2nd Group F",
  "kickoff": "2026-07-01T20:00:00Z",
  "venue": "MetLife Stadium, New Jersey",
  "status": "scheduled",
  "score": null
}
```

`round` values: R32 / R16 / QF / SF / F / 3P

Penalty score format:
```json
"score": { "home": 1, "away": 1, "aet": true, "penalties": { "home": 4, "away": 2 } }
```

---

## Player Ranking Schema

```json
{
  "playerId": "france-mbappe",
  "transfermarkt": 95,
  "ea": 91,
  "awards": 88,
  "media": 99,
  "form": 85,
  "consensus": 92.8
}
```

All component scores 0–100. `null` = not yet entered (script re-normalises).

---

## JSON File Wrapper (all data files except search-index.json)

```json
{ "version": "1.0", "lastUpdated": "2026-06-19T00:00:00Z", "data": [] }
```

`search-index.json` is a bare array `[]`.
