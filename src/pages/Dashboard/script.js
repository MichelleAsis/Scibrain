// Dashboard/script.js - WITH AUTHENTICATION - FIXED REDIRECT LOOP

// ==================== //
// AUTOMATIC BACKEND URL DETECTION FOR MOBILE
// ==================== //
function getBackendURL() {
    return window.location.origin;
}

const BACKEND_URL = getBackendURL();
const API_BASE = `${BACKEND_URL}/api`;
console.log('🔗 Using API base:', API_BASE);

let allReviewers = [];
let statistics = {
    reviewers: 0,
    documents: 0,
    quizAttempts: 0,
    avgQuizScore: 0
};

let isVerifyingAuth = false; // Prevent multiple verification attempts

// ==================== //
// Authentication Helper Functions
// ==================== //
function getUserId() {
    return sessionStorage.getItem('userId');
}

function getSessionToken() {
    return sessionStorage.getItem('sessionToken') || localStorage.getItem('sessionToken');
}

function getUserName() {
    return sessionStorage.getItem('userName') || 'User';
}

async function verifyAuthentication() {
    // Prevent multiple simultaneous verification attempts
    if (isVerifyingAuth) {
        console.log('⏳ Auth verification already in progress...');
        return false;
    }
    
    isVerifyingAuth = true;
    
    try {
        let userId = getUserId();
        let sessionToken = getSessionToken();
        
        // If no userId but have token, sync from localStorage
        if (!userId && sessionToken) {
            sessionToken = localStorage.getItem('sessionToken');
            if (sessionToken) {
                sessionStorage.setItem('sessionToken', sessionToken);
            }
        }
        
        if (!userId || !sessionToken) {
            console.log('❌ No authentication found, redirecting to login...');
            isVerifyingAuth = false;
            
            // Clear any partial data
            sessionStorage.clear();
            localStorage.removeItem('sessionToken');
            
            // Redirect after small delay to prevent loop
            setTimeout(() => {
                window.location.href = '../LoginPage/index.html';
            }, 100);
            
            return false;
        }
        
        console.log('🔍 Verifying session...');
        
        const response = await fetch(`${API_BASE}/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${sessionToken}`
            }
        });
        
        if (!response.ok) {
            console.log('❌ Session invalid, redirecting to login...');
            
            // Clear all session data
            sessionStorage.clear();
            localStorage.removeItem('sessionToken');
            
            isVerifyingAuth = false;
            
            // Redirect after small delay
            setTimeout(() => {
                window.location.href = '../LoginPage/index.html';
            }, 100);
            
            return false;
        }
        
        const data = await response.json();
        
        if (!data.valid) {
            console.log('❌ Session not valid, redirecting to login...');
            
            sessionStorage.clear();
            localStorage.removeItem('sessionToken');
            
            isVerifyingAuth = false;
            
            setTimeout(() => {
                window.location.href = '../LoginPage/index.html';
            }, 100);
            
            return false;
        }
        
        console.log('✅ Session valid for:', data.fullName);
        
        // Sync user data to sessionStorage
        sessionStorage.setItem('userId', data.userId.toString());
        sessionStorage.setItem('userEmail', data.email);
        sessionStorage.setItem('userName', data.fullName);
        sessionStorage.setItem('sessionToken', sessionToken);
        
        isVerifyingAuth = false;
        return true;
        
    } catch (error) {
        console.error('❌ Authentication verification failed:', error);
        
        // On network error, don't redirect immediately
        // Give user chance to retry
        isVerifyingAuth = false;
        
        alert('Could not verify your session. Please check your connection and try again.');
        return false;
    }
}

// ==================== //
// Initialize on Load
// ==================== //
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 Dashboard Page Loaded');
    
    // CRITICAL: Verify authentication first
    const isAuthenticated = await verifyAuthentication();
    if (!isAuthenticated) {
        return; // Stop execution if not authenticated (redirect already triggered)
    }
    
    // Update greeting with user name
    updateGreeting();
    
    // Setup navigation
    initNavigationButtons();
    
    // Load data from database
    await loadDashboardData();
    
    console.log('✅ Dashboard initialized successfully');
});

// ... (rest of the functions remain the same from the original Dashboard script)

// ==================== //
// Load All Dashboard Data
// ==================== //
async function loadDashboardData() {
    showLoading();
    
    try {
        // Load statistics
        await loadStatistics();
        
        // Load all reviewers
        await loadReviewers();
        
        // Update UI
        updateStatsDisplay();
        displayReviewers();
        
        hideLoading();
        
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        hideLoading();
        showError('Failed to load dashboard data. Please refresh the page.');
    }
}

// ==================== //
// Load Statistics from Database
// ==================== //
async function loadStatistics() {
    try {
        const sessionToken = getSessionToken();
        
        const response = await fetch(`${API_BASE}/statistics`, {
            headers: {
                'Authorization': `Bearer ${sessionToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch statistics');
        }
        
        statistics = await response.json();
        console.log('📊 Statistics loaded:', statistics);
        
    } catch (error) {
        console.error('Error loading statistics:', error);
        statistics = {
            reviewers: 0,
            documents: 0,
            quizAttempts: 0,
            avgQuizScore: 0
        };
    }
}

// ==================== //
// Load All Reviewers from Database
// ==================== //
async function loadReviewers() {
    try {
        const sessionToken = getSessionToken();
        
        const response = await fetch(`${API_BASE}/reviewers`, {
            headers: {
                'Authorization': `Bearer ${sessionToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch reviewers');
        }
        
        allReviewers = await response.json();
        console.log(`📚 Loaded ${allReviewers.length} reviewers from database`);
        
    } catch (error) {
        console.error('Error loading reviewers:', error);
        allReviewers = [];
    }
}

// ==================== //
// Update Stats Display
// ==================== //
function updateStatsDisplay() {
    document.getElementById('statReviewers').textContent = statistics.reviewers;
    document.getElementById('statGames').textContent = statistics.quizAttempts;
    document.getElementById('statDocuments').textContent = statistics.documents;
    
    const avgScore = Math.round(statistics.avgQuizScore || 0);
    document.getElementById('statScore').textContent = `${avgScore}%`;
    
    const subtitle = document.getElementById('reviewsSubtitle');
    if (allReviewers.length === 0) {
        subtitle.textContent = 'No reviews yet';
    } else if (allReviewers.length === 1) {
        subtitle.textContent = '1 review available';
    } else {
        subtitle.textContent = `${allReviewers.length} reviews available`;
    }
    
    animateStatCards();
}

// ==================== //
// Display Reviewers
// ==================== //
function displayReviewers() {
    const emptyState = document.getElementById('emptyState');
    const reviewerGrid = document.getElementById('reviewerGrid');
    
    if (allReviewers.length === 0) {
        emptyState.style.display = 'block';
        reviewerGrid.style.display = 'none';
        return;
    }
    
    emptyState.style.display = 'none';
    reviewerGrid.style.display = 'grid';
    
    reviewerGrid.innerHTML = '';
    
    allReviewers.forEach((reviewer, index) => {
        const card = createReviewerCard(reviewer, index);
        reviewerGrid.appendChild(card);
    });
    
    console.log(`✅ Displayed ${allReviewers.length} reviewer cards`);
}

// ==================== //
// Create Reviewer Card
// ==================== //
function createReviewerCard(reviewer, index) {
    const card = document.createElement('div');
    card.className = 'reviewer-card';
    card.style.animationDelay = `${index * 0.1}s`;
    
    const date = new Date(reviewer.generated_at);
    const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    
    const wordCount = reviewer.word_count || 'N/A';
    
    card.innerHTML = `
        <div class="reviewer-card-header">
            <div class="reviewer-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
            </div>
            <div class="reviewer-badge">Study Material</div>
        </div>
        
        <div class="reviewer-card-body">
            <h3 class="reviewer-title">${escapeHtml(reviewer.title)}</h3>
            <p class="reviewer-date">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                ${formattedDate}
            </p>
            <div class="reviewer-stats">
                <div class="reviewer-stat">
                    <span class="stat-icon">📄</span>
                    <span class="stat-text">${wordCount} words</span>
                </div>
            </div>
        </div>
        
        <div class="reviewer-card-footer">
            <button class="btn-open-reviewer" data-reviewer-id="${reviewer.id}">
                Open Reviewer
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
            </button>
            <button class="btn-delete-reviewer" data-reviewer-id="${reviewer.id}" title="Delete">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        </div>
    `;
    
    const openBtn = card.querySelector('.btn-open-reviewer');
    const deleteBtn = card.querySelector('.btn-delete-reviewer');
    
    openBtn.addEventListener('click', () => openReviewer(reviewer.id));
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        confirmDeleteReviewer(reviewer.id, reviewer.title);
    });
    
    return card;
}

// ==================== //
// Open Reviewer - WITH AUTH
// ==================== //
async function openReviewer(reviewerId) {
    console.log(`📖 Opening reviewer ID: ${reviewerId}`);
    
    showLoading('Loading reviewer...');
    
    try {
        const sessionToken = getSessionToken();
        
        const response = await fetch(`${API_BASE}/reviewer/${reviewerId}`, {
            headers: {
                'Authorization': `Bearer ${sessionToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load reviewer');
        }
        
        const reviewerData = await response.json();
        console.log('✅ Reviewer loaded:', reviewerData);
        
        sessionStorage.setItem('reviewerData', JSON.stringify(reviewerData));
        sessionStorage.setItem('reviewerTitle', reviewerData.title);
        sessionStorage.setItem('reviewerId', reviewerData.id.toString());
        sessionStorage.setItem('documentId', reviewerData.documentId.toString());
        sessionStorage.setItem('reviewerSource', 'database');
        
        const questionsResponse = await fetch(`${API_BASE}/quiz-questions/${reviewerId}`, {
            headers: {
                'Authorization': `Bearer ${sessionToken}`
            }
        });
        
        if (questionsResponse.ok) {
            const quizQuestions = await questionsResponse.json();
            sessionStorage.setItem('quizQuestions', JSON.stringify(quizQuestions));
            sessionStorage.setItem('quizQuestions_reviewerId', reviewerId.toString());
            console.log('✅ Quiz questions loaded');
        }
        
        sessionStorage.setItem('previousPage', window.location.href);
        window.location.href = '../ReviewerPage/index.html';
        
    } catch (error) {
        console.error('❌ Error opening reviewer:', error);
        hideLoading();
        alert('Failed to open reviewer. Please try again.');
    }
}

// ==================== //
// Delete Reviewer - WITH AUTH
// ==================== //
function confirmDeleteReviewer(reviewerId, title) {
    const confirmed = confirm(`Are you sure you want to delete "${title}"?\n\nThis will also delete all associated quiz questions and attempts.`);
    
    if (confirmed) {
        deleteReviewer(reviewerId);
    }
}

async function deleteReviewer(reviewerId) {
    console.log(`🗑️ Deleting reviewer ID: ${reviewerId}`);
    
    showLoading('Deleting reviewer...');
    
    try {
        const sessionToken = getSessionToken();
        
        const response = await fetch(`${API_BASE}/reviewer/${reviewerId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${sessionToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete reviewer');
        }
        
        console.log('✅ Reviewer deleted successfully');
        
        await loadDashboardData();
        
    } catch (error) {
        console.error('❌ Error deleting reviewer:', error);
        hideLoading();
        alert('Failed to delete reviewer. Please try again.');
    }
}

// ==================== //
// Navigation Buttons
// ==================== //
function initNavigationButtons() {
    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            window.location.href = '../HomePage/index.html';
        });
    }

    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            window.location.href = '../SettingsPage/index.html';
        });
    }
    
    const newReviewBtn = document.getElementById('newReviewBtn');
    if (newReviewBtn) {
        newReviewBtn.addEventListener('click', () => {
            window.location.href = '../UploadPage/index.html';
        });
    }
    
    const createFirstBtn = document.getElementById('createFirstBtn');
    if (createFirstBtn) {
        createFirstBtn.addEventListener('click', () => {
            window.location.href = '../UploadPage/index.html';
        });
    }
    
    const actionCreate = document.getElementById('actionCreate');
    const actionExplore = document.getElementById('actionExplore');
    const actionSettings = document.getElementById('actionSettings');
    
    if (actionCreate) {
        actionCreate.addEventListener('click', () => {
            window.location.href = '../UploadPage/index.html';
        });
    }
    
    if (actionExplore) {
        actionExplore.addEventListener('click', () => {
            document.querySelector('.reviews-section').scrollIntoView({ 
                behavior: 'smooth' 
            });
        });
    }
    
    if (actionSettings) {
        actionSettings.addEventListener('click', () => {
            window.location.href = '../SettingsPage/index.html';
        });
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// ==================== //
// Logout Handler
// ==================== //
async function handleLogout() {
    const sessionToken = getSessionToken();
    
    try {
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${sessionToken}`
            }
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    sessionStorage.clear();
    localStorage.removeItem('sessionToken');
    
    window.location.href = '../LoginPage/index.html';
}

// ==================== //
// Greeting Based on Time
// ==================== //
function updateGreeting() {
    const welcomeTitle = document.getElementById('welcomeTitle');
    const currentHour = new Date().getHours();
    const userName = getUserName();
    
    let greeting = 'Welcome Back';
    
    if (currentHour < 12) {
        greeting = 'Good Morning';
    } else if (currentHour < 18) {
        greeting = 'Good Afternoon';
    } else {
        greeting = 'Good Evening';
    }
    
    welcomeTitle.textContent = `${greeting}, ${userName}! 👋`;
}

// ==================== //
// Animate Stat Cards
// ==================== //
function animateStatCards() {
    const statCards = document.querySelectorAll('.stat-card');
    
    statCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// ==================== //
// Loading Overlay
// ==================== //
function showLoading(message = 'Loading your reviewers...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = overlay.querySelector('.loading-text');
    
    if (loadingText) {
        loadingText.textContent = message;
    }
    
    overlay.classList.add('active');
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.remove('active');
}

// ==================== //
// Error Display
// ==================== //
function showError(message) {
    alert(message);
}

// ==================== //
// Utility Functions
// ==================== //
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== //
// Refresh Dashboard
// ==================== //
function refreshDashboard() {
    console.log('🔄 Refreshing dashboard...');
    loadDashboardData();
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
        e.preventDefault();
        refreshDashboard();
    }
});

console.log('✅ Dashboard script loaded - WITH AUTHENTICATION (FIXED REDIRECT LOOP)');