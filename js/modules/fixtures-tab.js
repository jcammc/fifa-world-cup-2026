import { DataManager } from '../data.js';
import { escapeHtml } from '../utils.js';
import { formatKickoff, isToday } from '../time.js';

export class FixturesTab {
  #container;
  #country;
  #countryMap = new Map();

  constructor(container, country) {
    this.#container = container;
    this.#country   = country;
  }

  async render() {
    const [fixtures, countries] = await Promise.all([
      DataManager.loadFixtures(),
      DataManager.loadCountries(),
    ]);

    this.#countryMap = new Map(countries.map(c => [c.id, c]));

    const teamId  = this.#country.id;
    const groupId = this.#country.groupId;

    const teamFixtures = fixtures
      .filter(f => f.homeTeamId === teamId || f.awayTeamId === teamId)
      .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));

    const groupFixtures    = teamFixtures.filter(f => f.groupId);
    const knockoutFixtures = teamFixtures.filter(f => !f.groupId);

    const groupLabel = groupId ? `Group ${groupId}` : 'Group Stage';
    const groupHash  = groupId ? `#group-${groupId.toLowerCase()}` : '#tournament';

    this.#container.innerHTML = `
      <div class="page-content tp-fixtures">
        ${this.#buildGroupSection(groupFixtures, groupLabel, groupHash, teamId)}
        ${this.#buildKnockoutSection(knockoutFixtures, teamId)}
      </div>`;
  }

  // ─── Group stage section ──────────────────────────────────

  #buildGroupSection(fixtures, groupLabel, groupHash, teamId) {
    if (!fixtures.length) {
      return `
        <div class="tf-section">
          <div class="tf-section-head">
            <h3 class="tf-section-head__title">${escapeHtml(groupLabel)}</h3>
          </div>
          <div class="empty-state empty-state--compact">
            <p class="empty-state__message">No group fixtures found.</p>
          </div>
        </div>`;
    }

    const cards = fixtures.map(f => this.#buildFixtureCard(f, teamId)).join('');

    return `
      <div class="tf-section">
        <div class="tf-section-head">
          <h3 class="tf-section-head__title">${escapeHtml(groupLabel)}</h3>
          <a href="${escapeHtml(groupHash)}" class="btn-link">View group standings →</a>
        </div>
        <div class="tf-match-list">${cards}</div>
      </div>`;
  }

  // ─── Knockout section ─────────────────────────────────────

  #buildKnockoutSection(fixtures, teamId) {
    if (fixtures.length) {
      const cards = fixtures.map(f => this.#buildFixtureCard(f, teamId)).join('');
      return `
        <div class="tf-section">
          <div class="tf-section-head">
            <h3 class="tf-section-head__title">Knockout Stage</h3>
            <a href="#knockout" class="btn-link">View full bracket →</a>
          </div>
          <div class="tf-match-list">${cards}</div>
        </div>`;
    }

    return `
      <div class="tf-section">
        <div class="tf-section-head">
          <h3 class="tf-section-head__title">Knockout Stage</h3>
        </div>
        <div class="empty-state empty-state--compact">
          <div class="empty-state__icon">&#127942;</div>
          <p class="empty-state__message">Knockout fixtures will appear once the group stage concludes.</p>
          <a href="#knockout" class="btn-link">View full bracket →</a>
        </div>
      </div>`;
  }

  // ─── Fixture card ─────────────────────────────────────────

  #buildFixtureCard(f, teamId) {
    const home     = this.#countryMap.get(f.homeTeamId);
    const away     = this.#countryMap.get(f.awayTeamId);
    const homeName = escapeHtml(home?.name ?? f.homeTeamId ?? '?');
    const awayName = escapeHtml(away?.name ?? f.awayTeamId ?? '?');
    const homeId   = escapeHtml(f.homeTeamId ?? '');
    const awayId   = escapeHtml(f.awayTeamId ?? '');
    const isHome   = f.homeTeamId === teamId;
    const isAway   = f.awayTeamId === teamId;

    const { middleHtml, statusBadge } = this.#buildMiddle(f, isHome);

    const tcHash  = f.groupId
      ? `#group-${escapeHtml(f.groupId.toLowerCase())}`
      : '#knockout';
    const tcLabel = f.groupId
      ? `Open Group ${escapeHtml(f.groupId)} in Tournament Centre →`
      : 'View knockout bracket →';

    const venue     = f.venue ? `<span class="tf-match__venue">${escapeHtml(f.venue)}</span>` : '';
    const roundText = f.round ? `Round ${f.round}` : '';

    return `
      <div class="tf-match">
        <div class="tf-match__header">
          <span class="tf-match__round">${escapeHtml(roundText)}</span>
          ${venue}
        </div>
        <div class="tf-match__body">
          <div class="tf-match__team${isHome ? ' tf-match__team--focus' : ''}">
            <img src="assets/flags/${homeId}.svg" alt="" width="20" height="14"
                 class="tf-match__flag" aria-hidden="true"
                 onerror="this.style.display='none'">
            <span class="tf-match__name">${homeName}</span>
          </div>
          ${middleHtml}
          <div class="tf-match__team tf-match__team--away${isAway ? ' tf-match__team--focus' : ''}">
            <span class="tf-match__name">${awayName}</span>
            <img src="assets/flags/${awayId}.svg" alt="" width="20" height="14"
                 class="tf-match__flag" aria-hidden="true"
                 onerror="this.style.display='none'">
          </div>
        </div>
        <div class="tf-match__footer">
          ${statusBadge}
          <a href="${tcHash}" class="btn-link">${tcLabel}</a>
        </div>
      </div>`;
  }

  #buildMiddle(f, isHome) {
    if (f.status === 'FT') {
      const goalsFor     = isHome ? f.homeScore : f.awayScore;
      const goalsAgainst = isHome ? f.awayScore : f.homeScore;
      const result       = goalsFor > goalsAgainst ? 'W' : goalsFor < goalsAgainst ? 'L' : 'D';
      const resultClass  = result === 'W' ? 'tf-result--win' : result === 'L' ? 'tf-result--loss' : 'tf-result--draw';
      return {
        middleHtml: `
          <div class="tf-match__middle">
            <span class="tf-match__score">${f.homeScore}&ndash;${f.awayScore}</span>
            <span class="tf-result ${resultClass}">${result}</span>
          </div>`,
        statusBadge: `<span class="badge badge--ft badge--compact">FT</span>`,
      };
    }

    const timeStr   = f.kickoff ? escapeHtml(formatKickoff(f.kickoff)) : 'TBC';
    const todayNote = f.kickoff && isToday(f.kickoff)
      ? `<span class="badge badge--live badge--compact">Today</span>`
      : '';
    return {
      middleHtml: `
        <div class="tf-match__middle">
          <span class="tf-match__time">${timeStr}</span>
          ${todayNote}
        </div>`,
      statusBadge: '',
    };
  }

  init()     {}
  teardown() {}
}
