// ── Global Fetch Interceptor ──
// Ensures every fetch() call sends the session cookie and user identity
(function() {
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
        options.credentials = options.credentials || 'include';
        options.headers = options.headers || {};
        
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (user && user.email) {
                options.headers['X-User-Email'] = user.email;
            }
        } catch(e) {}
        
        return originalFetch.call(this, url, options);
    };
})();
