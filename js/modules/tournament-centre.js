import { DataManager } from '../data.js';
import { formatKickoff, isToday, timezoneLabel } from '../time.js';
import { escapeHtml } from '../utils.js';
import { GroupCarousel } from './group-carousel.js';
import { KnockoutBracket } from './knockout-bracket.js';
import { deriveQualificationStatus } from '../tournament-state.js';

const POLL_INTERVAL_MS = 50_000;

export class TournamentCentre {
  #container;
  #params          = {};
  #activeTab       = 'groups';
  #tabEl           = null;
  #tabModule       = null;
  #countries       = [];
  #fixtures        = [];
  #knockoutMatches = [];
  #standings       = [];
  #groups          = [];
  #countryMap      = new Map();

  // DOM refs for in-place updates
  #snapshotEl      = null;
  #stripEl         = null;
  #railEl          = null;
  #pollIndicatorEl = null;

  // Polling
  #pollTimer       = null;
  #visibilityFn    = null;
  #polling         = false;
  #lastPollText    = '';

  constructor(container, params = {}) {
    this.#container = container;
    this.#params    = params;
  }

  async render() {
    const [fixtures, standings, countries, groups, knockoutRounds] = await Promise.all([
      DataManager.loadFixtures(),
      DataManager.loadStandings(),
      DataManager.loadCountries(),
      DataManager.loadGroups(),
      DataManager.loadKnockout(),
    ]);
    this.#fixtures        = fixtures;
    this.#standings       = standings;
    this.#countries       = countries;
    this.#groups          = groups;
    this.#knockoutMatches = knockoutRounds.flatMap(r => r.matches ?? []);
    this.#countryMap      = new Map(this.#countries.map(c => [c.id, c]));

    this.#container.innerHTML = `
      <div class="page-content tournament-centre">
        ${this.#renderSnapshot()}
        <div class="tc-layout">
          <div class="tc-main">
            <div class="tc-fixture-strip-wrap">${this.#renderFixtureStripInner()}</div>
            <div class="tc-tabs" role="tablist">
              <button class="tc-tab tc-tab--active" data-tab="groups"
                      role="tab" aria-selected="true" type="button">Group Stage</button>
              <button class="tc-tab" data-tab="knockout"
                      role="tab" aria-selected="false" type="button">Knockout Stage</button>
            </div>
            <div class="tc-tab-content"></div>
          </div>
          <aside class="tc-rail"><div class="tc-rail__inner">${this.#renderRailInner()}</div></aside>
        </div>
      </div>`;

    this.#tabEl          = this.#container.querySelector('.tc-tab-content');
    this.#snapshotEl     = this.#container.querySelector('.tc-snapshot');
    this.#stripEl        = this.#container.querySelector('.tc-fixture-strip-wrap');
    this.#railEl         = this.#container.querySelector('.tc-rail');
    this.#pollIndicatorEl = this.#container.querySelector('.tc-poll-indicator__text');

    const validTabs = ['groups', 'knockout'];
    const initialTab = validTabs.includes(this.#params.initialTab)
      ? this.#params.initialTab
      : 'groups';
    await this.#loadTab(initialTab);

    this.#container.querySelector('.tournament-centre').addEventListener('click', async e => {
      const btn = e.target.closest('[data-tab]');
      if (!btn || btn.dataset.tab === this.#activeTab) return;
      await this.#loadTab(btn.dataset.tab);
    });
  }

  // ─── Tab loading ──────────────────────────────────────────

  async #loadTab(tab) {
    this.#tabModule?.teardown?.();
    this.#tabModule = null;
    this.#tabEl.innerHTML = '';
    this.#activeTab = tab;

    this.#container.querySelectorAll('.tc-tab').forEach(btn => {
      const active = btn.dataset.tab === tab;
      btn.classList.toggle('tc-tab--active', active);
      btn.setAttribute('aria-selected', String(active));
    });

    if (tab === 'groups') {
      this.#tabModule = new GroupCarousel(
        this.#tabEl,
        this.#groups,
        this.#standings,
        this.#fixtures,
        this.#countryMap,
      );
      this.#tabModule.render();
      this.#tabModule.init();
      const groupId = this.#params.groupId;
      if (groupId) {
        this.#params.groupId = null;
        setTimeout(() => this.#tabModule?.scrollToGroup(groupId), 0);
      }
    } else if (tab === 'knockout') {
      this.#tabModule = new KnockoutBracket(this.#tabEl);
      await this.#tabModule.render();
      this.#tabModule.init();
    }
  }

  // ─── Snapshot ─────────────────────────────────────────────

  #renderSnapshot() {
    const playedGroup    = this.#fixtures.filter(f => f.status === 'FT').length;
    const playedKnockout = this.#knockoutMatches.filter(m => m.status === 'FT').length;
    const played         = playedGroup + playedKnockout;
    const total          = this.#fixtures.length + this.#knockoutMatches.length;
    const remaining      = total ? total - played : '—';

    const allTeams   = this.#standings.flatMap(g => g.teams);
    const effectiveQs = t => t.qualificationStatus ?? deriveQualificationStatus(t, this.#standings);
    const qualified  = allTeams.filter(t => effectiveQs(t) === 'qualified').length  || '—';
    const eliminated = allTeams.filter(t => effectiveQs(t) === 'eliminated').length || '—';

    const pollText = this.#lastPollText || 'Live';

    return `
      <section class="tc-snapshot">
        <h1 class="tc-title">World Cup 2026</h1>
        <p class="tc-subtitle">48 teams &middot; 12 groups &middot; 104 matches</p>
        <div class="tc-snapshot__stats">
          <div class="tc-stat">
            <span class="tc-stat__value">${qualified}</span>
            <span class="tc-stat__label">Qualified</span>
          </div>
          <div class="tc-stat">
            <span class="tc-stat__value">${eliminated}</span>
            <span class="tc-stat__label">Eliminated</span>
          </div>
          <div class="tc-stat">
            <span class="tc-stat__value">${played}</span>
            <span class="tc-stat__label">Played</span>
          </div>
          <div class="tc-stat">
            <span class="tc-stat__value">${remaining}</span>
            <span class="tc-stat__label">Remaining</span>
          </div>
        </div>
        <div class="tc-poll-indicator" aria-live="polite">
          <span class="tc-poll-indicator__dot" aria-hidden="true">&#9679;</span>
          <span class="tc-poll-indicator__text">${escapeHtml(pollText)}</span>
        </div>
      </section>`;
  }

  // ─── Mobile fixture strip ──────────────────────────────────

  #renderFixtureStripInner() {
    const allFixtures = this.#allFixturesWithKickoff();
    const todayAll    = allFixtures.filter(f => isToday(f.kickoff));
    const displayFixtures = todayAll.length > 0
      ? todayAll
      : [...allFixtures]
          .filter(f => f.status === 'scheduled')
          .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))
          .slice(0, 8);

    if (!displayFixtures.length) return '';
    const cards = displayFixtures.map(f => this.#stripCard(f)).join('');
    return `<div class="tc-fixture-strip">${cards}</div>`;
  }

  #stripCard(f) {
    const home     = this.#countryMap.get(f.homeTeamId);
    const away     = this.#countryMap.get(f.awayTeamId);
    const homeAbbr = escapeHtml((home?.name ?? f.homeLabel ?? f.homeTeamId ?? 'TBD').slice(0, 3).toUpperCase());
    const awayAbbr = escapeHtml((away?.name ?? f.awayLabel ?? f.awayTeamId ?? 'TBD').slice(0, 3).toUpperCase());
    const isLive   = f.status === 'live';
    const isFT     = f.status === 'FT';
    const hasScore = isFT || isLive;

    const middle = hasScore
      ? `<span class="tc-strip-card__score">${f.homeScore ?? 0}–${f.awayScore ?? 0}</span>`
      : `<span class="tc-strip-card__vs">v</span>`;

    const secondaryHtml = hasScore
      ? `<span class="tc-strip-card__badge${isLive ? ' tc-strip-card__badge--live' : ''}">${isLive ? 'LIVE' : 'FT'}</span>`
      : `<span class="tc-strip-card__time">${escapeHtml(formatKickoff(f.kickoff))}</span>`;

    const broadcasterHtml = this.#broadcasterHtml(f.broadcaster, 'tc-strip-card__broadcaster');

    return `
      <a href="#match/${escapeHtml(f.id)}" class="tc-strip-card${isLive ? ' tc-strip-card--live' : ''}">
        <div class="tc-strip-card__row">
          <span class="tc-strip-card__team">${homeAbbr}</span>
          ${middle}
          <span class="tc-strip-card__team">${awayAbbr}</span>
        </div>
        ${secondaryHtml}
        ${broadcasterHtml}
      </a>`;
  }

  // ─── Fixture rail (desktop) ────────────────────────────────

  #renderRailInner() {
    const allFixtures = this.#allFixturesWithKickoff();

    const live         = allFixtures.filter(f => f.status === 'live');
    const todayUpcoming = allFixtures.filter(f =>
      f.status === 'scheduled' && isToday(f.kickoff)
    );
    const recentFT = [...allFixtures]
      .filter(f => f.status === 'FT')
      .sort((a, b) => new Date(b.kickoff) - new Date(a.kickoff))
      .slice(0, 5);
    const nextScheduled = [...allFixtures]
      .filter(f => f.status === 'scheduled' && !isToday(f.kickoff))
      .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))
      .slice(0, 5);

    const sections = [
      live.length          ? this.#railSection('Live', live, true) : '',
      todayUpcoming.length ? this.#railSection('Today', todayUpcoming) : '',
      recentFT.length      ? this.#railSection('Recent', recentFT) : '',
      nextScheduled.length ? this.#railSection('Coming Up', nextScheduled) : '',
    ].join('');

    return sections || `<p class="tc-rail__empty">No fixtures available</p>`;
  }

  #railSection(label, fixtures, isLive = false) {
    const labelClass = isLive ? 'tc-rail__label tc-rail__label--live' : 'tc-rail__label';
    const cards = fixtures.map(f => this.#railCard(f)).join('');
    return `
      <div class="tc-rail__section">
        <p class="${labelClass}">${escapeHtml(label)}</p>
        ${cards}
      </div>`;
  }

  #railCard(f) {
    const home     = this.#countryMap.get(f.homeTeamId);
    const away     = this.#countryMap.get(f.awayTeamId);
    const homeName = escapeHtml(home?.name ?? f.homeLabel ?? f.homeTeamId ?? 'TBD');
    const awayName = escapeHtml(away?.name ?? f.awayLabel ?? f.awayTeamId ?? 'TBD');
    const isLive   = f.status === 'live';
    const isFT     = f.status === 'FT';
    const hasScore = isFT || isLive;

    const matchupLine = hasScore
      ? `${homeName} ${f.homeScore ?? 0}–${f.awayScore ?? 0} ${awayName}`
      : `${homeName} v ${awayName}`;

    const stagePart  = f.groupId ? `Group ${escapeHtml(f.groupId)}` : '';
    const statusPart = isFT ? 'FT' : isLive ? `${f.minute ?? 'LIVE'}'` : escapeHtml(formatKickoff(f.kickoff));
    const metaParts  = [stagePart, statusPart].filter(Boolean);

    const venueHtml       = (!hasScore && f.venue)
      ? `<p class="tc-rail-card__venue">${escapeHtml(f.venue)}</p>`
      : '';
    const broadcasterHtml = this.#broadcasterHtml(f.broadcaster, 'tc-rail-card__broadcaster');

    return `
      <a href="#match/${escapeHtml(f.id)}" class="tc-rail-card${isLive ? ' tc-rail-card--live' : ''}">
        <p class="tc-rail-card__matchup">${matchupLine}</p>
        ${metaParts.length ? `<p class="tc-rail-card__meta">${metaParts.join(' · ')}</p>` : ''}
        ${venueHtml}
        ${broadcasterHtml}
      </a>`;
  }

  #broadcasterHtml(broadcaster, cls) {
    if (!broadcaster) return '';
    const BROADCASTERS = {
      BBC: { href: 'https://www.bbc.co.uk/iplayer/live/bbcone', mod: 'bbc' },
      ITV: { href: 'https://www.itv.com/watch?channel=itv',     mod: 'itv' },
    };
    const b = BROADCASTERS[broadcaster];
    if (!b) return '';
    return `<a href="${b.href}" target="_blank" rel="noopener noreferrer"
               class="${escapeHtml(cls)} ${escapeHtml(cls)}--${b.mod}"
               onclick="event.stopPropagation()">${escapeHtml(broadcaster)}</a>`;
  }

  // ─── Shared helpers ────────────────────────────────────────

  #allFixturesWithKickoff() {
    return [
      ...this.#fixtures,
      ...this.#knockoutMatches.filter(m => m.kickoff),
    ];
  }

  init() {
    this.#startPolling();
  }

  teardown() {
    this.#stopPolling();
    this.#tabModule?.teardown?.();
    this.#tabModule = null;
  }

  // ─── Live polling ─────────────────────────────────────────

  #startPolling() {
    this.#visibilityFn = () => {
      if (document.hidden) {
        this.#stopPollTimer();
      } else {
        this.#poll();
        this.#schedulePoll();
      }
    };
    document.addEventListener('visibilitychange', this.#visibilityFn);
    this.#schedulePoll();
  }

  #stopPolling() {
    this.#stopPollTimer();
    if (this.#visibilityFn) {
      document.removeEventListener('visibilitychange', this.#visibilityFn);
      this.#visibilityFn = null;
    }
  }

  #schedulePoll() {
    this.#stopPollTimer();
    if (!document.hidden) {
      this.#pollTimer = setTimeout(() => {
        this.#poll();
        this.#schedulePoll();
      }, POLL_INTERVAL_MS);
    }
  }

  #stopPollTimer() {
    if (this.#pollTimer !== null) {
      clearTimeout(this.#pollTimer);
      this.#pollTimer = null;
    }
  }

  async #poll() {
    if (this.#polling) return;
    this.#polling = true;
    try {
      DataManager.invalidateLive();
      const [fixtures, standings, knockoutRounds] = await Promise.all([
        DataManager.loadFixtures(),
        DataManager.loadStandings(),
        DataManager.loadKnockout(),
      ]);
      this.#fixtures        = fixtures;
      this.#standings       = standings;
      this.#knockoutMatches = knockoutRounds.flatMap(r => r.matches ?? []);

      // Update snapshot stats in-place
      this.#lastPollText = 'Updated just now';
      if (this.#snapshotEl) {
        this.#snapshotEl.outerHTML = this.#renderSnapshot();
        this.#snapshotEl     = this.#container.querySelector('.tc-snapshot');
        this.#pollIndicatorEl = this.#container.querySelector('.tc-poll-indicator__text');
      }

      // Settle indicator to timestamp after 3 s
      setTimeout(() => {
        const tz   = timezoneLabel();
        const time = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Europe/London',
          hour: '2-digit', minute: '2-digit', hour12: false,
        }).format(new Date());
        this.#lastPollText = `Updated ${time} ${tz}`;
        if (this.#pollIndicatorEl) this.#pollIndicatorEl.textContent = this.#lastPollText;
      }, 3000);

      // Update fixture strip
      if (this.#stripEl) this.#stripEl.innerHTML = this.#renderFixtureStripInner();

      // Update rail
      if (this.#railEl) this.#railEl.querySelector('.tc-rail__inner').innerHTML = this.#renderRailInner();

      // Dispatch to active tab module
      if (this.#activeTab === 'groups') {
        this.#tabModule?.update?.(this.#standings, this.#fixtures);
      } else if (this.#activeTab === 'knockout') {
        this.#tabModule?.update?.();
      }
    } catch (err) {
      console.warn('TournamentCentre: poll failed', err);
    } finally {
      this.#polling = false;
    }
  }
}
