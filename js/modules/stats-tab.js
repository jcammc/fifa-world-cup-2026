import { escapeHtml } from '../utils.js';

const POSITIONS       = ['GK', 'DF', 'MF', 'FW'];
const POSITION_LABELS = { GK: 'Goalkeepers', DF: 'Defenders', MF: 'Midfielders', FW: 'Forwards' };

export class StatsTab {
  #container;
  #country;
  #players;

  constructor(container, country, players) {
    this.#container = container;
    this.#country   = country;
    this.#players   = players;
  }

  async render() {
    if (!this.#players.length) {
      this.#container.innerHTML = `
        <div class="page-content">
          <div class="empty-state empty-state--compact">
            <p class="empty-state__message">Squad data not yet available.</p>
          </div>
        </div>`;
      return;
    }

    this.#container.innerHTML = `
      <div class="tp-stats">
        ${this.#renderExperience()}
        ${this.#renderGoalscorers()}
        ${this.#renderSquadProfile()}
      </div>`;
  }

  // ─── Experience ───────────────────────────────────────────────

  #renderExperience() {
    const sorted    = [...this.#players].sort((a, b) => (b.caps ?? 0) - (a.caps ?? 0));
    const totalCaps = this.#players.reduce((s, p) => s + (p.caps ?? 0), 0);
    const avgCaps   = Math.round(totalCaps / this.#players.length);
    const uncapped  = this.#players.filter(p => !(p.caps > 0)).length;

    const rows = sorted.map((p, i) => this.#playerRow(i + 1, p, p.caps ?? 0)).join('');

    return `
      <section class="tp-section">
        <h2 class="tp-section__title">Experience</h2>
        <div class="ts-headlines">
          ${this.#statCard(totalCaps.toLocaleString(), 'Total caps')}
          ${this.#statCard(avgCaps, 'Avg caps')}
          ${this.#statCard(uncapped, 'Uncapped')}
        </div>
        <div class="ts-list">${rows}</div>
      </section>`;
  }

  // ─── Goalscorers ──────────────────────────────────────────────

  #renderGoalscorers() {
    const scorers = [...this.#players]
      .filter(p => (p.goals ?? 0) > 0)
      .sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0));

    if (!scorers.length) {
      return `
        <section class="tp-section">
          <h2 class="tp-section__title">International Goals</h2>
          <div class="empty-state empty-state--compact">
            <p class="empty-state__message">No international goals recorded for this squad.</p>
          </div>
        </section>`;
    }

    const totalGoals = scorers.reduce((s, p) => s + (p.goals ?? 0), 0);
    const rows       = scorers.map((p, i) => this.#playerRow(i + 1, p, p.goals ?? 0)).join('');

    return `
      <section class="tp-section">
        <h2 class="tp-section__title">International Goals</h2>
        <div class="ts-headlines">
          ${this.#statCard(totalGoals, 'Squad goals')}
          ${this.#statCard(scorers.length, 'Goalscorers')}
          ${this.#statCard(scorers[0].goals, 'Top scorer')}
        </div>
        <div class="ts-list">${rows}</div>
      </section>`;
  }

  // ─── Squad profile ────────────────────────────────────────────

  #renderSquadProfile() {
    const withAge = this.#players.filter(p => p.age > 0);
    if (!withAge.length) return '';

    const avgAge  = (withAge.reduce((s, p) => s + p.age, 0) / withAge.length).toFixed(1);
    const byDob   = [...withAge].sort((a, b) => a.age - b.age);
    const youngest = byDob[0];
    const oldest   = byDob[byDob.length - 1];

    const posRows = POSITIONS.map(pos => {
      const group  = withAge.filter(p => p.position === pos);
      const posAvg = group.length
        ? (group.reduce((s, p) => s + p.age, 0) / group.length).toFixed(1)
        : '—';
      return `
        <div class="ts-profile-row">
          <span class="tp-pos tp-pos--${pos.toLowerCase()}">${pos}</span>
          <span class="ts-profile-row__label">${escapeHtml(POSITION_LABELS[pos])}</span>
          <span class="ts-profile-row__value">avg ${posAvg}</span>
        </div>`;
    }).join('');

    return `
      <section class="tp-section">
        <h2 class="tp-section__title">Squad Profile</h2>
        <div class="ts-headlines">
          ${this.#statCard(avgAge, 'Avg age')}
          ${this.#statCard(youngest.age, 'Youngest')}
          ${this.#statCard(oldest.age, 'Oldest')}
        </div>
        <div class="ts-profile">${posRows}</div>
        <div class="ts-notes">
          <p class="ts-note">Youngest: <strong>${escapeHtml(youngest.name)}</strong></p>
          <p class="ts-note">Oldest: <strong>${escapeHtml(oldest.name)}</strong></p>
        </div>
      </section>`;
  }

  // ─── Shared renderers ─────────────────────────────────────────

  #statCard(value, label) {
    return `
      <div class="ts-stat-card">
        <span class="ts-stat-card__value">${escapeHtml(String(value))}</span>
        <span class="ts-stat-card__label">${escapeHtml(label)}</span>
      </div>`;
  }

  #playerRow(rank, player, value) {
    const pos  = escapeHtml(player.position ?? '');
    const name = escapeHtml(player.name ?? '');
    return `
      <div class="ts-player-row">
        <span class="ts-player-row__rank">${rank}</span>
        <span class="tp-pos tp-pos--${pos.toLowerCase()}">${pos}</span>
        <span class="ts-player-row__name">${name}</span>
        <span class="ts-player-row__value">${value}</span>
      </div>`;
  }

  init() {}
  teardown() {}
}
