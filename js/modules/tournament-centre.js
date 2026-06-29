import { DataManager } from '../data.js';
import { formatKickoff, isToday, timezoneLabel } from '../time.js';
import { escapeHtml } from '../utils.js';
import { GroupCarousel } from './group-carousel.js';
import { KnockoutBracket } from './knockout-bracket.js';
import { deriveQualificationStatus } from '../tournament-state.js';
import { broadcasterBadge, broadcasterIcon } from '../broadcasters.js';

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

  // Stat detail panel
  #activeStatPanel = null; // 'qualified' | 'eliminated' | 'played' | 'remaining' | null

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
    this.#bindSnapshotClicks();

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
    const ap = this.#activeStatPanel;
    const statCls = p => `tc-stat tc-stat--clickable${ap === p ? ' tc-stat--active' : ''}`;

    return `
      <section class="tc-snapshot">
        <h1 class="tc-title">World Cup 2026</h1>
        <p class="tc-subtitle">48 teams &middot; 12 groups &middot; 104 matches</p>
        <div class="tc-snapshot__stats">
          <div class="${statCls('qualified')}" data-panel="qualified" role="button" tabindex="0" aria-expanded="${ap === 'qualified'}">
            <span class="tc-stat__value">${qualified}</span>
            <span class="tc-stat__label">Qualified</span>
          </div>
          <div class="${statCls('eliminated')}" data-panel="eliminated" role="button" tabindex="0" aria-expanded="${ap === 'eliminated'}">
            <span class="tc-stat__value">${eliminated}</span>
            <span class="tc-stat__label">Eliminated</span>
          </div>
          <div class="${statCls('played')}" data-panel="played" role="button" tabindex="0" aria-expanded="${ap === 'played'}">
            <span class="tc-stat__value">${played}</span>
            <span class="tc-stat__label">Played</span>
          </div>
          <div class="${statCls('remaining')}" data-panel="remaining" role="button" tabindex="0" aria-expanded="${ap === 'remaining'}">
            <span class="tc-stat__value">${remaining}</span>
            <span class="tc-stat__label">Remaining</span>
          </div>
        </div>
        ${ap ? this.#buildStatPanel(ap) : ''}
        <div class="tc-poll-indicator" aria-live="polite">
          <span class="tc-poll-indicator__dot" aria-hidden="true">&#9679;</span>
          <span class="tc-poll-indicator__text">${escapeHtml(pollText)}</span>
        </div>
      </section>`;
  }

  // ─── Snapshot click binding ───────────────────────────────

  #bindSnapshotClicks() {
    this.#snapshotEl?.querySelectorAll('.tc-stat--clickable').forEach(el => {
      const toggle = () => {
        const panel = el.dataset.panel;
        this.#activeStatPanel = (this.#activeStatPanel === panel) ? null : panel;
        this.#snapshotEl.outerHTML = this.#renderSnapshot();
        this.#snapshotEl      = this.#container.querySelector('.tc-snapshot');
        this.#pollIndicatorEl = this.#container.querySelector('.tc-poll-indicator__text');
        this.#bindSnapshotClicks();
      };
      el.addEventListener('click', toggle);
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });
  }

  // ─── Stat detail panel ────────────────────────────────────

  #buildStatPanel(type) {
    const allTeams  = this.#standings.flatMap(g => g.teams.map(t => ({ ...t, groupId: g.groupId })));
    const effectiveQs = t => t.qualificationStatus ?? deriveQualificationStatus(t, this.#standings);

    if (type === 'qualified') {
      const teams = allTeams
        .filter(t => effectiveQs(t) === 'qualified')
        .sort((a, b) => a.groupId.localeCompare(b.groupId) || a.position - b.position);

      const rows = teams.map(t => {
        const c    = this.#countryMap.get(t.teamId);
        const name = escapeHtml(c?.name ?? t.teamId);
        const id   = escapeHtml(t.teamId);
        return `
          <div class="tc-stat-panel__team">
            <img src="assets/flags/${id}.svg" alt="" width="16" height="11"
                 class="tc-stat-panel__flag" aria-hidden="true"
                 onerror="this.style.display='none'">
            <span class="tc-stat-panel__team-name">${name}</span>
            <span class="tc-stat-panel__group">Grp ${escapeHtml(t.groupId)}</span>
          </div>`;
      }).join('');

      return `
        <div class="tc-stat-panel">
          <p class="tc-stat-panel__title">Qualified — Advanced from Group Stage</p>
          <div class="tc-stat-panel__grid">${rows || '<p class="tc-stat-panel__empty">None yet</p>'}</div>
        </div>`;
    }

    if (type === 'eliminated') {
      const teams = allTeams
        .filter(t => effectiveQs(t) === 'eliminated')
        .sort((a, b) => a.groupId.localeCompare(b.groupId) || a.position - b.position);

      const rows = teams.map(t => {
        const c    = this.#countryMap.get(t.teamId);
        const name = escapeHtml(c?.name ?? t.teamId);
        const id   = escapeHtml(t.teamId);
        return `
          <div class="tc-stat-panel__row">
            <span class="tc-stat-panel__row-left">
              <img src="assets/flags/${id}.svg" alt="" width="16" height="11"
                   class="tc-stat-panel__flag" aria-hidden="true"
                   onerror="this.style.display='none'">
              ${name} <span class="tc-stat-panel__group">Grp&nbsp;${escapeHtml(t.groupId)}</span>
            </span>
            <span class="tc-stat-panel__record">${t.won}W ${t.drawn}D ${t.lost}L &middot; ${t.points}pts</span>
          </div>`;
      }).join('');

      return `
        <div class="tc-stat-panel">
          <p class="tc-stat-panel__title">Eliminated — Group Stage</p>
          <div class="tc-stat-panel__list">${rows || '<p class="tc-stat-panel__empty">None yet</p>'}</div>
        </div>`;
    }

    if (type === 'played') {
      const groupFT    = this.#fixtures.filter(f => f.status === 'FT').length;
      const groupTotal = this.#fixtures.length;

      const KO_ORDER  = ['r32', 'r16', 'qf', 'sf', 'final'];
      const KO_LABELS = {
        r32: 'Round of 32', r16: 'Round of 16',
        qf: 'Quarter-finals', sf: 'Semi-finals', final: 'Final',
      };
      const koRounds = new Map();
      for (const m of this.#knockoutMatches) {
        const rid = m.id?.split('-')[0] ?? 'other';
        if (!koRounds.has(rid)) koRounds.set(rid, { ft: 0, total: 0 });
        const r = koRounds.get(rid);
        r.total++;
        if (m.status === 'FT') r.ft++;
      }

      const koRows = KO_ORDER
        .filter(rid => koRounds.has(rid))
        .map(rid => {
          const r = koRounds.get(rid);
          return `
            <div class="tc-stat-panel__row">
              <span>${KO_LABELS[rid] ?? rid}</span>
              <span class="tc-stat-panel__row-right">${r.ft} / ${r.total}</span>
            </div>`;
        }).join('');

      return `
        <div class="tc-stat-panel">
          <p class="tc-stat-panel__title">Matches Played</p>
          <div class="tc-stat-panel__list">
            <div class="tc-stat-panel__row">
              <span>Group Stage</span>
              <span class="tc-stat-panel__row-right">${groupFT} / ${groupTotal}</span>
            </div>
            ${koRows}
          </div>
        </div>`;
    }

    if (type === 'remaining') {
      const upcoming = [
        ...this.#fixtures.filter(f => f.status === 'scheduled' && f.kickoff),
        ...this.#knockoutMatches.filter(m => m.status === 'scheduled' && m.kickoff),
      ]
        .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))
        .slice(0, 10);

      if (!upcoming.length) {
        return `<div class="tc-stat-panel"><p class="tc-stat-panel__empty">No upcoming matches</p></div>`;
      }

      const rows = upcoming.map(f => {
        const home     = this.#countryMap.get(f.homeTeamId);
        const away     = this.#countryMap.get(f.awayTeamId);
        const homeName = escapeHtml(home?.name ?? f.homeLabel ?? f.homeTeamId ?? 'TBD');
        const awayName = escapeHtml(away?.name ?? f.awayLabel ?? f.awayTeamId ?? 'TBD');
        const kickoff  = escapeHtml(formatKickoff(f.kickoff));
        return `
          <div class="tc-stat-panel__row">
            <span class="tc-stat-panel__row-left">${homeName} v ${awayName}</span>
            <span class="tc-stat-panel__row-right">${kickoff}</span>
          </div>`;
      }).join('');

      return `
        <div class="tc-stat-panel">
          <p class="tc-stat-panel__title">Upcoming Matches</p>
          <div class="tc-stat-panel__list">${rows}</div>
        </div>`;
    }

    return '';
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
      ? `<span class="tc-strip-card__badge${isLive ? ' tc-strip-card__badge--live' : ''}">${isLive ? '<span class="live-dot live-dot--sm" aria-hidden="true"></span> LIVE' : 'FT'}</span>`
      : `<span class="tc-strip-card__time">${escapeHtml(formatKickoff(f.kickoff))}</span>`;

    const broadcasterHtml = broadcasterIcon(f.broadcaster, f.status);

    return `
      <a href="#match/${escapeHtml(f.id)}" class="tc-strip-card${isLive ? ' tc-strip-card--live' : ''}">
        <div class="tc-strip-card__row">
          <span class="tc-strip-card__team">${homeAbbr}</span>
          ${middle}
          <span class="tc-strip-card__team">${awayAbbr}</span>
          ${broadcasterHtml}
        </div>
        ${secondaryHtml}
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
      nextScheduled.length ? this.#railSection('Coming Up', nextScheduled) : '',
      recentFT.length      ? this.#railSection('Recent', recentFT) : '',
    ].join('');

    return sections || `<p class="tc-rail__empty">No fixtures available</p>`;
  }

  #railSection(label, fixtures, isLive = false) {
    const labelClass = isLive ? 'tc-rail__label tc-rail__label--live' : 'tc-rail__label';
    const labelHtml  = isLive
      ? `<span class="live-dot" aria-hidden="true"></span>${escapeHtml(label)}`
      : escapeHtml(label);
    const cards = fixtures.map(f => this.#railCard(f)).join('');
    return `
      <div class="tc-rail__section">
        <p class="${labelClass}">${labelHtml}</p>
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
    const statusPart = isFT ? 'FT'
      : isLive ? (f.minute != null ? `${f.minute}'` : '<span class="live-dot live-dot--sm" aria-hidden="true"></span> LIVE')
      : escapeHtml(formatKickoff(f.kickoff));
    const metaParts  = [stagePart, statusPart].filter(Boolean);

    const venueHtml       = (!hasScore && f.venue)
      ? `<p class="tc-rail-card__venue">${escapeHtml(f.venue)}</p>`
      : '';
    const broadcasterHtml = broadcasterIcon(f.broadcaster, f.status);

    return `
      <a href="#match/${escapeHtml(f.id)}" class="tc-rail-card${isLive ? ' tc-rail-card--live' : ''}">
        <div class="tc-rail-card__body">
          <div class="tc-rail-card__text">
            <p class="tc-rail-card__matchup">${matchupLine}</p>
            ${metaParts.length ? `<p class="tc-rail-card__meta">${metaParts.join(' · ')}</p>` : ''}
            ${venueHtml}
          </div>
          ${broadcasterHtml}
        </div>
      </a>`;
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
        this.#snapshotEl      = this.#container.querySelector('.tc-snapshot');
        this.#pollIndicatorEl = this.#container.querySelector('.tc-poll-indicator__text');
        this.#bindSnapshotClicks();
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
