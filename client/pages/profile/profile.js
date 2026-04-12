const API_BASE = 'http://localhost:3000';

function getToken() {
  return localStorage.getItem('token');
}

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + getToken()
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  const token = getToken();
  if (!token) {
    alert('Please sign in first.');
    window.location.href = '../auth/signin/signin.html';
    return;
  }

  // Elements
  const firstNameInput = document.getElementById('profileFirstName');
  const lastNameInput = document.getElementById('profileLastName');
  const emailInput = document.getElementById('profileEmail');
  const companyInput = document.getElementById('profileCompany');
  const userNameDisplay = document.getElementById('profileUserName');
  const userEmailDisplay = document.getElementById('profileUserEmail');
  const memberSinceDisplay = document.getElementById('profileMemberSince');
  const sidebarUserName = document.getElementById('sidebarUserName');
  const saveBtn = document.querySelector('.save-btn');
  const editButtons = document.querySelectorAll('.edit-btn');

  // Fetch user profile
  try {
    const resp = await fetch(`${API_BASE}/api/user/profile`, {
      headers: getAuthHeaders()
    });

    if (resp.ok) {
      const user = await resp.json();

      // Populate form fields
      if (firstNameInput) firstNameInput.value = user.firstName || '';
      if (lastNameInput) lastNameInput.value = user.lastName || '';
      if (emailInput) emailInput.value = user.email || '';
      if (companyInput) companyInput.value = user.companyName || '';

      // Populate display elements
      const fullName = (user.firstName || '') + ' ' + (user.lastName || '');
      if (userNameDisplay) userNameDisplay.innerHTML = fullName + ' <span class="badge">ACTIVE</span>';
      if (userEmailDisplay) userEmailDisplay.textContent = user.email + ' • Member since ' + new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (sidebarUserName) sidebarUserName.textContent = fullName;
    } else {
      console.error('Failed to load profile.');
    }
  } catch (err) {
    console.error('Error loading profile:', err);
  }

  // Handle Save Button
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const data = {
        firstName: firstNameInput ? firstNameInput.value : '',
        lastName: lastNameInput ? lastNameInput.value : '',
        email: emailInput ? emailInput.value : '',
        companyName: companyInput ? companyInput.value : ''
      };

      try {
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;

        const resp = await fetch(`${API_BASE}/api/user/profile`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(data)
        });

        const result = await resp.json();
        if (resp.ok) {
          alert('Profile updated successfully!');
          // Update display
          const fullName = data.firstName + ' ' + data.lastName;
          if (userNameDisplay) userNameDisplay.innerHTML = fullName + ' <span class="badge">ACTIVE</span>';
          if (sidebarUserName) sidebarUserName.textContent = fullName;
        } else {
          alert(result.message || 'Failed to update profile.');
        }
      } catch (err) {
        console.error('Error updating profile:', err);
        alert('Connection error. Please ensure the server is running.');
      } finally {
        saveBtn.textContent = '💾 Save Changes';
        saveBtn.disabled = false;
      }
    });
  }

  // Handle Edit Buttons (Visual feedback)
  editButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.card');
      const inputs = card.querySelectorAll('input');
      inputs.forEach(input => {
        input.focus();
        input.style.borderColor = '#3B82F6';
      });
    });
  });
});
