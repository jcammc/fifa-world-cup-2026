import { escapeHtml, getInitials } from '../utils.js';
import { generateFallbackBio } from '../bio.js';

export class ProfilePanel {
  #container;
  #currentPlayerId = null;

  constructor(container) {
    this.#container = container;
    this.#showEmpty();
  }

  show(player, club = null) {
    if (player.id === this.#currentPlayerId) return;
    this.#currentPlayerId = player.id;
    this.#container.innerHTML = this.#buildCard(player, club);
  }

  hide() {
    this.#currentPlayerId = null;
    this.#showEmpty();
  }

  #showEmpty() {
    this.#container.innerHTML = `
      <div class="pp-placeholder">
        <p>Scroll through the squad to focus a player</p>
      </div>`;
  }

  #buildCard(player, club) {
    const id       = escapeHtml(player.id);
    const name     = escapeHtml(player.name);
    const initials = escapeHtml(getInitials(player.name));
    const shirt    = player.shirt ?? '—';
    const pos      = player.position ?? '—';
    const posLabel = { GK: 'Goalkeeper', DF: 'Defender', MF: 'Midfielder', FW: 'Forward' }[pos] ?? pos;
    const clubName = escapeHtml(club?.name ?? '');
    const age      = player.age ?? '—';
    const caps     = player.caps ?? 0;
    const goals    = player.goals ?? 0;
    const bio      = escapeHtml(player.bio || generateFallbackBio(player, club));
    const captain  = player.captain
      ? `<span class="pp-captain" title="Captain">C</span>`
      : '';

    return `
      <div class="pp-card">
        <div class="pp-photo">
          <img src="assets/players/${id}.jpg" alt="${name}"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <div class="pp-photo__initials" aria-hidden="true">${initials}</div>
          <span class="pp-photo__shirt">#${shirt}</span>
        </div>
        <div class="pp-body">
          <div class="pp-header">
            <h3 class="pp-name">${name}</h3>
            ${captain}
          </div>
          <div class="pp-badges">
            <span class="tp-pos tp-pos--${escapeHtml(pos.toLowerCase())}">${escapeHtml(posLabel)}</span>
            ${clubName ? `<span class="pp-club">${clubName}</span>` : ''}
          </div>
          <div class="pp-stats">
            <div class="pp-stat">
              <span class="pp-stat__val">${age}</span>
              <span class="pp-stat__lbl">Age</span>
            </div>
            <div class="pp-stat">
              <span class="pp-stat__val">${caps}</span>
              <span class="pp-stat__lbl">Caps</span>
            </div>
            <div class="pp-stat">
              <span class="pp-stat__val">${goals}</span>
              <span class="pp-stat__lbl">Goals</span>
            </div>
          </div>
          <p class="pp-bio">${bio}</p>
        </div>
      </div>`;
  }

  teardown() {
    this.#currentPlayerId = null;
    this.#container.innerHTML = '';
  }
}
