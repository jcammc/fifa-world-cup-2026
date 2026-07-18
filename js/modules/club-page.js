import { DataManager } from '../data.js';
import { escapeHtml, getInitials } from '../utils.js';
import { POSITION_GROUPS } from './position-groups.js';
import { ProfilePanel } from './profile-panel.js';

export class ClubPage {
  #container;
  #params;
  #club        = null;
  #players     = [];
  #countryMap  = new Map();
  #photoMap    = {};
  #rankingsMap = new Map();
  #panel       = null;
  #groups      = [];

  constructor(container, params = {}) {
    this.#container = container;
    this.#params    = params;
  }

  async render() {
    const { clubId } = this.#params;

    const [clubs, leagues, countries, allPlayers, photoMap, rankings] = await Promise.all([
      DataManager.loadClubs(),
      DataManager.loadLeagues(),
      DataManager.loadCountries(),
      DataManager.loadAllPlayers(),
      DataManager.loadPlayerPhotos(),
      DataManager.loadRankings(),
    ]);

    const club = clubs.find(c => c.id === clubId);

    if (!club) {
      this.#container.innerHTML = `
        <div class="page-content">
          <div class="empty-state">
            <div class="empty-state__icon">🔍</div>
            <p class="empty-state__title">Club not found</p>
            <p class="empty-state__message">No data for &ldquo;${escapeHtml(clubId ?? '')}&rdquo;.</p>
            <a href="#club-explorer" class="btn-link">← Club Explorer</a>
          </div>
        </div>`;
      return;
    }

    this.#club        = club;
    this.#photoMap    = photoMap;
    this.#rankingsMap = new Map(rankings.map(e => [e.playerId, e]));
    this.#countryMap  = new Map(countries.map(c => [c.id, c]));
    this.#players     = allPlayers.filter(p => p.clubId === clubId);

    if (!this.#players.length) {
      this.#container.innerHTML = `
        <div class="page-content">
          <div class="empty-state">
            <div class="empty-state__icon">👕</div>
            <p class="empty-state__title">${escapeHtml(club.name)}</p>
            <p class="empty-state__message">No World Cup players from this club yet.</p>
            <a href="#club-explorer" class="btn-link">← Club Explorer</a>
          </div>
        </div>`;
      return;
    }

    const league      = leagues.find(l => l.id === club.leagueId) ?? null;
    const nationCount = new Set(this.#players.map(p => p.countryId)).size;

    // Group players by position, sorted by shirt number within each group
    const byPos = new Map(POSITION_GROUPS.map(g => [g.key, []]));
    this.#players.forEach(p => byPos.get(p.position)?.push(p));
    byPos.forEach(arr => arr.sort((a, b) => (a.shirt ?? 99) - (b.shirt ?? 99)));

    this.#groups = POSITION_GROUPS
      .map(g => ({ ...g, players: byPos.get(g.key) ?? [] }))
      .filter(g => g.players.length > 0);

    const groupsHtml = this.#groups.map(g => `
      <section class="squad-group" data-position="${g.key}">
        <h3 class="squad-group__title">${escapeHtml(g.label)} <span class="squad-group__count">${g.players.length}</span></h3>
        <div class="squad-grid">
          ${g.players.map(p => this.#renderCard(p)).join('')}
        </div>
      </section>`).join('');

    this.#container.innerHTML = `
      <div class="tp-page">
        ${this.#renderHeader(club, league, nationCount)}
        <div class="squad-layout">
          <div class="squad-scroll">${groupsHtml}</div>
          <div class="squad-panel-container" id="club-panel-${escapeHtml(club.id)}"></div>
        </div>
      </div>`;
  }

  // ─── Header ───────────────────────────────────────────────────

  #renderHeader(club, league, nationCount) {
    const name      = escapeHtml(club.name);
    const initials  = escapeHtml(getInitials(club.name));
    const meta      = [league?.name, club.country].filter(Boolean).map(escapeHtml).join(' · ');
    const count     = this.#players.length;
    const sub       = `${count} player${count === 1 ? '' : 's'} · ${nationCount} nation${nationCount === 1 ? '' : 's'}`;

    return `
      <div class="tp-header cp-header">
        <div class="cp-header__badge" aria-hidden="true">${initials}</div>
        <div class="tp-header__info">
          <h1 class="tp-header__name">${name}</h1>
          <p class="tp-header__meta">${meta}</p>
          <p class="tp-header__manager">${sub}</p>
        </div>
      </div>`;
  }

  // ─── Player card ──────────────────────────────────────────────

  #renderCard(p) {
    const id          = escapeHtml(p.id);
    const name        = escapeHtml(p.name);
    const pos         = escapeHtml(p.position);
    const initials    = escapeHtml(getInitials(p.name));
    const country     = this.#countryMap.get(p.countryId);
    const countryName = escapeHtml(country?.name ?? '');
    const photoSrc     = escapeHtml(this.#photoMap[p.id] || `assets/players/${id}.jpg`);

    return `
      <button class="squad-card" type="button" data-player-id="${id}">
        <div class="squad-card__photo">
          <img src="${photoSrc}" alt="${name}" loading="lazy"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <div class="squad-card__initials" aria-hidden="true">${initials}</div>
          <span class="squad-card__shirt">${p.shirt ?? '—'}</span>
          ${p.captain ? '<span class="squad-card__captain-badge" title="Captain">C</span>' : ''}
        </div>
        <div class="squad-card__info">
          <span class="squad-card__name">${name}</span>
          <span class="tp-pos tp-pos--${pos.toLowerCase()}">${pos}</span>
          ${countryName ? `
            <span class="squad-card__club cp-card__nation">
              <img src="assets/flags/${escapeHtml(p.countryId)}.svg" alt="" class="cp-card__flag"
                   width="14" height="10" onerror="this.style.display='none'">
              ${countryName}
            </span>` : ''}
        </div>
      </button>`;
  }

  // ─── Lifecycle ────────────────────────────────────────────────

  init() {
    if (!this.#groups.length) return;

    const panelEl = this.#container.querySelector('.squad-panel-container');
    if (!panelEl) return;
    this.#panel = new ProfilePanel(panelEl, this.#photoMap, this.#rankingsMap);

    this.#container.querySelector('.squad-scroll')
      ?.addEventListener('click', e => {
        const card = e.target.closest('[data-player-id]');
        if (!card) return;
        const player = this.#players.find(p => p.id === card.dataset.playerId);
        if (player) this.#activatePlayer(player, card);
      });

    // Auto-show first player immediately
    const first = this.#groups[0]?.players[0];
    if (first) {
      const firstCard = this.#container.querySelector(`[data-player-id="${first.id}"]`);
      this.#activatePlayer(first, firstCard ?? null);
    }
  }

  // ─── Activate a player (panel + card highlight) ────────────────

  #activatePlayer(player, cardEl) {
    this.#panel?.show(player, this.#club);

    this.#container.querySelectorAll('.squad-card--selected')
      .forEach(el => el.classList.remove('squad-card--selected'));
    cardEl?.classList.add('squad-card--selected');
  }

  // ─── Teardown ────────────────────────────────────────────────

  teardown() {
    this.#panel?.teardown();
    this.#panel = null;
  }
}
