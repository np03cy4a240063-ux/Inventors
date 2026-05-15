(async function() {
    const API_BASE = window.location.port === '5000' ? '' : `http://${window.location.hostname}:5000`;
    
    // Pages that don't need auth
    const publicPages = ['login.html', 'signup.html', 'forgot_password.html', 'index.html'];
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    if (publicPages.includes(currentPage)) return;

    try {
        const resp = await fetch(`${API_BASE}/api/check-auth`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!resp.ok) {
            console.warn('Auth check server error:', resp.status);
            return; // Don't redirect on 500 or other server errors
        }

        const result = await resp.json();
        console.log('Auth status:', result.authenticated ? 'Logged In' : 'Logged Out');

        if (result.authenticated === false) {
            console.log('User not authenticated, redirecting to login...');
            window.location.href = 'login.html';
        } else if (result.authenticated === true) {
            localStorage.setItem('user', JSON.stringify(result.user));
        }
    } catch (err) {
        console.error('Auth check network/fetch error:', err);
        // Do NOT redirect on network errors to prevent "phantom" logouts
    }
})();
