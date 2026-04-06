document.addEventListener('DOMContentLoaded', () => {
  const passwordInput = document.getElementById('passwordInput');
  const resetBtn = document.getElementById('resetBtn');
  const backBtn = document.getElementById('backBtn');

  // Get email from query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email');

  if (!email) {
    alert('Email is missing. Please go back to the Forgot Password page.');
    window.location.href = '../forgot-password/forgot-password.html';
    return;
  }

  resetBtn.addEventListener('click', async () => {
    const newPassword = passwordInput.value;

    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, newPassword })
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        data = { message: 'The server encountered an unexpected error and did not return valid JSON.' };
      }

      if (response.ok) {
        alert(data.message);
        // Success! Redirect to sign-in page
        window.location.href = '../signin/signin.html';
      } else {
        alert(`Server Error (${response.status}): ${data.message || 'Error resetting password.'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Network Error: Could not connect to the server. Please ensure the backend is running on port 3000.');
    }
  });

  backBtn.addEventListener('click', () => {
    window.location.href = '../signin/signin.html';
  });
});
