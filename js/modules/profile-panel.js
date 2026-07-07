import { escapeHtml, getInitials } from '../utils.js';
import { generateFallbackBio } from '../bio.js';

export class ProfilePanel {
  #container;
  #currentPlayerId = null;
  #photoMap;
  #rankingsMap;

  constructor(container, photoMap = {}, rankingsMap = new Map()) {
    this.#container   = container;
    this.#photoMap    = photoMap;
    this.#rankingsMap = rankingsMap;
    this.#showEmpty();
  }

  show(player, club = null) {
    if (player.id === this.#currentPlayerId) return;
    this.#currentPlayerId = player.id;
    this.#container.innerHTML = this.#buildCard(player, club, this.#photoMap);
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

  #buildCard(player, club, photoMap = {}) {
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
    const description = escapeHtml(player.description || player.bio || generateFallbackBio(player, club));
    const fullBio     = (player.bio && player.bio !== player.description) ? escapeHtml(player.bio) : '';
    const captain  = player.captain
      ? `<span class="pp-captain" title="Captain">C</span>`
      : '';

    const photoSrc = escapeHtml(photoMap[player.id] || `assets/players/${id}.jpg`);
    return `
      <div class="pp-card">
        <div class="pp-photo">
          <img src="${photoSrc}" alt="${name}"
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
          <p class="pp-bio">${description}</p>
          ${fullBio ? `<details class="pp-bio-details"><summary>Full biography</summary><p>${fullBio}</p></details>` : ''}
          ${this.#renderRankingBreakdown(this.#rankingsMap.get(player.id))}
        </div>
      </div>`;
  }

  // ─── Ranking breakdown (Sprint 39) ─────────────────────────────
  // See docs/plans/2026-07-06-ranking-system-design.md §5. Absent entirely
  // for players outside the ranking scope (this.#rankingsMap has no entry).

  #renderRankingBreakdown(ranking) {
    if (!ranking) return '';

    const components = [
      ['Transfermarkt', ranking.transfermarkt],
      ['EA Rating', ranking.ea],
      ['Awards Voting', ranking.awards],
      ['Media Coverage', ranking.media],
      ['Tournament Form', ranking.form],
    ];
    const rows = components.map(([label, val]) => `
      <div class="pp-rank__row">
        <span class="pp-rank__label">${escapeHtml(label)}</span>
        <span class="pp-rank__value">${val == null ? 'not yet researched' : val}</span>
      </div>`).join('');

    const fb = ranking.formBreakdown ?? {};
    const fbRows = [
      ['Starts', fb.starts],
      ['Sub appearances', fb.subApps],
      ['Goals', fb.goals],
      ['Assists', fb.assists],
      ['Player of the Match', fb.motm],
    ].map(([label, val]) => `
      <div class="pp-rank__row">
        <span class="pp-rank__label">${escapeHtml(label)}</span>
        <span class="pp-rank__value">${val ?? 0}</span>
      </div>`).join('');

    return `
      <div class="pp-rank">
        <h4 class="pp-rank__title">Ranking Breakdown</h4>
        <div class="pp-rank__consensus">
          <span class="pp-rank__consensus-val">${ranking.consensus}</span>
          <span class="pp-rank__consensus-lbl">Consensus Score</span>
          ${ranking.provisional ? '<span class="pp-rank__provisional">Provisional</span>' : ''}
        </div>
        <div class="pp-rank__components">${rows}</div>
        <details class="pp-rank__form-details">
          <summary>Form breakdown</summary>
          <div class="pp-rank__components">${fbRows}</div>
        </details>
      </div>`;
  }

  teardown() {
    this.#currentPlayerId = null;
    this.#container.innerHTML = '';
  }
}
