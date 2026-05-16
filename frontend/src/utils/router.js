/* ============================================================
   ROUTER — Hash-based client-side routing
   ============================================================ */

export class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.beforeEach = null;
    window.addEventListener('hashchange', () => this.resolve());
    window.addEventListener('DOMContentLoaded', () => this.resolve());
  }

  on(path, handler) {
    this.routes[path] = handler;
    return this;
  }

  navigate(path) {
    window.location.hash = path;
  }

  resolve() {
    const hash = window.location.hash.slice(1) || '/';
    const route = this.routes[hash];
    
    if (this.beforeEach) {
      this.beforeEach(hash, this.currentRoute);
    }
    
    this.currentRoute = hash;

    if (route) {
      const app = document.getElementById('app');
      if (app) {
        // Page transition
        app.classList.remove('page-container');
        void app.offsetWidth; // Force reflow
        app.classList.add('page-container');
        route(app);
      }
    } else {
      // Default to landing
      if (this.routes['/']) {
        this.navigate('/');
      }
    }
  }

  getCurrentRoute() {
    return window.location.hash.slice(1) || '/';
  }
}

export const router = new Router();
