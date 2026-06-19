export class SquadTab {
  #container;
  #observer = null;
  constructor(container, params = {}) { this.#container = container; }
  async render() {}
  init() {}
  teardown() { this.#observer?.disconnect(); }
}
