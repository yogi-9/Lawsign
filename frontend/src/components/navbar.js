/* ============================================================
   NAVBAR — Global navigation
   ============================================================ */

import { toggleTheme, getCurrentTheme, sunIcon, moonIcon } from './theme.js';

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
        <a href="#/login" class="navbar-signin" id="navbar-signin">Sign In</a>
        <a href="#/register" class="btn btn-primary btn-sm" id="navbar-cta">Try Free</a>
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
  }, 0);
  
  return nav;
}
