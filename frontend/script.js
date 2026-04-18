document.addEventListener('DOMContentLoaded', () => {
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

                // Simulate/Call API
                const resp = await fetch('/api/queries', {
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
                alert('Success! (Mocked for frontend-only view)');
                queryForm.reset();
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

                const resp = await fetch('/api/register', {
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
                alert('Feature available in integrated version.');
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

                // Frontend validation for specified task
                if (data.email === 'Admin123@gmail.com' && data.password === 'admin123') {
                    setTimeout(() => {
                        alert('Login successful!');
                        location.href = 'dashboard.html';
                    }, 500);
                    return;
                }

                const resp = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await resp.json();
                if (resp.ok) {
                    alert('Login successful!');
                    location.href = 'dashboard.html';
                } else {
                    alert(result.error || 'Login failed.');
                }
                btn.innerHTML = '<i class="fas fa-arrow-right-to-bracket"></i> Sign In';
                btn.disabled = false;
            } catch (err) {
                console.error(err);
                if (data.email === 'Admin123@gmail.com' && data.password === 'admin123') {
                     alert('Login successful!');
                     location.href = 'dashboard.html';
                } else {
                     alert('Feature available in integrated version.');
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

                // Simulate API call
                const resp = await fetch('/api/forgot-password', {
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
                alert('Password reset link sent! (Mocked for frontend-only view)');
                forgotForm.reset();
            }
        });
    }
});
