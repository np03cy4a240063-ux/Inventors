document.addEventListener('DOMContentLoaded', () => {
  const emailInput = document.getElementById('emailInput');
  const sendBtn = document.getElementById('sendBtn');
  const backBtn = document.getElementById('backBtn');

  sendBtn.addEventListener('click', async () => {
    const email = emailInput.value;

    if (!email) {
      alert('Please enter your email address.');
      return;
    }

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        data = { message: 'The server encountered an unexpected error and did not return valid JSON.' };
      }

      if (response.ok) {
        alert(data.message);
        // Redirect to reset password page with email in query param
        window.location.href = `../reset-password/reset-password.html?email=${encodeURIComponent(email)}`;
      } else {
        alert(`Server Error (${response.status}): ${data.message || 'Something went wrong.'}`);
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
