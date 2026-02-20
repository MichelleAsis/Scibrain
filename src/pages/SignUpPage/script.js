// SignUpPage/script.js - Sign Up Form Handler

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
const signupForm = document.getElementById('signupForm');
const fullNameInput = document.getElementById('fullName');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const termsCheckbox = document.getElementById('termsCheckbox');
const submitBtn = document.getElementById('submitBtn');
const togglePasswordBtn = document.getElementById('togglePassword');
const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');
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

    if (toggleConfirmPasswordBtn) {
        toggleConfirmPasswordBtn.addEventListener('click', () => {
            togglePasswordVisibility(confirmPasswordInput, toggleConfirmPasswordBtn);
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
function validateFullName(name) {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
        return { valid: false, message: 'Name must be at least 2 characters long' };
    }
    if (trimmed.length > 100) {
        return { valid: false, message: 'Name is too long' };
    }
    return { valid: true };
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmed = email.trim();
    
    if (!emailRegex.test(trimmed)) {
        return { valid: false, message: 'Please enter a valid email address' };
    }
    return { valid: true };
}

function validatePassword(password) {
    if (password.length < 6) {
        return { valid: false, message: 'Password must be at least 6 characters long' };
    }
    if (password.length > 100) {
        return { valid: false, message: 'Password is too long' };
    }
    // Optional: Add more password strength requirements
    return { valid: true };
}

function validatePasswordMatch(password, confirmPassword) {
    if (password !== confirmPassword) {
        return { valid: false, message: 'Passwords do not match' };
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
// Form Submission
// ==================== //
async function handleSignUp(e) {
    e.preventDefault();
    
    console.log('📝 Sign up form submitted');
    
    // Get form values
    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const termsAccepted = termsCheckbox.checked;
    
    // Validate full name
    const nameValidation = validateFullName(fullName);
    if (!nameValidation.valid) {
        showError(nameValidation.message);
        fullNameInput.focus();
        return;
    }
    
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
    
    // Validate password match
    const matchValidation = validatePasswordMatch(password, confirmPassword);
    if (!matchValidation.valid) {
        showError(matchValidation.message);
        confirmPasswordInput.focus();
        return;
    }
    
    // Check terms acceptance
    if (!termsAccepted) {
        showError('Please accept the Terms of Service and Privacy Policy');
        return;
    }
    
    // Show loading
    showLoading();
    
    try {
        // Send sign up request to backend
        const response = await fetch(`${BACKEND_URL}/api/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fullName: fullName,
                email: email,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Sign up failed');
        }
        
        console.log('✅ Sign up successful:', data);
        
        // Store user data in BOTH sessionStorage and localStorage
        // sessionStorage for temporary data
        sessionStorage.setItem('userId', data.userId);
        sessionStorage.setItem('userEmail', data.email);
        sessionStorage.setItem('userName', data.fullName);
        sessionStorage.setItem('sessionToken', data.sessionToken);
        
        // localStorage for persistent session token
        localStorage.setItem('sessionToken', data.sessionToken);
        
        hideLoading();
        
        // Show success message
        showSuccess('Account created successfully! Redirecting to dashboard...');
        
        // Redirect to dashboard after short delay
        setTimeout(() => {
            window.location.href = '../Dashboard/index.html';
        }, 1500);
        
    } catch (error) {
        console.error('❌ Sign up error:', error);
        hideLoading();
        
        // Show user-friendly error message
        if (error.message.includes('already exists')) {
            showError('An account with this email already exists. Please sign in instead.');
        } else {
            showError(error.message || 'Failed to create account. Please try again.');
        }
    }
}

// ==================== //
// Initialize
// ==================== //
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 Sign Up page loaded');
    
    // Initialize password toggle
    initPasswordToggle();
    
    // Attach form submit handler
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignUp);
    }
    
    // Check if user is already logged in
    const sessionToken = sessionStorage.getItem('sessionToken') || localStorage.getItem('sessionToken');
    if (sessionToken) {
        console.log('ℹ️ User already logged in, redirecting to dashboard...');
        window.location.href = '../Dashboard/index.html';
    }
    
    console.log('✅ Sign Up page initialized');
});