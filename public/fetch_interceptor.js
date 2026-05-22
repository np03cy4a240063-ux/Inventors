// ── Global Fetch Interceptor ──
// Ensures every fetch() call sends the session cookie (credentials: 'include').
// This file MUST be loaded before any other JS that makes fetch calls.
(function() {
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
        options.credentials = options.credentials || 'include';
        return originalFetch.call(this, url, options);
    };
})();
