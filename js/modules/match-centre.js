import { DataManager } from '../data.js';
import { formatKickoff } from '../time.js';
import { escapeHtml } from '../utils.js';
import { Charts } from '../charts.js';
import { getMatchImplication, deriveRecentForm } from '../tournament-state.js';
import { broadcasterBadge } from '../broadcasters.js';

// ─── Pure head-to-head / Match Story builders ────────────────
//
// Extracted to module scope (rather than private class methods) so
// Sprint 37's regression test can lock in the Sprint 33 fix directly,
// without instantiating the class or mocking DataManager. No behavior
// change from the extraction itself — none of these three read `this`.

// `capped` distinguishes a genuine zero-history pair (common — many 2026
// fixtures are first-ever meetings) from a pair where the automated source
// told us history exists but couldn't return it (aggregates.numberOfMatches
// exceeded what was actually returned — see gather-head-to-head-stats.mjs).
// Silently showing nothing in the latter case would misrepresent a data gap
// as "these teams have never met."
export function buildOneH2HGrid(scope, capped, home, away, homeIsFixtureHome, meetingsLabel) {
  if (!scope) return '<p class="mc-h2h-empty">Not yet available.</p>';
  if (!scope.meetings) {
    return capped
      ? '<p class="mc-h2h-empty">Prior meetings exist but full detail isn’t available yet.</p>'
      : '<p class="mc-h2h-empty">No prior meetings on record.</p>';
  }
  const homeName = escapeHtml(home?.name ?? 'Home');
  const awayName = escapeHtml(away?.name ?? 'Away');
  // scope.homeWins/homeGoals etc. are stored relative to `stats.teams.home`
  // (the team that was fixture-home at acquisition time), not necessarily
  // whichever side is rendering as home right now — reorient if needed.
  const [homeWins, awayWins]   = homeIsFixtureHome ? [scope.homeWins, scope.awayWins]   : [scope.awayWins, scope.homeWins];
  const [homeGoals, awayGoals] = homeIsFixtureHome ? [scope.homeGoals, scope.awayGoals] : [scope.awayGoals, scope.homeGoals];

  const rows = [
    [meetingsLabel,        scope.meetings],
    [`${homeName} wins`,   homeWins ?? '—'],
    [`${awayName} wins`,   awayWins ?? '—'],
    ['Draws',              scope.draws ?? 0],
    ['Goals',              homeGoals != null ? `${homeGoals} – ${awayGoals}` : '—'],
    ['Last meeting',       scope.lastMeeting ?? '—'],
  ].map(([label, val]) => `
    <div class="mc-h2h-row">
      <span class="mc-h2h-label">${label}</span>
      <span class="mc-h2h-val">${typeof val === 'number' ? val : escapeHtml(String(val))}</span>
    </div>`).join('');

  return `<div class="mc-h2h-stats">${rows}</div>`;
}

// Renders both the World Cup-only and all-time head-to-head grids, when
// present. `stats` is the fixture's `headToHeadStats` object — see
// scripts/gather-head-to-head-stats.mjs for the schema (Sprint 36).
// `stats.teams.home`/`.away` record which side is home *for this fixture*,
// so historical W/D/L (stored per-team, not per-match-role) can be
// reoriented to "this fixture's home team" regardless of which side a team
// played on in any given historical meeting.
export function buildH2HStatsGrids(stats, home, away) {
  if (!stats) return '';
  const homeIsFixtureHome = stats.teams?.home === home?.id;
  const worldCupHtml = buildOneH2HGrid(stats.worldCup, stats.meta?.autoCapped?.worldCup, home, away, homeIsFixtureHome, 'World Cup meetings');
  const allTimeHtml  = buildOneH2HGrid(stats.allTime,  stats.meta?.autoCapped?.allTime,  home, away, homeIsFixtureHome, 'All-time meetings');

  return `
    <div class="mc-h2h-block">
      <h3 class="mc-h2h-block__title">World Cup</h3>
      ${worldCupHtml}
    </div>
    <div class="mc-h2h-block">
      <h3 class="mc-h2h-block__title">All-time (all competitions)</h3>
      ${allTimeHtml}
    </div>`;
}

export function buildHeadToHeadSection(fixtureId, matchPreviews, isFT = false, home = null, away = null) {
  const entry = matchPreviews?.data?.[fixtureId];
  if (!entry) return '';

  const stats    = entry.headToHeadStats ?? null;
  const story    = entry.matchStory ?? '';
  const h2hProse = entry.headToHead ?? '';

  // Stats grids (World Cup + all-time, side by side conceptually, stacked in markup)
  const statsHtml = stats ? buildH2HStatsGrids(stats, home, away) : '';

  if (isFT) {
    // Completed match: "Match Story" section.
    // Prefer the migrated matchStory field; fall back to the legacy headToHead
    // field so matches whose data hasn't been re-scraped yet still show content
    // instead of nothing (see gather-head-to-head.mjs's migration step).
    //
    // This fallback is a PERMANENT robustness layer, not a one-time migration
    // shim to delete later. gather-head-to-head.mjs only re-runs periodically
    // (per knockout round, not per match — see docs/ROADMAP.md Sprint 34), so
    // every newly-FT match sits with only `headToHead` populated until the next
    // maintenance pass. That lag recurs for the rest of the tournament, not just
    // during this one historical backfill. Keep this fallback even once the
    // current backlog is fully migrated.
    const primaryProse = story || h2hProse;
    if (!primaryProse && !statsHtml) return '';

    const proseHtml = primaryProse
      ? `<blockquote class="mc-hth">${escapeHtml(primaryProse)}</blockquote>` : '';
    // Only surface h2hProse a second time in the details block if it's genuinely
    // distinct extra content (i.e. story already took the primary blockquote slot).
    const extraProse = (story && h2hProse) ? h2hProse : '';
    const historyDetails = (statsHtml || extraProse)
      ? `<details class="mc-hth-details">
          <summary class="mc-hth-details__toggle">Head-to-Head History</summary>
          ${statsHtml}
          ${extraProse ? `<p class="mc-hth-prose">${escapeHtml(extraProse)}</p>` : ''}
        </details>`
      : '';
    return `
      <div class="mc-section">
        <h2 class="mc-section__title">Match Story</h2>
        ${proseHtml}
        ${historyDetails}
      </div>`;
  } else {
    // Upcoming match: "Head-to-Head" section (World Cup history prose + both stat grids)
    if (!statsHtml && !h2hProse) return '';
    const proseDetails = h2hProse
      ? `<details class="mc-hth-details">
          <summary class="mc-hth-details__toggle">History notes</summary>
          <p class="mc-hth-prose">${escapeHtml(h2hProse)}</p>
        </details>`
      : '';
    return `
      <div class="mc-section">
        <h2 class="mc-section__title">Head-to-Head</h2>
        ${statsHtml}
        ${proseDetails}
      </div>`;
  }
}

export class MatchCentre {
  #container;
  #params;
  #tabObserver   = null;
  #homeLineup    = null;
  #awayLineup    = null;

  constructor(container, params = {}) {
    this.#container = container;
    this.#params    = params;
  }

  async render() {
    const fixtureId = this.#params.fixtureId;
    if (!fixtureId) { this.#renderNotFound(); return; }

    const [fixtures, knockoutRounds, countries, standings, matchEvents, matchPreviews] = await Promise.all([
      DataManager.loadFixtures(),
      DataManager.loadKnockout(),
      DataManager.loadCountries(),
      DataManager.loadStandings(),
      DataManager.loadMatchEvents(),
      DataManager.loadMatchPreviews(),
    ]);

    let fixture    = fixtures.find(f => f.id === fixtureId) ?? null;
    let isKnockout = false;
    let roundLabel = null;

    if (!fixture) {
      for (const round of knockoutRounds) {
        const m = round.matches?.find(m => m.id === fixtureId);
        if (m) { fixture = m; roundLabel = round.label; isKnockout = true; break; }
      }
    }

    if (!fixture) { this.#renderNotFound(); return; }

    const countryMap     = new Map(countries.map(c => [c.id, c]));
    const home           = countryMap.get(fixture.homeTeamId) ?? null;
    const away           = countryMap.get(fixture.awayTeamId) ?? null;
    const groupStandings = (!isKnockout && fixture.groupId)
      ? (standings.find(g => g.groupId === fixture.groupId) ?? null)
      : null;

    const homeId = fixture.homeTeamId ?? null;
    const awayId = fixture.awayTeamId ?? null;

    const [homePlayers, awayPlayers, playerPhotos] = (homeId && awayId)
      ? await Promise.all([
          DataManager.loadPlayersForTeam(homeId),
          DataManager.loadPlayersForTeam(awayId),
          DataManager.loadPlayerPhotos(),
        ])
      : [[], [], {}];

    const homeCaptain = homePlayers.find(p => p.captain) ?? null;
    const awayCaptain = awayPlayers.find(p => p.captain) ?? null;

    const allFixtures = [
      ...fixtures,
      ...knockoutRounds.flatMap(r => r.matches ?? []),
    ];

    this.#container.innerHTML = this.#buildPage(
      fixture, home, away, isKnockout, roundLabel, groupStandings, countryMap,
      homeCaptain, awayCaptain, playerPhotos, allFixtures, standings, matchEvents, matchPreviews
    );

    if (home?.teamStrength) {
      const el = this.#container.querySelector('.mc-radar--home');
      if (el) Charts.renderRadar(el, home.teamStrength);
    }
    if (away?.teamStrength) {
      const el = this.#container.querySelector('.mc-radar--away');
      if (el) Charts.renderRadar(el, away.teamStrength);
    }

    const homeLineupEl = this.#container.querySelector('.mc-lineup-canvas--home');
    if (homeLineupEl && this.#homeLineup?.formation && this.#homeLineup?.starters?.length) {
      Charts.renderLineup(homeLineupEl, this.#homeLineup.formation, this.#homeLineup.starters);
    }
    const awayLineupEl = this.#container.querySelector('.mc-lineup-canvas--away');
    if (awayLineupEl && this.#awayLineup?.formation && this.#awayLineup?.starters?.length) {
      Charts.renderLineup(awayLineupEl, this.#awayLineup.formation, this.#awayLineup.starters);
    }
  }

  // ─── Page template ────────────────────────────────────────

  #buildPage(fixture, home, away, isKnockout, roundLabel, groupStandings, countryMap,
             homeCaptain, awayCaptain, playerPhotos, allFixtures = [], allStandings = [],
             matchEvents = null, matchPreviews = null) {
    const isLive   = fixture.status === 'live';
    const isFT     = fixture.status === 'FT';
    const hasScore = isLive || isFT;
    const isUpcoming = !isFT && !isLive;

    const homeName = escapeHtml(home?.name ?? fixture.homeLabel ?? 'TBD');
    const awayName = escapeHtml(away?.name ?? fixture.awayLabel ?? 'TBD');
    const homeId   = fixture.homeTeamId;
    const awayId   = fixture.awayTeamId;

    const homeNameEl = homeId
      ? `<a href="#${escapeHtml(homeId)}" class="mc-team__name mc-team__name--link">${homeName}</a>`
      : `<span class="mc-team__name">${homeName}</span>`;
    const awayNameEl = awayId
      ? `<a href="#${escapeHtml(awayId)}" class="mc-team__name mc-team__name--link">${awayName}</a>`
      : `<span class="mc-team__name">${awayName}</span>`;

    const stageLabel = isKnockout
      ? escapeHtml(roundLabel ?? 'Knockout Stage')
      : `Group ${escapeHtml(fixture.groupId ?? '')}${fixture.round ? ` · Matchday ${fixture.round}` : ''}`;

    const centreHtml = isFT
      ? `<p class="mc-score">${fixture.homeScore ?? 0}–${fixture.awayScore ?? 0}</p>
         <span class="badge badge--ft">FT</span>`
      : isLive
        ? `<p class="mc-score">${fixture.homeScore ?? 0}–${fixture.awayScore ?? 0}</p>
           <span class="badge badge--live">&#128308; LIVE</span>`
        : `<p class="mc-time">${escapeHtml(formatKickoff(fixture.kickoff))}</p>`;

    const homeFlag = homeId
      ? `<img src="assets/flags/${escapeHtml(homeId)}.svg" alt="${homeName}" class="mc-team__flag"
              onerror="this.style.display='none'">`
      : `<span class="mc-team__flag-placeholder"></span>`;
    const awayFlag = awayId
      ? `<img src="assets/flags/${escapeHtml(awayId)}.svg" alt="${awayName}" class="mc-team__flag"
              onerror="this.style.display='none'">`
      : `<span class="mc-team__flag-placeholder"></span>`;

    const venuePart       = fixture.venue ? `<span class="mc-venue">${escapeHtml(fixture.venue)}</span>` : '';
    const broadcasterPart = broadcasterBadge(fixture.broadcaster, fixture.status);
    const metaHtml        = (venuePart || broadcasterPart)
      ? `<div class="mc-meta">${venuePart}${broadcasterPart}</div>`
      : '';

    const showEnrichment = !!(homeId && awayId);

    // Determine whether this match is in the yellow card accumulation phase
    // (Group stage + R32 + R16). Cards reset before QF.
    const inAccumulationPhase = !!(
      fixture.groupId ||
      roundLabel === 'Round of 32' ||
      roundLabel === 'Round of 16'
    );

    // ── Completed match sections ──────────────────────────────
    const eventsHtml = (isFT || isLive)
      ? this.#buildEventsSection(fixture.id, matchEvents, home, away) : '';
    const motmHtml   = isFT
      ? this.#buildMotmSection(fixture.id, matchEvents, countryMap) : '';

    // ── Head-to-head (all matches) ────────────────────────────
    const hthHtml = showEnrichment
      ? buildHeadToHeadSection(fixture.id, matchPreviews, isFT, home, away) : '';

    // ── Upcoming match sections ───────────────────────────────
    const prevLineupHtml = (isUpcoming && showEnrichment)
      ? this.#buildPreviousLineupSection(homeId, awayId, home, away, fixture, allFixtures, matchEvents) : '';
    const suspensionHtml = (isUpcoming && showEnrichment && inAccumulationPhase)
      ? this.#buildSuspensionSection(homeId, awayId, home, away, allFixtures, matchEvents) : '';

    // ── Shared enrichment sections ────────────────────────────
    const formHtml    = showEnrichment ? this.#buildFormRow(home, away, allFixtures, countryMap) : '';
    const stakeHtml   = (showEnrichment && groupStandings && !isFT)
      ? this.#buildStakeRow(home, away, groupStandings, allStandings) : '';
    const radarHtml   = showEnrichment ? this.#buildRadarSection(home, away) : '';
    const managerHtml = showEnrichment ? this.#buildManagerRow(home, away) : '';
    const captainHtml = (showEnrichment && (homeCaptain || awayCaptain))
      ? this.#buildCaptainRow(homeCaptain, awayCaptain, home, away, playerPhotos) : '';
    const standingsHtml = groupStandings
      ? this.#buildStandings(groupStandings, homeId, awayId, countryMap)
      : '';

    // ── Tab groups depend on match state ─────────────────────
    const isPostMatch = isFT || isLive;

    const tabStrip = showEnrichment ? (isPostMatch
      ? `<nav class="mc-tab-strip" aria-label="Match sections">
          <a class="mc-tab mc-tab--active" href="#mc-group-match">Match</a>
          <a class="mc-tab" href="#mc-group-context">Context</a>
          <a class="mc-tab" href="#mc-group-teams">Teams</a>
        </nav>`
      : `<nav class="mc-tab-strip" aria-label="Match sections">
          <a class="mc-tab mc-tab--active" href="#mc-group-preview">Preview</a>
          ${(prevLineupHtml || suspensionHtml) ? '<a class="mc-tab" href="#mc-group-lineups">Lineups</a>' : ''}
          <a class="mc-tab" href="#mc-group-teams">Teams</a>
        </nav>`)
      : '';

    const groupsHtml = showEnrichment ? (isPostMatch
      ? `<section id="mc-group-match" class="mc-tab-group">
          ${eventsHtml}${motmHtml}${hthHtml}
        </section>
        <section id="mc-group-context" class="mc-tab-group">
          ${formHtml}${stakeHtml}${standingsHtml}
        </section>
        <section id="mc-group-teams" class="mc-tab-group">
          ${managerHtml}${captainHtml}${radarHtml}
        </section>`
      : `<section id="mc-group-preview" class="mc-tab-group">
          ${hthHtml}${formHtml}${stakeHtml}${standingsHtml}
        </section>
        ${(prevLineupHtml || suspensionHtml)
          ? `<section id="mc-group-lineups" class="mc-tab-group">
              ${prevLineupHtml}${suspensionHtml}
            </section>`
          : ''}
        <section id="mc-group-teams" class="mc-tab-group">
          ${managerHtml}${captainHtml}${radarHtml}
        </section>`)
      : `${eventsHtml}${motmHtml}${hthHtml}${prevLineupHtml}${suspensionHtml}${formHtml}${stakeHtml}${standingsHtml}${managerHtml}${captainHtml}${radarHtml}`;

    return `
      <div class="page-content mc-page">
        <a href="#tournament" class="mc-back">&#8592; Tournament</a>
        <div class="mc-header">
          <p class="mc-stage">${stageLabel}</p>
          <div class="mc-teams">
            <div class="mc-team">
              ${homeFlag}
              ${homeNameEl}
            </div>
            <div class="mc-centre">${centreHtml}</div>
            <div class="mc-team">
              ${awayFlag}
              ${awayNameEl}
            </div>
          </div>
        </div>
        ${metaHtml}
        ${tabStrip}
        ${groupsHtml}
      </div>`;
  }

  // ─── Events timeline ──────────────────────────────────────
  // Unified chronological timeline: goals, yellow/red cards, substitutions.

  #buildEventsSection(fixtureId, matchEvents, home, away) {
    const entry = matchEvents?.data?.[fixtureId];
    if (!entry) return '';

    const events = entry.events ?? [];
    if (events.length === 0) {
      // Show empty state only for FT matches with no events — not for live
      return '';
    }

    const sortMin = m => {
      const p = String(m).split('+');
      return parseInt(p[0], 10) * 100 + parseInt(p[1] || 0, 10);
    };
    const sorted = [...events].sort((a, b) => sortMin(a.minute) - sortMin(b.minute));

    const rowsHtml = sorted.map(e => this.#buildEventRow(e, home, away)).join('');

    return `
      <div class="mc-section">
        <h2 class="mc-section__title">Match Events</h2>
        <div class="mc-events">${rowsHtml}</div>
      </div>`;
  }

  #buildEventRow(event, home, away) {
    const isHome = event.teamId === home?.id;
    const minute = escapeHtml(String(event.minute ?? ''));

    let cell = '';
    switch (event.type) {
      case 'goal': {
        const scorer = escapeHtml(event.scorer ?? '');
        const assist = event.assistBy
          ? ` <span class="mc-event__assist">(${escapeHtml(event.assistBy)})</span>` : '';
        cell = `&#9917; <span class="mc-event__name">${scorer}</span>${assist}`;
        break;
      }
      case 'yellow_card': {
        const player = escapeHtml(event.player ?? '');
        cell = `<span class="mc-event__yc" aria-label="Yellow card"></span><span class="mc-event__name">${player}</span>`;
        break;
      }
      case 'red_card': {
        const player = escapeHtml(event.player ?? '');
        cell = `<span class="mc-event__rc" aria-label="Red card"></span><span class="mc-event__name">${player}</span>`;
        break;
      }
      case 'substitution': {
        const on  = escapeHtml(event.onPlayer ?? '');
        const off = escapeHtml(event.offPlayer ?? '');
        cell = `<span class="mc-event__sub-on">&#8593;</span><span class="mc-event__name">${on}</span>`
             + (off ? ` <span class="mc-event__sub-off">&#8595;${escapeHtml(off)}</span>` : '');
        break;
      }
      default:
        return '';
    }

    return `
      <div class="mc-event-row mc-event-row--${event.type.replace('_', '-')}">
        <div class="mc-event-row__home">${isHome ? cell : ''}</div>
        <div class="mc-event-row__min">${minute}'</div>
        <div class="mc-event-row__away">${isHome ? '' : cell}</div>
      </div>`;
  }

  #buildMotmSection(fixtureId, matchEvents, countryMap) {
    const entry = matchEvents?.data?.[fixtureId];
    if (!entry?.motm) return '';

    return `
      <div class="mc-section">
        <h2 class="mc-section__title">Man of the Match</h2>
        <p class="mc-motm">${escapeHtml(entry.motm)}</p>
      </div>`;
  }

  // ─── Previous starting XI ─────────────────────────────────

  #buildPreviousLineupSection(homeId, awayId, home, away, fixture, allFixtures, matchEvents) {
    const homeLineup = this.#findPreviousLineup(homeId, fixture, allFixtures, matchEvents);
    const awayLineup = this.#findPreviousLineup(awayId, fixture, allFixtures, matchEvents);
    this.#homeLineup = homeLineup;
    this.#awayLineup = awayLineup;

    if (!homeLineup && !awayLineup) return '';

    return `
      <div class="mc-section">
        <h2 class="mc-section__title">Previous Starting XI</h2>
        <div class="mc-lineups">
          <div class="mc-lineup-panel">
            <div class="mc-lineup__header">
              <span class="mc-lineup__team">${escapeHtml(home?.name ?? homeId)}</span>
              ${homeLineup?.formation ? `<span class="mc-lineup__formation">${escapeHtml(homeLineup.formation)}</span>` : ''}
            </div>
            <div class="mc-lineup-canvas mc-lineup-canvas--home"></div>
            <div aria-hidden="true">${this.#buildLineupColumn(homeLineup, home?.name ?? homeId, true)}</div>
          </div>
          <div class="mc-lineup-panel">
            <div class="mc-lineup__header">
              <span class="mc-lineup__team">${escapeHtml(away?.name ?? awayId)}</span>
              ${awayLineup?.formation ? `<span class="mc-lineup__formation">${escapeHtml(awayLineup.formation)}</span>` : ''}
            </div>
            <div class="mc-lineup-canvas mc-lineup-canvas--away"></div>
            <div aria-hidden="true">${this.#buildLineupColumn(awayLineup, away?.name ?? awayId, false)}</div>
          </div>
        </div>
      </div>`;
  }

  #findPreviousLineup(teamId, currentFixture, allFixtures, matchEvents) {
    const teamFixtures = allFixtures
      .filter(f =>
        f.id !== currentFixture.id &&
        f.status === 'FT' &&
        (f.homeTeamId === teamId || f.awayTeamId === teamId)
      )
      .sort((a, b) => new Date(b.kickoff) - new Date(a.kickoff));

    for (const f of teamFixtures) {
      const entry   = matchEvents?.data?.[f.id];
      if (!entry) continue;
      const isHome  = f.homeTeamId === teamId;
      const starters = isHome ? entry.homeStarting : entry.awayStarting;
      const formation = isHome ? entry.homeFormation : entry.awayFormation;
      const subs      = isHome ? (entry.homeSubs ?? []) : (entry.awaySubs ?? []);
      if (starters?.length > 0) {
        return { formation, starters, subs, fromFixtureId: f.id };
      }
    }
    return null;
  }

  #buildLineupColumn(lineup, teamName, isHome) {
    if (!lineup) {
      return `<div class="mc-lineup mc-lineup--empty"><p class="mc-lineup__none">No data</p></div>`;
    }

    const { formation, starters } = lineup;

    const tierOrder = ['gk', 'def', 'mid', 'fwd'];
    const tierLabel = { gk: 'GK', def: 'DEF', mid: 'MID', fwd: 'FWD' };
    const POS_TIER = {
      GK: 'gk',
      CB: 'def', CD: 'def', SW: 'def', LB: 'def', RB: 'def', LWB: 'def', RWB: 'def', WB: 'def',
      DM: 'mid', CDM: 'mid', CM: 'mid', MF: 'mid', LM: 'mid', RM: 'mid', AM: 'mid', CAM: 'mid', OM: 'mid',
      CF: 'fwd', ST: 'fwd', SS: 'fwd', FW: 'fwd', LW: 'fwd', RW: 'fwd', LF: 'fwd', RF: 'fwd', WF: 'fwd',
    };

    const byTier = { gk: [], def: [], mid: [], fwd: [] };
    for (const p of (starters ?? [])) {
      const tier = POS_TIER[p.pos] ?? 'mid';
      byTier[tier].push(p);
    }

    const groupsHtml = tierOrder
      .filter(t => byTier[t].length > 0)
      .map(t => {
        const players = byTier[t].map(p =>
          `<span class="mc-lineup__player">${escapeHtml(p.name)}<span class="mc-lineup__shirt">${p.shirt}</span></span>`
        ).join('');
        return `<div class="mc-lineup__group">
          <span class="mc-lineup__tier">${tierLabel[t]}</span>
          <div class="mc-lineup__players">${players}</div>
        </div>`;
      }).join('');

    return `
      <div class="mc-lineup${isHome ? ' mc-lineup--home' : ''}">
        <div class="mc-lineup__header">
          <span class="mc-lineup__team">${escapeHtml(teamName)}</span>
          ${formation ? `<span class="mc-lineup__formation">${escapeHtml(formation)}</span>` : ''}
        </div>
        ${groupsHtml}
      </div>`;
  }

  // ─── Suspension / yellow card tracker ────────────────────

  #buildSuspensionSection(homeId, awayId, home, away, allFixtures, matchEvents) {
    const homeCards = this.#aggregateYellowCards(homeId, allFixtures, matchEvents);
    const awayCards = this.#aggregateYellowCards(awayId, allFixtures, matchEvents);

    const homeAtRisk    = [...homeCards.entries()].filter(([, n]) => n === 1);
    const homeSuspended = [...homeCards.entries()].filter(([, n]) => n >= 2);
    const awayAtRisk    = [...awayCards.entries()].filter(([, n]) => n === 1);
    const awaySuspended = [...awayCards.entries()].filter(([, n]) => n >= 2);

    if (!homeAtRisk.length && !homeSuspended.length && !awayAtRisk.length && !awaySuspended.length) {
      return '';
    }

    const colHtml = (players, suspended, teamName) => {
      const items = [
        ...suspended.map(([n]) => `<li class="mc-susp__item mc-susp__item--suspended"><span class="mc-susp__icon mc-susp__icon--suspended" aria-label="Suspended"></span> ${escapeHtml(n)}</li>`),
        ...players.map(([n])   => `<li class="mc-susp__item mc-susp__item--risk"><span class="mc-susp__icon mc-susp__icon--risk" aria-label="Yellow card"></span> ${escapeHtml(n)}</li>`),
      ];
      if (!items.length) return `<div class="mc-susp__col"><span class="mc-susp__team">${escapeHtml(teamName)}</span><p class="mc-susp__none">None</p></div>`;
      return `
        <div class="mc-susp__col">
          <span class="mc-susp__team">${escapeHtml(teamName)}</span>
          <ul class="mc-susp__list">${items.join('')}</ul>
        </div>`;
    };

    return `
      <div class="mc-section">
        <h2 class="mc-section__title">Card Risk</h2>
        <p class="mc-susp__note">2 yellow cards = 1-match ban (resets before QF)</p>
        <div class="mc-susp">
          ${colHtml(homeAtRisk, homeSuspended, home?.name ?? homeId)}
          ${colHtml(awayAtRisk, awaySuspended, away?.name ?? awayId)}
        </div>
      </div>`;
  }

  #aggregateYellowCards(teamId, allFixtures, matchEvents) {
    const counts = new Map();
    for (const f of allFixtures) {
      if (f.homeTeamId !== teamId && f.awayTeamId !== teamId) continue;
      if (f.status !== 'FT') continue;
      const entry = matchEvents?.data?.[f.id];
      if (!entry) continue;
      for (const ev of entry.events ?? []) {
        if (ev.type !== 'yellow_card' || ev.teamId !== teamId) continue;
        if (!ev.player) continue;
        counts.set(ev.player, (counts.get(ev.player) ?? 0) + 1);
      }
    }
    return counts;
  }

  // ─── Form strips ──────────────────────────────────────────

  #buildFormRow(home, away, allFixtures = [], countryMap = null) {
    const homeForm = deriveRecentForm(home?.id, allFixtures);
    const awayForm = deriveRecentForm(away?.id, allFixtures);
    if (!homeForm.length && !awayForm.length) return '';

    return `
      <div class="mc-section">
        <h2 class="mc-section__title">Recent Form</h2>
        <div class="mc-form-row">
          <div class="mc-form mc-form--home">${this.#formDots(homeForm, countryMap)}</div>
          <div class="mc-form mc-form--away">${this.#formDots(awayForm, countryMap)}</div>
        </div>
      </div>`;
  }

  #formDots(form, countryMap = null) {
    if (!form?.length) return `<span class="mc-form__none">—</span>`;
    return form.map(item => {
      const cls      = item.result === 'W' ? 'mc-form__dot--w'
                     : item.result === 'D' ? 'mc-form__dot--d'
                     : 'mc-form__dot--l';
      const opponent = countryMap?.get(item.opponentId)?.name ?? item.opponentId ?? '?';
      const score    = `${item.scored}–${item.conceded}`;
      const date     = item.kickoff ? this.#shortDate(item.kickoff) : '';
      const tooltip  = `vs ${opponent} · ${score}${date ? ' · ' + date : ''}`;
      return `<span class="mc-form__dot ${cls}" data-tooltip="${escapeHtml(tooltip)}">${escapeHtml(item.result)}</span>`;
    }).join('');
  }

  #shortDate(kickoff) {
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const parts  = kickoff.slice(0, 10).split('-');
    if (parts.length < 3) return '';
    return `${parseInt(parts[2], 10)} ${MONTHS[parseInt(parts[1], 10) - 1]}`;
  }

  // ─── What's at stake ──────────────────────────────────────

  #buildStakeRow(home, away, groupStandings, allStandings = []) {
    const homeImpl = getMatchImplication(home, groupStandings, allStandings);
    const awayImpl = getMatchImplication(away, groupStandings, allStandings);
    if (!homeImpl && !awayImpl) return '';

    const homeEntry = groupStandings.teams.find(t => t.teamId === home?.id) ?? null;
    const awayEntry = groupStandings.teams.find(t => t.teamId === away?.id) ?? null;

    return `
      <div class="mc-section">
        <h2 class="mc-section__title">What's at stake</h2>
        <div class="mc-stake-row">
          <div class="mc-stake mc-stake--home">
            ${this.#stakeCard(homeImpl, homeEntry, awayEntry, groupStandings)}
          </div>
          <div class="mc-stake mc-stake--away">
            ${this.#stakeCard(awayImpl, awayEntry, homeEntry, groupStandings)}
          </div>
        </div>
      </div>`;
  }

  #stakeCard(impl, entry, opponentEntry, groupStandings) {
    if (!impl) return '';

    const chip = `<span class="mc-stake__chip mc-stake__chip--${impl.status}">${escapeHtml(impl.text)}</span>`;
    if (!entry) return chip;

    const ORDINALS = ['', '1st', '2nd', '3rd', '4th'];
    const pos    = ORDINALS[entry.position] ?? `${entry.position}th`;
    const gdSign = entry.goalDifference >= 0 ? '+' : '';
    const posLine = `${pos} · ${entry.points} pt${entry.points !== 1 ? 's' : ''} · GD ${gdSign}${entry.goalDifference}`;

    return `
      <div class="mc-stake__card">
        ${chip}
        <p class="mc-stake__pos">${escapeHtml(posLine)}</p>
        ${this.#buildScenarios(entry, opponentEntry, groupStandings)}
      </div>`;
  }

  #buildScenarios(entry, opponentEntry, groupStandings) {
    if (entry.qualificationStatus === 'qualified' || entry.qualificationStatus === 'eliminated') return '';

    const winPts  = entry.points + 3;
    const drawPts = entry.points + 1;
    const lossPts = entry.points;

    const isFinal = entry.played >= 2;
    const others  = isFinal
      ? groupStandings.teams.filter(t => t.teamId !== entry.teamId && t.teamId !== opponentEntry?.teamId)
      : [];

    const row = (result, pts, cls) => {
      const note = isFinal ? this.#qualNote(pts, others) : '';
      return `
        <p class="mc-stake__scenario mc-stake__scenario--${cls}">
          <span class="mc-stake__result">${result}</span>
          ${pts} pts${note ? ` — ${escapeHtml(note)}` : ''}
        </p>`;
    };

    return `
      <div class="mc-stake__scenarios">
        ${row('W', winPts,  'win')}
        ${row('D', drawPts, 'draw')}
        ${row('L', lossPts, 'loss')}
      </div>`;
  }

  #qualNote(pts, others) {
    if (!others.length) return '';
    const maxOther = Math.max(...others.map(t => t.points + 3));
    if (pts > maxOther) return 'guaranteed qualification';
    if (pts >= 6)       return 'likely qualifies';
    if (pts >= 4)       return 'in contention';
    if (pts <= 1)       return 'likely eliminated';
    return '';
  }

  // ─── Team strength radars ─────────────────────────────────

  #buildRadarSection(home, away) {
    if (!home?.teamStrength && !away?.teamStrength) return '';

    return `
      <div class="mc-section">
        <h2 class="mc-section__title">Team Strength</h2>
        <div class="mc-radars">
          <div class="mc-radar-wrap">
            ${home?.teamStrength
              ? `<div class="mc-radar mc-radar--home"></div>`
              : `<div class="mc-radar mc-radar--empty"></div>`}
            <p class="mc-radar__label">${escapeHtml(home?.name ?? '')}</p>
          </div>
          <div class="mc-radar-wrap">
            ${away?.teamStrength
              ? `<div class="mc-radar mc-radar--away"></div>`
              : `<div class="mc-radar mc-radar--empty"></div>`}
            <p class="mc-radar__label">${escapeHtml(away?.name ?? '')}</p>
          </div>
        </div>
      </div>`;
  }

  // ─── Manager comparison ───────────────────────────────────

  #buildManagerRow(home, away) {
    if (!home?.manager && !away?.manager) return '';

    return `
      <div class="mc-section">
        <h2 class="mc-section__title">Managers</h2>
        <div class="mc-manager-row">
          ${this.#managerCard(home, true)}
          ${this.#managerCard(away, false)}
        </div>
      </div>`;
  }

  #managerCard(country, isHome = false) {
    if (!country?.manager) {
      return `<div class="mc-manager mc-manager--empty"><span class="mc-manager__name">—</span></div>`;
    }
    const metaParts = [country.managerNationality, country.managerTenure].filter(Boolean);
    return `
      <div class="mc-manager${isHome ? ' mc-manager--home' : ''}">
        <a href="#manager/${escapeHtml(country.id)}" class="mc-manager__name mc-manager__name--link">${escapeHtml(country.manager)}</a>
        ${metaParts.length
          ? `<span class="mc-manager__meta">${escapeHtml(metaParts.join(' · '))}</span>`
          : ''}
      </div>`;
  }

  // ─── Captain cards ────────────────────────────────────────

  #buildCaptainRow(homeCaptain, awayCaptain, home, away, playerPhotos) {
    return `
      <div class="mc-section">
        <h2 class="mc-section__title">Captains</h2>
        <div class="mc-captains">
          ${this.#captainCard(homeCaptain, playerPhotos)}
          ${this.#captainCard(awayCaptain, playerPhotos)}
        </div>
      </div>`;
  }

  #captainCard(captain, playerPhotos) {
    if (!captain) return `<div class="mc-captain mc-captain--empty"></div>`;

    const photoUrl  = playerPhotos[captain.id];
    const photoHtml = photoUrl
      ? `<img src="${escapeHtml(photoUrl)}" alt="" class="mc-captain__photo"
               onerror="this.style.display='none'">`
      : `<span class="mc-captain__photo-placeholder"></span>`;

    const captionText = captain.description || captain.bio || '';
    const bioHtml = captionText
      ? `<p class="mc-captain__bio">${escapeHtml(captionText)}</p>`
      : '';

    return `
      <div class="mc-captain">
        ${photoHtml}
        <div class="mc-captain__info">
          <a href="#${escapeHtml(captain.id)}" class="mc-captain__name">${escapeHtml(captain.name)}</a>
          ${captain.position
            ? `<span class="mc-captain__pos">${escapeHtml(captain.position)}</span>`
            : ''}
          <span class="mc-captain__badge">C</span>
          ${bioHtml}
        </div>
      </div>`;
  }

  // ─── Standings snapshot ───────────────────────────────────

  #buildStandings(groupStandings, homeTeamId, awayTeamId, countryMap) {
    const rows = groupStandings.teams.map(t => {
      const country = countryMap.get(t.teamId);
      const name    = escapeHtml(country?.name ?? t.teamId);
      const isMatch = t.teamId === homeTeamId || t.teamId === awayTeamId;
      const gdStr   = t.goalDifference >= 0 ? `+${t.goalDifference}` : String(t.goalDifference);
      return `
        <tr class="${isMatch ? 'mc-standings__row--highlight' : ''}">
          <td class="mc-standings__pos">${t.position}</td>
          <td class="mc-standings__team">${name}</td>
          <td>${t.played}</td>
          <td>${t.won}</td>
          <td>${t.drawn}</td>
          <td>${t.lost}</td>
          <td>${gdStr}</td>
          <td class="mc-standings__pts">${t.points}</td>
        </tr>`;
    }).join('');

    return `
      <section class="mc-standings">
        <h2 class="mc-standings__title">Group ${escapeHtml(groupStandings.groupId)}</h2>
        <table class="mc-standings-table">
          <thead>
            <tr>
              <th></th>
              <th class="mc-standings__team-th"></th>
              <th title="Played">P</th>
              <th title="Won">W</th>
              <th title="Drawn">D</th>
              <th title="Lost">L</th>
              <th title="Goal Difference">GD</th>
              <th title="Points">Pts</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`;
  }

  #renderNotFound() {
    this.#container.innerHTML = `
      <div class="page-content">
        <div class="empty-state">
          <p class="empty-state__title">Match not found</p>
          <p class="empty-state__message">This match could not be found.</p>
          <a href="#tournament" class="btn-link">&#8592; Tournament Centre</a>
        </div>
      </div>`;
  }

  init() {
    const groups = this.#container.querySelectorAll('.mc-tab-group');
    const tabs   = this.#container.querySelectorAll('.mc-tab');
    if (!groups.length || !tabs.length) return;

    const tabMap = new Map();
    tabs.forEach(t => tabMap.set(t.getAttribute('href')?.slice(1), t));

    this.#tabObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          tabs.forEach(t => t.classList.remove('mc-tab--active'));
          tabMap.get(entry.target.id)?.classList.add('mc-tab--active');
        }
      }
    }, { threshold: 0.3 });

    groups.forEach(g => this.#tabObserver.observe(g));
  }

  teardown() {
    this.#tabObserver?.disconnect();
    this.#tabObserver = null;
  }
}
