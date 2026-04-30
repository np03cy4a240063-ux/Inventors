console.log('REINVENT_V2_PROFILE_V3_ACTIVE');
document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = window.location.port === '5000' ? '' : 'http://localhost:5000';
    
    function updateUIWithData(data) {
        const fN = document.getElementById('first-name');
        const lN = document.getElementById('last-name');
        const em = document.getElementById('email-address');
        const ph = document.getElementById('phone-number');
        const co = document.getElementById('company-name');
        
        if(fN && data.firstName) fN.value = data.firstName;
        if(lN && data.lastName) lN.value = data.lastName;
        if(em && data.email) em.value = data.email;
        if(ph && data.phone) ph.value = data.phone;
        if(co && data.company) co.value = data.company;
        
        // Update header tags
        const hName = document.querySelector('.name-status h2');
        const hEmail = document.querySelector('.meta-row span');
        const sidebarName = document.querySelector('.u-text strong');
        
        const fullName = `${data.firstName || 'John'} ${data.lastName || 'Doe'}`.trim();
        if(hName) hName.textContent = fullName;
        if(hEmail) hEmail.textContent = data.email || 'johndoe@reinvent.io';
        if(sidebarName) sidebarName.textContent = fullName;
    }

    // Simulate user fetch for profile
    async function loadProfile() {
        // Try local storage first
        const localData = localStorage.getItem('reinvent_profile_data');
        if (localData) {
            try {
                const data = JSON.parse(localData);
                updateUIWithData(data);
            } catch (e) {
                console.error("Error parsing local profile data", e);
            }
        }

        try {
            const resp = await fetch(`${API_BASE}/api/profile`);
            if (resp.ok) {
                const data = await resp.json();
                updateUIWithData(data);
                localStorage.setItem('reinvent_profile_data', JSON.stringify(data));
            }
        } catch(err) {
            console.warn('Profile fetch failed, using local data if available', err);
        }
    }

    loadProfile();

    const saveChangesBtn = document.querySelector('.header-actions .black-btn');
    if (saveChangesBtn) {
        saveChangesBtn.addEventListener('click', async () => {
            saveChangesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            const fN = document.getElementById('first-name');
            const lN = document.getElementById('last-name');
            const em = document.getElementById('email-address');
            const ph = document.getElementById('phone-number');
            const co = document.getElementById('company-name');
            
            const data = {
                firstName: fN ? fN.value : '',
                lastName: lN ? lN.value : '',
                email: em ? em.value : '',
                phone: ph ? ph.value : '',
                company: co ? co.value : ''
            };

            // Save to localStorage immediately
            localStorage.setItem('reinvent_profile_data', JSON.stringify(data));
            updateUIWithData(data);

            try {
                const resp = await fetch(`${API_BASE}/api/profile`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                });
                
                if (resp.ok) {
                    alert('Profile updated successfully!');
                } else {
                    throw new Error('Server error');
                }
            } catch(err) {
                alert('Profile saved locally (Offline mode).');
            }
            saveChangesBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        });
    }

    // Toggle Edit Mode
    const editBtn = document.querySelector('.outline-btn.small-btn');
    let isEditing = false;
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            isEditing = !isEditing;
            const inputs = document.querySelectorAll('.profile-form input:not([type="password"])');
            inputs.forEach(input => {
                input.readOnly = !isEditing;
                if (isEditing) input.classList.add('editing-active');
                else input.classList.remove('editing-active');
            });
            editBtn.innerHTML = isEditing ? '<i class="fas fa-check"></i> Done' : '<i class="fas fa-edit"></i> Edit';
            if (isEditing) inputs[0].focus();
        });
        
        // Initially lock inputs
        document.querySelectorAll('.profile-form input').forEach(inp => inp.readOnly = true);
    }

    // Toggle Switches
    const switches = document.querySelectorAll('.toggle-switch');
    
    // Load saved notification states
    const savedNotifStates = JSON.parse(localStorage.getItem('reinvent_notifications_state'));
    if (savedNotifStates && Array.isArray(savedNotifStates)) {
        switches.forEach((sw, idx) => {
            if (savedNotifStates[idx]) sw.classList.add('active');
            else sw.classList.remove('active');
        });
    }

    switches.forEach((sw, idx) => {
        sw.addEventListener('click', () => {
            sw.classList.toggle('active');
            // Save state on change
            const currentStates = Array.from(switches).map(s => s.classList.contains('active'));
            localStorage.setItem('reinvent_notifications_state', JSON.stringify(currentStates));
        });
    });

    // Change Photo
    const changePhotoBtn = document.querySelector('.profile-header-right .outline-btn');
    const avatar = document.querySelector('.profile-avatar-large');
    
    // Load saved photo
    const savedPhoto = localStorage.getItem('reinvent_profile_photo');
    if (savedPhoto && avatar) {
        avatar.innerHTML = `<img src="${savedPhoto}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    }

    if (changePhotoBtn) {
        changePhotoBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const photoData = event.target.result;
                        if (avatar) avatar.innerHTML = `<img src="${photoData}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                        localStorage.setItem('reinvent_profile_photo', photoData);
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        });
    }

    // Change Password simulation
    const passwordInputs = document.querySelectorAll('.profile-right input[type="password"]');
    if (passwordInputs.length >= 3) {
        const changePasswordBtn = document.createElement('button');
        changePasswordBtn.className = 'black-btn';
        changePasswordBtn.style.marginTop = '20px';
        changePasswordBtn.innerHTML = '<i class="fas fa-key"></i> Update Password';
        
        const passwordCard = passwordInputs[0].closest('.card');
        passwordCard.appendChild(changePasswordBtn);

        changePasswordBtn.addEventListener('click', () => {
            const current = passwordInputs[0].value;
            const newP = passwordInputs[1].value;
            const confirmP = passwordInputs[2].value;

            if (!newP || !confirmP) {
                alert("Please enter a new password.");
                return;
            }
            if (newP !== confirmP) {
                alert("New passwords do not match!");
                return;
            }
            
            alert("Password updated successfully!");
            passwordInputs.forEach(i => i.value = '');
        });

        // Enable password inputs
        passwordInputs.forEach(i => i.readOnly = false);
    }

    const logoutBtn = document.querySelector('.red-btn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', () => {
             if(confirm("Are you sure you want to log out?")) {
                 location.href = "login.html";
             }
        });
    }
});
