document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = window.location.port === '5000' ? '' : `http://${window.location.hostname}:5000`;
    let user = JSON.parse(localStorage.getItem('user'));

    if (!user || !user.email) {
        window.location.href = 'login.html';
        return;
    }

    let currentProfilePhoto = null;

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

        currentProfilePhoto = data.profile_photo || null;

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

        if (currentProfilePhoto) {
            const avatarLg = document.querySelector('.profile-avatar-large');
            if (avatarLg) {
                avatarLg.innerHTML = `<img src="${currentProfilePhoto}" alt="Profile Photo" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            }
            document.querySelectorAll('.user-avatar').forEach(el => {
                el.innerHTML = `<img src="${currentProfilePhoto}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            });
        }

        const lowStockToggle = document.querySelector('.toggle-switch[data-pref="lowStock"]');
        if (lowStockToggle && data.notif_low_stock !== undefined) {
            if (Number(data.notif_low_stock) === 1) lowStockToggle.classList.add('active'); else lowStockToggle.classList.remove('active');
        }
        const orderToggle = document.querySelector('.toggle-switch[data-pref="orderUpdates"]');
        if (orderToggle && data.notif_order_updates !== undefined) {
            if (Number(data.notif_order_updates) === 1) orderToggle.classList.add('active'); else orderToggle.classList.remove('active');
        }
        const agingToggle = document.querySelector('.toggle-switch[data-pref="agingStock"]');
        if (agingToggle && data.notif_aging_stock !== undefined) {
            if (Number(data.notif_aging_stock) === 1) agingToggle.classList.add('active'); else agingToggle.classList.remove('active');
        }
    }

    async function loadProfile() {
        try {
            const resp = await fetch(`${API_BASE}/api/profile?email=${encodeURIComponent(user.email)}&t=${Date.now()}`);
            if (resp.ok) {
                const data = await resp.json();
                updateUIWithData(data);
                localStorage.setItem('reinvent_profile_data', JSON.stringify(data));
                
                // Keep local storage header user in sync immediately
                user.name = `${data.first_name || ''} ${data.last_name || ''}`.trim() || user.name;
                user.profile_photo = data.profile_photo || null;
                localStorage.setItem('user', JSON.stringify(user));
                document.querySelectorAll('.user-info-text span').forEach(el => el.textContent = user.name || 'User');
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
                company: document.getElementById('profileCompany').value,
                profile_photo: currentProfilePhoto,
                notif_low_stock: document.querySelector('.toggle-switch[data-pref="lowStock"]')?.classList.contains('active') ? 1 : 0,
                notif_order_updates: document.querySelector('.toggle-switch[data-pref="orderUpdates"]')?.classList.contains('active') ? 1 : 0,
                notif_aging_stock: document.querySelector('.toggle-switch[data-pref="agingStock"]')?.classList.contains('active') ? 1 : 0
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
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
            showToast('Preference changed. Click Save Changes to apply.', 'success');
        });
    });

    // Profile Photo Change
    const changePhotoBtn = document.getElementById('changePhotoBtn');
    const photoInput = document.getElementById('profilePhotoInput');
    if (changePhotoBtn && photoInput) {
        changePhotoBtn.addEventListener('click', () => photoInput.click());
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
                return showToast('Image size should be less than 2MB', 'error');
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                currentProfilePhoto = ev.target.result;
                const avatarLg = document.querySelector('.profile-avatar-large');
                if (avatarLg) {
                    avatarLg.innerHTML = `<img src="${currentProfilePhoto}" alt="Profile Photo" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
                }
                showToast('Photo selected! Remember to Save Changes.', 'success');
            };
            reader.readAsDataURL(file);
        });
    }

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