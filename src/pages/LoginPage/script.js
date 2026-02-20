// LoginPage/script.js - Login Form Handler

// ==================== //
// AUTOMATIC BACKEND URL DETECTION FOR MOBILE
// ==================== //
function getBackendURL() {
    return window.location.origin;
}

const BACKEND_URL = getBackendURL();
console.log('🔗 Using backend URL:', BACKEND_URL);

// ==================== //
// Form Elements
// ==================== //
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const rememberMeCheckbox = document.getElementById('rememberMe');
const submitBtn = document.getElementById('submitBtn');
const togglePasswordBtn = document.getElementById('togglePassword');
const loadingOverlay = document.getElementById('loadingOverlay');

// ==================== //
// Password Toggle
// ==================== //
function initPasswordToggle() {
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            togglePasswordVisibility(passwordInput, togglePasswordBtn);
        });
    }
}

function togglePasswordVisibility(input, button) {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    
    // Update icon
    const icon = button.querySelector('.eye-icon');
    if (isPassword) {
        icon.innerHTML = `
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
        `;
    } else {
        icon.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        `;
    }
}

// ==================== //
// Validation Functions
// ==================== //
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmed = email.trim();
    
    if (!emailRegex.test(trimmed)) {
        return { valid: false, message: 'Please enter a valid email address' };
    }
    return { valid: true };
}

function validatePassword(password) {
    if (password.length === 0) {
        return { valid: false, message: 'Please enter your password' };
    }
    return { valid: true };
}

function showError(message) {
    alert(message);
}

function showSuccess(message) {
    alert(message);
}

// ==================== //
// Loading Overlay
// ==================== //
function showLoading() {
    if (loadingOverlay) {
        loadingOverlay.classList.add('active');
    }
    if (submitBtn) {
        submitBtn.disabled = true;
    }
}

function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
    }
    if (submitBtn) {
        submitBtn.disabled = false;
    }
}

// ==================== //
// Remember Me Functionality
// ==================== //
function loadRememberedEmail() {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail && emailInput) {
        emailInput.value = rememberedEmail;
        if (rememberMeCheckbox) {
            rememberMeCheckbox.checked = true;
        }
    }
}

function handleRememberMe(email, remember) {
    if (remember) {
        localStorage.setItem('rememberedEmail', email);
    } else {
        localStorage.removeItem('rememberedEmail');
    }
}

// ==================== //
// Form Submission
// ==================== //
async function handleLogin(e) {
    e.preventDefault();
    
    console.log('🔐 Login form submitted');
    
    // Get form values
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const rememberMe = rememberMeCheckbox.checked;
    
    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
        showError(emailValidation.message);
        emailInput.focus();
        return;
    }
    
    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
        showError(passwordValidation.message);
        passwordInput.focus();
        return;
    }
    
    // Show loading
    showLoading();
    
    try {
        // Send login request to backend
        const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }
        
        console.log('✅ Login successful:', data);
        
        // Store user data in BOTH sessionStorage and localStorage
        // sessionStorage for temporary data
        sessionStorage.setItem('userId', data.userId);
        sessionStorage.setItem('userEmail', data.email);
        sessionStorage.setItem('userName', data.fullName);
        sessionStorage.setItem('sessionToken', data.sessionToken);
        
        // localStorage for persistent session token
        localStorage.setItem('sessionToken', data.sessionToken);
        
        // Handle remember me
        handleRememberMe(email, rememberMe);
        
        hideLoading();
        
        // Show success message
        showSuccess('Login successful! Redirecting to dashboard...');
        
        // Redirect to dashboard after short delay
        setTimeout(() => {
            window.location.href = '../Dashboard/index.html';
        }, 1000);
        
    } catch (error) {
        console.error('❌ Login error:', error);
        hideLoading();
        
        // Show user-friendly error message
        if (error.message.includes('Invalid') || error.message.includes('not found')) {
            showError('Invalid email or password. Please try again.');
        } else {
            showError(error.message || 'Failed to sign in. Please try again.');
        }
    }
}

// ==================== //
// Forgot Password Handler
// ==================== //
function handleForgotPassword(e) {
    e.preventDefault();
    alert('Password reset functionality coming soon! Please contact support if you need to reset your password.');
}

// ==================== //
// Initialize
// ==================== //
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 Login page loaded');
    
    // Initialize password toggle
    initPasswordToggle();
    
    // Load remembered email
    loadRememberedEmail();
    
    // Attach form submit handler
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Attach forgot password handler
    const forgotPasswordLink = document.querySelector('.forgot-password');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', handleForgotPassword);
    }
    
    // Check if user is already logged in
    const sessionToken = sessionStorage.getItem('sessionToken') || localStorage.getItem('sessionToken');
    if (sessionToken) {
        console.log('ℹ️ User already logged in, redirecting to dashboard...');
        window.location.href = '../Dashboard/index.html';
    }
    
    console.log('✅ Login page initialized');
});