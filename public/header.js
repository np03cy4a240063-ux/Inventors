document.addEventListener('DOMContentLoaded', () => {
    // 1. Session & Profile Logic
    const user = JSON.parse(localStorage.getItem('user'));
    const isAuthPage = window.location.pathname.includes('login.html') || 
                       window.location.pathname.includes('signup.html') || 
                       window.location.pathname.includes('forgot_password.html');

    if (!user && !isAuthPage) {
        window.location.href = 'login.html';
        return;
    }

    if (user) {
        const displayName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
        const initials = getInitials(displayName, user.firstName, user.lastName);

        // Update ALL header user name spans
        document.querySelectorAll('.user-info-text span').forEach(el => {
            el.textContent = displayName;
        });

        // Update ALL avatar elements with initials
        document.querySelectorAll('.user-avatar').forEach(el => {
            el.textContent = initials;
        });

        // Update ALL sidebar bottom user names
        document.querySelectorAll('.user-bottom-info strong').forEach(el => {
            el.textContent = displayName;
        });

        // Update profile header card name if on profile page
        const profileHeaderName = document.querySelector('.name-status h2');
        if (profileHeaderName) profileHeaderName.textContent = displayName;

        // Update profile meta-row email
        const profileMetaEmail = document.querySelector('.meta-row span');
        if (profileMetaEmail && user.email) profileMetaEmail.textContent = user.email;

        // Update profile avatar large with initials
        const profileAvatarLarge = document.querySelector('.profile-avatar-large');
        if (profileAvatarLarge && !profileAvatarLarge.querySelector('img')) {
            profileAvatarLarge.innerHTML = `<span style="font-size:2rem;font-weight:800;color:#475569;">${initials}</span>`;
        }
    }

    function getInitials(name, firstName, lastName) {
        if (firstName && lastName) {
            return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
        }
        if (name) {
            const parts = name.trim().split(' ');
            if (parts.length >= 2) {
                return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
            }
            return name.charAt(0).toUpperCase();
        }
        return 'U';
    }

    // 2. Notification Toggle
    const notifBtn = document.getElementById('notifBtn');
    const notifDropdown = document.getElementById('notifDropdown');

    if (notifBtn && notifDropdown) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notifDropdown.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            notifDropdown.classList.remove('show');
        });

        notifDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // 3. Global Search
    const searchInput = document.getElementById('globalSearchInput');
    const searchIcon = document.querySelector('.global-search i');
    
    function triggerGlobalSearch() {
        const query = searchInput.value.trim().toLowerCase();
        if (query) {
            const localSearch = document.getElementById('tableSearch') || document.querySelector('.table-search input');
            if (localSearch) {
                localSearch.value = query;
                localSearch.dispatchEvent(new Event('input'));
            } else {
                alert('Searching for: ' + query);
            }
        }
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') triggerGlobalSearch();
        });
    }
    if (searchIcon) {
        searchIcon.style.cursor = 'pointer';
        searchIcon.addEventListener('click', triggerGlobalSearch);
    }

    // 4. Password Toggle Global Logic
    const togglePasswords = document.querySelectorAll('.toggle-password');
    togglePasswords.forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    });

    // 5. Sidebar Settings Gear Icon → Profile
    const settingsIcon = document.querySelector('.fa-cog');
    if (settingsIcon) {
        settingsIcon.style.cursor = 'pointer';
        settingsIcon.addEventListener('click', () => {
            window.location.href = 'profile.html';
        });
    }
    // 6. Fetch Alerts from Server
    async function fetchAlerts() {
        try {
            const API_BASE = window.location.port === '5000' ? '' : 'http://localhost:5000';
            const resp = await fetch(`${API_BASE}/api/alerts`);
            if (resp.ok) {
                const alerts = await resp.json();
                const list = document.getElementById('notifList');
                if (list) {
                    list.innerHTML = '';
                    const unreadAlerts = alerts.filter(a => !a.is_read);
                    if (unreadAlerts.length === 0) {
                        list.innerHTML = '<div style="padding: 20px; text-align: center; color: #94A3B8;">No new notifications</div>';
                    }
                    unreadAlerts.forEach(alert => {
                        addNotification(alert.id, alert.message, new Date(alert.created_at).toLocaleTimeString(), alert.type === 'LOW_STOCK' ? 'red' : 'blue', false);
                    });
                    
                    const dot = document.querySelector('.header-btn .dot');
                    if (dot) dot.style.display = unreadAlerts.length > 0 ? 'block' : 'none';
                }
            }
        } catch(err) { console.error('Alert fetch error', err); }
    }

    fetchAlerts();
    setInterval(fetchAlerts, 60000); // Check every minute

    // Mark all as read
    const markAllRead = document.querySelector('.notif-header a');
    if (markAllRead) {
        markAllRead.addEventListener('click', async (e) => {
            e.preventDefault();
            const API_BASE = window.location.port === '5000' ? '' : 'http://localhost:5000';
            try {
                await fetch(`${API_BASE}/api/alerts/read`, { method: 'POST' });
                fetchAlerts();
            } catch(err) { console.error(err); }
        });
    }
});

// Helper to add notification
function addNotification(id, title, time, type = 'blue', showDot = true) {
    const list = document.getElementById('notifList');
    if (!list) return;

    const item = document.createElement('div');
    item.className = 'notif-item';
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.justifyContent = 'space-between';
    item.style.padding = '12px 15px';
    item.style.borderBottom = '1px solid #E2E8F0';
    
    let iconClass = 'fa-info-circle';
    if (type === 'green') iconClass = 'fa-check-circle';
    if (type === 'red') iconClass = 'fa-exclamation-triangle';

    item.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px;">
            <div class="notif-icon ${type}">
                <i class="fas ${iconClass}"></i>
            </div>
            <div class="notif-content">
                <p style="margin:0; font-size:13px; color:#1E293B; font-weight:500;">${title}</p>
                <span style="font-size:11px; color:#94A3B8;">${time}</span>
            </div>
        </div>
        <button class="ack-btn" data-id="${id}" style="background:none; border:none; cursor:pointer; color:#4F46E5; font-size:12px; font-weight:600; padding:4px 8px; border-radius:4px;">
            <i class="fas fa-check"></i> Ack
        </button>
    `;
    list.prepend(item);
    
    const ackBtn = item.querySelector('.ack-btn');
    ackBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const API_BASE = window.location.port === '5000' ? '' : 'http://localhost:5000';
        try {
            const resp = await fetch(`${API_BASE}/api/alerts/acknowledge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alert_id: id })
            });
            if (resp.ok) {
                item.remove();
                // update dot if no more items
                const remaining = document.querySelectorAll('.notif-item').length;
                if (remaining === 0) {
                    list.innerHTML = '<div style="padding: 20px; text-align: center; color: #94A3B8;">No new notifications</div>';
                    const dot = document.querySelector('.header-btn .dot');
                    if (dot) dot.style.display = 'none';
                }
            }
        } catch(err) { console.error('Ack error', err); }
    });
    
    if (showDot) {
        const dot = document.querySelector('.header-btn .dot');
        if (dot) dot.style.display = 'block';
    }
}
