export function withErrorBoundary(appElement, routeHandler) {
  return async () => {
    try {
      await Promise.resolve(routeHandler(appElement));
    } catch (err) {
      console.error('[ErrorBoundary] Caught error:', err);
      renderErrorCard(appElement, err, routeHandler);
    }
  };
}

function renderErrorCard(app, error, routeHandler) {
  const isDev = import.meta.env.DEV;
  
  app.innerHTML = `
    <div style="min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 20px;">
      <div style="background: var(--surface-1); border: 1px solid var(--border-color); border-radius: 12px; padding: 32px; max-width: 600px; width: 100%; box-shadow: 0 4px 24px rgba(0,0,0,0.1);">
        <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px; color: #ef4444;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <h2 style="margin: 0; font-size: 1.5rem;">Something went wrong</h2>
        </div>
        
        <p style="color: var(--text-2); margin-bottom: 16px; font-size: 1.1rem;">
          ${error.message || 'An unexpected error occurred while loading this page.'}
        </p>
        
        ${isDev && error.stack ? `
          <div style="background: var(--surface-2); padding: 16px; border-radius: 8px; overflow-x: auto; margin-bottom: 24px;">
            <pre style="margin: 0; font-family: monospace; font-size: 0.85rem; color: var(--text-3); white-space: pre-wrap; word-break: break-all;">${error.stack}</pre>
          </div>
        ` : '<div style="margin-bottom: 24px;"></div>'}
        
        <div style="display: flex; gap: 12px;">
          <button id="eb-retry-btn" class="btn btn-primary">Try Again</button>
          <a href="#/" class="btn btn-ghost" style="text-decoration: none; display: flex; align-items: center; justify-content: center;">Go Home</a>
        </div>
      </div>
    </div>
  `;

  const retryBtn = app.querySelector('#eb-retry-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      app.innerHTML = '<div style="text-align:center; padding:60px; color:var(--text-2);">Retrying...</div>';
      // Re-run the boundary logic
      withErrorBoundary(app, routeHandler)();
    });
  }
}
