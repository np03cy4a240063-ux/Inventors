/**
 * profile_v3.js — Complete Profile Page Controller
 * Handles: Edit profile, Save changes, Change password, Activity stats,
 *          Notification toggles, Logout (custom modal — NO browser confirm/alert)
 */

// Global Toast Notification (if not already defined by script_v3.js)
if (typeof window.showToast === 'undefined') {
    window.showToast = function(message, type = 'error') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            display:flex; align-items:center; gap:12px;
            padding:14px 20px; border-radius:14px; cursor:pointer;
            font-family:'Inter',sans-serif; font-size:0.95rem; font-weight:600;
            box-shadow:0 8px 30px rgba(0,0,0,0.18); opacity:0;
            transform:translateY(-20px) scale(0.95);
            transition:all 0.35s cubic-bezier(0.34,1.56,0.64,1);
            background:${type === 'success' ? '#00C851' : '#FF4D4D'};
            color:#fff; min-width:300px; max-width:420px;
        `;
        toast.innerHTML = `<i class="fas ${icon}" style="font-size:1.1rem;flex-shrink:0;"></i>
            <span style="flex:1;">${message}</span>
            <i class="fas fa-times" style="opacity:0.6;font-size:0.85rem;flex-shrink:0;"></i>`;

        container.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0) scale(1)'; }, 10);

        const remove = () => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px) scale(0.95)';
            setTimeout(() => {
                toast.remove();
                if (container.children.length === 0) container.remove();
            }, 350);
        };
        toast.addEventListener('click', remove);
        setTimeout(remove, 5000);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = window.location.port === '5000' ? '' : `http://${window.location.hostname}:5000`;

    let isEditing = false;

    // ══════════════════════════════════════════════════════════════════════════
    //  1. LOAD PROFILE FROM SERVER
    // ══════════════════════════════════════════════════════════════════════════
    async function loadProfile() {
        try {
            const resp = await fetch(`${API_BASE}/api/profile`, { credentials: 'include' });
            if (!resp.ok) throw new Error('Not authenticated');
            const data = await resp.json();
            populateForm(data);
            populateHeader(data);

            // Keep localStorage in sync
            const stored = JSON.parse(localStorage.getItem('user') || '{}');
            stored.firstName = data.first_name;
            stored.lastName  = data.last_name;
            stored.name      = `${data.first_name || ''} ${data.last_name || ''}`.trim();
            stored.email     = data.email;
            stored.company   = data.company || '';
            localStorage.setItem('user', JSON.stringify(stored));
        } catch (err) {
            console.warn('Profile load failed:', err);
        }
    }

    function populateForm(data) {
        safeSet('profileFirstName', data.first_name || '');
        safeSet('profileLastName',  data.last_name  || '');
        safeSet('profileEmail',     data.email      || '');
        safeSet('profilePhone',     data.phone      || '');
        safeSet('profileCompany',   data.company    || '');
    }

    function populateHeader(data) {
        const fullName = `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'User';
        const initials = ((data.first_name?.[0] || '') + (data.last_name?.[0] || '')).toUpperCase() || 'U';

        const nameEl = document.querySelector('.name-status h2');
        if (nameEl) nameEl.textContent = fullName;

        const avatarEl = document.querySelector('.profile-avatar-large');
        if (avatarEl) {
            avatarEl.innerHTML = `<span style="font-size:2rem;font-weight:800;color:#475569;">${initials}</span>`;
        }

        const metaSpans = document.querySelectorAll('.meta-row span');
        if (metaSpans[0]) metaSpans[0].textContent = data.email || '';

        const memberEl = document.getElementById('memberSince');
        if (memberEl && data.created_at) {
            const d = new Date(data.created_at);
            memberEl.textContent = 'Member since ' + d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        }

        const loginEl = document.getElementById('lastLoginTime');
        if (loginEl) {
            const now = new Date();
            loginEl.textContent = 'Last Login: ' + now.toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        }

        // Update sidebar and header user sections
        document.querySelectorAll('.u-text strong').forEach(el => el.textContent = fullName);
        document.querySelectorAll('.user-avatar').forEach(el => el.textContent = initials);
        document.querySelectorAll('.user-info-text span').forEach(el => el.textContent = fullName);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  2. LOAD ACTIVITY STATS (from real API data)
    // ══════════════════════════════════════════════════════════════════════════
    async function loadActivity() {
        const safeFetch = async (url) => {
            try {
                const r = await fetch(url, { credentials: 'include' });
                if (!r.ok) return [];
                return await r.json();
            } catch { return []; }
        };

        try {
            const [products, sales, purchases] = await Promise.all([
                safeFetch(`${API_BASE}/api/products`),
                safeFetch(`${API_BASE}/api/sales_orders`),
                safeFetch(`${API_BASE}/api/purchase_orders`)
            ]);

            const prodArr  = Array.isArray(products)  ? products  : [];
            const salesArr = Array.isArray(sales)      ? sales     : [];
            const purchArr = Array.isArray(purchases)  ? purchases : [];

            const transactions = salesArr.length + purchArr.length;
            const pending = [...salesArr, ...purchArr].filter(o => o && o.status === 'PENDING').length;
            const reports = parseInt(localStorage.getItem('reinvent_reports_count') || '0', 10);

            safeSet('activityTransactions', transactions);
            safeSet('activityProducts',     prodArr.length);
            safeSet('activityPending',      pending);
            safeSet('activityReports',      reports);
        } catch (err) {
            console.warn('Activity load failed:', err);
        }
    }

    // Kick off both loads immediately
    loadProfile();
    loadActivity();

    // ══════════════════════════════════════════════════════════════════════════
    //  3. EDIT PROFILE (toggle lock / unlock inputs)
    // ══════════════════════════════════════════════════════════════════════════
    const editBtn      = document.getElementById('editProfileBtn');
    const saveBtn      = document.getElementById('saveChangesBtn');
    const personalForm = document.getElementById('personalInfoForm');

    // Helper: lock / unlock all editable inputs
    function lockForm() {
        if (!personalForm) return;
        const inputs = personalForm.querySelectorAll('input:not(#profileEmail)');
        inputs.forEach(inp => {
            inp.readOnly = true;
            inp.style.pointerEvents = 'none';
            inp.style.background    = '#F1F5F9';
            inp.style.borderColor   = '#E2E8F0';
            inp.style.boxShadow     = 'none';
            inp.style.cursor        = 'default';
        });
    }

    function unlockForm() {
        if (!personalForm) return;
        const inputs = personalForm.querySelectorAll('input:not(#profileEmail)');
        inputs.forEach(inp => {
            inp.readOnly = false;
            inp.style.pointerEvents = 'auto';
            inp.style.background    = '#ffffff';
            inp.style.borderColor   = '#4F46E5';
            inp.style.boxShadow     = '0 0 0 3px rgba(79,70,229,0.08)';
            inp.style.cursor        = 'text';
        });
    }

    // Start locked
    lockForm();

    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isEditing = !isEditing;

            if (isEditing) {
                unlockForm();
                editBtn.innerHTML = '<i class="fas fa-times"></i> Cancel';
                editBtn.style.background   = '#FEE2E2';
                editBtn.style.color        = '#DC2626';
                editBtn.style.borderColor  = '#FECACA';
                document.getElementById('profileFirstName')?.focus();
            } else {
                lockForm();
                editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
                editBtn.style.background   = '';
                editBtn.style.color        = '';
                editBtn.style.borderColor  = '';
                loadProfile(); // revert unsaved changes
            }
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  4. SAVE CHANGES (profile update — no success popup)
    // ══════════════════════════════════════════════════════════════════════════
    if (saveBtn) {
        saveBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            if (!isEditing) {
                showToast('Click Edit first to make changes.', 'error');
                return;
            }

            const firstName = document.getElementById('profileFirstName')?.value.trim();
            const lastName  = document.getElementById('profileLastName')?.value.trim();
            if (!firstName || !lastName) {
                showToast('First and last name are required.', 'error');
                return;
            }

            const origHTML = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            saveBtn.disabled = true;

            try {
                const resp = await fetch(`${API_BASE}/api/profile`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        firstName,
                        lastName,
                        phone:   document.getElementById('profilePhone')?.value.trim()   || '',
                        company: document.getElementById('profileCompany')?.value.trim() || ''
                    })
                });

                if (resp.ok) {
                    // Silently succeed — lock form, reload data
                    isEditing = false;
                    lockForm();
                    if (editBtn) {
                        editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
                        editBtn.style.background   = '';
                        editBtn.style.color        = '';
                        editBtn.style.borderColor  = '';
                    }
                    loadProfile();
                } else {
                    const errData = await resp.json();
                    showToast(errData.error || 'Failed to save.', 'error');
                }
            } catch (_) {
                showToast('Connection error.', 'error');
            } finally {
                saveBtn.innerHTML = origHTML;
                saveBtn.disabled = false;
            }
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  5. CHANGE PASSWORD
    // ══════════════════════════════════════════════════════════════════════════
    const updatePasswordBtn = document.getElementById('updatePasswordBtn');
    if (updatePasswordBtn) {
        updatePasswordBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            const currentVal = document.getElementById('currentPassword')?.value;
            const newVal     = document.getElementById('newPassword')?.value;
            const confirmVal = document.getElementById('confirmPassword')?.value;

            if (!currentVal || !newVal || !confirmVal) {
                showToast('Please fill in all password fields.', 'error');
                return;
            }
            if (newVal.length < 6) {
                showToast('New password must be at least 6 characters.', 'error');
                return;
            }
            if (!/^(?=.*[A-Z])(?=.*[!@#$%^&*]).{6,}$/.test(newVal)) {
                showToast('Password needs 1 uppercase and 1 special character (!@#$%^&*).', 'error');
                return;
            }
            if (newVal !== confirmVal) {
                showToast('New passwords do not match.', 'error');
                return;
            }

            const origHTML = updatePasswordBtn.innerHTML;
            updatePasswordBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            updatePasswordBtn.disabled = true;

            try {
                const resp = await fetch(`${API_BASE}/api/change-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ currentPassword: currentVal, newPassword: newVal })
                });
                const result = await resp.json();
                if (resp.ok) {
                    showToast('Password updated successfully!', 'success');
                    ['currentPassword', 'newPassword', 'confirmPassword'].forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.value = '';
                    });
                } else {
                    showToast(result.error || 'Failed to update password.', 'error');
                }
            } catch (_) {
                showToast('Connection error.', 'error');
            } finally {
                updatePasswordBtn.innerHTML = origHTML;
                updatePasswordBtn.disabled = false;
            }
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  6. PASSWORD VISIBILITY TOGGLES
    // ══════════════════════════════════════════════════════════════════════════
    document.querySelectorAll('.toggle-pass-vis').forEach(icon => {
        icon.addEventListener('click', () => {
            const input = document.getElementById(icon.dataset.target);
            if (!input) return;
            const hidden = input.type === 'password';
            input.type = hidden ? 'text' : 'password';
            icon.classList.toggle('fa-eye',       hidden);
            icon.classList.toggle('fa-eye-slash', !hidden);
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    //  7. CHANGE PHOTO
    // ══════════════════════════════════════════════════════════════════════════
    const changePhotoBtn = document.getElementById('changePhotoBtn');
    if (changePhotoBtn) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        changePhotoBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
                showToast('Image must be under 2 MB.', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const el = document.querySelector('.profile-avatar-large');
                if (el) el.innerHTML = `<img src="${e.target.result}" alt="Avatar"
                    style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            };
            reader.readAsDataURL(file);
            fileInput.value = '';
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  8. NOTIFICATION PREFERENCE TOGGLES (no popups)
    // ══════════════════════════════════════════════════════════════════════════
    const defaultPrefs = { lowStock: true, orderUpdates: true, agingStock: true };
    let notifPrefs = { ...defaultPrefs };
    try {
        const saved = JSON.parse(localStorage.getItem('reinvent_notif_prefs'));
        if (saved && typeof saved === 'object') notifPrefs = { ...defaultPrefs, ...saved };
    } catch (_) {}

    document.querySelectorAll('.toggle-switch[data-pref]').forEach(sw => {
        const pref = sw.dataset.pref;

        // Set correct initial visual state
        if (notifPrefs[pref] === false) {
            sw.classList.remove('active');
        } else {
            sw.classList.add('active');
        }

        // Clone to remove any stale listeners
        const fresh = sw.cloneNode(true);
        sw.parentNode.replaceChild(fresh, sw);

        fresh.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const nowActive = fresh.classList.toggle('active');
            notifPrefs[pref] = nowActive;
            localStorage.setItem('reinvent_notif_prefs', JSON.stringify(notifPrefs));
            // No toast / no popup — just silently save
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    //  9. LOGOUT — Custom styled modal (NO browser confirm / alert)
    // ══════════════════════════════════════════════════════════════════════════
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        // Remove any previously attached listeners by cloning
        const freshLogout = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(freshLogout, logoutBtn);

        freshLogout.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            showLogoutModal();
            return false;
        });
    }

    function showLogoutModal() {
        // Remove any existing modal
        const existing = document.getElementById('_profileLogoutModal');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = '_profileLogoutModal';
        overlay.style.cssText = `
            position:fixed; inset:0; background:rgba(15,23,42,0.55);
            backdrop-filter:blur(6px); z-index:99999;
            display:flex; align-items:center; justify-content:center;
        `;

        overlay.innerHTML = `
            <div style="
                background:#fff; border-radius:20px; padding:40px 36px;
                width:380px; max-width:90vw; text-align:center;
                box-shadow:0 25px 60px rgba(0,0,0,0.2);
                animation:modalPop 0.25s cubic-bezier(0.34,1.56,0.64,1);
            ">
                <div style="
                    width:64px; height:64px; background:#FEE2E2; border-radius:50%;
                    display:flex; align-items:center; justify-content:center;
                    margin:0 auto 20px; font-size:1.6rem; color:#DC2626;
                ">
                    <i class="fas fa-sign-out-alt"></i>
                </div>
                <h2 style="font-size:1.4rem;font-weight:800;color:#0F172A;margin:0 0 10px;">Log Out?</h2>
                <p style="color:#64748B;font-size:0.9rem;margin:0 0 28px;line-height:1.5;">
                    Are you sure you want to log out of ReInvent?<br>You'll need to sign in again to continue.
                </p>
                <div style="display:flex;gap:12px;justify-content:center;">
                    <button id="_profLogoutCancel" style="
                        flex:1; padding:12px; border:1.5px solid #E2E8F0; border-radius:12px;
                        background:#fff; color:#475569; font-weight:700; font-size:0.9rem;
                        cursor:pointer; font-family:inherit; transition:background 0.15s;
                    ">Cancel</button>
                    <button id="_profLogoutConfirm" style="
                        flex:1; padding:12px; border:none; border-radius:12px;
                        background:#DC2626; color:#fff; font-weight:700; font-size:0.9rem;
                        cursor:pointer; font-family:inherit; transition:background 0.15s;
                    ">Yes, Log Out</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Cancel
        document.getElementById('_profLogoutCancel').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (ev) => { if (ev.target === overlay) overlay.remove(); });

        // Confirm logout
        document.getElementById('_profLogoutConfirm').addEventListener('click', async () => {
            document.getElementById('_profLogoutConfirm').innerHTML =
                '<i class="fas fa-spinner fa-spin"></i> Logging out...';
            try {
                await fetch(`${API_BASE}/api/logout`, { method: 'POST', credentials: 'include' });
            } catch (_) {}
            localStorage.removeItem('user');
            localStorage.removeItem('reinvent_adv_products');
            localStorage.removeItem('reinvent_profile_data');
            localStorage.removeItem('reinvent_notif_prefs');
            window.location.href = 'index.html';
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  UTILITY
    // ══════════════════════════════════════════════════════════════════════════
    function safeSet(id, val) {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = val;
        else el.textContent = val;
    }
});
