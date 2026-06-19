import { DataManager } from '../data.js';
import { formatKickoff } from '../time.js';
import { escapeHtml, formatCurrency } from '../utils.js';

export class TournamentCentre {
  #container;

  constructor(container, params = {}) {
    this.#container = container;
  }

  async render() {
    const [fixtures, standings, countries, groups] = await Promise.all([
      DataManager.loadFixtures(),
      DataManager.loadStandings(),
      DataManager.loadCountries(),
      DataManager.loadGroups(),
    ]);

    const todaysFixtures = await DataManager.getTodaysFixtures();
    const isNextMatches  = todaysFixtures.length === 0;
    const displayFixtures = isNextMatches
      ? fixtures.filter(f => f.status === 'scheduled').slice(0, 4)
      : todaysFixtures;

    const countryMap = new Map(countries.map(c => [c.id, c]));

    this.#container.innerHTML = `
      <div class="page-content tournament-centre">
        ${this.#renderSnapshot(countries, fixtures)}
        ${this.#renderMatches(displayFixtures, isNextMatches, countryMap)}
        ${this.#renderGroupLeaders(standings, countryMap)}
        ${this.#renderGroupStage(groups)}
        ${this.#renderKnockout()}
      </div>`;
  }

  // ─── Snapshot ───────────────────────────────────────────

  #renderSnapshot(countries, fixtures) {
    const played    = fixtures.filter(f => f.status === 'finished').length;
    const remaining = fixtures.length > 0 ? fixtures.length - played : '—';

    return `
      <section class="tc-snapshot">
        <h1 class="tc-title">World Cup 2026</h1>
        <p class="tc-subtitle">48 teams &middot; 12 groups &middot; 104 matches</p>
        <div class="tc-snapshot__stats">
          <div class="tc-stat">
            <span class="tc-stat__value">${countries.length || 48}</span>
            <span class="tc-stat__label">Teams</span>
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
      </section>`;
  }

  // ─── Today's / Next matches ──────────────────────────────

  #renderMatches(displayFixtures, isNextMatches, countryMap) {
    const heading = isNextMatches ? "Next Matches" : "Today's Matches";
    const note    = isNextMatches
      ? `<span class="tc-section__note">(no matches scheduled today)</span>`
      : '';

    if (!displayFixtures.length) {
      return `
        <section class="tc-section">
          <h2 class="tc-section__title">${heading}</h2>
          <div class="empty-state empty-state--compact">
            <p class="empty-state__message">No fixtures available yet.</p>
          </div>
        </section>`;
    }

    const cards = displayFixtures.map(f => this.#matchCard(f, countryMap)).join('');

    return `
      <section class="tc-section">
        <h2 class="tc-section__title">${heading}${note}</h2>
        <div class="match-cards">${cards}</div>
      </section>`;
  }

  #matchCard(f, countryMap) {
    const home    = countryMap.get(f.homeTeamId);
    const away    = countryMap.get(f.awayTeamId);
    const homeName = escapeHtml(home?.name ?? f.homeTeamId ?? 'TBD');
    const awayName = escapeHtml(away?.name ?? f.awayTeamId ?? 'TBD');
    const kickoff  = escapeHtml(formatKickoff(f.kickoff));
    const venue    = f.venue ? escapeHtml(f.venue) : '';

    const middle = f.score
      ? `<span class="match-card__score">${f.score.home}&nbsp;&ndash;&nbsp;${f.score.away}</span>`
      : `<span class="match-card__time">${kickoff}</span>`;

    const statusBadge = f.status === 'live'
      ? `<span class="badge badge--live" aria-label="Live match">🔴 LIVE</span>`
      : f.status === 'finished'
      ? `<span class="badge badge--ft">FT</span>`
      : '';

    return `
      <div class="match-card">
        <div class="match-card__teams">
          <span class="match-card__team">${homeName}</span>
          ${middle}
          <span class="match-card__team match-card__team--away">${awayName}</span>
        </div>
        <div class="match-card__meta">
          ${statusBadge}
          ${venue ? `<span class="match-card__venue">${venue}</span>` : ''}
        </div>
      </div>`;
  }

  // ─── Group leaders ───────────────────────────────────────

  #renderGroupLeaders(standings, countryMap) {
    if (!standings.length) {
      return `
        <section class="tc-section">
          <h2 class="tc-section__title">Group Leaders</h2>
          <div class="empty-state empty-state--compact">
            <p class="empty-state__message">Standings will appear once matches begin.</p>
          </div>
        </section>`;
    }

    const groupMap = new Map();
    for (const s of standings) {
      const prev = groupMap.get(s.groupId);
      if (!prev || s.points > prev.points) groupMap.set(s.groupId, s);
    }

    const cards = [...groupMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([groupId, s]) => {
        const name = escapeHtml(countryMap.get(s.countryId)?.name ?? s.countryId);
        const id   = escapeHtml(s.countryId);
        return `
          <div class="leader-card">
            <span class="leader-card__group">Group ${escapeHtml(groupId)}</span>
            <a href="#${id}" class="leader-card__team">${name}</a>
            <span class="leader-card__pts">${s.points} pts</span>
          </div>`;
      }).join('');

    return `
      <section class="tc-section">
        <h2 class="tc-section__title">Group Leaders</h2>
        <div class="leader-cards">${cards}</div>
      </section>`;
  }

  // ─── Group stage link ────────────────────────────────────

  #renderGroupStage(groups) {
    const count = groups.length || 12;
    return `
      <section class="tc-section">
        <div class="tc-section__header">
          <h2 class="tc-section__title">Group Stage</h2>
          <a href="#groups" class="tc-section__link">View all →</a>
        </div>
        <div class="empty-state empty-state--compact">
          <p class="empty-state__message">${count} groups &middot; Full carousel arrives in Sprint 4</p>
        </div>
      </section>`;
  }

  // ─── Knockout stage link ─────────────────────────────────

  #renderKnockout() {
    return `
      <section class="tc-section">
        <div class="tc-section__header">
          <h2 class="tc-section__title">Knockout Stage</h2>
        </div>
        <div class="empty-state empty-state--compact">
          <p class="empty-state__message">Full bracket arrives in Sprint 4</p>
        </div>
      </section>`;
  }

  init() {}

  teardown() {}
}
