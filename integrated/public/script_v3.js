console.log('REINVENT_V2_INTEGRATED_V3_ACTIVE');
document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = window.location.port === '5000' ? '' : 'http://localhost:5000';

    // Contact Form (Splash Page)
    const queryForm = document.getElementById('queryForm');
    if (queryForm) {
        queryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const queryValue = document.getElementById('query').value.trim();
            if (!queryValue) return alert('Please enter a query.');

            try {
                const btn = queryForm.querySelector('button');
                btn.textContent = 'Sending...';
                btn.disabled = true;

                const resp = await fetch(`${API_BASE}/api/queries`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: queryValue })
                });

                if (resp.ok) {
                    alert('Query sent successfully!');
                    queryForm.reset();
                } else {
                    alert('Failed to send query.');
                }
                btn.textContent = 'Submit';
                btn.disabled = false;
            } catch (err) {
                console.error(err);
                alert('Connection error. Is the server running?');
            }
        });
    }

    // Signup Form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(signupForm);
            const data = Object.fromEntries(formData.entries());

            if (data.password !== data.confirmPassword) {
                return alert('Passwords do not match!');
            }

            try {
                const btn = signupForm.querySelector('button');
                btn.textContent = 'Creating account...';
                btn.disabled = true;

                const resp = await fetch(`${API_BASE}/api/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await resp.json();
                if (resp.ok) {
                    alert('Account created successfully!');
                    location.href = 'login.html';
                } else {
                    alert(result.error || 'Registration failed.');
                }
                btn.innerHTML = 'Create Account <i class="fas fa-arrow-right-to-bracket"></i>';
                btn.disabled = false;
            } catch (err) {
                console.error(err);
                alert('Connection error. Server may be down.');
            }
        });
    }

    // Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(loginForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const btn = loginForm.querySelector('button');
                btn.textContent = 'Logging in...';
                btn.disabled = true;

                // Admin Bypass check (case-insensitive)
                const is_admin = data.email.toLowerCase() === 'admin123@gmail.com' && data.password === 'admin123';

                const resp = await fetch(`${API_BASE}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await resp.json();
                if (resp.ok) {
                    alert('Login successful!');
                    location.href = 'dashboard.html';
                } else {
                    if (is_admin) {
                        alert('Login successful (Admin Local)!');
                        location.href = 'dashboard.html';
                    } else {
                        alert(result.error || 'Login failed.');
                    }
                }
                btn.innerHTML = '<i class="fas fa-arrow-right-to-bracket"></i> Sign In';
                btn.disabled = false;
            } catch (err) {
                console.error('Login error:', err);
                // Fallback for Admin credentials if backend is down
                if (data.email.toLowerCase() === 'admin123@gmail.com' && data.password === 'admin123') {
                     alert('Login successful (Auto Bypass)!');
                     location.href = 'dashboard.html';
                } else {
                     alert('Server connection failed. Ensure "node server.js" is running in the integrated folder.');
                }
            }
        });
    }

    // Forgot Password Form
    const forgotForm = document.getElementById('forgotForm');
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(forgotForm);
            const data = Object.fromEntries(formData.entries());

            if (!data.email) return alert('Please enter your email address.');

            try {
                const btn = forgotForm.querySelector('button');
                const originalText = btn.textContent;
                btn.textContent = 'Sending...';
                btn.disabled = true;

                const resp = await fetch(`${API_BASE}/api/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (resp.ok) {
                    alert('Password reset link sent to your email!');
                    forgotForm.reset();
                } else {
                    const result = await resp.json();
                    alert(result.error || 'Failed to send reset link.');
                }
                btn.textContent = originalText;
                btn.disabled = false;
            } catch (err) {
                console.error(err);
                alert('Connection error. Server may be down.');
            }
        });
    }
});
