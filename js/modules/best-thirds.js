import { DataManager } from '../data.js';
import { escapeHtml } from '../utils.js';
import { rankBestThirds, getAdvancingThirdGroups, lookupAnnexC } from '../tournament-state.js';

export class BestThirds {
  #container;

  constructor(container, params = {}) {
    this.#container = container;
  }

  async render() {
    const [standings, annexC, countries, knockoutRounds] = await Promise.all([
      DataManager.loadStandings(),
      DataManager.loadAnnexC(),
      DataManager.loadCountries(),
      DataManager.loadKnockout(),
    ]);

    const countryMap   = new Map(countries.map(c => [c.id, c]));
    const rankedThirds = rankBestThirds(standings);
    const allGroupsDone = standings.length === 12 && standings.every(g => g.teams.every(t => t.played >= 3));

    // Build match lookup from knockout rounds
    const matchMap = new Map();
    for (const round of knockoutRounds) {
      for (const m of round.matches ?? []) {
        matchMap.set(m.id, m);
      }
    }

    // Annex C slot assignments
    const advancingGroups = getAdvancingThirdGroups(standings);
    const annexMapping    = lookupAnnexC(annexC ?? { combinations: {} }, advancingGroups);

    this.#container.innerHTML = `
      <div class="page-content bt-page">
        <a href="#knockout" class="bt-back">&#8592; Knockout Stage</a>
        <div class="bt-header">
          <h1 class="bt-title">Best Third-Place Teams</h1>
          <p class="bt-subtitle">
            8 of 12 groups' third-place finishers advance to the Round of 32.
            Teams are ranked by points, then goal difference, then goals scored.
          </p>
          ${allGroupsDone
            ? `<span class="badge bt-status bt-status--done">All groups complete</span>`
            : `<span class="badge bt-status bt-status--live">&#9679; Updating live</span>`}
        </div>

        ${this.#buildRankTable(rankedThirds, standings, countryMap, allGroupsDone)}
        ${this.#buildTiebreakerNote()}
        ${annexMapping ? this.#buildSlotAssignments(annexMapping, rankedThirds, countryMap, matchMap, allGroupsDone) : ''}
      </div>`;
  }

  // ─── Ranked table ─────────────────────────────────────────

  #buildRankTable(rankedThirds, standings, countryMap, allGroupsDone) {
    if (!rankedThirds.length) {
      return `
        <div class="empty-state empty-state--compact">
          <p class="empty-state__message">Third-place standings will appear once Matchday 2 is complete.</p>
        </div>`;
    }

    const rows = rankedThirds.map((entry, idx) => {
      const rank      = idx + 1;
      const advancing = rank <= 8;
      const country   = countryMap.get(entry.teamId);
      const name      = escapeHtml(country?.name ?? entry.teamId);
      const id        = escapeHtml(entry.teamId);
      const gdStr     = entry.gd >= 0 ? `+${entry.gd}` : String(entry.gd);
      const groupDone = standings.find(g => g.groupId === entry.groupId)
        ?.teams.every(t => t.played >= 3);

      const statusBadge = allGroupsDone && advancing
        ? `<span class="bt-row__status bt-row__status--adv">ADV</span>`
        : allGroupsDone && !advancing
          ? `<span class="bt-row__status bt-row__status--out">OUT</span>`
          : '';

      return `
        <tr class="bt-row${advancing ? ' bt-row--advancing' : ''}${rank === 9 ? ' bt-row--cutline' : ''}">
          <td class="bt-col--rank">
            ${advancing ? `<span class="bt-rank bt-rank--adv">${rank}</span>` : `<span class="bt-rank">${rank}</span>`}
          </td>
          <td class="bt-col--team">
            <img src="assets/flags/${id}.svg" alt="" width="16" height="11"
                 class="bt-flag" aria-hidden="true" onerror="this.style.display='none'">
            <a href="#${id}" class="bt-team-name">${name}</a>
            ${statusBadge}
          </td>
          <td class="bt-col--group">${escapeHtml(entry.groupId)}</td>
          <td>${entry.played}</td>
          <td class="bt-col--pts">${entry.points}</td>
          <td>${entry.gf}</td>
          <td>${gdStr}</td>
        </tr>`;
    }).join('');

    return `
      <section class="bt-section">
        <table class="bt-table" aria-label="Best third-place teams rankings">
          <thead>
            <tr>
              <th class="bt-col--rank"></th>
              <th class="bt-col--team">Team</th>
              <th class="bt-col--group" title="Group">Grp</th>
              <th title="Played">P</th>
              <th class="bt-col--pts" title="Points">Pts</th>
              <th title="Goals For">GF</th>
              <th title="Goal Difference">GD</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p class="bt-table-note">Top 8 advance. Cut line shown after rank 8.</p>
      </section>`;
  }

  // ─── Tiebreaker note ──────────────────────────────────────

  #buildTiebreakerNote() {
    return `
      <section class="bt-section bt-section--tiebreaker">
        <h2 class="bt-section__title">Tiebreaker rules</h2>
        <p class="bt-tiebreaker">
          Teams are ranked by points, then goal difference, then goals scored.
          If still equal, FIFA ranking is used as the final tiebreaker.
          Slot assignments (which 3rd-place team plays which Round of 32 match)
          are determined by FIFA Annex C based on the combination of groups that advance.
        </p>
      </section>`;
  }

  // ─── Annex C slot assignments ─────────────────────────────

  #buildSlotAssignments(annexMapping, rankedThirds, countryMap, matchMap, allGroupsDone) {
    // Build a lookup: groupLetter → ranked third entry
    const thirdByGroup = new Map(rankedThirds.map(t => [t.groupId, t]));

    const cards = Object.entries(annexMapping).map(([matchId, groupLetter]) => {
      const match   = matchMap.get(matchId);
      const entry   = thirdByGroup.get(groupLetter);
      const country = entry ? countryMap.get(entry.teamId) : null;
      const name    = country ? escapeHtml(country.name) : escapeHtml(groupLetter);
      const id      = entry ? escapeHtml(entry.teamId) : null;

      const conf = allGroupsDone ? 'confirmed' : (entry ? 'likely' : 'open');
      const confLabel = conf === 'confirmed' ? 'Confirmed' : conf === 'likely' ? 'Likely' : 'Open';
      const confCls   = `bt-slot__conf bt-slot__conf--${conf}`;

      const flagHtml = id
        ? `<img src="assets/flags/${id}.svg" alt="" width="20" height="14"
               class="bt-slot__flag" aria-hidden="true" onerror="this.style.display='none'">`
        : '';

      const teamHtml = id
        ? `<a href="#${id}" class="bt-slot__team">${name}</a>`
        : `<span class="bt-slot__team bt-slot__team--pending">Group ${escapeHtml(groupLetter)} 3rd</span>`;

      const matchLink = match
        ? `<a href="#match/${escapeHtml(matchId)}" class="bt-slot__match-link">View match &#8594;</a>`
        : '';

      const matchDate = match?.kickoff ? this.#fmtDate(match.kickoff) : '';

      return `
        <div class="bt-slot">
          <div class="bt-slot__body">
            ${flagHtml}
            <div class="bt-slot__info">
              ${teamHtml}
              <span class="${confCls}">${confLabel}</span>
            </div>
          </div>
          <div class="bt-slot__footer">
            <span class="bt-slot__match-id">${escapeHtml(matchDate)}</span>
            ${matchLink}
          </div>
        </div>`;
    }).join('');

    const confidenceNote = allGroupsDone
      ? ''
      : `<p class="bt-slots__note">Assignments shown are projected based on current standings and may change.</p>`;

    return `
      <section class="bt-section">
        <h2 class="bt-section__title">Round of 32 slot assignments</h2>
        ${confidenceNote}
        <div class="bt-slots">${cards}</div>
      </section>`;
  }

  #fmtDate(dateStr) {
    if (!dateStr) return '';
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const [, m, d] = dateStr.split('-').map(Number);
    return `${d} ${MONTHS[m - 1]}`;
  }

  init() {}
  teardown() {}
}
