import { Router } from './router.js';
import { ThemeManager } from './theme.js';
import { Nav } from './modules/nav.js';

async function init() {
  ThemeManager.init();
  Nav.render();
  Nav.init();
  await Router.init();
}

init();
