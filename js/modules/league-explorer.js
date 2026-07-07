import { DataManager } from '../data.js';
import { escapeHtml } from '../utils.js';

export class LeagueExplorer {
  #container;
  #expandedId = null;

  constructor(container, params = {}) {
    this.#container = container;
  }

  async render() {
    this.#container.innerHTML = `
      <div class="le-page">
        <div class="sp-loading">
          <p class="sp-loading__text">Loading league data…</p>
        </div>
      </div>`;

    const [leagues, clubs, allPlayers, rankings] = await Promise.all([
      DataManager.loadLeagues(),
      DataManager.loadClubs(),
      DataManager.loadAllPlayers(),
      DataManager.loadRankings(),
    ]);
    const rankingsMap = new Map(rankings.map(e => [e.playerId, e]));

    // Players grouped by club
    const playersByClub = new Map();
    for (const p of allPlayers) {
      if (!p.clubId) continue;
      if (!playersByClub.has(p.clubId)) playersByClub.set(p.clubId, []);
      playersByClub.get(p.clubId).push(p);
    }

    // Per-league stats: clubs with their player counts + nation sets +
    // average consensus (non-provisional ranked players only, omitted if none)
    const leagueData = new Map();
    for (const league of leagues) {
      const leagueClubs = clubs
        .filter(c => c.leagueId === league.id)
        .map(c => {
          const players = playersByClub.get(c.id) ?? [];
          const nations = [...new Set(players.map(p => p.countryId).filter(Boolean))];
          const eligible = players
            .map(p => rankingsMap.get(p.id))
            .filter(r => r && !r.provisional);
          const avgConsensus = eligible.length > 0
            ? Math.round((eligible.reduce((s, r) => s + r.consensus, 0) / eligible.length) * 10) / 10
            : null;
          return { club: c, playerCount: players.length, nations, avgConsensus };
        })
        .filter(r => r.playerCount > 0)
        .sort((a, b) => b.playerCount - a.playerCount);

      const playerCount = leagueClubs.reduce((s, r) => s + r.playerCount, 0);
      if (playerCount === 0) continue;
      leagueData.set(league.id, { playerCount, clubs: leagueClubs });
    }

    // Ranked leagues
    const ranked = leagues
      .filter(l => leagueData.has(l.id))
      .sort((a, b) => (leagueData.get(b.id)?.playerCount ?? 0) - (leagueData.get(a.id)?.playerCount ?? 0));

    const topLeague = ranked[0];
    const topStats  = leagueData.get(topLeague?.id);
    const totalClubs = playersByClub.size;

    const rowsHtml = ranked.map(league =>
      this.#renderRow(league, leagueData.get(league.id))
    ).join('');

    this.#container.innerHTML = `
      <div class="le-page">
        <div class="le-header">
          <h1 class="le-header__title">League Explorer</h1>
          <p class="le-header__sub">${ranked.length} leagues · ${allPlayers.length.toLocaleString()} players across 48 nations</p>
        </div>
        <div class="le-stats">
          ${this.#statCard(ranked.length, 'Leagues')}
          ${this.#statCard(topStats?.playerCount ?? 0, `${topLeague?.name ?? ''} · most players`)}
          ${this.#statCard(totalClubs, 'Clubs')}
        </div>
        <div class="le-search-bar">
          <input type="search" class="le-search__input" placeholder="Search leagues…" aria-label="Search leagues">
        </div>
        <div class="le-list" id="le-list">
          ${rowsHtml}
        </div>
      </div>`;
  }

  // ─── League row ───────────────────────────────────────────

  #renderRow(league, stats) {
    const id      = escapeHtml(league.id);
    const name    = escapeHtml(league.name);
    const country = escapeHtml(league.country ?? '');
    const conf    = escapeHtml(league.confederation ?? '');
    const meta    = `${country} · ${stats.playerCount} players · ${stats.clubs.length} clubs`;

    const clubsHtml = stats.clubs.map(r => this.#renderClubRow(r)).join('');

    return `
      <div class="le-row" data-league-id="${id}" data-searchable="${name.toLowerCase()} ${country.toLowerCase()}">
        <button class="le-row__header" type="button" aria-expanded="false">
          <span class="le-conf-badge le-conf-badge--${conf.toLowerCase()}">${conf}</span>
          <span class="le-row__name">${name}</span>
          <span class="le-row__meta">${escapeHtml(meta)}</span>
          <span class="le-row__chevron" aria-hidden="true"></span>
        </button>
        <div class="le-row__clubs" hidden>
          ${clubsHtml}
        </div>
      </div>`;
  }

  // ─── Club row (inside expansion) ─────────────────────────

  #renderClubRow({ club, playerCount, nations, avgConsensus }) {
    const flagsHtml = nations.slice(0, 8).map(cId =>
      `<img src="assets/flags/${escapeHtml(cId)}.svg" alt="${escapeHtml(cId)}"
            class="le-flag" width="18" height="12"
            onerror="this.style.display='none'">`
    ).join('');
    const overflow = nations.length > 8
      ? `<span class="le-flag-overflow">+${nations.length - 8}</span>`
      : '';

    return `
      <div class="le-club-row">
        <span class="le-club-row__name">${escapeHtml(club.name)}</span>
        <span class="le-club-row__count">${playerCount}</span>
        <span class="le-club-row__consensus">${avgConsensus != null ? `${avgConsensus} avg consensus` : ''}</span>
        <div class="le-club-row__flags">${flagsHtml}${overflow}</div>
      </div>`;
  }

  // ─── Stat card ────────────────────────────────────────────

  #statCard(value, label) {
    return `
      <div class="le-stat-card">
        <span class="le-stat-card__value">${escapeHtml(String(value))}</span>
        <span class="le-stat-card__label">${escapeHtml(String(label))}</span>
      </div>`;
  }

  // ─── Lifecycle ────────────────────────────────────────────

  init() {
    const listEl   = this.#container.querySelector('#le-list');
    const searchEl = this.#container.querySelector('.le-search__input');
    if (!listEl) return;

    // Expand / collapse rows
    listEl.addEventListener('click', e => {
      const btn = e.target.closest('.le-row__header');
      if (!btn) return;
      const row    = btn.closest('.le-row');
      const clubs  = row?.querySelector('.le-row__clubs');
      const isOpen = btn.getAttribute('aria-expanded') === 'true';

      // Collapse previous
      if (this.#expandedId && this.#expandedId !== row?.dataset.leagueId) {
        const prev = listEl.querySelector(`.le-row[data-league-id="${this.#expandedId}"]`);
        prev?.querySelector('.le-row__header')?.setAttribute('aria-expanded', 'false');
        const prevClubs = prev?.querySelector('.le-row__clubs');
        if (prevClubs) prevClubs.hidden = true;
        prev?.classList.remove('le-row--expanded');
      }

      if (isOpen) {
        btn.setAttribute('aria-expanded', 'false');
        if (clubs) clubs.hidden = true;
        row?.classList.remove('le-row--expanded');
        this.#expandedId = null;
      } else {
        btn.setAttribute('aria-expanded', 'true');
        if (clubs) clubs.hidden = false;
        row?.classList.add('le-row--expanded');
        this.#expandedId = row?.dataset.leagueId ?? null;
      }
    });

    // Real-time search
    searchEl?.addEventListener('input', e => {
      const q = e.target.value.toLowerCase().trim();
      listEl.querySelectorAll('.le-row').forEach(row => {
        const searchable = row.dataset.searchable ?? '';
        row.style.display = (!q || searchable.includes(q)) ? '' : 'none';
      });
    });
  }

  teardown() {}
}
