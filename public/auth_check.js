/**
 * auth_check.js — Runs before any page script.
 * Verifies the server session is valid. If not, redirects to login.
 * On success, overwrites localStorage with the session user so stale
 * data from a previous account is never used.
 */
(async function () {
    const API_BASE = window.location.port === '5000'
        ? ''
        : `http://${window.location.hostname}:5000`;

    const publicPages = ['login.html', 'signup.html', 'forgot_password.html', 'index.html', ''];
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Skip auth check on public pages
    if (publicPages.includes(currentPage)) return;

    try {
        const resp = await fetch(`${API_BASE}/api/check-auth`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!resp.ok) {
            // Server error — don't redirect, but don't trust localStorage either
            console.warn('Auth check failed with status:', resp.status);
            return;
        }

        const result = await resp.json();

        if (!result.authenticated) {
            // No valid session — wipe any stale local data and go to login
            localStorage.removeItem('user');
            localStorage.removeItem('reinvent_adv_products');
            localStorage.removeItem('reinvent_profile_data');
            window.location.href = 'login.html';
            return;
        }

        // Session is valid — overwrite localStorage with the authoritative
        // server-side user object so a new login never sees the old user's name
        localStorage.setItem('user', JSON.stringify(result.user));

    } catch (err) {
        // Network error — don't redirect (prevents phantom logouts on flaky connections)
        console.error('Auth check network error:', err);
    }
})();
