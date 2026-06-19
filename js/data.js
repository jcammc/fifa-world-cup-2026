class _DataManager {
  #cache = new Map();

  async loadCountries() { return []; }
  async loadGroups() { return []; }
  async loadFixtures() { return []; }
  async loadStandings() { return []; }
  async loadKnockout() { return []; }
  async loadPlayersForTeam(id) { return []; }
  async loadClubs() { return []; }
  async loadLeagues() { return []; }
  async loadRankings() { return []; }
  async getPlayerResolved(id) { return null; }
  async getTodaysFixtures() { return []; }
  async getGroupStandings(groupId) { return []; }
  invalidateCache(key) { this.#cache.delete(key); }
  clearCache() { this.#cache.clear(); }
}

export const DataManager = new _DataManager();
