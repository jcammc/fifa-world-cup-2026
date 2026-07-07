import { escapeHtml, getInitials } from '../utils.js';
import { ProfilePanel } from './profile-panel.js';

const POSITION_GROUPS = [
  { key: 'GK', label: 'Goalkeepers' },
  { key: 'DF', label: 'Defenders' },
  { key: 'MF', label: 'Midfielders' },
  { key: 'FW', label: 'Forwards' },
];

export class SquadTab {
  #container;
  #country;
  #players;
  #clubMap;
  #photoMap;
  #rankingsMap;
  #observer    = null;
  #panel       = null;
  #rowSelections = new Map();   // position → playerId
  #groups      = [];            // { key, label, players }

  constructor(container, country, players, clubs, photoMap = {}, rankingsMap = new Map()) {
    this.#container  = container;
    this.#country     = country;
    this.#players     = players;
    this.#clubMap     = new Map((clubs ?? []).map(c => [c.id, c]));
    this.#photoMap    = photoMap;
    this.#rankingsMap = rankingsMap;
  }

  async render() {
    const players = this.#players;

    if (!players.length) {
      this.#container.innerHTML = `
        <div class="page-content">
          <div class="empty-state">
            <div class="empty-state__icon">📋</div>
            <p class="empty-state__title">Squad not yet available</p>
            <p class="empty-state__message">Player data for ${escapeHtml(this.#country.name)} is being added.</p>
          </div>
        </div>`;
      return;
    }

    // Group players by position, sorted by shirt number within each group
    const byPos = new Map(POSITION_GROUPS.map(g => [g.key, []]));
    players.forEach(p => byPos.get(p.position)?.push(p));
    byPos.forEach(arr => arr.sort((a, b) => (a.shirt ?? 99) - (b.shirt ?? 99)));

    this.#groups = POSITION_GROUPS
      .map(g => ({ ...g, players: byPos.get(g.key) ?? [] }))
      .filter(g => g.players.length > 0);

    const groupsHtml = this.#groups.map((g, i) => `
      <section class="squad-group" data-position="${g.key}" data-group-index="${i}">
        <h3 class="squad-group__title">${escapeHtml(g.label)} <span class="squad-group__count">${g.players.length}</span></h3>
        <div class="squad-grid">
          ${g.players.map(p => this.#renderCard(p)).join('')}
        </div>
      </section>`).join('');

    this.#container.innerHTML = `
      <div class="squad-layout">
        <div class="squad-scroll">${groupsHtml}</div>
        <div class="squad-panel-container" id="squad-panel-${escapeHtml(this.#country.id)}"></div>
      </div>`;
  }

  // ─── Player card ──────────────────────────────────────────────

  #renderCard(p) {
    const id       = escapeHtml(p.id);
    const name     = escapeHtml(p.name);
    const pos      = escapeHtml(p.position);
    const initials = escapeHtml(getInitials(p.name));
    const club     = this.#clubMap.get(p.clubId);
    const clubName = escapeHtml(club?.name ?? '');
    const photoSrc = escapeHtml(this.#photoMap[p.id] || `assets/players/${id}.jpg`);

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
          ${clubName ? `<span class="squad-card__club">${clubName}</span>` : ''}
        </div>
      </button>`;
  }

  // ─── Lifecycle ────────────────────────────────────────────────

  init() {
    if (!this.#groups.length) return;

    // Init ProfilePanel
    const panelEl = this.#container.querySelector('.squad-panel-container');
    if (!panelEl) return;
    this.#panel = new ProfilePanel(panelEl, this.#photoMap, this.#rankingsMap);

    // Default row selections: first player in each group
    this.#groups.forEach(g => {
      if (g.players.length) this.#rowSelections.set(g.key, g.players[0].id);
    });

    // Card click delegation
    this.#container.querySelector('.squad-scroll')
      ?.addEventListener('click', e => {
        const card = e.target.closest('[data-player-id]');
        if (!card) return;
        const playerId = card.dataset.playerId;
        const groupEl  = card.closest('[data-position]');
        if (groupEl) this.#rowSelections.set(groupEl.dataset.position, playerId);
        const player = this.#players.find(p => p.id === playerId);
        if (player) this.#activatePlayer(player, card);
      });

    // IntersectionObserver: auto-focus group on scroll
    const root = document.getElementById('app-content');
    this.#observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const pos      = entry.target.dataset.position;
        const selected = this.#rowSelections.get(pos);
        const player   = this.#players.find(p => p.id === selected);
        if (player) {
          const card = this.#container.querySelector(`[data-player-id="${player.id}"]`);
          this.#activatePlayer(player, card ?? null);
        }
      }
    }, { root, rootMargin: '-30% 0px', threshold: 0 });

    this.#container.querySelectorAll('[data-position]')
      .forEach(el => this.#observer.observe(el));

    // Auto-show first player immediately (first group is visible on load)
    const first = this.#groups[0]?.players[0];
    if (first) {
      const firstCard = this.#container.querySelector(`[data-player-id="${first.id}"]`);
      this.#activatePlayer(first, firstCard ?? null);
    }
  }

  // ─── Activate a player (panel + card highlight) ───────────────

  #activatePlayer(player, cardEl) {
    const club = this.#clubMap.get(player.clubId) ?? null;
    this.#panel?.show(player, club);

    this.#container.querySelectorAll('.squad-card--selected')
      .forEach(el => el.classList.remove('squad-card--selected'));
    cardEl?.classList.add('squad-card--selected');
  }

  // ─── Hero player navigation ───────────────────────────────────

  scrollToPlayer(playerId) {
    const card = this.#container.querySelector(`[data-player-id="${playerId}"]`);
    if (!card) return;

    const groupEl = card.closest('[data-position]');
    if (groupEl) this.#rowSelections.set(groupEl.dataset.position, playerId);

    const player = this.#players.find(p => p.id === playerId);
    if (player) this.#activatePlayer(player, card);

    setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  }

  // ─── Teardown ─────────────────────────────────────────────────

  teardown() {
    this.#observer?.disconnect();
    this.#observer = null;
    this.#panel?.teardown();
    this.#panel = null;
  }
}
