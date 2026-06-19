import { isToday } from './time.js';

const URLS = {
  countries:  'data/countries.json',
  groups:     'data/groups.json',
  fixtures:   'data/fixtures.json',
  standings:  'data/standings.json',
  clubs:      'data/clubs.json',
  leagues:    'data/leagues.json',
  rankings:   'data/rankings.json',
  knockout:   'data/knockout.json',
  players:    (id) => `data/players/${id}.json`,
};

class _DataManager {
  #cache = new Map();

  async #load(key, url) {
    if (this.#cache.has(key)) return this.#cache.get(key);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const json = await res.json();
      // Unwrap { version, lastUpdated, data: [...] } envelope
      const data = Array.isArray(json) ? json : (json.data ?? []);
      this.#cache.set(key, data);
      return data;
    } catch (err) {
      console.warn(`DataManager: failed to load "${url}"`, err.message);
      return [];
    }
  }

  // ─── Core loaders ──────────────────────────────────────

  async loadCountries()            { return this.#load('countries', URLS.countries); }
  async loadGroups()               { return this.#load('groups',    URLS.groups); }
  async loadFixtures()             { return this.#load('fixtures',  URLS.fixtures); }
  async loadStandings()            { return this.#load('standings', URLS.standings); }
  async loadKnockout()             { return this.#load('knockout',  URLS.knockout); }
  async loadClubs()                { return this.#load('clubs',     URLS.clubs); }
  async loadLeagues()              { return this.#load('leagues',   URLS.leagues); }
  async loadRankings()             { return this.#load('rankings',  URLS.rankings); }

  async loadPlayersForTeam(countryId) {
    return this.#load(`players-${countryId}`, URLS.players(countryId));
  }

  // ─── Filtered queries ───────────────────────────────────

  async getTodaysFixtures() {
    const fixtures = await this.loadFixtures();
    return fixtures.filter(f => isToday(f.kickoff));
  }

  async getGroupStandings(groupId) {
    const standings = await this.loadStandings();
    return standings.filter(s => s.groupId === groupId);
  }

  // ─── Resolved lookups ───────────────────────────────────

  async getPlayerResolved(playerId) {
    const countries = await this.loadCountries();
    for (const country of countries) {
      if (!playerId.startsWith(country.id + '-')) continue;
      const players = await this.loadPlayersForTeam(country.id);
      const player = players.find(p => p.id === playerId);
      if (!player) continue;
      const [clubs, leagues] = await Promise.all([this.loadClubs(), this.loadLeagues()]);
      return {
        ...player,
        club:   clubs.find(c => c.id === player.clubId)   ?? null,
        league: leagues.find(l => l.id === player.leagueId) ?? null,
      };
    }
    return null;
  }

  // ─── Cache management ───────────────────────────────────

  invalidateCache(key) { this.#cache.delete(key); }
  clearCache()         { this.#cache.clear(); }
}

export const DataManager = new _DataManager();
