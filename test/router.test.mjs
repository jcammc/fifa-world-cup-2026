// Regression coverage for the router's hash -> Module mapping. Exercises
// the real resolveRoute() function extracted from js/router.js — same
// logic the Router singleton uses, just callable without instantiating
// it or the 11 page modules it can route to.
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// js/router.js transitively imports js/data.js, which reads
// window.location.hostname at module-load time.
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
globalThis.window   = dom.window;
globalThis.document = dom.window.document;

const { resolveRoute, PlaceholderModule, NotFoundModule } = await import('../js/router.js');
const { TournamentCentre } = await import('../js/modules/tournament-centre.js');
const { TeamPage }         = await import('../js/modules/team-page.js');
const { CompareView }      = await import('../js/modules/compare-view.js');
const { CountriesPage }    = await import('../js/modules/countries-page.js');
const { ContinentsPage }   = await import('../js/modules/continents-page.js');
const { StatisticsPage }   = await import('../js/modules/statistics-page.js');
const { LeagueExplorer }   = await import('../js/modules/league-explorer.js');
const { ClubExplorer }     = await import('../js/modules/club-explorer.js');
const { MatchCentre }      = await import('../js/modules/match-centre.js');
const { BestThirds }       = await import('../js/modules/best-thirds.js');
const { ManagerPage }      = await import('../js/modules/manager-page.js');

const countryIds = new Set(['france', 'brazil']);

test('every named route resolves to the expected Module', () => {
  const cases = [
    ['',                  TournamentCentre],
    ['tournament',        TournamentCentre],
    ['today',             TournamentCentre],
    ['knockout',          TournamentCentre],
    ['group-a',           TournamentCentre],
    ['groups',            TournamentCentre],
    ['countries',         CountriesPage],
    ['continents',        ContinentsPage],
    ['statistics',        StatisticsPage],
    ['league-explorer',   LeagueExplorer],
    ['club-explorer',     ClubExplorer],
    ['compare',           CompareView],
    ['compare/france/brazil', CompareView],
    ['match/c-r1-bra-mor', MatchCentre],
    ['best-thirds',       BestThirds],
    ['manager/france',    ManagerPage],
    ['france',            TeamPage],       // exact country id
    ['france-mbappe',     TeamPage],       // player deep-link
    ['not-a-real-route',  NotFoundModule],
  ];

  for (const [hash, ExpectedModule] of cases) {
    const { Module } = resolveRoute(hash, countryIds);
    assert.equal(Module, ExpectedModule, `#${hash} should resolve to ${ExpectedModule.name}`);
  }
});

test('group deep-link extracts the correct groupId', () => {
  const { params } = resolveRoute('group-c', countryIds);
  assert.equal(params.groupId, 'C');
});

test('compare route with no team params still resolves, with null params', () => {
  const { params } = resolveRoute('compare', countryIds);
  assert.equal(params.teamA, null);
  assert.equal(params.teamB, null);
});

test('match route extracts the fixture id after the prefix', () => {
  const { params } = resolveRoute('match/r32-m11', countryIds);
  assert.equal(params.fixtureId, 'r32-m11');
});

test('player deep-link is distinguished from a bare country route', () => {
  const player = resolveRoute('france-mbappe', countryIds);
  assert.equal(player.params.countryId, 'france');
  assert.equal(player.params.scrollToPlayer, 'mbappe');

  const country = resolveRoute('france', countryIds);
  assert.equal(country.params.countryId, 'france');
  assert.equal(country.params.scrollToPlayer, undefined);
});

test('unrecognized club-/league-/search- prefixes fall back to the placeholder, not a 404', () => {
  const { Module } = resolveRoute('club-explorer-detail', countryIds);
  assert.equal(Module, PlaceholderModule);
});
