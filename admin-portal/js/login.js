/**
 * Login Page Logic
 * Handles form submission and authentication
 */

document.addEventListener('DOMContentLoaded', async () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const loginBtnText = document.getElementById('loginBtnText');
    const loginSpinner = document.getElementById('loginSpinner');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const alertContainer = document.getElementById('alertContainer');

    // Check if already logged in
    const session = await window.authManager.getCurrentSession();
    if (session) {
        const isAdmin = await window.authManager.verifyAdminRole(session.user.id);
        if (isAdmin) {
            window.location.href = 'dashboard.html';
            return;
        }
    }

    /**
     * Show alert message
     */
    function showAlert(message, type = 'error') {
        const alertClass = type === 'error' ? 'alert-error' : 'alert-success';
        const alertHTML = `
            <div class="alert ${alertClass}">
                <span>${message}</span>
            </div>
        `;
        alertContainer.innerHTML = alertHTML;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            alertContainer.innerHTML = '';
        }, 5000);
    }

    /**
     * Set loading state
     */
    function setLoading(isLoading) {
        loginBtn.disabled = isLoading;
        googleLoginBtn.disabled = isLoading;
        
        if (isLoading) {
            loginBtnText.textContent = 'Signing in...';
            loginSpinner.classList.remove('hidden');
        } else {
            loginBtnText.textContent = 'Sign In';
            loginSpinner.classList.add('hidden');
        }
    }

    /**
     * Handle email/password login
     */
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Validation
        if (!email || !password) {
            showAlert('Please enter both email and password');
            return;
        }

        setLoading(true);
        alertContainer.innerHTML = '';

        try {
            const result = await window.authManager.login(email, password);
            
            if (result.success) {
                showAlert('Login successful! Redirecting...', 'success');
                // Redirect is handled in auth.js
            } else {
                showAlert(result.error || 'Login failed. Please check your credentials.');
            }
        } catch (error) {
            console.error('Login error:', error);
            showAlert('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    });

    /**
     * Handle Google login
     */
    googleLoginBtn.addEventListener('click', async () => {
        setLoading(true);
        alertContainer.innerHTML = '';

        try {
            const result = await window.authManager.loginWithGoogle();
            
            if (!result.success) {
                showAlert(result.error || 'Google sign-in failed');
                setLoading(false);
            }
            // If successful, redirect happens automatically
        } catch (error) {
            console.error('Google login error:', error);
            showAlert('Google sign-in failed. Please try again.');
            setLoading(false);
        }
    });

    // Focus on email input
    emailInput.focus();
});