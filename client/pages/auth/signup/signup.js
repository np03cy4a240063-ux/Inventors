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
