import { isToday } from './time.js';

const URLS = {
  countries:   'data/countries.json',
  groups:      'data/groups.json',
  fixtures:    'data/fixtures.json',
  standings:   'data/standings.json',
  clubs:       'data/clubs.json',
  leagues:     'data/leagues.json',
  rankings:    'data/rankings.json',
  knockout:    'data/knockout.json',
  annexC:        'data/annex-c.json',
  matchEvents:    'data/match-events.json',
  matchPreviews:  'data/match-previews.json',
  searchIndex:    'data/search-index.json',
  players:       (id) => `data/players/${id}.json`,
  playerPhotos:  'data/player-photos.json',
};

const LIVE_KEYS = ['fixtures', 'standings', 'knockout'];

// On production (not localhost) try the live Blob Store endpoint first.
// Falls back to static files if the endpoint fails or isn't populated yet.
const IS_LIVE = !['localhost', '127.0.0.1'].includes(window.location.hostname);
const LIVE_ENDPOINT = '/api/live';

class _DataManager {
  #cache = new Map();

  // Stores the full JSON object without unwrapping (for non-array data like annex-c).
  async #loadRaw(key, url) {
    if (this.#cache.has(key)) return this.#cache.get(key);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const json = await res.json();
      this.#cache.set(key, json);
      return json;
    } catch (err) {
      console.warn(`DataManager: failed to load "${url}"`, err.message);
      return null;
    }
  }

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

  // Tries live Blob Store endpoint first; falls back to static file.
  async #loadLive(key, staticUrl, type) {
    if (this.#cache.has(key)) return this.#cache.get(key);
    if (IS_LIVE) {
      try {
        const res = await fetch(`${LIVE_ENDPOINT}?type=${type}`);
        if (res.ok) {
          const json = await res.json();
          if (!json.error) {
            const data = Array.isArray(json) ? json : (json.data ?? []);
            this.#cache.set(key, data);
            return data;
          }
        }
      } catch {
        // fall through to static
      }
    }
    return this.#load(key, staticUrl);
  }

  // ─── Core loaders ──────────────────────────────────────

  async loadCountries()            { return this.#load('countries', URLS.countries); }
  async loadGroups()               { return this.#load('groups',    URLS.groups); }
  async loadFixtures()             { return this.#loadLive('fixtures',  URLS.fixtures,  'fixtures'); }
  async loadStandings()            { return this.#loadLive('standings', URLS.standings, 'standings'); }
  async loadKnockout()             { return this.#loadLive('knockout',  URLS.knockout,  'knockout'); }
  async loadClubs()                { return this.#load('clubs',     URLS.clubs); }
  async loadLeagues()              { return this.#load('leagues',   URLS.leagues); }
  async loadRankings()             { return this.#load('rankings',     URLS.rankings); }
  async loadSearchIndex()          { return this.#load('search-index', URLS.searchIndex); }
  async loadAnnexC()               { return this.#loadRaw('annex-c',     URLS.annexC); }
  async loadMatchEvents()          { return this.#loadRaw('match-events',   URLS.matchEvents); }
  async loadMatchPreviews()        { return this.#loadRaw('match-previews', URLS.matchPreviews); }

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
        league: leagues.find(l => l.id === (clubs.find(c => c.id === player.clubId)?.leagueId)) ?? null,
      };
    }
    return null;
  }

  async loadAllPlayers() {
    const key = 'all-players';
    if (this.#cache.has(key)) return this.#cache.get(key);
    const countries = await this.loadCountries();
    const chunks = await Promise.all(
      countries.map(async c => {
        const ps = await this.loadPlayersForTeam(c.id);
        return ps.map(p => ({ ...p, countryId: c.id }));
      })
    );
    const result = chunks.flat();
    this.#cache.set(key, result);
    return result;
  }

  async loadPlayerPhotos() {
    const key = 'player-photos';
    if (this.#cache.has(key)) return this.#cache.get(key);
    try {
      const res = await fetch(URLS.playerPhotos);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data = (json.data && typeof json.data === 'object' && !Array.isArray(json.data))
        ? json.data : {};
      this.#cache.set(key, data);
      return data;
    } catch {
      return {};
    }
  }

  async loadManagers() {
    const key = 'managers';
    if (this.#cache.has(key)) return this.#cache.get(key);
    try {
      const res = await fetch('data/managers.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data = (json.data && typeof json.data === 'object' && !Array.isArray(json.data))
        ? json.data : {};
      this.#cache.set(key, data);
      return data;
    } catch {
      return {};
    }
  }

  async loadManager(countryId) {
    const managers = await this.loadManagers();
    return managers[countryId] ?? null;
  }

  // ─── Cache management ───────────────────────────────────

  invalidateCache(key) { this.#cache.delete(key); }
  clearCache()         { this.#cache.clear(); }

  // Evicts only live-data keys so the next load fetches fresh data from the endpoint.
  invalidateLive() {
    for (const key of LIVE_KEYS) this.#cache.delete(key);
  }
}

export const DataManager = new _DataManager();
