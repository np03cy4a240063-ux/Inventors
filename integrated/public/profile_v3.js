document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = window.location.port === '5000' ? '' : `http://${window.location.hostname}:5000`;
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
        const hEmail = document.querySelector('.meta-row span:nth-child(1)');
        const memberSince = document.getElementById('memberSince');
        const sidebarName = document.querySelector('.u-text strong');

        const fullName = `${data.first_name || 'User'} ${data.last_name || ''}`.trim();
        if (hName) hName.textContent = fullName;
        if (hEmail) hEmail.textContent = data.email || user.email;
        if (sidebarName) sidebarName.textContent = fullName;
        
        if (memberSince && data.created_at) {
            const d = new Date(data.created_at);
            memberSince.innerHTML = `Member since ${d.toLocaleString('default', {month:'short'})} ${d.getFullYear()}`;
        }
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

    async function loadActivity() {
        try {
            const resp = await fetch(`${API_BASE}/api/analytics`);
            if (resp.ok) {
                const data = await resp.json();
                const transVal = data.metrics && data.metrics[0] ? data.metrics[0].units_sold : 0;
                document.getElementById('activityTransactions').textContent = transVal || 0;
                
                const prodResp = await fetch(`${API_BASE}/api/products`);
                if (prodResp.ok) {
                    const products = await prodResp.json();
                    document.getElementById('activityProducts').textContent = products.length;
                }
            }
        } catch (err) {
            console.warn('Activity fetch failed', err);
        }
    }

    // Set Last Login
    const lastLoginEl = document.getElementById('lastLoginTime');
    if (lastLoginEl) {
        lastLoginEl.innerHTML = `Last Login: Today, ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    }

    loadProfile();
    loadActivity();

    // Profile Save
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
                    showToast('Profile updated successfully!', 'success');
                    user.name = `${data.firstName} ${data.lastName}`.trim();
                    localStorage.setItem('user', JSON.stringify(user));
                    loadProfile(); // Refresh UI
                } else {
                    const res = await resp.json();
                    showToast('Error: ' + (res.error || 'Server error'), 'error');
                }
            } catch (err) {
                showToast('Connection error.', 'error');
            }
            saveChangesBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        });
    }

    // Change Password
    const updatePasswordBtn = document.getElementById('updatePasswordBtn');
    if (updatePasswordBtn) {
        updatePasswordBtn.addEventListener('click', async () => {
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (!currentPassword || !newPassword || !confirmPassword) {
                return showToast('Please fill all password fields', 'error');
            }
            if (newPassword !== confirmPassword) {
                return showToast('New passwords do not match!', 'error');
            }
            if (newPassword.length < 8) {
                return showToast('New password must be at least 8 characters', 'error');
            }

            updatePasswordBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            updatePasswordBtn.disabled = true;

            try {
                const resp = await fetch(`${API_BASE}/api/change-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: user.email, currentPassword, newPassword })
                });
                const res = await resp.json();
                
                if (resp.ok) {
                    showToast('Password changed successfully!', 'success');
                    document.getElementById('passwordForm').reset();
                } else {
                    showToast(res.error || 'Failed to change password', 'error');
                }
            } catch (err) {
                showToast('Connection error.', 'error');
            }
            updatePasswordBtn.innerHTML = '<i class="fas fa-key"></i> Update Password';
            updatePasswordBtn.disabled = false;
        });
    }

    // Toggle Edit Mode
    const editBtn = document.getElementById('editProfileBtn');
    let isEditing = false;
    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            e.preventDefault();
            isEditing = !isEditing;
            const inputs = document.querySelectorAll('#personalInfoForm input:not(#profileEmail)');
            inputs.forEach(input => {
                input.readOnly = !isEditing;
                if (isEditing) input.classList.add('editing-active');
                else input.classList.remove('editing-active');
            });
            editBtn.innerHTML = isEditing ? '<i class="fas fa-check"></i> Done' : '<i class="fas fa-edit"></i> Edit';
        });

        // Initially lock inputs
        document.querySelectorAll('#personalInfoForm input').forEach(inp => {
            if (inp.id !== 'profileEmail') inp.readOnly = true;
        });
    }

    // Notification Prefs
    const toggles = document.querySelectorAll('.toggle-switch');
    toggles.forEach(toggle => {
        const prefKey = `notif_pref_${user.email}_${toggle.dataset.pref}`;
        if (localStorage.getItem(prefKey) === 'false') {
            toggle.classList.remove('active');
        }
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
            localStorage.setItem(prefKey, toggle.classList.contains('active'));
            showToast('Preferences updated', 'success');
        });
    });

    // Password Visibility Toggle
    document.querySelectorAll('.toggle-pass-vis').forEach(eye => {
        eye.addEventListener('click', () => {
            const input = document.getElementById(eye.dataset.target);
            if (!input) return;
            input.type = input.type === 'password' ? 'text' : 'password';
            eye.classList.toggle('fa-eye-slash');
            eye.classList.toggle('fa-eye');
        });
    });

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to log out? These actions are permanent and cannot be undone.")) {
                localStorage.removeItem('user');
                location.href = "login.html";
            }
        });
    }
});