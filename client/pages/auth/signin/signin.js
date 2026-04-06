document.addEventListener('DOMContentLoaded', () => {
    const signinForm = document.getElementById('signinForm');
    if (signinForm) {
        signinForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(signinForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const btn = signinForm.querySelector('button');
                const originalContent = btn.innerHTML;
                btn.textContent = 'Signing in...';
                btn.disabled = true;

                // Call the actual API
                const resp = await fetch('http://localhost:3000/api/auth/signin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await resp.json();
                if (resp.ok) {
                    // Store token in localStorage (simplest for now)
                    localStorage.setItem('token', result.token);
                    localStorage.setItem('user', JSON.stringify(result.user));

                    alert('Logged in successfully!');
                    // Redirect to dashboard
                    window.location.href = '../../dashboard/dashboard.html';
                } else {
                    alert(result.message || 'Login failed.');
                }
                btn.innerHTML = originalContent;
                btn.disabled = false;
            } catch (err) {
                console.error('Error during signin:', err);
                alert('Connection error. Please ensure the server is running.');
            }
        });
    }
});
