document.addEventListener('DOMContentLoaded', () => {
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
                const originalContent = btn.innerHTML;
                btn.textContent = 'Creating account...';
                btn.disabled = true;

                // Call the actual API
                const resp = await fetch('http://localhost:3000/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await resp.json();
                if (resp.ok) {
                    alert('Account created successfully!');
                    // Redirect to signin page
                    window.location.href = '../signin/signin.html';
                } else {
                    alert(result.message || 'Registration failed.');
                }
                btn.innerHTML = originalContent;
                btn.disabled = false;
            } catch (err) {
                console.error('Error during signup:', err);
                alert('Connection error. Please ensure the server is running.');
            }
        });
    }
});
