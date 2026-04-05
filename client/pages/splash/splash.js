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
