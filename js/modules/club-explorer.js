import { DataManager } from '../data.js';
import { escapeHtml } from '../utils.js';

export class ClubExplorer {
  #container;
  #showAll    = false;
  #query      = '';

  constructor(container, params = {}) {
    this.#container = container;
  }

  async render() {
    this.#container.innerHTML = `
      <div class="ce-page">
        <div class="sp-loading">
          <p class="sp-loading__text">Loading club data…</p>
        </div>
      </div>`;

    const [clubs, allPlayers] = await Promise.all([
      DataManager.loadClubs(),
      DataManager.loadAllPlayers(),
    ]);

    // Players grouped by club → count + nation set
    const clubData = new Map();
    for (const p of allPlayers) {
      if (!p.clubId) continue;
      if (!clubData.has(p.clubId)) clubData.set(p.clubId, { count: 0, nations: new Set() });
      const entry = clubData.get(p.clubId);
      entry.count++;
      if (p.countryId) entry.nations.add(p.countryId);
    }

    // Ranked clubs (only those with WC players)
    const ranked = clubs
      .filter(c => clubData.has(c.id))
      .map(c => ({ club: c, ...clubData.get(c.id), nations: [...clubData.get(c.id).nations] }))
      .sort((a, b) => b.count - a.count);

    const topClub       = ranked[0];
    const totalClubs    = ranked.length;
    const multiClubs    = ranked.filter(r => r.count >= 2).length;

    const rowsHtml = ranked.map(r => this.#renderRow(r)).join('');

    this.#container.innerHTML = `
      <div class="ce-page">
        <div class="ce-header">
          <h1 class="ce-header__title">Club Explorer</h1>
          <p class="ce-header__sub">${totalClubs} clubs · ${allPlayers.length.toLocaleString()} players across 48 nations</p>
        </div>
        <div class="ce-stats">
          ${this.#statCard(totalClubs, 'Clubs')}
          ${this.#statCard(topClub?.count ?? 0, `${topClub?.club.name ?? ''} · most players`)}
          ${this.#statCard(multiClubs, '2+ player clubs')}
        </div>
        <div class="ce-controls">
          <input type="search" class="ce-search__input" placeholder="Search clubs…" aria-label="Search clubs">
          <div class="ce-toggle" role="group" aria-label="Filter by player count">
            <button class="ce-toggle__btn ce-toggle__btn--active" data-filter="2plus" type="button">2+ players</button>
            <button class="ce-toggle__btn" data-filter="all" type="button">All clubs</button>
          </div>
        </div>
        <div class="ce-list" id="ce-list">
          ${rowsHtml}
        </div>
        <div class="ce-empty" id="ce-empty" hidden>
          <p class="ce-empty__text">No clubs found for "<span id="ce-empty-query"></span>"</p>
          <button class="btn-link" id="ce-clear">Clear search</button>
        </div>
      </div>`;
  }

  // ─── Club row ─────────────────────────────────────────────

  #renderRow({ club, count, nations }) {
    const id    = escapeHtml(club.id);
    const name  = escapeHtml(club.name);
    const multi = count >= 2 ? '' : ' ce-club-row--single';

    const flagsHtml = nations.slice(0, 8).map(cId =>
      `<a href="#${escapeHtml(cId)}" class="ce-flag-link" title="${escapeHtml(cId)}" tabindex="0">
        <img src="assets/flags/${escapeHtml(cId)}.svg" alt="${escapeHtml(cId)}"
             class="ce-flag" width="20" height="14"
             onerror="this.parentElement.style.display='none'">
      </a>`
    ).join('');

    const overflow = nations.length > 8
      ? `<span class="ce-flag-overflow">+${nations.length - 8}</span>`
      : '';

    return `
      <div class="ce-club-row${multi}" data-count="${count}" data-searchable="${name.toLowerCase()}">
        <span class="ce-club-row__name">${name}</span>
        <span class="ce-club-row__count">${count}</span>
        <div class="ce-club-row__flags">${flagsHtml}${overflow}</div>
      </div>`;
  }

  // ─── Stat card ────────────────────────────────────────────

  #statCard(value, label) {
    return `
      <div class="ce-stat-card">
        <span class="ce-stat-card__value">${escapeHtml(String(value))}</span>
        <span class="ce-stat-card__label">${escapeHtml(String(label))}</span>
      </div>`;
  }

  // ─── Lifecycle ────────────────────────────────────────────

  init() {
    const listEl   = this.#container.querySelector('#ce-list');
    const emptyEl  = this.#container.querySelector('#ce-empty');
    const queryEl  = this.#container.querySelector('#ce-empty-query');
    const searchEl = this.#container.querySelector('.ce-search__input');
    const clearEl  = this.#container.querySelector('#ce-clear');
    const toggleEl = this.#container.querySelector('.ce-toggle');
    if (!listEl) return;

    const applyFilter = () => {
      const q       = this.#query;
      const showAll = this.#showAll;
      let visible   = 0;

      listEl.querySelectorAll('.ce-club-row').forEach(row => {
        const name  = row.dataset.searchable ?? '';
        const count = parseInt(row.dataset.count ?? '0', 10);

        let show;
        if (q) {
          show = name.includes(q);
        } else {
          show = showAll || count >= 2;
        }

        row.style.display = show ? '' : 'none';
        if (show) visible++;
      });

      if (emptyEl && queryEl) {
        const noResults = visible === 0 && q.length > 0;
        emptyEl.hidden  = !noResults;
        queryEl.textContent = q;
      }
    };

    // Search
    searchEl?.addEventListener('input', e => {
      this.#query = e.target.value.toLowerCase().trim();
      applyFilter();
    });

    // Clear button in empty state
    clearEl?.addEventListener('click', () => {
      this.#query    = '';
      if (searchEl) searchEl.value = '';
      applyFilter();
    });

    // Toggle
    toggleEl?.addEventListener('click', e => {
      const btn = e.target.closest('.ce-toggle__btn');
      if (!btn) return;
      toggleEl.querySelectorAll('.ce-toggle__btn').forEach(b =>
        b.classList.toggle('ce-toggle__btn--active', b === btn)
      );
      this.#showAll = btn.dataset.filter === 'all';
      applyFilter();
    });

    // Apply initial filter (default: 2+ players, no query)
    applyFilter();
  }

  teardown() {}
}
