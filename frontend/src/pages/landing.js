/* ============================================================
   LANDING PAGE
   ============================================================ */

import { createNavbar } from '../components/navbar.js';

const checkSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`;

export function renderLanding(app) {
  app.innerHTML = '';
  app.appendChild(createNavbar());

  const main = document.createElement('main');
  main.innerHTML = `
    <!-- ════ HERO ════ -->
    <section class="hero dot-grid" id="section-hero">
      <div class="container-wide hero-inner">
        <div class="hero-content">
          <div class="hero-badge">
            <span class="live-dot"></span>
            <span>For Legal Professionals</span>
          </div>
          <h1 class="hero-headline">Sign <span class="highlight">every</span> page.<br>In <span class="highlight">minutes</span>, not hours.</h1>
          <p class="hero-sub">Upload your document and signature. AI finds every signing field. You verify and download a legally valid PDF.</p>
          <div class="hero-ctas">
            <a href="#/upload" class="btn btn-primary btn-lg">Start Signing Free</a>
            <a href="#/" class="hero-ghost-link" data-link="how">See how it works <span>→</span></a>
          </div>
          <p class="hero-trust">Used by advocates and CAs across India, UK, and Canada.</p>
        </div>
        <div class="hero-visual">
          <div>
            <div class="hero-mockup">
              <div class="mockup-toolbar">
                <span class="mockup-dot"></span>
                <span class="mockup-dot"></span>
                <span class="mockup-dot"></span>
                <span class="mockup-title">sale_deed_final.pdf</span>
              </div>
              <div class="mockup-page">
                <div class="mockup-line long"></div>
                <div class="mockup-line medium"></div>
                <div class="mockup-line long"></div>
                <div class="mockup-line short"></div>
                <div class="mockup-line medium"></div>
                <div class="mockup-line long"></div>
                <div class="mockup-line short"></div>
                <div class="mockup-sig-zone">
                  <span class="sig-text">J. Sharma</span>
                </div>
              </div>
            </div>
            <div class="hero-stats">
              <span class="stat-pill">40 pages signed</span>
              <span class="stat-pill">AI detected 6 fields</span>
              <span class="stat-pill">Downloaded in 4 min</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ════ PROBLEM ════ -->
    <section class="section" id="section-problems">
      <div class="container">
        <div style="text-align:center;">
          <span class="section-label">The Problem</span>
          <h2 class="section-title" style="margin-top:var(--space-3);">Signing shouldn't be the hardest part</h2>
        </div>
        <div class="problems-grid">
          <div class="card problem-card">
            <span class="problem-number">01</span>
            <h3>Time wasted</h3>
            <p>Signing 40 pages by hand takes 90 minutes. Multiply that by every document, every client, every week.</p>
          </div>
          <div class="card problem-card">
            <span class="problem-number">02</span>
            <h3>Missed signatures</h3>
            <p>One unsigned page voids the entire document. A single oversight creates hours of rework and legal risk.</p>
          </div>
          <div class="card problem-card">
            <span class="problem-number">03</span>
            <h3>Physical limits</h3>
            <p>Physical signatures don't work remotely. Printing, signing, scanning — it's 2026 and we're still doing this.</p>
          </div>
        </div>
        <div class="problem-conclusion">
          <p>LawSign eliminates all three.</p>
        </div>
      </div>
    </section>

    <!-- ════ HOW IT WORKS ════ -->
    <section class="section" id="section-how">
      <div class="container">
        <div style="text-align:center;">
          <span class="section-label">How It Works</span>
          <h2 class="section-title" style="margin-top:var(--space-3);">Four steps. That's it.</h2>
        </div>
        <div class="steps-container">
          <div class="step-card">
            <span class="step-number">01</span>
            <span class="badge badge-default step-time">~30 sec</span>
            <h3>Upload document</h3>
            <p>Drop your PDF, DOCX, or image. Rental agreements, sale deeds, affidavits — all supported.</p>
          </div>
          <div class="step-connector">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 4"><path d="M5 12h14M15 6l6 6-6 6"/></svg>
          </div>
          <div class="step-card">
            <span class="step-number">02</span>
            <span class="badge badge-default step-time">~20 sec</span>
            <h3>Upload signature</h3>
            <p>A clear photo of your signature on white paper. We remove the background automatically.</p>
          </div>
          <div class="step-connector">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 4"><path d="M5 12h14M15 6l6 6-6 6"/></svg>
          </div>
          <div class="step-card ai-step">
            <span class="step-number">03</span>
            <span class="badge badge-default step-time" style="border-color:var(--accent-cyan);color:var(--accent-cyan);box-shadow:0 0 8px var(--accent-cyan-glow);">AI ~15 sec</span>
            <h3>AI detects fields</h3>
            <p>Our AI scans every page and identifies exactly where signatures need to go. You just verify.</p>
          </div>
          <div class="step-connector">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 4"><path d="M5 12h14M15 6l6 6-6 6"/></svg>
          </div>
          <div class="step-card">
            <span class="step-number">04</span>
            <span class="badge badge-default step-time">~10 sec</span>
            <h3>Download signed PDF</h3>
            <p>One click generates a legally valid PDF with all signatures embedded. Audit trail included.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ════ FEATURES ════ -->
    <section class="section" id="section-features">
      <div class="container">
        <div style="text-align:center;">
          <span class="section-label">Features</span>
          <h2 class="section-title" style="margin-top:var(--space-3);">Everything a legal professional needs</h2>
        </div>
        <div class="features-grid">
          <div class="card feature-card feature-hero-card" style="display:flex;gap:var(--space-8);align-items:center;">
            <div style="flex:1;">
              <div class="feature-icon" style="background:var(--accent-cyan-subtle);color:var(--accent-cyan);">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 2v10l7-3"/></svg>
              </div>
              <h3>AI Signature Field Detection</h3>
              <p>Our AI reads the structure of your document and identifies every location where a signature is required. It understands common legal layouts — from rental agreements to partnership deeds — so you never miss a field.</p>
            </div>
            <div style="flex-shrink:0;width:160px;height:100px;background:var(--bg-2);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;position:relative;">
              <div style="width:120px;height:80px;background:white;border-radius:4px;position:relative;padding:8px;">
                <div style="height:3px;background:#e5e7eb;border-radius:2px;margin-bottom:4px;width:80%;"></div>
                <div style="height:3px;background:#e5e7eb;border-radius:2px;margin-bottom:4px;width:60%;"></div>
                <div style="position:absolute;bottom:8px;right:8px;width:40px;height:16px;border:1.5px dashed var(--accent-indigo);border-radius:2px;"></div>
                <div style="position:absolute;bottom:30px;left:8px;width:35px;height:16px;border:1.5px dashed var(--accent-indigo);border-radius:2px;"></div>
              </div>
            </div>
          </div>
          ${renderFeatureCard('Batch Signing', 'Sign 40+ pages in one session. Place your signature once and apply it to every detected field across the entire document.', featureIconSvg('layers'))}
          ${renderFeatureCard('Background Removal', 'Upload a photo of your signature on paper. We automatically remove the background, leaving clean strokes ready for placement.', featureIconSvg('scissors'))}
          ${renderFeatureCard('Audit Trail', 'Every signature placement is logged with timestamp, page number, and coordinates. Download a complete audit log alongside your signed PDF.', featureIconSvg('shield'))}
          ${renderFeatureCard('Multi-format Support', 'Upload PDF, DOCX, JPG, or PNG files up to 50MB. LawSign handles the conversion so you never need to think about formats.', featureIconSvg('file'))}
          ${renderFeatureCard('End-to-end Encryption', 'Your documents are encrypted during upload, processing, and storage. Files are auto-deleted after 30 days. We never share or train on your data.', featureIconSvg('lock'))}
          ${renderFeatureCard('Dashboard & History', 'Access every signed document from your personal dashboard. Search, filter, re-download, and manage your complete signing history.', featureIconSvg('grid'))}
        </div>
      </div>
    </section>

    <!-- ════ TESTIMONIALS ════ -->
    <section class="section" id="section-testimonials" style="background:var(--bg-2);">
      <div class="container">
        <div style="text-align:center;">
          <span class="section-label">Trusted by Professionals</span>
          <h2 class="section-title" style="margin-top:var(--space-3);">What lawyers are saying</h2>
        </div>
        <div class="testimonials-grid">
          <div class="testimonial-card">
            <div class="stars">${'<span class="star">★</span>'.repeat(5)}</div>
            <p class="quote">"I signed a 60-page sale deed in 7 minutes. Didn't miss a single page. My clerk couldn't believe it."</p>
            <p class="testimonial-author">Adv. Rajesh Mehta</p>
            <p class="testimonial-title">Property Lawyer · Mumbai 🇮🇳</p>
          </div>
          <div class="testimonial-card">
            <div class="stars">${'<span class="star">★</span>'.repeat(5)}</div>
            <p class="quote">"The AI detection is eerily accurate. It found signature fields I would have missed manually. Saved me on a partnership deed."</p>
            <p class="testimonial-author">CA Priya Nair</p>
            <p class="testimonial-title">Chartered Accountant · Bangalore 🇮🇳</p>
          </div>
          <div class="testimonial-card">
            <div class="stars">${'<span class="star">★</span>'.repeat(5)}</div>
            <p class="quote">"Finally, a signing tool that understands legal documents. The audit trail alone makes this worth every rupee."</p>
            <p class="testimonial-author">Barrister James Clarke</p>
            <p class="testimonial-title">Commercial Solicitor · London 🇬🇧</p>
          </div>
        </div>
        <div class="metrics-bar">
          <div class="metric-item">
            <div class="metric-number" data-count="12847">0</div>
            <div class="metric-label">Documents signed this month</div>
          </div>
          <div class="metric-item">
            <div class="metric-number" data-count="4.2" data-suffix=" min">0</div>
            <div class="metric-label">Average signing time</div>
          </div>
          <div class="metric-item">
            <div class="metric-number" data-count="98.6" data-suffix="%">0</div>
            <div class="metric-label">AI field detection accuracy</div>
          </div>
          <div class="metric-item">
            <div class="metric-number" data-count="4.9" data-suffix="/5">0</div>
            <div class="metric-label">Customer satisfaction</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ════ PRICING ════ -->
    <section class="section" id="section-pricing">
      <div class="container">
        <div class="pricing-header">
          <span class="section-label">Pricing</span>
          <h2 class="section-title" style="margin-top:var(--space-3);">Simple, honest pricing</h2>
          <div class="currency-toggle">
            <span class="currency-opt active" data-currency="inr">₹ INR</span>
            <div class="toggle" id="currency-toggle"></div>
            <span class="currency-opt" data-currency="usd">$ USD</span>
          </div>
        </div>
        <div class="pricing-grid">
          <!-- Free -->
          <div class="card pricing-card">
            <div class="pricing-plan-name">Free</div>
            <div class="pricing-price"><span class="currency-symbol">₹</span>0<span class="period">/month</span></div>
            <div class="pricing-features">
              <div class="pricing-feature">${checkSvg} 5 documents per month</div>
              <div class="pricing-feature">${checkSvg} Up to 10 pages per document</div>
              <div class="pricing-feature">${checkSvg} AI field detection</div>
              <div class="pricing-feature">${checkSvg} Basic audit trail</div>
              <div class="pricing-feature disabled">${checkSvg} Priority processing</div>
              <div class="pricing-feature disabled">${checkSvg} Team collaboration</div>
            </div>
            <a href="#/register" class="btn btn-ghost btn-full">Get Started</a>
          </div>
          <!-- Solo Lawyer -->
          <div class="card-elevated pricing-card hero-plan">
            <span class="badge badge-solid popular-badge">Most Popular</span>
            <div class="pricing-plan-name">Solo Lawyer</div>
            <div class="pricing-price"><span class="currency-symbol">₹</span><span class="price-value">499</span><span class="period">/month</span></div>
            <div class="pricing-features">
              <div class="pricing-feature">${checkSvg} Unlimited documents</div>
              <div class="pricing-feature">${checkSvg} Up to 100 pages per document</div>
              <div class="pricing-feature">${checkSvg} AI field detection</div>
              <div class="pricing-feature">${checkSvg} Full audit trail with PDF export</div>
              <div class="pricing-feature">${checkSvg} Priority processing</div>
              <div class="pricing-feature disabled">${checkSvg} Team collaboration</div>
            </div>
            <a href="#/register" class="btn btn-primary btn-full">Start Free Trial</a>
          </div>
          <!-- Firm -->
          <div class="card pricing-card">
            <div class="pricing-plan-name">Firm</div>
            <div class="pricing-price"><span class="currency-symbol">₹</span><span class="price-value">1,999</span><span class="period">/month</span></div>
            <div class="pricing-features">
              <div class="pricing-feature">${checkSvg} Everything in Solo</div>
              <div class="pricing-feature">${checkSvg} Up to 500 pages per document</div>
              <div class="pricing-feature">${checkSvg} 5 team members included</div>
              <div class="pricing-feature">${checkSvg} Team collaboration</div>
              <div class="pricing-feature">${checkSvg} Centralized billing</div>
              <div class="pricing-feature">${checkSvg} Dedicated support</div>
            </div>
            <a href="#/register" class="btn btn-ghost btn-full">Contact Sales</a>
          </div>
        </div>
        <p class="pricing-objection">No credit card required for Free. Cancel anytime on paid plans.</p>
      </div>
    </section>

    <!-- ════ FINAL CTA ════ -->
    <section class="section final-cta" id="section-security">
      <div class="container" style="position:relative;z-index:1;">
        <h2>Ready to sign your first document?</h2>
        <p class="sub">Takes 3 minutes. No setup. No training. Just upload and sign.</p>
        <div class="final-cta-buttons">
          <a href="#/upload" class="btn btn-primary btn-lg">Start for Free</a>
          <a href="mailto:legal@lawsign.in" class="btn btn-ghost-white btn-lg">Talk to us first</a>
        </div>
        <p class="final-cta-email">or email legal@lawsign.in</p>
        <div class="trust-pills">
          <span class="trust-pill">🔒 IT Act 2000 compliant</span>
          <span class="divider-vertical"></span>
          <span class="trust-pill">🛡️ AES-256 encrypted</span>
          <span class="divider-vertical"></span>
          <span class="trust-pill">📋 Audit trail included</span>
          <span class="divider-vertical"></span>
          <span class="trust-pill">🚫 No document retention</span>
        </div>
      </div>
    </section>

    <!-- ════ FOOTER ════ -->
    <footer class="footer">
      <div class="container">
        <p>© 2026 LawSign. Built for legal professionals who value precision.</p>
      </div>
    </footer>
  `;

  app.appendChild(main);
  initAnimations();
  initCurrencyToggle();
}

function renderFeatureCard(title, desc, icon) {
  return `<div class="card feature-card">
    <div class="feature-icon">${icon}</div>
    <h3>${title}</h3>
    <p>${desc}</p>
  </div>`;
}

function featureIconSvg(type) {
  const icons = {
    layers: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
    scissors: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`,
    shield: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    file: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    lock: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    grid: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`
  };
  return icons[type] || '';
}

function initAnimations() {
  // Counter animation for metrics
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        const isFloat = target % 1 !== 0;
        const duration = 2000;
        const start = performance.now();

        function update(now) {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = target * eased;
          el.textContent = (isFloat ? current.toFixed(1) : Math.floor(current).toLocaleString()) + suffix;
          if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-count]').forEach(el => observer.observe(el));

  // Fade-in on scroll
  const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        fadeObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.card, .step-card, .testimonial-card, .pricing-card, .problem-conclusion').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    fadeObserver.observe(el);
  });
}

function initCurrencyToggle() {
  const toggle = document.getElementById('currency-toggle');
  if (!toggle) return;
  let isUSD = false;
  const rates = { '499': '$6', '1,999': '$24' };

  toggle.addEventListener('click', () => {
    isUSD = !isUSD;
    toggle.classList.toggle('active', isUSD);
    document.querySelectorAll('.currency-symbol').forEach(el => el.textContent = isUSD ? '$' : '₹');
    document.querySelectorAll('.price-value').forEach(el => {
      if (isUSD) {
        el.dataset.inr = el.textContent;
        el.textContent = rates[el.textContent] || el.textContent;
      } else {
        el.textContent = el.dataset.inr || el.textContent;
      }
    });
    document.querySelectorAll('.currency-opt').forEach(el => {
      el.classList.toggle('active', (isUSD && el.dataset.currency === 'usd') || (!isUSD && el.dataset.currency === 'inr'));
    });
  });
}
