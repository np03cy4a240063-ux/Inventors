console.log('REINVENT_V2_PROFILE_V3_ACTIVE');
document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = window.location.port === '5000' ? '' : 'http://localhost:5000';
    
    // Simulate user fetch for profile
    async function loadProfile() {
        try {
            const resp = await fetch(`${API_BASE}/api/profile`);
            if (resp.ok) {
                const data = await resp.json();
                const fN = document.querySelector('input[value="John"]');
                const lN = document.querySelector('input[value="Doe"]');
                const em = document.querySelector('input[type="email"]');
                const co = document.querySelector('input[value="Acme Trading Co."]');
                
                if(fN) fN.value = data.firstName || 'John';
                if(lN) lN.value = data.lastName || 'Doe';
                if(em) em.value = data.email || 'johndoe@reinvent.io';
                if(co) co.value = data.company || 'Acme Trading Co.';
                
                // Update header tags
                const hName = document.querySelector('.name-status h2');
                const hEmail = document.querySelector('.meta-row span');
                if(hName) hName.textContent = (data.firstName + ' ' + data.lastName).trim() || 'John Doe';
                if(hEmail) hEmail.textContent = data.email || 'johndoe@reinvent.io';
            }
        } catch(err) {
            console.error('Profile fetch failed', err);
        }
    }

    loadProfile();

    const saveChangesBtn = document.querySelector('.black-btn');
    if (saveChangesBtn) {
        saveChangesBtn.addEventListener('click', async () => {
            saveChangesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            const inputs = document.querySelectorAll('.profile-left input');
            const data = {
                firstName: inputs[0].value,
                lastName: inputs[1].value,
                email: inputs[2].value,
                phone: inputs[3].value,
                company: inputs[4].value
            };

            try {
                const resp = await fetch(`${API_BASE}/api/profile`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                });
                
                if (resp.ok) {
                    alert('Profile updated successfully!');
                    const hName = document.querySelector('.name-status h2');
                    if(hName) hName.textContent = data.firstName + ' ' + data.lastName;
                }
            } catch(err) {
                alert('Saved locally only (Connection error).');
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
    document.querySelectorAll('.toggle-switch').forEach(sw => {
        sw.addEventListener('click', () => {
            sw.classList.toggle('active');
        });
    });

    // Change Photo
    const changePhotoBtn = document.querySelector('.profile-header-right .outline-btn');
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
                        const avatar = document.querySelector('.profile-avatar-large');
                        avatar.innerHTML = `<img src="${event.target.result}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
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
