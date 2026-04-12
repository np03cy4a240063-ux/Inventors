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

                const resp = await fetch('http://localhost:3000/api/auth/signin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: data.email, password: data.password })
                });

                const result = await resp.json();

                if (resp.ok) {
                    // Save token
                    localStorage.setItem('token', result.token);
                    // Go straight to dashboard
                    window.location.href = '../../dashboard/dashboard.html';
                } else {
                    alert(result.message || 'Login failed. Check your credentials.');
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
