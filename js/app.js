import { Router } from './router.js';
import { ThemeManager } from './theme.js';
import { Nav } from './modules/nav.js';
import { SearchOverlay } from './modules/search-overlay.js';

const search = new SearchOverlay();

async function init() {
  ThemeManager.init();
  Nav.render();
  Nav.init();
  await search.init();
  await Router.init();
}

init();
