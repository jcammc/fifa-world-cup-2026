import { Router } from './router.js';
import { ThemeManager } from './theme.js';
import { Nav } from './modules/nav.js';

async function init() {
  ThemeManager.init();
  await Nav.render(document.getElementById('app-nav'));
  Nav.init();
  Router.init();
}

init();
