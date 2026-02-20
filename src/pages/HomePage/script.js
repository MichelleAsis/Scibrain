// script.js - Home Page Script - FIXED SESSION HANDLING

// ==================== //
// Science Topics Data
// ==================== //
const scienceTopics = [
    { name: "Cell Biology", icon: "🔬" },
    { name: "Chemical Reactions", icon: "⚗️" },
    { name: "Newton's Laws", icon: "🍎" },
    { name: "Photosynthesis", icon: "🌱" },
    { name: "DNA & Genetics", icon: "🧬" },
    { name: "Atomic Structure", icon: "⚛️" },
    { name: "Ecosystems", icon: "🌍" },
    { name: "Energy & Motion", icon: "⚡" },
    { name: "Human Anatomy", icon: "🫀" },
    { name: "Organic Chemistry", icon: "🧪" },
    { name: "Evolution", icon: "🦕" },
    { name: "Electricity", icon: "💡" },
    { name: "Periodic Table", icon: "📊" },
    { name: "Astronomy", icon: "🌌" },
    { name: "Waves & Sound", icon: "🌊" },
    { name: "Microorganisms", icon: "🦠" },
    { name: "Thermodynamics", icon: "🌡️" },
    { name: "Plant Biology", icon: "🌿" },
    { name: "Magnetism", icon: "🧲" },
    { name: "Biochemistry", icon: "💊" },
    { name: "Climate Science", icon: "🌤️" },
    { name: "Quantum Physics", icon: "🔭" },
    { name: "Marine Biology", icon: "🐠" },
    { name: "Acids & Bases", icon: "🧴" },
    { name: "Optics", icon: "👓" },
    { name: "Neuroscience", icon: "🧠" },
    { name: "Molecular Biology", icon: "🔬" },
    { name: "States of Matter", icon: "💧" },
    { name: "Plate Tectonics", icon: "🌋" },
    { name: "Radioactivity", icon: "☢️" }
];

// ==================== //
// Authentication State Management
// ==================== //
let currentUser = null;
let isCheckingAuth = false; // Prevent multiple simultaneous checks

// CRITICAL: Clear all session data properly
function clearAllSessionData() {
    console.log('🧹 Clearing all session data...');
    
    // Clear sessionStorage
    sessionStorage.removeItem('sessionToken');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userName');
    
    // Clear localStorage
    localStorage.removeItem('sessionToken');
    
    currentUser = null;
    
    console.log('✅ Session data cleared');
}

// Check authentication status on page load
async function checkAuthStatus() {
    // Prevent multiple simultaneous checks
    if (isCheckingAuth) {
        console.log('⏳ Auth check already in progress...');
        return;
    }
    
    isCheckingAuth = true;
    
    try {
        // Try sessionStorage first, then localStorage
        let sessionToken = sessionStorage.getItem('sessionToken');
        
        // If not in sessionStorage, check localStorage
        if (!sessionToken) {
            sessionToken = localStorage.getItem('sessionToken');
            
            // If found in localStorage, sync to sessionStorage
            if (sessionToken) {
                console.log('📋 Syncing session from localStorage to sessionStorage');
                sessionStorage.setItem('sessionToken', sessionToken);
            }
        }
        
        if (!sessionToken) {
            console.log('ℹ️ No session token found - showing guest view');
            updateNavbarForGuest();
            isCheckingAuth = false;
            return;
        }

        console.log('🔍 Verifying session token...');
        
        // Auto-detect backend URL
        const backendURL = window.location.origin;
        
        const response = await fetch(`${backendURL}/api/auth/verify`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${sessionToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            
            if (data.valid) {
                console.log('✅ Session valid for user:', data.fullName);
                
                currentUser = {
                    userId: data.userId,
                    email: data.email,
                    fullName: data.fullName
                };
                
                // Sync user data to sessionStorage
                sessionStorage.setItem('userId', data.userId.toString());
                sessionStorage.setItem('userEmail', data.email);
                sessionStorage.setItem('userName', data.fullName);
                sessionStorage.setItem('sessionToken', sessionToken);
                
                updateNavbarForUser(data.fullName);
            } else {
                console.log('⚠️ Session invalid - clearing data');
                clearAllSessionData();
                updateNavbarForGuest();
            }
        } else {
            console.log('⚠️ Session verification failed (status:', response.status, ') - clearing data');
            clearAllSessionData();
            updateNavbarForGuest();
        }
    } catch (error) {
        console.error('❌ Error verifying session:', error);
        // Don't clear on network error - might be temporary
        // Just show guest view
        updateNavbarForGuest();
    } finally {
        isCheckingAuth = false;
    }
}

// Update navbar for logged-in user
function updateNavbarForUser(fullName) {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;
    
    // Remove existing auth buttons
    const existingLoginBtn = navLinks.querySelector('.btn-login');
    const existingUserBtn = navLinks.querySelector('.btn-user');
    const existingLogoutBtn = navLinks.querySelector('.btn-logout');
    
    if (existingLoginBtn) existingLoginBtn.remove();
    if (existingUserBtn) existingUserBtn.remove();
    if (existingLogoutBtn) existingLogoutBtn.remove();

    // Create user name button
    const userButton = document.createElement('button');
    userButton.className = 'btn-user';
    userButton.textContent = fullName;
    userButton.title = 'Logged in';
    userButton.style.cssText = `
        background: none;
        border: none;
        color: #2C3E50;
        font-weight: 600;
        padding: 8px 16px;
        cursor: default;
        font-size: 14px;
    `;
    
    // Create logout button
    const logoutButton = document.createElement('button');
    logoutButton.className = 'btn-logout';
    logoutButton.textContent = 'Logout';
    logoutButton.title = 'Logout';
    logoutButton.style.cssText = `
        background: #E74C3C;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.3s ease;
    `;
    
    logoutButton.addEventListener('mouseenter', () => {
        logoutButton.style.background = '#C0392B';
    });
    
    logoutButton.addEventListener('mouseleave', () => {
        logoutButton.style.background = '#E74C3C';
    });
    
    // Add logout handler
    logoutButton.addEventListener('click', handleLogout);
    
    // Append buttons to nav
    navLinks.appendChild(userButton);
    navLinks.appendChild(logoutButton);
    
    console.log('✅ Navbar updated for user:', fullName);
}

// Update navbar for guest user
function updateNavbarForGuest() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;
    
    // Remove user and logout buttons if they exist
    const existingUserBtn = navLinks.querySelector('.btn-user');
    const existingLogoutBtn = navLinks.querySelector('.btn-logout');
    const existingLoginBtn = navLinks.querySelector('.btn-login');
    
    if (existingUserBtn) existingUserBtn.remove();
    if (existingLogoutBtn) existingLogoutBtn.remove();
    if (existingLoginBtn) existingLoginBtn.remove();
    
    // Add login button
    const loginButton = document.createElement('button');
    loginButton.className = 'btn-login';
    loginButton.textContent = 'Login';
    loginButton.style.cssText = `
        background: #2ECC71;
        color: white;
        border: none;
        padding: 8px 20px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.3s ease;
    `;
    
    loginButton.addEventListener('mouseenter', () => {
        loginButton.style.background = '#27AE60';
    });
    
    loginButton.addEventListener('mouseleave', () => {
        loginButton.style.background = '#2ECC71';
    });
    
    loginButton.addEventListener('click', () => {
        window.location.href = '../LoginPage/index.html';
    });
    
    navLinks.appendChild(loginButton);
    
    console.log('✅ Navbar updated for guest');
}

// Handle logout
async function handleLogout() {
    console.log('👋 Logout initiated...');
    
    const sessionToken = sessionStorage.getItem('sessionToken') || localStorage.getItem('sessionToken');
    
    if (sessionToken) {
        try {
            // Call logout endpoint
            await fetch(`${window.location.origin}/api/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${sessionToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('✅ Logout API call successful');
        } catch (error) {
            console.error('⚠️ Logout API error (continuing anyway):', error);
        }
    }
    
    // Clear all session data
    clearAllSessionData();
    
    // Update navbar
    updateNavbarForGuest();
    
    // Show confirmation
    alert('You have been logged out successfully.');
    
    console.log('✅ Logout complete');
}

// ==================== //
// Shuffle Array Helper
// ==================== //
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// ==================== //
// Generate Topic Capsules for Multiple Rows
// ==================== //
function generateTopicCapsules() {
    // Shuffle topics for each row to create variety
    const row1Topics = shuffleArray(scienceTopics).slice(0, 10);
    const row2Topics = shuffleArray(scienceTopics).slice(0, 12);
    const row3Topics = shuffleArray(scienceTopics).slice(0, 10);
    
    // Generate Row 1
    const track1 = document.getElementById('topicsTrack1');
    if (track1) {
        const doubledRow1 = [...row1Topics, ...row1Topics];
        doubledRow1.forEach(topic => {
            track1.appendChild(createTopicCapsule(topic));
        });
    }
    
    // Generate Row 2 (reverse direction)
    const track2 = document.getElementById('topicsTrack2');
    if (track2) {
        const doubledRow2 = [...row2Topics, ...row2Topics];
        doubledRow2.forEach(topic => {
            track2.appendChild(createTopicCapsule(topic));
        });
    }
    
    // Generate Row 3
    const track3 = document.getElementById('topicsTrack3');
    if (track3) {
        const doubledRow3 = [...row3Topics, ...row3Topics];
        doubledRow3.forEach(topic => {
            track3.appendChild(createTopicCapsule(topic));
        });
    }
}

// ==================== //
// Create Individual Topic Capsule
// ==================== //
function createTopicCapsule(topic) {
    const capsule = document.createElement('div');
    capsule.className = 'topic-capsule';
    
    const icon = document.createElement('span');
    icon.className = 'topic-icon';
    icon.textContent = topic.icon;
    
    const name = document.createElement('span');
    name.textContent = topic.name;
    
    capsule.appendChild(icon);
    capsule.appendChild(name);
    
    return capsule;
}

// ==================== //
// Smooth Scroll for Navigation
// ==================== //
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// ==================== //
// Navbar Scroll Effect
// ==================== //
function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 50) {
            navbar.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.boxShadow = 'none';
        }

        lastScroll = currentScroll;
    });
}

// ==================== //
// Button Click Handlers
// ==================== //
function initButtonHandlers() {
    // Get Started / Start Reviewing Buttons
    const startButtons = document.querySelectorAll('.btn-primary, .btn-cta');
    startButtons.forEach(button => {
        button.addEventListener('click', () => {
            console.log('Start Reviewing clicked - Navigating to Upload Page');
            window.location.href = '../UploadPage/index.html';
        });
    });

    // Watch Demo Button
    const demoButton = document.querySelector('.btn-secondary');
    if (demoButton) {
        demoButton.addEventListener('click', () => {
            console.log('Watch Demo clicked - Demo modal will be added later');
            alert('Demo video coming soon!');
        });
    }

    // Settings Button
    const settingsButton = document.querySelector('.btn-settings');
    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            console.log('Settings clicked - Navigating to Settings Page');
            localStorage.setItem('settingsReferrer', '../HomePage/index.html');
            window.location.href = '../SettingsPage/index.html';
        });
    }

    // Dashboard Link
    const dashboardLink = document.querySelector('.nav-link');
    if (dashboardLink) {
        dashboardLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Dashboard clicked - Navigating to Dashboard');
            window.location.href = '../Dashboard/index.html';
        });
    }
}

// ==================== //
// Pause Animation on Hover
// ==================== //
function initTopicsHoverEffect() {
    const topicsTracks = document.querySelectorAll('.topics-track');
    
    topicsTracks.forEach(track => {
        track.addEventListener('mouseenter', () => {
            track.style.animationPlayState = 'paused';
        });

        track.addEventListener('mouseleave', () => {
            track.style.animationPlayState = 'running';
        });
    });
}

// ==================== //
// Add Intersection Observer for Animations
// ==================== //
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe step cards
    document.querySelectorAll('.step-card').forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = `all 0.6s ease ${index * 0.1}s`;
        observer.observe(card);
    });
}

// ==================== //
// Initialize Everything on Page Load
// ==================== //
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🏠 ScienceReview Homepage Loaded');
    
    // Check authentication status first (with proper error handling)
    await checkAuthStatus();
    
    // Generate the animated topics
    generateTopicCapsules();
    
    // Initialize all features
    initSmoothScroll();
    initNavbarScroll();
    initButtonHandlers();
    initTopicsHoverEffect();
    initScrollAnimations();
    
    console.log('✅ All features initialized successfully');
});

// ==================== //
// Handle Window Resize
// ==================== //
window.addEventListener('resize', () => {
    // Handle any responsive adjustments if needed
    console.log('Window resized');
});

// ==================== //
// Prevent Animation Issues on Page Load
// ==================== //
window.addEventListener('load', () => {
    document.body.style.opacity = '1';
});

console.log('✅ HomePage script loaded - WITH FIXED SESSION HANDLING');