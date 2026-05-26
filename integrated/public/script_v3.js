console.log('REINVENT_V2_INTEGRATED_V4_ACTIVE');

// ─────────────────────────────────────────────────────────
// Global Toast / Popup Notification (replaces all alert())
// ─────────────────────────────────────────────────────────
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

// Backwards-compat alias used in some files
window.showPopup = window.showToast;

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = '';

    // ─── Contact / Query Form ────────────────────────────────────────────────
    const queryForm = document.getElementById('queryForm');
    if (queryForm) {
        queryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const queryValue = document.getElementById('query').value.trim();
            if (!queryValue) return showToast('Please enter a query.', 'error');

            const btn = queryForm.querySelector('button');
            btn.textContent = 'Sending...';
            btn.disabled = true;
            try {
                const resp = await fetch(`${API_BASE}/api/queries`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: queryValue })
                });
                if (resp.ok) {
                    showToast('Query sent successfully!', 'success');
                    queryForm.reset();
                } else {
                    showToast('Failed to send query.', 'error');
                }
            } catch (err) {
                showToast('Connection error. Is the server running?', 'error');
            } finally {
                btn.textContent = 'Submit';
                btn.disabled = false;
            }
        });
    }

    // ─── OTP Modal Elements ──────────────────────────────────────────────────
    const otpModal       = document.getElementById('otpModal');
    const otpBoxes       = document.querySelectorAll('.otp-digit');
    const otpVerifyBtn   = document.getElementById('otpVerifyBtn');
    const resendBtn      = document.getElementById('resendBtn');
    const otpTimer       = document.getElementById('otpTimer');
    const otpError       = document.getElementById('otpError');
    const otpEmailLabel  = document.getElementById('otpEmailLabel');
    const otpBackBtn     = document.getElementById('otpBackBtn');
    let signupEmail      = '';
    let resendInterval   = null;

    if (otpBackBtn) {
        otpBackBtn.addEventListener('click', () => {
            if (otpModal) otpModal.classList.remove('show');
        });
    }

    // 6-box keyboard navigation
    if (otpBoxes.length > 0) {
        otpBoxes.forEach((box, i) => {
            box.addEventListener('input', () => {
                box.value = box.value.replace(/\D/g, '').slice(-1);
                box.classList.toggle('filled', box.value.length > 0);
                if (box.value && i < otpBoxes.length - 1) otpBoxes[i + 1].focus();
            });
            box.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !box.value && i > 0) otpBoxes[i - 1].focus();
            });
            box.addEventListener('paste', (e) => {
                const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
                if (pasted.length >= 6) {
                    e.preventDefault();
                    otpBoxes.forEach((b, idx) => {
                        b.value = pasted[idx] || '';
                        b.classList.toggle('filled', !!b.value);
                    });
                    otpBoxes[5].focus();
                }
            });
        });
    }

    function startResendTimer(seconds = 60) {
        if (!resendBtn || !otpTimer) return;
        clearInterval(resendInterval);
        resendBtn.style.pointerEvents = 'none';
        resendBtn.style.opacity = '0.4';
        let rem = seconds;
        otpTimer.textContent = ` (${rem}s)`;
        resendInterval = setInterval(() => {
            rem--;
            otpTimer.textContent = ` (${rem}s)`;
            if (rem <= 0) {
                clearInterval(resendInterval);
                otpTimer.textContent = '';
                resendBtn.style.pointerEvents = '';
                resendBtn.style.opacity = '1';
            }
        }, 1000);
    }

    // ─── Signup Form ─────────────────────────────────────────────────────────
    const signupForm      = document.getElementById('signupForm');
    const signupSubmitBtn = document.getElementById('signupSubmitBtn');

    if (signupForm) {
        let isSubmitting = false;

        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isSubmitting) return;

            const signupSubmitBtn = document.getElementById('signupSubmitBtn');
            const firstName       = signupForm.firstName?.value.trim();
            const lastName        = signupForm.lastName?.value.trim();
            const emailVal        = signupForm.email?.value.trim();
            const companyVal      = signupForm.company?.value.trim();
            const passInput       = signupForm.querySelector('input[name="password"]');
            const confirmInput    = signupForm.querySelector('input[name="confirmPassword"]');
            const termsCheckbox   = document.getElementById('terms');

            if (!firstName || !lastName || !emailVal || !companyVal) {
                return showToast('Please fill in all required fields.', 'error');
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailVal)) {
                return showToast('Please enter a valid email address.', 'error');
            }
            const passRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*]).{6,}$/;
            if (!passRegex.test(passInput.value)) {
                return showToast('Password must be 6+ chars with 1 uppercase and 1 special character.', 'error');
            }
            if (passInput.value !== confirmInput.value) {
                return showToast('Passwords do not match!', 'error');
            }
            if (termsCheckbox && !termsCheckbox.checked) {
                return showToast('Please accept the Terms of Service.', 'error');
            }

            try {
                isSubmitting = true;
                signupSubmitBtn.disabled = true;
                signupSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending OTP...';
                signupEmail = emailVal;

                const resp = await fetch(`${API_BASE}/api/send-signup-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        firstName,
                        lastName,
                        email: signupEmail,
                        phone: signupForm.phone?.value || '',
                        company: companyVal,
                        password: passInput.value
                    })
                });

                const result = await resp.json();
                if (resp.ok) {
                    if (otpModal) {
                        if (otpEmailLabel) otpEmailLabel.textContent = signupEmail;
                        otpBoxes.forEach(b => { b.value = ''; b.classList.remove('filled'); });
                        if (otpError) otpError.textContent = '';
                        otpModal.classList.add('show');
                        if (otpBoxes[0]) otpBoxes[0].focus();
                        startResendTimer(60);
                    }
                    showToast('OTP sent to your email!', 'success');
                } else {
                    showToast(result.error || 'Failed to send OTP.', 'error');
                }
            } catch (err) {
                showToast('Connection error. Is the server running?', 'error');
            } finally {
                signupSubmitBtn.innerHTML = 'Create Account <i class="fas fa-arrow-right-to-bracket"></i>';
                signupSubmitBtn.disabled = false;
                isSubmitting = false;
            }
        });
    }

    // OTP Verify
    if (otpVerifyBtn) {
        otpVerifyBtn.addEventListener('click', async () => {
            const otp = [...otpBoxes].map(b => b.value).join('');
            if (otp.length < 6) {
                if (otpError) otpError.textContent = 'Please enter all 6 digits.';
                return;
            }
            if (otpError) otpError.textContent = '';
            try {
                otpVerifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
                otpVerifyBtn.disabled = true;

                const resp = await fetch(`${API_BASE}/api/verify-signup-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email: signupEmail, otp })
                });
                const result = await resp.json();
                if (resp.ok) {
                    showToast('Account created successfully! Redirecting...', 'success');
                    clearInterval(resendInterval);
                    setTimeout(() => { location.href = 'login.html'; }, 1500);
                } else {
                    if (otpError) otpError.textContent = result.error || 'Incorrect OTP.';
                    otpBoxes.forEach(b => { b.value = ''; b.classList.remove('filled'); });
                    if (otpBoxes[0]) otpBoxes[0].focus();
                }
            } catch (err) {
                if (otpError) otpError.textContent = 'Connection error. Try again.';
            } finally {
                otpVerifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verify & Create Account';
                otpVerifyBtn.disabled = false;
            }
        });
    }

    // OTP Resend
    if (resendBtn) {
        resendBtn.addEventListener('click', async () => {
            if (resendBtn.style.pointerEvents === 'none') return;
            try {
                const resp = await fetch(`${API_BASE}/api/resend-signup-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email: signupEmail })
                });
                const result = await resp.json();
                if (resp.ok) {
                    showToast('New OTP sent!', 'success');
                    if (otpError) otpError.textContent = '';
                    otpBoxes.forEach(b => { b.value = ''; b.classList.remove('filled'); });
                    if (otpBoxes[0]) otpBoxes[0].focus();
                    startResendTimer(60);
                } else {
                    showToast(result.error || 'Failed to resend.', 'error');
                }
            } catch (err) {
                showToast('Connection error.', 'error');
            }
        });
    }

    // ─── Login Form ───────────────────────────────────────────────────────────
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(loginForm);
            const data = Object.fromEntries(formData.entries());

            const btn = loginForm.querySelector('button[type="submit"]') || loginForm.querySelector('button');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            btn.disabled = true;

            try {
                const resp = await fetch(`${API_BASE}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(data)
                });
                const result = await resp.json();
                if (resp.ok) {
                    showToast('Login successful!', 'success');
                    localStorage.setItem('user', JSON.stringify(result.user));
                    setTimeout(() => { location.href = 'dashboard.html'; }, 900);
                } else {
                    showToast(result.error || 'Login failed. Check your email and password.', 'error');
                }
            } catch (err) {
                showToast('Server connection failed. Ensure "node server.js" is running.', 'error');
            } finally {
                btn.innerHTML = '<i class="fas fa-arrow-right-to-bracket"></i> Sign In';
                btn.disabled = false;
            }
        });
    }

    // ─── Forgot Password Form ─────────────────────────────────────────────────
    const forgotForm = document.getElementById('forgotForm');
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(forgotForm);
            const data = Object.fromEntries(formData.entries());

            if (!data.email) return showToast('Please enter your email address.', 'error');

            const btn = forgotForm.querySelector('button');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            btn.disabled = true;

            try {
                const resp = await fetch(`${API_BASE}/api/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(data)
                });
                if (resp.ok) {
                    showToast('Password reset OTP sent to your email!', 'success');
                    forgotForm.reset();
                } else {
                    const result = await resp.json();
                    showToast(result.error || 'Failed to send reset OTP.', 'error');
                }
            } catch (err) {
                showToast('Connection error. Server may be down.', 'error');
            } finally {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
            }
        });
    }

    // ─── Logout ───────────────────────────────────────────────────────────────
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await fetch(`${API_BASE}/api/logout`, { method: 'POST', credentials: 'include' });
            } catch (_) {}
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });
    }

    // ─── Password Visibility Toggle ───────────────────────────────────────────
    document.querySelectorAll('.toggle-password').forEach(eye => {
        eye.addEventListener('click', () => {
            const input = eye.previousElementSibling || eye.parentElement.querySelector('input');
            if (!input) return;
            input.type = (input.type === 'password') ? 'text' : 'password';
            eye.classList.toggle('fa-eye');
            eye.classList.toggle('fa-eye-slash');
        });
    });
});
