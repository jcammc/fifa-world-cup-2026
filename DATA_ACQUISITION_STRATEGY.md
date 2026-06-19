# DATA_ACQUISITION_STRATEGY.md

Version: 1.0
Status: Planning Document — Phase 6 (Final)
Purpose: Defines how every piece of tournament data is obtained, maintained,
         and updated before and during the FIFA World Cup 2026.

---

## SECTION 1 — DATA SOURCE INVENTORY

### Summary Table

| Dataset | Method | Pre-Deploy | During Tournament |
|---------|--------|-----------|------------------|
| Countries (48) | Manual | One-time | Emergency only |
| Groups (A–L) | Manual | One-time | Never |
| Official Squads | Wikipedia API (section fetch) | One-time | Squad changes only |
| Managers | Manual | One-time | Emergency only |
| Coaching Staff | Manual | One-time | Never |
| Player Photos | Script-assisted | One-time | New players only |
| Club Badges | Script-assisted | One-time | Never |
| League Logos | Manual | One-time | Never |
| Fixtures (104) | Manual + Script | Pre-tournament | After every match |
| Kickoff Times | Manual | Pre-tournament | Reschedules only |
| Broadcasters | Manual | Pre-tournament | Changes rarely |
| Standings | Script (automated) | N/A | After every group match |
| Knockout Bracket | Manual + Script | Structure only | After every KO match |
| Player Rankings | Manual | Phased (see §4) | Form: optional refresh |
| Clubs | Manual | After squads | Never |
| Leagues | Manual | After clubs | Never |
| Player Bios | Script (automated) | One-time | After squad changes |
| Similar Players | Script (offline) | One-time | Never |
| Team Strength | Manual/Script | Pre-tournament | Optional |
| Search Index | Script (automated) | Pre-deploy | After any data change |

---

## SECTION 1b — SQUAD DATA SOURCE (confirmed Sprint 2)

### Primary source: Wikipedia

URL: https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_squads

Wikipedia provides: shirt number, name, position (GK/DF/MF/FW), date of birth, caps,
goals, and current club for all 48 squads in a single page. This is the authoritative
source for squad composition and must be fetched before any other source.

### FIFA.com is NOT usable for automated collection

FIFA.com is JavaScript-rendered. Web fetchers (WebFetch, curl, etc.) receive an empty
page — no squad data is returned. Despite being the official source, it cannot be used
for any scripted data acquisition. Use Wikipedia instead.

### Wikipedia API — required technique

The full page is too large for a direct WebFetch call — content is always truncated
before reaching later groups (C, I, L etc.). Use the JSON API with section numbers:

Step 1 — Get section list:
  GET https://en.wikipedia.org/w/api.php?action=parse&page=2026_FIFA_World_Cup_squads&prop=sections&format=json

Step 2 — Fetch one squad:
  GET https://en.wikipedia.org/w/api.php?action=parse&page=2026_FIFA_World_Cup_squads&prop=wikitext&section={N}&format=json

Section numbers confirmed at Sprint 2: Brazil=12, France=42, England=58.
Re-fetch the sections list at the start of each new data session — indices can shift.

### Supplementary sources (for fields not on Wikipedia)

  Market values:    transfermarkt.com
  EA player ratings: ea.com/fc/ratings or FUTBIN
  Player bios:      Wikipedia individual player pages
  Photos (future):  Club press packs / Wikimedia Commons

---

## SECTION 2 — PHOTO STRATEGY

Runtime chain (production):
  assets/players/{player.id}.jpg  →  assets/placeholders/player-avatar.svg

photoUrl in player JSON = source metadata only. Used exclusively by scripts/gather-photos.js.
Never used at browser runtime. This eliminates URL rot risk during the 6-week tournament.

Photo specs: JPEG, 400px wide, 80% quality (~20–40KB each, ~50MB total for 1,250 players).

Workflow:
  node scripts/gather-photos.js
  Reads all player JSON, downloads files with photoUrl set to assets/players/.
  Idempotent — skips files that already exist.

---

## SECTION 3 — BADGE AND FLAG STRATEGY

All assets are local SVGs. No runtime external dependencies.

| Asset | Count | Source | Path |
|-------|-------|--------|------|
| Country flags | 48 | Wikimedia Commons SVG | assets/flags/{countryId}.svg |
| Club badges | ~400 | Club press packs / Wikimedia | assets/badges/{clubId}.svg |
| League logos | ~25 | Official league sites | assets/logos/{leagueId}.svg |

Club badge fallback: CSS initials badge (always works, no image required).
getInitials("Real Madrid") → "RM", displayed in a styled circle.

---

## SECTION 4 — RANKING DATA STRATEGY

Consensus formula:
  Consensus = (Transfermarkt × 0.40) + (EA × 0.20) + (Awards × 0.20) + (Media × 0.10) + (Form × 0.10)
  All components normalised to 0–100.

Phased approach:

  Phase 1 (launch): TM value + EA rating + Awards for top ~200 players (4-5 per team).
    Null components re-normalised by generate-rankings.js.
    Effective weights with 3 components: TM 50%, EA 25%, Awards 25%.

  Phase 2 (pre-tournament): Add Media + Form. Full 5-component consensus.

  Phase 3 (optional, mid-tournament): Refresh Form component with in-tournament stats.

Component sources:
  Transfermarkt: transfermarkt.com squad pages (manual lookup, already required for marketValue)
  EA Sports FC: ea.com/fc/ratings or FUTBIN (manual lookup, 0–99 scale → treat as 0–100)
  Awards: Wikipedia career sections + FIFA/UEFA records (manual, scoring rubric below)
  Media: Instagram follower count as proxy (manual lookup, ~60 minutes for all 1,250)
  Form: fbref.com international match logs, or WC qualification goals+assists as proxy

Awards scoring rubric:
  Ballon d'Or winner: 100 | Top 3: 85 | Top 10: 70
  FIFA Best Player: 95 | UEFA Player of Year: 90
  World Cup Golden Ball: 90 | TOTY (EA FC): 80
  World Cup winner: +15 | CL winner: +10 (per win, max +20)
  Domestic title: +5 (per title, max +15) | Cap at 100.

---

## SECTION 5 — TOURNAMENT UPDATE WORKFLOW

### Group Stage Match Update (time from whistle to live: ~3–5 minutes)

  1. Confirm final score (BBC Sport / FIFA.com)
  2. npm run update-standings -- --fixture f-001 --home 2 --away 1
     Script updates: fixture status, score, standings (P/W/D/L/GF/GA/GD/Pts), qualification status
  3. npm run validate
  4. git add data/fixtures.json data/standings.json
  5. git commit -m "FT: France 2-1 Iraq (Group I, MD2)"
  6. git push
  → Netlify auto-deploys in ~30 seconds

### Knockout Match Update

  1. npm run update-knockout -- --match ko-001 --winner france --home 2 --away 0 --aet false
     Script: updates result, advances team to next slot
  2. npm run validate && git add data/knockout.json && git commit -m "..." && git push

  Penalty shootout format:
  "score": { "home": 1, "away": 1, "aet": true, "penalties": { "home": 4, "away": 2 } }

### Squad Change Workflow (injury replacement)

  1. Edit data/players/{team}.json
     Departing: isOfficialSquad: false
     Arriving (promotion): isOfficialSquad: true, isReserve: false
     Arriving (new): full player record
  2. Download photo if new player (add photoUrl → npm run gather-photos)
  3. npm run generate-bios (idempotent — only fills null bios)
  4. npm run generate-rankings (if ranking data available)
  5. npm run build-search-index
  6. npm run validate && git add -A && git commit -m "Squad: ..." && git push

### Pre-Deployment Checklist

  npm run validate
  npm run generate-bios
  npm run generate-rankings
  npm run build-search-index
  git diff data/
  git add -A && git commit -m "..." && git push

---

## SECTION 6 — IMPLEMENTATION READINESS

All architectural decisions are resolved. No remaining blockers for Sprint 0.

Three accepted risks (resolved only by testing, not planning):
  1. IntersectionObserver threshold tuning on iOS Safari → test Auto-Focus in Sprint 3 on device
  2. CSS scroll-snap inertial scroll behaviour on iOS → test carousel in Sprint 4 on device
  3. Data population timeline → app is team-agnostic; works with 3–5 complete teams during dev

---

End of DATA_ACQUISITION_STRATEGY.md
