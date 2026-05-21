import { authAPI } from '../utils/api.js';

export function renderRegister(app) {
  app.innerHTML = `<div class="auth-page">
    <div class="auth-left">
      <a href="#/" class="auth-left-logo"><span style="font-size:var(--text-xl);font-weight:700;color:var(--text-1);">LawSign</span></a>
      <div class="auth-left-quote">
        <h2>"The future of legal document signing is here. And it's surprisingly simple."</h2>
        <div class="auth-testimonial">
          <div class="auth-avatar">PN</div>
          <div class="auth-testimonial-text">
            <div class="name">CA Priya Nair</div>
            <div class="title">Chartered Accountant · Bangalore</div>
          </div>
        </div>
      </div>
      <div></div>
    </div>
    <div class="auth-right">
      <form class="auth-form" onsubmit="return false;">
        <h1>Create your account</h1>
        <p class="auth-form-subtitle">Start signing documents in minutes</p>
        <div class="auth-form-fields">
          <div class="input-group">
            <label class="input-label">Full Name</label>
            <input type="text" class="input-field" placeholder="Adv. Full Name" id="reg-name">
          </div>
          <div class="input-group">
            <label class="input-label">Email</label>
            <input type="email" class="input-field" placeholder="you@lawfirm.com" id="reg-email">
          </div>
          <div class="input-group">
            <label class="input-label">Password</label>
            <input type="password" class="input-field" placeholder="Create a strong password" id="reg-password" oninput="updateStrength(this.value)">
            <div class="password-strength"><span id="s1"></span><span id="s2"></span><span id="s3"></span><span id="s4"></span></div>
            <div class="strength-label" id="strength-label">Enter a password</div>
          </div>
          <div class="input-group">
            <label class="input-label">Choose your plan</label>
            <div class="plan-selector">
              <div class="plan-option selected" onclick="selectPlan(this)">
                <div class="plan-name">Free</div>
                <div class="plan-price">₹0/mo</div>
              </div>
              <div class="plan-option" onclick="selectPlan(this)">
                <div class="plan-name">Solo</div>
                <div class="plan-price">₹499/mo</div>
              </div>
              <div class="plan-option" onclick="selectPlan(this)">
                <div class="plan-name">Firm</div>
                <div class="plan-price">₹1,999/mo</div>
              </div>
            </div>
          </div>
        </div>
        <div id="register-error" style="display:none;color:#ef4444;font-size:var(--text-sm);margin-bottom:8px;"></div>
        <button type="submit" class="btn btn-primary btn-full" id="btn-register-submit">Create Account</button>
        <div class="divider-text">or</div>
        <button type="button" class="google-btn">
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Sign up with Google
        </button>
        <p class="auth-bottom">Already have an account? <a href="#/login">Sign in</a></p>
      </form>
    </div>
  </div>`;
  window.updateStrength = function(val) {
    const colors = ['','var(--color-error)','var(--color-warning)','var(--accent-indigo)','var(--color-success)'];
    const labels = ['Enter a password','Weak','Fair','Strong','Very Strong'];
    let score = 0;
    if (val.length >= 8) score++;
    if (val.length >= 12) score++;
    if (/[A-Z]/.test(val) && /[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    for (let i = 1; i <= 4; i++) {
      document.getElementById('s'+i).style.background = i <= score ? colors[score] : 'var(--border-2)';
    }
    document.getElementById('strength-label').textContent = labels[score];
  };
  window.selectPlan = function(el) {
    el.parentElement.querySelectorAll('.plan-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
  };

  const form = app.querySelector('.auth-form');
  const errorDiv = app.querySelector('#register-error');
  const btn = app.querySelector('#btn-register-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = app.querySelector('#reg-name').value;
    const email = app.querySelector('#reg-email').value;
    const password = app.querySelector('#reg-password').value;
    
    const selectedPlanEl = app.querySelector('.plan-option.selected .plan-name');
    const plan = selectedPlanEl ? selectedPlanEl.textContent.toLowerCase() : 'free';

    errorDiv.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Creating account...';

    try {
      await authAPI.register(name, email, password, plan);
      window.location.hash = '#/upload';
    } catch (err) {
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  });
}
