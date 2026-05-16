/* ============================================================
   LAWSIGN — Main Entry Point
   ============================================================ */

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/landing.css';
import './styles/auth.css';
import './styles/upload.css';
import './styles/editor.css';
import './styles/dashboard.css';

import { router } from './utils/router.js';
import { initTheme } from './components/theme.js';
import { renderLanding } from './pages/landing.js';
import { renderLogin } from './pages/login.js';
import { renderRegister } from './pages/register.js';
import { renderUpload } from './pages/upload.js';
import { renderEditor } from './pages/editor.js';
import { renderDashboard } from './pages/dashboard.js';

// Initialize theme (dark mode default)
initTheme();

// Register routes
router
  .on('/', renderLanding)
  .on('/login', renderLogin)
  .on('/register', renderRegister)
  .on('/upload', renderUpload)
  .on('/editor', renderEditor)
  .on('/dashboard', renderDashboard);

// Initial resolve
router.resolve();
