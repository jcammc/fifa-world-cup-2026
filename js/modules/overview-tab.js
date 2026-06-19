import { escapeHtml, getInitials } from '../utils.js';
import { Charts } from '../charts.js';

const POSITION_GROUPS = ['GK', 'DF', 'MF', 'FW'];

export class OverviewTab {
  #container;
  #country;
  #players;
  #clubMap;
  #leagueMap;
  #onHeroSelect;

  constructor(container, country, players, clubs, leagues, onHeroSelect) {
    this.#container    = container;
    this.#country      = country;
    this.#players      = players;
    this.#clubMap      = new Map(clubs.map(c => [c.id, c]));
    this.#leagueMap    = new Map(leagues.map(l => [l.id, l]));
    this.#onHeroSelect = onHeroSelect;
  }

  async render() {
    const country = this.#country;
    const players = this.#players;

    if (!players.length) {
      this.#container.innerHTML = `
        <div class="page-content">
          <div class="empty-state">
            <div class="empty-state__icon">📋</div>
            <p class="empty-state__title">Squad not yet available</p>
            <p class="empty-state__message">Player data for ${escapeHtml(country.name)} is being added.</p>
          </div>
        </div>`;
      return;
    }

    // Hero players: sort by caps desc, take top 5
    const heroes = [...players].sort((a, b) => (b.caps ?? 0) - (a.caps ?? 0)).slice(0, 5);

    // Squad makeup by position
    const byPos = { GK: 0, DF: 0, MF: 0, FW: 0 };
    players.forEach(p => { if (p.position in byPos) byPos[p.position]++; });

    // Club distribution: top 6 clubs
    const clubCounts = new Map();
    players.forEach(p => {
      if (p.clubId) clubCounts.set(p.clubId, (clubCounts.get(p.clubId) ?? 0) + 1);
    });
    const topClubs = [...clubCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id, count]) => ({ club: this.#clubMap.get(id) ?? null, count }));

    // League distribution
    const leagueCounts = new Map();
    players.forEach(p => {
      const club = this.#clubMap.get(p.clubId);
      if (club?.leagueId) leagueCounts.set(club.leagueId, (leagueCounts.get(club.leagueId) ?? 0) + 1);
    });
    const topLeagues = [...leagueCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => ({ league: this.#leagueMap.get(id) ?? null, count }));

    this.#container.innerHTML = `
      <div class="tp-overview">
        ${this.#renderHeroes(heroes)}
        <div class="tp-overview-grid">
          ${country.teamStrength ? this.#renderRadarSection(country) : ''}
          ${this.#renderSquadMakeup(byPos)}
          ${this.#renderDistribution('Clubs Represented', topClubs.map(({ club, count }) => ({ label: club?.name ?? '—', count })))}
          ${this.#renderDistribution('Leagues', topLeagues.map(({ league, count }) => ({ label: league?.name ?? '—', count })))}
          ${this.#renderRecentForm(country)}
        </div>
      </div>`;

    // Render radar chart after DOM is ready
    if (country.teamStrength) {
      const radarEl = this.#container.querySelector('.tp-radar-chart');
      if (radarEl) Charts.renderRadar(radarEl, country.teamStrength);
    }

    // Event delegation for hero card clicks
    const heroEl = this.#container.querySelector('.tp-heroes');
    heroEl?.addEventListener('click', e => {
      const card = e.target.closest('[data-player-id]');
      if (card) this.#onHeroSelect?.(card.dataset.playerId);
    });
  }

  // ─── Hero cards ──────────────────────────────────────────────

  #renderHeroes(heroes) {
    const cards = heroes.map(p => {
      const club     = this.#clubMap.get(p.clubId);
      const clubName = escapeHtml(club?.name ?? '');
      const id       = escapeHtml(p.id);
      const name     = escapeHtml(p.name);
      const pos      = escapeHtml(p.position);
      const initials = escapeHtml(getInitials(p.name));

      return `
        <button class="tp-hero-card" type="button" data-player-id="${id}">
          <div class="tp-hero-card__photo">
            <img src="assets/players/${id}.jpg" alt="${name}" loading="lazy"
                 onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
            <div class="tp-hero-card__initials" aria-hidden="true">${initials}</div>
          </div>
          <div class="tp-hero-card__info">
            <span class="tp-hero-card__name">${name}</span>
            <span class="tp-pos tp-pos--${pos.toLowerCase()}">${pos}</span>
            ${p.captain ? '<span class="tp-hero-card__captain">Captain</span>' : ''}
            ${clubName ? `<span class="tp-hero-card__club">${clubName}</span>` : ''}
            <span class="tp-hero-card__stat">${p.caps ?? 0} caps</span>
          </div>
        </button>`;
    }).join('');

    return `
      <section class="tp-section tp-hero-section">
        <h2 class="tp-section__title">Key Players</h2>
        <div class="tp-heroes">${cards}</div>
        <p class="tp-hero-hint">Click a player to see their profile</p>
      </section>`;
  }

  // ─── Radar chart ─────────────────────────────────────────────

  #renderRadarSection(country) {
    return `
      <section class="tp-section tp-radar-section">
        <h2 class="tp-section__title">Team Strength</h2>
        <div class="tp-radar-chart"></div>
      </section>`;
  }

  // ─── Squad makeup ─────────────────────────────────────────────

  #renderSquadMakeup(byPos) {
    const total = Object.values(byPos).reduce((s, n) => s + n, 0) || 1;
    const labels = { GK: 'Goalkeepers', DF: 'Defenders', MF: 'Midfielders', FW: 'Forwards' };

    const rows = POSITION_GROUPS.map(pos => {
      const count = byPos[pos];
      const pct   = Math.round((count / total) * 100);
      return `
        <div class="tp-makeup__row">
          <span class="tp-pos tp-pos--${pos.toLowerCase()}">${pos}</span>
          <div class="tp-makeup__bar-track">
            <div class="tp-makeup__bar-fill" style="width:${pct}%"></div>
          </div>
          <span class="tp-makeup__label">${escapeHtml(labels[pos])}</span>
          <span class="tp-makeup__count">${count}</span>
        </div>`;
    }).join('');

    return `
      <section class="tp-section">
        <h2 class="tp-section__title">Squad Makeup</h2>
        <div class="tp-makeup">${rows}</div>
      </section>`;
  }

  // ─── Distribution table (clubs / leagues) ────────────────────

  #renderDistribution(title, items) {
    if (!items.length) return '';
    const rows = items.map(({ label, count }) => `
      <div class="tp-dist__row">
        <span class="tp-dist__label">${escapeHtml(label)}</span>
        <span class="tp-dist__count">${count}</span>
      </div>`).join('');

    return `
      <section class="tp-section">
        <h2 class="tp-section__title">${escapeHtml(title)}</h2>
        <div class="tp-dist">${rows}</div>
      </section>`;
  }

  // ─── Recent form ──────────────────────────────────────────────

  #renderRecentForm(country) {
    if (!country.recentForm?.length) {
      return `
        <section class="tp-section">
          <h2 class="tp-section__title">Recent Form</h2>
          <div class="empty-state empty-state--compact">
            <p class="empty-state__message">Match results not yet available.</p>
          </div>
        </section>`;
    }
    return '';
  }

  init() {}
  teardown() {}
}
