/* ============================================================
   NAVBAR — Global navigation
   ============================================================ */

import { toggleTheme, getCurrentTheme, sunIcon, moonIcon } from './theme.js';
import { authAPI } from '../utils/api.js';

export function createNavbar(activeLink = '') {
  const theme = getCurrentTheme();
  
  const nav = document.createElement('nav');
  nav.className = 'navbar';
  nav.id = 'main-navbar';
  
  nav.innerHTML = `
    <div class="navbar-inner container-wide">
      <a href="#/" class="navbar-logo" id="navbar-logo">
        <svg class="logo-icon" width="28" height="28" viewBox="0 0 32 32" fill="none">
          <path d="M16 4C15 4 14 5 14 6L14 22C14 23 13.5 24 12 25C10.5 26 9 26 8 25" 
                stroke="var(--accent-indigo)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
          <path d="M14 6L20 4L18 10L22 8" stroke="var(--accent-indigo)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <path d="M18 18L24 16" stroke="var(--accent-indigo)" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
          <path d="M18 21L22 20" stroke="var(--accent-indigo)" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
          <circle cx="24" cy="16" r="1.5" fill="var(--accent-indigo)" opacity="0.7"/>
        </svg>
        <span class="logo-text">LawSign</span>
      </a>
      
      <div class="navbar-links" id="navbar-links">
        <a href="#/" class="navbar-link ${activeLink === 'features' ? 'active' : ''}" data-link="features">Features</a>
        <a href="#/" class="navbar-link ${activeLink === 'how' ? 'active' : ''}" data-link="how">How It Works</a>
        <a href="#/" class="navbar-link ${activeLink === 'pricing' ? 'active' : ''}" data-link="pricing">Pricing</a>
        <a href="#/" class="navbar-link ${activeLink === 'security' ? 'active' : ''}" data-link="security">Security</a>
      </div>
      
      <div class="navbar-actions">
        <button class="btn-icon theme-toggle" id="theme-toggle" data-tooltip="Toggle theme">
          <span class="theme-toggle-icon">${theme === 'dark' ? sunIcon() : moonIcon()}</span>
        </button>
        <div id="navbar-auth-buttons" style="display:flex; align-items:center; gap:var(--space-2);">
          <a href="#/login" class="navbar-signin" id="navbar-signin">Sign In</a>
          <a href="#/register" class="btn btn-primary btn-sm" id="navbar-cta">Try Free</a>
        </div>
      </div>
      
      <button class="navbar-hamburger" id="navbar-hamburger" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
    </div>
    
    <div class="navbar-mobile-overlay" id="navbar-mobile-overlay">
      <button class="mobile-close" id="mobile-close" aria-label="Close menu">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <div class="mobile-links">
        <a href="#/" class="mobile-link" data-link="features">Features</a>
        <a href="#/" class="mobile-link" data-link="how">How It Works</a>
        <a href="#/" class="mobile-link" data-link="pricing">Pricing</a>
        <a href="#/" class="mobile-link" data-link="security">Security</a>
        <div class="mobile-divider"></div>
        <a href="#/login" class="mobile-link">Sign In</a>
        <a href="#/register" class="btn btn-primary btn-lg" style="margin-top: var(--space-4); width: 100%;">Try Free</a>
      </div>
    </div>
  `;
  
  // Scroll glass effect
  const handleScroll = () => {
    if (window.scrollY > 80) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', handleScroll);
  handleScroll();
  
  // Theme toggle
  setTimeout(() => {
    const toggle = nav.querySelector('#theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', toggleTheme);
    }
    
    // Mobile hamburger
    const hamburger = nav.querySelector('#navbar-hamburger');
    const overlay = nav.querySelector('#navbar-mobile-overlay');
    const closeBtn = nav.querySelector('#mobile-close');
    
    if (hamburger && overlay) {
      hamburger.addEventListener('click', () => {
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
      });
      
      const closeMobile = () => {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
      };
      
      closeBtn?.addEventListener('click', closeMobile);
      overlay.querySelectorAll('.mobile-link').forEach(link => {
        link.addEventListener('click', closeMobile);
      });
    }
    
    // Smooth scroll for section links
    nav.querySelectorAll('[data-link]').forEach(link => {
      link.addEventListener('click', (e) => {
        const target = link.getAttribute('data-link');
        const section = document.getElementById(`section-${target}`);
        if (section) {
          e.preventDefault();
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    // Check auth state to update navbar UI
    authAPI.verify().then((res) => {
      if (res && res.user) {
        const authContainer = nav.querySelector('#navbar-auth-buttons');
        if (authContainer) {
          const initials = res.user.name.substring(0, 2).toUpperCase();
          authContainer.innerHTML = `
            <a href="#/dashboard" class="btn btn-ghost btn-sm" style="margin-right:8px;">Dashboard</a>
            <div class="navbar-avatar-wrapper" style="position:relative;">
              <div class="dash-user-avatar" id="navbar-user-avatar" style="width:32px;height:32px;cursor:pointer;background:var(--accent-indigo);color:white;display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:12px;font-weight:600;user-select:none;" title="${res.user.name}">
                ${initials}
              </div>
              <div class="navbar-dropdown" id="navbar-dropdown" style="display:none;position:absolute;top:calc(100% + 8px);right:0;background:var(--surface-1);border:1px solid var(--surface-2);border-radius:var(--radius-md);box-shadow:var(--shadow-lg);padding:8px;min-width:180px;z-index:100;">
                <div style="padding:4px 8px 12px 8px;border-bottom:1px solid var(--surface-2);margin-bottom:4px;">
                  <div style="font-weight:600;font-size:14px;color:var(--text-1);">${res.user.name}</div>
                  <div style="font-size:12px;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${res.user.email}</div>
                </div>
                <a href="#" id="navbar-logout" style="display:block;padding:8px;color:#ef4444;text-decoration:none;border-radius:var(--radius-sm);font-size:14px;transition:background 0.2s;">Logout</a>
              </div>
            </div>
          `;

          const avatar = nav.querySelector('#navbar-user-avatar');
          const dropdown = nav.querySelector('#navbar-dropdown');
          
          avatar.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
          });

          document.addEventListener('click', () => {
            if(dropdown) dropdown.style.display = 'none';
          });

          const logoutBtn = nav.querySelector('#navbar-logout');
          logoutBtn.addEventListener('mouseenter', () => logoutBtn.style.background = 'rgba(239, 68, 68, 0.1)');
          logoutBtn.addEventListener('mouseleave', () => logoutBtn.style.background = 'transparent');
          
          logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            logoutBtn.textContent = 'Logging out...';
            try { await authAPI.logout(); } catch(err) {}
            window.location.hash = '#/login';
            window.location.reload();
          });
        }
        
        const mobileLinks = nav.querySelector('.mobile-links');
        if (mobileLinks) {
          const authLinks = mobileLinks.querySelectorAll('a[href="#/login"], a[href="#/register"]');
          authLinks.forEach(l => l.remove());
          mobileLinks.innerHTML += `
            <a href="#/dashboard" class="mobile-link" style="margin-top:var(--space-4);">Dashboard</a>
            <a href="#" class="mobile-link" id="mobile-logout" style="color:#ef4444;margin-top:var(--space-2);">Logout</a>
          `;
          
          const mobileLogout = nav.querySelector('#mobile-logout');
          if (mobileLogout) {
            mobileLogout.addEventListener('click', async (e) => {
              e.preventDefault();
              try { await authAPI.logout(); } catch(err) {}
              window.location.hash = '#/login';
              window.location.reload();
            });
          }
        }
      }
    }).catch(() => {
      // Not logged in, leave default buttons
    });

  }, 0);
  
  return nav;
}
