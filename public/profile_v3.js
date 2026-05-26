document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = window.location.port === '5000' ? '' : 'http://localhost:5000';
    let user = JSON.parse(localStorage.getItem('user'));

    if (!user || !user.email) {
        window.location.href = 'login.html';
        return;
    }

    function updateUIWithData(data) {
        const fN = document.getElementById('profileFirstName');
        const lN = document.getElementById('profileLastName');
        const em = document.getElementById('profileEmail');
        const ph = document.getElementById('profilePhone');
        const co = document.getElementById('profileCompany');

        if (fN && data.first_name) fN.value = data.first_name;
        if (lN && data.last_name) lN.value = data.last_name;
        if (em && data.email) em.value = data.email;
        if (ph && data.phone) ph.value = data.phone;
        if (co && data.company) co.value = data.company;

        // Update header tags
        const hName = document.querySelector('.name-status h2');
        const hEmail = document.querySelector('.meta-row span');
        const sidebarName = document.querySelector('.u-text strong');

        const fullName = `${data.first_name || 'User'} ${data.last_name || ''}`.trim();
        if (hName) hName.textContent = fullName;
        if (hEmail) hEmail.textContent = data.email || user.email;
        if (sidebarName) sidebarName.textContent = fullName;
    }

    async function loadProfile() {
        try {
            const resp = await fetch(`${API_BASE}/api/profile?email=${encodeURIComponent(user.email)}`);
            if (resp.ok) {
                const data = await resp.json();
                updateUIWithData(data);
                localStorage.setItem('reinvent_profile_data', JSON.stringify(data));
            }
        } catch (err) {
            console.warn('Profile fetch failed', err);
        }
    }

    loadProfile();

    const saveChangesBtn = document.getElementById('saveChangesBtn');
    if (saveChangesBtn) {
        saveChangesBtn.addEventListener('click', async () => {
            saveChangesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            const data = {
                firstName: document.getElementById('profileFirstName').value,
                lastName: document.getElementById('profileLastName').value,
                email: user.email,
                phone: document.getElementById('profilePhone').value,
                company: document.getElementById('profileCompany').value
            };

            try {
                const resp = await fetch(`${API_BASE}/api/profile`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (resp.ok) {
                    alert('Profile updated successfully!');
                    loadProfile(); // Refresh UI
                } else {
                    const res = await resp.json();
                    alert('Error: ' + (res.error || 'Server error'));
                }
            } catch (err) {
                alert('Connection error.');
            }
            saveChangesBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        });
    }

    // Toggle Edit Mode
    const editBtn = document.getElementById('editProfileBtn');
    let isEditing = false;
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            isEditing = !isEditing;
            const inputs = document.querySelectorAll('.profile-form input:not([readonly])');
            inputs.forEach(input => {
                input.readOnly = !isEditing;
                if (isEditing) input.classList.add('editing-active');
                else input.classList.remove('editing-active');
            });
            editBtn.innerHTML = isEditing ? '<i class="fas fa-check"></i> Done' : '<i class="fas fa-edit"></i> Edit';
        });

        // Initially lock inputs
        document.querySelectorAll('.profile-form input').forEach(inp => {
            if (inp.id !== 'profileEmail') inp.readOnly = true;
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to log out?")) {
                localStorage.removeItem('user');
                location.href = "login.html";
            }
        });
    }
});