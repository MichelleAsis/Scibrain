// ReviewerPage/script.js - FIXED: Navigation loop prevention + sessionStorage retry logic + MOBILE FEATURES

// ==================== //
// AUTOMATIC BACKEND URL DETECTION FOR MOBILE
// ==================== //
function getBackendURL() {
    return window.location.origin;
}   

const BACKEND_URL = getBackendURL();
console.log('🔗 Using backend URL:', BACKEND_URL);

// ==================== //
// Global State
// ==================== //
let annotations = {
    highlights: [],
    notes: [],
    bookmarks: []
};

let activeAnnotationTool = null;
let highlightColor = '#FFEB3B'; // Default yellow

// Get session token from localStorage
function getSessionToken() {
    return localStorage.getItem('sessionToken');
}

// Redirect if not authenticated
function redirectToLoginIfNoAuth() {
    const token = getSessionToken();
    if (!token) {
        alert('Please log in to continue');
        window.location.href = '../LoginPage/index.html';
        return false;
    }
    return true;
}

// Make authenticated fetch requests
async function authenticatedFetch(url, options = {}) {
    const token = getSessionToken();
    if (!token) throw new Error('No authentication token');
    
    const headers = options.headers || {};
    headers['Authorization'] = `Bearer ${token}`;
    headers['Content-Type'] = 'application/json';
    options.headers = headers;
    
    const response = await fetch(url, options);
    
    if (response.status === 401) {
        localStorage.removeItem('sessionToken');
        alert('Session expired. Please log in again.');
        window.location.href = '../LoginPage/index.html';
        throw new Error('Unauthorized');
    }
    
    return response;
}

// ==================== //
// CRITICAL FIX: Data Verification with RETRY LOGIC
// ==================== //
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📖 ReviewerPage Loading...');
    console.log('🔍 Verifying sessionStorage data...');
    
    // ============================================================
    // NAVIGATION FIX: Track original entry point to avoid loop
    // If we don't have an originalEntryPoint set, set it now
    // This prevents the Back button from looping through GamesHub
    // ============================================================
    if (!sessionStorage.getItem('reviewerOriginalEntryPoint')) {
        // This is the first time entering ReviewerPage in this session
        // Store the referrer or default to Dashboard
        const referrer = document.referrer;
        const entryPoint = referrer.includes('Dashboard') ? '../Dashboard/index.html' :
                          referrer.includes('UploadPage') ? '../UploadPage/index.html' :
                          '../Dashboard/index.html'; // Default fallback
        
        sessionStorage.setItem('reviewerOriginalEntryPoint', entryPoint);
        console.log('🔗 Set original entry point:', entryPoint);
    }
    
    // ============================================================
    // CRITICAL FIX: Retry reading sessionStorage before giving up
    // This handles the race condition where navigation happens
    // before sessionStorage is fully synchronized
    // ============================================================
    
    let reviewerDataStr = null;
    let retries = 0;
    const maxRetries = 5;
    
    console.log('🔄 Attempting to read sessionStorage (with retry)...');
    
    while (!reviewerDataStr && retries < maxRetries) {
        if (retries > 0) {
            console.log(`   ⏳ Retry ${retries}/${maxRetries} - waiting 200ms...`);
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        reviewerDataStr = sessionStorage.getItem('reviewerData');
        
        if (reviewerDataStr) {
            console.log(`   ✅ Data found on attempt ${retries + 1}`);
            break;
        }
        
        retries++;
    }
    
    // Now get the other items (after we confirmed data exists)
    const reviewerTitle = sessionStorage.getItem('reviewerTitle');
    const reviewerSource = sessionStorage.getItem('reviewerSource');
    const reviewerId = sessionStorage.getItem('reviewerId');
    const documentId = sessionStorage.getItem('documentId');
    
    console.log('📊 SessionStorage verification:');
    console.log('   - reviewerData:', reviewerDataStr ? `${(reviewerDataStr.length / 1024).toFixed(1)} KB` : '❌ MISSING');
    console.log('   - reviewerTitle:', reviewerTitle || '❌ MISSING');
    console.log('   - reviewerSource:', reviewerSource || '❌ MISSING');
    console.log('   - reviewerId:', reviewerId || 'Not set (optional)');
    console.log('   - documentId:', documentId || 'Not set (optional)');
    
    // CRITICAL: Check if data exists (after retries)
    if (!reviewerDataStr) {
        console.error('❌ CRITICAL: No reviewer data found after', maxRetries, 'attempts!');
        console.error('Possible causes:');
        console.error('1. User refreshed the page');
        console.error('2. User navigated directly to this page');
        console.error('3. SessionStorage was cleared');
        
        // Show error to user
        alert('⚠️ No reviewer data found.\n\nThis usually happens when:\n• You refreshed the page\n• You navigated here directly\n• The previous page didn\'t load properly\n\nYou will be redirected to create a new reviewer.');
        
        // Clear any corrupted data
        sessionStorage.clear();
        
        // Redirect to upload page after delay
        setTimeout(() => {
            window.location.href = '../UploadPage/index.html';
        }, 2000);
        
        return; // Stop execution
    }
    
    try {
        // Parse and verify data structure
        const reviewerData = JSON.parse(reviewerDataStr);
        
        console.log('✅ Reviewer data successfully parsed');
        console.log('📝 Data structure:');
        console.log('   - Title:', reviewerData.title || reviewerTitle || 'Untitled');
        console.log('   - Sections:', reviewerData.sections?.length || 0);
        console.log('   - Concepts:', reviewerData.concepts?.length || 0);
        console.log('   - Original Text Length:', reviewerData.originalText?.length || 0);
        console.log('   - Reviewer ID:', reviewerData.reviewerId || reviewerId || 'Not set');
        console.log('   - Document ID:', reviewerData.documentId || documentId || 'Not set');
        console.log('   - Source:', reviewerData.source || reviewerSource || 'Unknown');
        console.log('   - Timestamp:', reviewerData.timestamp ? new Date(reviewerData.timestamp).toLocaleString() : 'Not set');
        
        // Verify required data exists
        if (!reviewerData.sections || reviewerData.sections.length === 0) {
            throw new Error('No sections found in reviewer data. Data may be corrupted.');
        }
        
        if (!reviewerData.concepts || reviewerData.concepts.length === 0) {
            console.warn('⚠️ No concepts found - quiz generation may be limited');
        }
        
        console.log('✅ Data structure validation passed');
        
        // Store IDs globally for later use (quiz generation, saving results, etc.)
        window.currentReviewerId = reviewerData.reviewerId || (reviewerId ? parseInt(reviewerId) : null);
        window.currentDocumentId = reviewerData.documentId || (documentId ? parseInt(documentId) : null);
        window.reviewerConcepts = reviewerData.concepts || [];
        window.reviewerQuestions = null; // Will be populated after generation
        
        console.log('🆔 Global state initialized:');
        console.log('   - window.currentReviewerId:', window.currentReviewerId);
        console.log('   - window.currentDocumentId:', window.currentDocumentId);
        console.log('   - window.reviewerConcepts:', window.reviewerConcepts.length);
        
        // Load the reviewer UI with verified data
        console.log('🎨 Loading Reviewer UI...');
        loadReviewerUI(reviewerData, reviewerTitle || reviewerData.title);
        
        // Initialize all features
        initTableOfContents();
        initTopNavButtons();
        initScrollSpy();
        initHighlightTool();
        initNotesTool();
        initBookmarkTool();
        
        // ==================== //
        // MOBILE FEATURES INITIALIZATION
        // ==================== //
        initMobileMenu();
        initMobileFAB();
        
        console.log('✅ All features initialized successfully');
        console.log('✅ Mobile features initialized');
        
        // Check if quiz questions are already available
        const quizQuestionsStr = sessionStorage.getItem('quizQuestions');
        const storedReviewerId = sessionStorage.getItem('quizQuestions_reviewerId');
        if (quizQuestionsStr && storedReviewerId && parseInt(storedReviewerId) === window.currentReviewerId) {
            try {
                const quizQuestions = JSON.parse(quizQuestionsStr);
                window.reviewerQuestions = quizQuestions;
                console.log('✅ Quiz questions loaded from sessionStorage');
                showQuizGenerationNotification('success');
            } catch (error) {
                console.warn('⚠️ Failed to parse quiz questions:', error);
                if (reviewerData.originalText && reviewerData.concepts) {
                    startBackgroundQuizGeneration(
                        reviewerData.originalText,
                        reviewerData.concepts,
                        window.currentReviewerId
                    );
                }
            }
        } else {
            if (reviewerData.originalText && reviewerData.concepts && reviewerData.concepts.length > 0) {
                console.log('🎮 Starting background quiz generation...');
                startBackgroundQuizGeneration(
                    reviewerData.originalText,
                    reviewerData.concepts,
                    window.currentReviewerId
                );
            }
        }
        
    } catch (error) {
        console.error('❌ CRITICAL ERROR parsing reviewer data:', error);
        alert(`❌ Error loading reviewer data:\n\n${error.message}\n\nThe data may be corrupted.`);
        sessionStorage.removeItem('reviewerData');
        setTimeout(() => {
            window.location.href = '../UploadPage/index.html';
        }, 2000);
    }
});

// ==================== //
// MOBILE MENU FUNCTIONS
// ==================== //

function initMobileMenu() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const overlay = document.getElementById('mobileMenuOverlay');
    const closeBtn = document.getElementById('closeMobileMenuBtn');
    const menuItems = document.querySelectorAll('.mobile-menu-item');
    
    menuBtn?.addEventListener('click', () => {
        overlay.classList.add('active');
        if (navigator.vibrate) navigator.vibrate(10);
    });
    
    closeBtn?.addEventListener('click', () => {
        overlay.classList.remove('active');
    });
    
    overlay?.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
        }
    });
    
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const action = item.dataset.action;
            handleMenuAction(action);
            overlay.classList.remove('active');
        });
    });
}

function handleMenuAction(action) {
    switch(action) {
        case 'show-toc':
            showMobileSidebar('left');
            break;
        case 'show-annotations':
            showMobileSidebar('right');
            break;
        case 'toggle-annotations':
            toggleAnnotationsVisibility();
            break;
        case 'share':
            handleShare();
            break;
        case 'play-games':
            if (!window.reviewerQuestions) {
                alert('Quiz questions are still being generated. Please wait...');
                return;
            }
            window.location.href = '../GamesHub/index.html';
            break;
    }
}

function showMobileSidebar(side) {
    const sidebar = side === 'left' ? 
        document.getElementById('sidebarLeft') : 
        document.getElementById('sidebarRight');
    
    sidebar?.classList.add('mobile-active');
    
    const closeBtn = sidebar.querySelector('.btn-close-sidebar');
    closeBtn?.addEventListener('click', () => {
        sidebar.classList.remove('mobile-active');
    }, { once: true });
}

function toggleAnnotationsVisibility() {
    const highlights = document.querySelectorAll('.highlight-mark');
    const notes = document.querySelectorAll('.note-indicator');
    const bookmarks = document.querySelectorAll('.bookmark-icon');
    
    const isHidden = highlights[0]?.style.display === 'none';
    
    highlights.forEach(h => h.style.display = isHidden ? '' : 'none');
    notes.forEach(n => n.style.display = isHidden ? '' : 'none');
    bookmarks.forEach(b => b.style.display = isHidden ? '' : 'none');
}

function handleShare() {
    if (navigator.share) {
        navigator.share({
            title: document.querySelector('.topic-title').textContent,
            text: 'Check out this study guide!',
            url: window.location.href
        }).catch(err => console.log('Share error:', err));
    } else {
        navigator.clipboard.writeText(window.location.href).then(() => {
            alert('Link copied to clipboard!');
        });
    }
}

// ==================== //
// MOBILE FAB FUNCTIONS
// ==================== //

function initMobileFAB() {
    const fab = document.getElementById('mobileFabBtn');
    const fabMenu = document.getElementById('mobileFabMenu');
    const fabOptions = document.querySelectorAll('.mobile-fab-option');
    
    fab?.addEventListener('click', () => {
        fab.classList.toggle('active');
        fabMenu.classList.toggle('active');
        if (navigator.vibrate) navigator.vibrate(10);
    });
    
    fabOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const tool = option.dataset.tool;
            
            fabOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            
            toggleAnnotationTool(tool);
            
            setTimeout(() => {
                fab.classList.remove('active');
                fabMenu.classList.remove('active');
            }, 300);
        });
    });
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.mobile-fab-container')) {
            fab?.classList.remove('active');
            fabMenu?.classList.remove('active');
        }
    });
}

// ==================== //
// Load Reviewer UI
// ==================== //
function loadReviewerUI(reviewerData, title) {
    console.log('🎨 Rendering Reviewer UI...');
    
    try {
        // Update page title
        document.querySelector('.topic-title').textContent = title || reviewerData.title || 'Study Reviewer';
        
        // Update date
        const today = new Date();
        document.querySelector('.topic-date').textContent = 
            `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
        
        // Display content
        displayAdvancedReviewer(reviewerData);
        
        console.log('✅ Reviewer UI rendered successfully');
        
        // Load annotations AFTER content is rendered
        setTimeout(() => {
            loadAnnotations();
            console.log('✅ Annotations loaded');
        }, 500);
        
    } catch (error) {
        console.error('❌ Error rendering Reviewer UI:', error);
        throw error; // Re-throw to be caught by parent
    }
}

// ==================== //
// Legacy Load Function (kept for compatibility)
// ==================== //
function loadReviewerContent() {
    console.log('⚠️ loadReviewerContent() called - this is now handled in DOMContentLoaded');
    console.log('   This function is deprecated but kept for backward compatibility');
}

// ==================== //
// Background Quiz Generation - FIXED: Include reviewerId
// ==================== //
async function startBackgroundQuizGeneration(text, concepts, reviewerId) {
    console.log('🎮 Starting background quiz generation...');
    console.log('📝 Parameters:');
    console.log('   - Text length:', text?.length || 0);
    console.log('   - Concepts count:', concepts?.length || 0);
    console.log('   - Reviewer ID:', reviewerId || 'NOT PROVIDED');
    
    // Validate inputs
    if (!text || text.length < 100) {
        console.error('❌ Text too short or missing - cannot generate quiz');
        showQuizGenerationNotification('error');
        return;
    }
    
    if (!concepts || concepts.length === 0) {
        console.error('❌ No concepts provided - cannot generate quiz');
        showQuizGenerationNotification('error');
        return;
    }
    
    showQuizGenerationNotification('generating');
    
    try {
        const requestBody = {
            text: text,
            concepts: concepts
        };
        
        // CRITICAL: Only include reviewerId if it exists and is valid
        if (reviewerId && !isNaN(reviewerId)) {
            requestBody.reviewerId = reviewerId;
            console.log('✅ Including reviewerId in request:', reviewerId);
        } else {
            console.log('ℹ️ No valid reviewerId - quiz questions will not be saved to database');
        }
        
        console.log('📤 Sending request to backend...');
        const response = await authenticatedFetch(`${BACKEND_URL}/api/generate-questions`, {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });

        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Server error: ${response.status} - ${errorData.error || response.statusText}`);
        }
        
        const questions = await response.json();
        
        // Store questions in sessionStorage and global variable
        sessionStorage.setItem('quizQuestions', JSON.stringify(questions));
        sessionStorage.setItem('quizQuestions_reviewerId', reviewerId.toString());
        window.reviewerQuestions = questions;

        console.log('✅ Quiz questions generated successfully!');
        console.log('📊 Questions breakdown:');
        console.log('   - True/False:', Object.values(questions.trueFalse || {}).flat().length);
        console.log('   - Multiple Choice:', Object.values(questions.multipleChoice || {}).flat().length);
        console.log('   - Identification:', Object.values(questions.identification || {}).flat().length);
        console.log('   - Matching:', Object.values(questions.matching || {}).reduce((sum, m) => sum + (m.pairs?.length || 0), 0));
        
        showQuizGenerationNotification('success');
        
    } catch (error) {
        console.error('❌ Quiz generation failed:', error);
        console.error('   Error details:', error.message);
        console.error('   Stack trace:', error.stack);
        
        // Retry logic with exponential backoff
        console.log('🔄 Will retry quiz generation in 3 seconds...');
        
        setTimeout(async () => {
            try {
                console.log('🔄 Retrying quiz generation...');
                await startBackgroundQuizGeneration(text, concepts, reviewerId);
            } catch (retryError) {
                console.error('❌ Retry failed:', retryError);
                showQuizGenerationNotification('error');
                
                // Show user-friendly error
                console.log('ℹ️ Quiz generation failed twice. User can try manually from Games Hub.');
            }
        }, 3000);
    }
}

function showQuizGenerationNotification(status) {
    const existing = document.getElementById('quiz-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.id = 'quiz-notification';
    notification.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: white;
        border-radius: 12px;
        padding: 16px 20px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        max-width: 350px;
    `;
    
    if (status === 'generating') {
        notification.innerHTML = `
            <div style="width: 32px; height: 32px; border: 3px solid #2ECC71; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <div>
                <div style="font-weight: 600; color: #2C3E50; font-size: 14px;">Generating Quiz Questions</div>
                <div style="color: #7F8C8D; font-size: 12px; margin-top: 2px;">This won't interrupt your reading...</div>
            </div>
        `;
    } else if (status === 'success') {
        notification.innerHTML = `
            <div style="width: 32px; height: 32px; background: #2ECC71; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px;">✓</div>
            <div>
                <div style="font-weight: 600; color: #2C3E50; font-size: 14px;">Quiz Games Ready!</div>
                <div style="color: #7F8C8D; font-size: 12px; margin-top: 2px;">Click "Play Games" to start</div>
            </div>
        `;
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    } else if (status === 'error') {
        notification.innerHTML = `
            <div style="width: 32px; height: 32px; background: #E74C3C; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px;">!</div>
            <div>
                <div style="font-weight: 600; color: #2C3E50; font-size: 14px;">Quiz Generation Failed</div>
                <div style="color: #7F8C8D; font-size: 12px; margin-top: 2px;">Some games may be unavailable</div>
            </div>
        `;
        setTimeout(() => notification.remove(), 5000);
    }
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(400px); opacity: 0; } }
        @keyframes spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
}

// ==================== //
// Annotation System - Core Functions
// ==================== //

// Load annotations from localStorage - NOW REVIEWER-SPECIFIC
function loadAnnotations() {
    const reviewerId = window.currentReviewerId;
    
    if (!reviewerId) {
        console.warn('⚠️ No reviewer ID - cannot load annotations');
        // CRITICAL: Reset to empty if no reviewer
        annotations = {
            highlights: [],
            notes: [],
            bookmarks: []
        };
        return;
    }
    
    const storageKey = `reviewer_annotations_${reviewerId}`;
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
        try {
            annotations = JSON.parse(saved);
            console.log(`📌 Loading saved annotations for reviewer ${reviewerId}:`, annotations);
            applyAllAnnotations();
            updateAnnotationsSidebar();
        } catch (error) {
            console.error('Error loading annotations:', error);
            // CRITICAL: Reset to empty on error
            annotations = {
                highlights: [],
                notes: [],
                bookmarks: []
            };
        }
    } else {
        // CRITICAL: No saved annotations - reset to empty
        console.log(`ℹ️ No saved annotations for reviewer ${reviewerId} - starting fresh`);
        annotations = {
            highlights: [],
            notes: [],
            bookmarks: []
        };
        updateAnnotationsSidebar(); // Show empty state
    }
}

// Save annotations to localStorage - NOW REVIEWER-SPECIFIC
function saveAnnotations() {
    const reviewerId = window.currentReviewerId;
    
    if (!reviewerId) {
        console.warn('⚠️ No reviewer ID - cannot save annotations');
        return;
    }
    
    const storageKey = `reviewer_annotations_${reviewerId}`;
    localStorage.setItem(storageKey, JSON.stringify(annotations));
    updateAnnotationsSidebar();
    console.log(`💾 Annotations saved for reviewer ${reviewerId}`);
}

// Apply all saved annotations to the document
function applyAllAnnotations() {
    console.log('🎨 Applying all annotations...');
    
    // Apply highlights
    annotations.highlights.forEach((highlight, index) => {
        console.log(`Applying highlight ${index + 1}:`, highlight.text.substring(0, 50));
        applyHighlight(highlight);
    });
    
    // Apply bookmarks
    annotations.bookmarks.forEach(bookmark => {
        applyBookmark(bookmark);
    });
    
    // Apply notes
    annotations.notes.forEach(note => {
        applyNoteIndicator(note);
    });
}

// ==================== //
// Highlight Feature
// ==================== //

function initHighlightTool() {
    const highlightBtn = document.querySelector('[data-tool="highlight"]');
    
    // Create color picker
    const colorPicker = createColorPicker();
    highlightBtn.appendChild(colorPicker);
    
    highlightBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target.closest('.color-option')) return;
        
        toggleAnnotationTool('highlight');
    });
}

function createColorPicker() {
    const picker = document.createElement('div');
    picker.className = 'color-picker';
    picker.innerHTML = `
        <div class="color-option" data-color="#FFEB3B" style="background: #FFEB3B;" title="Yellow"></div>
        <div class="color-option" data-color="#4CAF50" style="background: #4CAF50;" title="Green"></div>
        <div class="color-option" data-color="#2196F3" style="background: #2196F3;" title="Blue"></div>
        <div class="color-option" data-color="#FF9800" style="background: #FF9800;" title="Orange"></div>
        <div class="color-option" data-color="#E91E63" style="background: #E91E63;" title="Pink"></div>
    `;
    
    picker.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            highlightColor = option.dataset.color;
            picker.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
        });
    });
    
    picker.querySelector('[data-color="#FFEB3B"]').classList.add('selected');
    
    return picker;
}

function toggleAnnotationTool(tool) {
    const allTools = document.querySelectorAll('.tool-btn');
    const clickedTool = document.querySelector(`[data-tool="${tool}"]`);
    
    if (activeAnnotationTool === tool) {
        activeAnnotationTool = null;
        clickedTool.classList.remove('active');
        disableTextSelection();
        if (tool === 'note') disableNoteMode();
        if (tool === 'bookmark') disableBookmarkMode();
    } else {
        activeAnnotationTool = tool;
        allTools.forEach(btn => btn.classList.remove('active'));
        clickedTool.classList.add('active');
        
        if (tool === 'highlight') {
            enableTextSelection();
            disableNoteMode();
            disableBookmarkMode();
        } else if (tool === 'note') {
            disableTextSelection();
            enableNoteMode();
            disableBookmarkMode();
        } else if (tool === 'bookmark') {
            disableTextSelection();
            disableNoteMode();
            enableBookmarkMode();
        }
    }
}

function enableTextSelection() {
    const contentArea = document.querySelector('.content-document');
    contentArea.style.userSelect = 'text';
    contentArea.style.cursor = 'text';
    contentArea.style.webkitUserSelect = 'text'; // iOS Safari
    
    // Desktop support
    document.addEventListener('mouseup', handleTextSelection);
    
    // Mobile touch support
    document.addEventListener('touchend', handleTextSelection);
    
    console.log('✅ Text selection enabled (desktop + mobile)');
}

function disableTextSelection() {
    const contentArea = document.querySelector('.content-document');
    contentArea.style.userSelect = 'none';
    contentArea.style.cursor = 'default';
    contentArea.style.webkitUserSelect = 'none'; // iOS Safari
    
    // Remove desktop support
    document.removeEventListener('mouseup', handleTextSelection);
    
    // Remove mobile touch support
    document.removeEventListener('touchend', handleTextSelection);
    
    console.log('✅ Text selection disabled (desktop + mobile)');
}

function handleTextSelection(e) {
    if (activeAnnotationTool !== 'highlight') return;
    
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (!selectedText) return;
    
    const contentArea = document.querySelector('.content-document');
    if (!contentArea.contains(selection.anchorNode)) return;
    
    console.log('📝 Creating highlight for:', selectedText.substring(0, 50));
    
    try {
        const range = selection.getRangeAt(0);
        
        const highlight = {
            id: Date.now(),
            text: selectedText,
            color: highlightColor,
            rangeData: {
                startOffset: range.startOffset,
                endOffset: range.endOffset,
                startText: range.startContainer.textContent,
                endText: range.endContainer.textContent,
                containerText: range.commonAncestorContainer.textContent
            },
            timestamp: new Date().toISOString()
        };
        
        const span = document.createElement('span');
        span.className = 'highlight-mark';
        span.dataset.highlightId = highlight.id;
        span.style.backgroundColor = highlightColor;
        span.style.cursor = 'pointer';
        span.title = 'Right-click to remove';
        
        // Desktop: right-click context menu
        span.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showHighlightContextMenu(e, highlight.id);
        });
        
        // Mobile: long-press to remove
        let pressTimer;
        span.addEventListener('touchstart', (e) => {
            pressTimer = setTimeout(() => {
                // Show mobile-friendly removal dialog
                if (confirm('Remove this highlight?')) {
                    removeHighlight(highlight.id);
                }
            }, 500); // 500ms long press
        });
        
        span.addEventListener('touchend', () => {
            clearTimeout(pressTimer);
        });
        
        span.addEventListener('touchmove', () => {
            clearTimeout(pressTimer);
        });
        
        range.surroundContents(span);
        
        annotations.highlights.push(highlight);
        saveAnnotations();
        
        console.log('✅ Highlight created and saved');
        
        // Show success feedback for mobile users
        if (e.type === 'touchend') {
            showMobileHighlightFeedback();
        }
        
    } catch (error) {
        console.error('❌ Error creating highlight:', error);
        alert('Could not highlight this selection. Try selecting within a single paragraph.');
    }
    
    selection.removeAllRanges();
}

// ==================== //
// Mobile Highlight Feedback
// ==================== //
function showMobileHighlightFeedback() {
    const feedback = document.createElement('div');
    feedback.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(46, 204, 113, 0.95);
        color: white;
        padding: 12px 24px;
        border-radius: 25px;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10001;
        animation: slideUp 0.3s ease;
        font-family: 'Inter', sans-serif;
    `;
    feedback.textContent = '✓ Highlighted';
    
    document.body.appendChild(feedback);
    
    setTimeout(() => {
        feedback.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => feedback.remove(), 300);
    }, 2000);
}

function applyHighlight(highlight) {
    try {
        const walker = document.createTreeWalker(
            document.querySelector('.content-document'),
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        while (node = walker.nextNode()) {
            const text = node.textContent;
            
            if (text.includes(highlight.text)) {
                const startIndex = text.indexOf(highlight.text);
                
                if (startIndex !== -1) {
                    const range = document.createRange();
                    range.setStart(node, startIndex);
                    range.setEnd(node, startIndex + highlight.text.length);
                    
                    const span = document.createElement('span');
                    span.className = 'highlight-mark';
                    span.dataset.highlightId = highlight.id;
                    span.style.backgroundColor = highlight.color;
                    span.style.cursor = 'pointer';
                    span.title = 'Right-click to remove';
                    
                    span.addEventListener('contextmenu', (e) => {
                        e.preventDefault();
                        showHighlightContextMenu(e, highlight.id);
                    });

                    // Mobile: long-press to remove
                    let pressTimer;
                    span.addEventListener('touchstart', (e) => {
                        pressTimer = setTimeout(() => {
                            if (confirm('Remove this highlight?')) {
                                removeHighlight(highlight.id);
                            }
                        }, 500);
                    });

                    span.addEventListener('touchend', () => {
                        clearTimeout(pressTimer);
                    });

                    span.addEventListener('touchmove', () => {
                        clearTimeout(pressTimer);
                    });
                    
                    range.surroundContents(span);
                    console.log('✅ Reapplied highlight:', highlight.text.substring(0, 30));
                    break;
                }
            }
        }
    } catch (error) {
        console.error('Error reapplying highlight:', error);
    }
}

function showHighlightContextMenu(e, highlightId) {
    const existingMenu = document.querySelector('.highlight-context-menu');
    if (existingMenu) existingMenu.remove();
    
    const menu = document.createElement('div');
    menu.className = 'highlight-context-menu';
    menu.style.cssText = `
        position: fixed;
        left: ${e.clientX}px;
        top: ${e.clientY}px;
        background: white;
        border: 1px solid #E0E0E0;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        padding: 8px 0;
        min-width: 150px;
    `;
    
    menu.innerHTML = `
        <div class="context-menu-item" data-action="remove" style="
            padding: 10px 16px;
            font-size: 13px;
            color: #2C3E50;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            font-family: 'Inter', sans-serif;
        ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            Remove Highlight
        </div>
    `;
    
    menu.querySelector('[data-action="remove"]').addEventListener('click', () => {
        removeHighlight(highlightId);
        menu.remove();
    });
    
    menu.querySelector('[data-action="remove"]').addEventListener('mouseenter', (e) => {
        e.target.style.background = '#F5F5F5';
    });
    
    menu.querySelector('[data-action="remove"]').addEventListener('mouseleave', (e) => {
        e.target.style.background = 'transparent';
    });
    
    document.body.appendChild(menu);
    
    setTimeout(() => {
        document.addEventListener('click', function closeMenu() {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        });
    }, 100);
}

function removeHighlight(highlightId) {
    annotations.highlights = annotations.highlights.filter(h => h.id !== highlightId);
    
    const span = document.querySelector(`[data-highlight-id="${highlightId}"]`);
    if (span) {
        const parent = span.parentNode;
        while (span.firstChild) {
            parent.insertBefore(span.firstChild, span);
        }
        parent.removeChild(span);
        parent.normalize();
    }
    
    saveAnnotations();
}

function removeAllHighlights() {
    if (!confirm('Remove all highlights? This cannot be undone.')) return;
    
    annotations.highlights.forEach(h => {
        const span = document.querySelector(`[data-highlight-id="${h.id}"]`);
        if (span) {
            const parent = span.parentNode;
            while (span.firstChild) {
                parent.insertBefore(span.firstChild, span);
            }
            parent.removeChild(span);
        }
    });
    
    annotations.highlights = [];
    saveAnnotations();
}

// ==================== //
// Notes Feature - Google Docs Style
// ==================== //

function initNotesTool() {
    const noteBtn = document.querySelector('[data-tool="note"]');
    noteBtn.addEventListener('click', () => {
        toggleAnnotationTool('note');
    });
}

function enableNoteMode() {
    console.log('📝 Note mode enabled - click anywhere on the reviewer to add notes');
    
    const documentPage = document.querySelector('.document-page');
    if (documentPage) {
        documentPage.style.cursor = 'crosshair';
        documentPage.addEventListener('click', handleNotePlacement);
    }
    
    const contentDocument = document.querySelector('.content-document');
    if (contentDocument) {
        contentDocument.style.cursor = 'crosshair';
        contentDocument.addEventListener('click', handleNotePlacement);
    }
}

function disableNoteMode() {
    console.log('📝 Note mode disabled');
    
    const documentPage = document.querySelector('.document-page');
    if (documentPage) {
        documentPage.style.cursor = 'default';
        documentPage.removeEventListener('click', handleNotePlacement);
    }
    
    const contentDocument = document.querySelector('.content-document');
    if (contentDocument) {
        contentDocument.style.cursor = 'default';
        contentDocument.removeEventListener('click', handleNotePlacement);
    }
}

function handleNotePlacement(e) {
    if (activeAnnotationTool !== 'note') return;
    
    if (e.target.closest('.annotation-toolbar') || 
        e.target.closest('.top-navbar') ||
        e.target.closest('.sidebar-left') ||
        e.target.closest('.sidebar-right') ||
        e.target.closest('.note-indicator') ||
        e.target.closest('.note-editor')) {
        return;
    }
    
    e.stopPropagation();
    
    const contentArea = document.querySelector('.content-area');
    const contentRect = contentArea.getBoundingClientRect();
    
    const relativeTop = e.clientY - contentRect.top + contentArea.scrollTop;
    const relativeLeft = e.clientX - contentRect.left + contentArea.scrollLeft;
    
    const maxWidth = contentRect.width - 350;
    const adjustedLeft = Math.min(relativeLeft, maxWidth);
    
    const note = {
        id: Date.now(),
        content: '',
        position: {
            top: relativeTop,
            left: adjustedLeft
        },
        timestamp: new Date().toISOString()
    };
    
    annotations.notes.push(note);
    applyNoteIndicator(note);
    openNoteEditor(note);
    saveAnnotations();
    
    toggleAnnotationTool('note');
    
    console.log('✅ Note created at:', note.position);
}

function applyNoteIndicator(note) {
    const indicator = document.createElement('div');
    indicator.className = 'note-indicator';
    indicator.dataset.noteId = note.id;
    indicator.style.cssText = `
        position: absolute;
        top: ${note.position.top}px;
        left: ${note.position.left}px;
        width: 24px;
        height: 24px;
        background: #FF9800;
        border: 2px solid white;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        z-index: 50;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: white;
        font-weight: bold;
    `;
    
    indicator.innerHTML = '📝';
    
    indicator.addEventListener('click', (e) => {
        e.stopPropagation();
        openNoteEditor(note);
    });
    
    indicator.addEventListener('mouseenter', () => {
        indicator.style.transform = 'scale(1.2)';
        indicator.style.boxShadow = '0 4px 12px rgba(255,152,0,0.5)';
    });
    
    indicator.addEventListener('mouseleave', () => {
        indicator.style.transform = 'scale(1)';
        indicator.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    });
    
    document.querySelector('.content-area').appendChild(indicator);
    
    console.log('✅ Note indicator created at position:', note.position);
}

function openNoteEditor(note) {
    const existingEditor = document.querySelector('.note-editor');
    if (existingEditor) existingEditor.remove();
    
    const editor = document.createElement('div');
    editor.className = 'note-editor';
    editor.style.cssText = `
        position: absolute;
        top: ${note.position.top}px;
        left: ${note.position.left + 35}px;
        width: 280px;
        background: linear-gradient(135deg, #FFF9C4 0%, #FFF59D 100%);
        border: 2px solid #FBC02D;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        z-index: 10000;
        font-family: 'Inter', sans-serif;
        animation: noteSlideIn 0.3s ease;
    `;
    
    editor.innerHTML = `
        <div style="
            padding: 12px;
            border-bottom: 2px solid #F9A825;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(249,168,37,0.2);
            border-radius: 10px 10px 0 0;
        ">
            <span style="font-weight: 700; font-size: 13px; color: #F57F17; display: flex; align-items: center; gap: 6px;">
                📝 Note
            </span>
            <div style="display: flex; gap: 8px;">
                <button class="note-delete-btn" title="Delete Note" style="
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    color: #F57F17;
                    display: flex;
                    align-items: center;
                    transition: background 0.2s ease;
                ">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
                <button class="note-close-btn" title="Close" style="
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    font-size: 22px;
                    font-weight: bold;
                    color: #F57F17;
                    padding: 0 6px;
                    line-height: 1;
                    transition: transform 0.2s ease;
                ">×</button>
            </div>
        </div>
        <textarea class="note-textarea" placeholder="Type your note here..." style="
            width: 100%;
            min-height: 140px;
            padding: 14px;
            border: none;
            background: transparent;
            font-size: 13px;
            line-height: 1.6;
            resize: vertical;
            font-family: 'Inter', sans-serif;
            outline: none;
            color: #5D4037;
        ">${note.content || ''}</textarea>
        <div style="
            padding: 10px 14px;
            font-size: 11px;
            color: #F57F17;
            border-top: 1px solid #F9A825;
            background: rgba(249,168,37,0.1);
            border-radius: 0 0 10px 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        ">
            <span>${new Date(note.timestamp).toLocaleString()}</span>
            <span style="font-size: 10px; opacity: 0.7;">Click outside to close</span>
        </div>
    `;
    
    if (!document.getElementById('note-animations')) {
        const style = document.createElement('style');
        style.id = 'note-animations';
        style.textContent = `
            @keyframes noteSlideIn {
                from {
                    opacity: 0;
                    transform: translateX(-20px) scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: translateX(0) scale(1);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.querySelector('.content-area').appendChild(editor);
    
    const textarea = editor.querySelector('.note-textarea');
    textarea.focus();
    
    textarea.addEventListener('input', () => {
        note.content = textarea.value;
        saveAnnotations();
    });
    
    editor.querySelector('.note-close-btn').addEventListener('click', () => {
        editor.remove();
    });
    
    const closeBtn = editor.querySelector('.note-close-btn');
    closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.transform = 'rotate(90deg)';
    });
    closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.transform = 'rotate(0)';
    });
    
    editor.querySelector('.note-delete-btn').addEventListener('click', () => {
        if (confirm('Delete this note? This cannot be undone.')) {
            removeNote(note.id);
            editor.remove();
        }
    });
    
    const deleteBtn = editor.querySelector('.note-delete-btn');
    deleteBtn.addEventListener('mouseenter', () => {
        deleteBtn.style.background = 'rgba(244,67,54,0.2)';
    });
    deleteBtn.addEventListener('mouseleave', () => {
        deleteBtn.style.background = 'transparent';
    });
    
    setTimeout(() => {
        document.addEventListener('click', function closeEditor(e) {
            if (!editor.contains(e.target) && !e.target.closest(`[data-note-id="${note.id}"]`)) {
                editor.remove();
                document.removeEventListener('click', closeEditor);
            }
        });
    }, 100);
    
    console.log('✅ Note editor opened for note:', note.id);
}

function removeNote(noteId) {
    annotations.notes = annotations.notes.filter(n => n.id !== noteId);
    
    const indicator = document.querySelector(`[data-note-id="${noteId}"]`);
    if (indicator) indicator.remove();
    
    saveAnnotations();
    console.log('🗑️ Note deleted:', noteId);
}

// ==================== //
// Bookmark Feature
// ==================== //

function initBookmarkTool() {
    const bookmarkBtn = document.querySelector('[data-tool="bookmark"]');
    bookmarkBtn.addEventListener('click', () => {
        toggleAnnotationTool('bookmark');
    });
}

function enableBookmarkMode() {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.cursor = 'pointer';
        section.style.outline = '2px dashed transparent';
        section.style.transition = 'outline 0.2s ease';
        
        section.addEventListener('mouseenter', highlightSection);
        section.addEventListener('mouseleave', unhighlightSection);
        section.addEventListener('click', handleBookmarkPlacement);
    });
}

function disableBookmarkMode() {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.cursor = 'default';
        section.style.outline = 'none';
        
        section.removeEventListener('mouseenter', highlightSection);
        section.removeEventListener('mouseleave', unhighlightSection);
        section.removeEventListener('click', handleBookmarkPlacement);
    });
}

function highlightSection(e) {
    if (activeAnnotationTool === 'bookmark') {
        e.currentTarget.style.outline = '2px dashed #2196F3';
    }
}

function unhighlightSection(e) {
    e.currentTarget.style.outline = 'none';
}

function handleBookmarkPlacement(e) {
    if (activeAnnotationTool !== 'bookmark') return;
    
    const section = e.currentTarget;
    const sectionId = section.id;
    const sectionTitle = section.querySelector('.section-heading')?.textContent || 'Untitled Section';
    
    const existing = annotations.bookmarks.find(b => b.sectionId === sectionId);
    if (existing) {
        alert('This section is already bookmarked!');
        return;
    }
    
    const bookmark = {
        id: Date.now(),
        sectionId: sectionId,
        sectionTitle: sectionTitle,
        timestamp: new Date().toISOString()
    };
    
    annotations.bookmarks.push(bookmark);
    applyBookmark(bookmark);
    saveAnnotations();
    
    toggleAnnotationTool('bookmark');
}

function applyBookmark(bookmark) {
    const section = document.getElementById(bookmark.sectionId);
    if (!section) return;
    
    const bookmarkIcon = document.createElement('div');
    bookmarkIcon.className = 'bookmark-icon';
    bookmarkIcon.dataset.bookmarkId = bookmark.id;
    bookmarkIcon.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#2196F3" stroke="#2196F3" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
    `;
    bookmarkIcon.style.cssText = `
        position: absolute;
        right: 20px;
        top: 10px;
        cursor: pointer;
        z-index: 50;
    `;
    
    bookmarkIcon.title = 'Bookmarked - Click to remove';
    bookmarkIcon.addEventListener('click', () => removeBookmark(bookmark.id));
    
    section.style.position = 'relative';
    section.appendChild(bookmarkIcon);
}

function removeBookmark(bookmarkId) {
    annotations.bookmarks = annotations.bookmarks.filter(b => b.id !== bookmarkId);
    
    const icon = document.querySelector(`[data-bookmark-id="${bookmarkId}"]`);
    if (icon) icon.remove();
    
    saveAnnotations();
}

// ==================== //
// Annotations Sidebar
// ==================== //

function updateAnnotationsSidebar() {
    const container = document.querySelector('.annotations-container');
    
    const totalAnnotations = annotations.highlights.length + 
                            annotations.notes.length + 
                            annotations.bookmarks.length;
    
    if (totalAnnotations === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                <p class="empty-state-text">No annotations yet</p>
                <p class="empty-state-subtext">Start highlighting or adding notes</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="annotations-header">
            <input type="text" class="annotation-search" placeholder="Search annotations..." />
            <select class="annotation-filter">
                <option value="all">All (${totalAnnotations})</option>
                <option value="highlights">Highlights (${annotations.highlights.length})</option>
                <option value="notes">Notes (${annotations.notes.length})</option>
                <option value="bookmarks">Bookmarks (${annotations.bookmarks.length})</option>
            </select>
        </div>
        <div class="annotations-actions">
            <button class="btn-clear-highlights" title="Clear all highlights">Clear Highlights</button>
        </div>
        <div class="annotations-list" id="annotationsList"></div>
    `;
    
    container.querySelector('.annotation-search').addEventListener('input', filterAnnotations);
    container.querySelector('.annotation-filter').addEventListener('change', filterAnnotations);
    container.querySelector('.btn-clear-highlights').addEventListener('click', removeAllHighlights);
    
    renderAnnotationsList();
}

function renderAnnotationsList(filter = 'all', searchTerm = '') {
    const list = document.getElementById('annotationsList');
    if (!list) return;
    
    list.innerHTML = '';
    
    let allAnnotations = [];
    
    if (filter === 'all' || filter === 'highlights') {
        annotations.highlights.forEach(h => {
            allAnnotations.push({
                type: 'highlight',
                data: h,
                timestamp: new Date(h.timestamp)
            });
        });
    }
    
    if (filter === 'all' || filter === 'notes') {
        annotations.notes.forEach(n => {
            allAnnotations.push({
                type: 'note',
                data: n,
                timestamp: new Date(n.timestamp)
            });
        });
    }
    
    if (filter === 'all' || filter === 'bookmarks') {
        annotations.bookmarks.forEach(b => {
            allAnnotations.push({
                type: 'bookmark',
                data: b,
                timestamp: new Date(b.timestamp)
            });
        });
    }
    
    if (searchTerm) {
        allAnnotations = allAnnotations.filter(a => {
            if (a.type === 'highlight') {
                return a.data.text.toLowerCase().includes(searchTerm.toLowerCase());
            } else if (a.type === 'note') {
                return a.data.content.toLowerCase().includes(searchTerm.toLowerCase());
            } else if (a.type === 'bookmark') {
                return a.data.sectionTitle.toLowerCase().includes(searchTerm.toLowerCase());
            }
            return false;
        });
    }
    
    allAnnotations.sort((a, b) => b.timestamp - a.timestamp);
    
    allAnnotations.forEach(annotation => {
        const item = createAnnotationListItem(annotation);
        list.appendChild(item);
    });
}

function createAnnotationListItem(annotation) {
    const item = document.createElement('div');
    item.className = `annotation-item annotation-${annotation.type}`;
    
    if (annotation.type === 'highlight') {
        item.innerHTML = `
            <div class="annotation-icon" style="background: ${annotation.data.color};">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
            </div>
            <div class="annotation-content">
                <div class="annotation-text">"${annotation.data.text.substring(0, 100)}${annotation.data.text.length > 100 ? '...' : ''}"</div>
                <div class="annotation-meta">${formatDate(annotation.timestamp)}</div>
            </div>
        `;
    } else if (annotation.type === 'note') {
        item.innerHTML = `
            <div class="annotation-icon" style="background: #FF9800;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
            </div>
            <div class="annotation-content">
                <div class="annotation-text">${annotation.data.content || '<em>Empty note</em>'}</div>
                <div class="annotation-meta">${formatDate(annotation.timestamp)}</div>
            </div>
        `;
        item.addEventListener('click', () => openNoteEditor(annotation.data));
    } else if (annotation.type === 'bookmark') {
        item.innerHTML = `
            <div class="annotation-icon" style="background: #2196F3;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
            </div>
            <div class="annotation-content">
                <div class="annotation-text">${annotation.data.sectionTitle}</div>
                <div class="annotation-meta">${formatDate(annotation.timestamp)}</div>
            </div>
        `;
        item.addEventListener('click', () => {
            const section = document.getElementById(annotation.data.sectionId);
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }
    
    return item;
}

function filterAnnotations() {
    const searchTerm = document.querySelector('.annotation-search')?.value || '';
    const filter = document.querySelector('.annotation-filter')?.value || 'all';
    renderAnnotationsList(filter, searchTerm);
}

function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 24) {
        if (hours < 1) return 'Just now';
        return `${hours}h ago`;
    }
    
    return date.toLocaleDateString();
}

// ==================== //
// Display Reviewer
// ==================== //
function displayAdvancedReviewer(data) {
    const contentDocument = document.querySelector('.content-document');
    const tocNav = document.querySelector('.toc-nav');
    
    contentDocument.innerHTML = '';
    tocNav.innerHTML = '';
    
    let currentPage = createNewPage();
    
    const header = document.createElement('div');
    header.className = 'document-header';
    header.innerHTML = `
        <h1 class="document-title">${data.title}</h1>
        <p class="document-subtitle">Study Guide • Generated on ${new Date().toLocaleDateString()}</p>
    `;
    currentPage.appendChild(header);
    
    data.sections.forEach((section, index) => {
        const sectionId = `section-${index}`;
        
        const tocItem = document.createElement('a');
        tocItem.href = `#${sectionId}`;
        tocItem.className = 'toc-item';
        if (index === 0) tocItem.classList.add('active');
        tocItem.textContent = section.title;
        tocNav.appendChild(tocItem);
        
        const sectionElement = document.createElement('section');
        sectionElement.className = 'content-section';
        sectionElement.id = sectionId;
        
        const heading = document.createElement('h2');
        heading.className = 'section-heading';
        heading.textContent = section.title;
        sectionElement.appendChild(heading);
        
        renderFormattedContent(section.content || [section.summary], sectionElement);
        
        currentPage.appendChild(sectionElement);
    });
    
    if (data.concepts.length > 0) {
        const termsSection = document.createElement('section');
        termsSection.className = 'content-section';
        termsSection.id = 'key-terms';
        
        const termsHeading = document.createElement('h2');
        termsHeading.className = 'section-heading';
        termsHeading.textContent = 'Key Terms';
        termsSection.appendChild(termsHeading);
        
        const dl = document.createElement('dl');
        dl.className = 'terms-list';
        
        data.concepts.slice(0, 20).forEach(concept => {
            const dt = document.createElement('dt');
            dt.textContent = concept.term;
            const dd = document.createElement('dd');
            dd.textContent = concept.definition;
            dl.appendChild(dt);
            dl.appendChild(dd);
        });
        
        termsSection.appendChild(dl);
        currentPage.appendChild(termsSection);
        
        const tocItem = document.createElement('a');
        tocItem.href = '#key-terms';
        tocItem.className = 'toc-item';
        tocItem.textContent = 'Key Terms';
        tocNav.appendChild(tocItem);
    }
    
    contentDocument.appendChild(currentPage);
}

function createNewPage() {
    const page = document.createElement('div');
    page.className = 'document-page';
    return page;
}

function renderFormattedContent(contentLines, parentElement) {
    if (!Array.isArray(contentLines)) contentLines = [contentLines];
    
    let currentList = null;
    let currentListType = null;
    
    contentLines.forEach((line) => {
        if (!line) {
            if (currentList) {
                parentElement.appendChild(currentList);
                currentList = null;
                currentListType = null;
            }
            return;
        }
        
        const trimmed = line.trim();
        if (!trimmed) return;
        
        if (/^[•\-]\s/.test(trimmed)) {
            if (!currentList || currentListType !== 'ul') {
                if (currentList) parentElement.appendChild(currentList);
                currentList = document.createElement('ul');
                currentList.className = 'content-list';
                currentListType = 'ul';
            }
            const li = document.createElement('li');
            li.innerHTML = formatInlineText(trimmed.replace(/^[•\-]\s*/, ''));
            currentList.appendChild(li);
        } else if (/^\d+[\.)]\s/.test(trimmed)) {
            if (!currentList || currentListType !== 'ol') {
                if (currentList) parentElement.appendChild(currentList);
                currentList = document.createElement('ol');
                currentList.className = 'content-list';
                currentListType = 'ol';
            }
            const li = document.createElement('li');
            li.innerHTML = formatInlineText(trimmed.replace(/^\d+[\.)]\s*/, ''));
            currentList.appendChild(li);
        } else if (/^>\s/.test(trimmed)) {
            if (currentList) {
                parentElement.appendChild(currentList);
                currentList = null;
                currentListType = null;
            }
            const arrowDiv = document.createElement('div');
            arrowDiv.className = 'arrow-list-item';
            arrowDiv.innerHTML = formatInlineText(trimmed.replace(/^>\s*/, ''));
            parentElement.appendChild(arrowDiv);
        } else {
            if (currentList) {
                parentElement.appendChild(currentList);
                currentList = null;
                currentListType = null;
            }
            const p = document.createElement('p');
            p.className = 'section-text';
            p.innerHTML = formatInlineText(trimmed);
            parentElement.appendChild(p);
        }
    });
    
    if (currentList) parentElement.appendChild(currentList);
}

function formatInlineText(text) {
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    return text;
}

// ==================== //
// Navigation & Init - FIXED: Back button navigation
// ==================== //
function initTableOfContents() {
    const tocItems = document.querySelectorAll('.toc-item');
    tocItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            tocItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const targetId = item.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

function initTopNavButtons() {
    // FIXED: Back button - navigate to original entry point, not browser history
    document.querySelector('.btn-back').addEventListener('click', () => {
        if (navigator.vibrate) navigator.vibrate(10);
        const originalEntryPoint = sessionStorage.getItem('reviewerOriginalEntryPoint');
        
        if (originalEntryPoint) {
            console.log('🔙 Navigating to original entry point:', originalEntryPoint);
            window.location.href = originalEntryPoint;
        } else {
            // Fallback to Dashboard if no entry point is set
            console.log('🔙 No entry point found, navigating to Dashboard');
            window.location.href = '../Dashboard/index.html';
        }
    });
    
    // Share button handler
    document.getElementById('shareBtn')?.addEventListener('click', () => {
        if (navigator.vibrate) navigator.vibrate(10);
        handleShare();
    });
    
    // Toggle annotations button
    document.getElementById('toggleAnnotationsBtn')?.addEventListener('click', () => {
        if (navigator.vibrate) navigator.vibrate(10);
        toggleAnnotationsVisibility();
    });
    
    document.getElementById('playGamesBtn')?.addEventListener('click', () => {
        if (navigator.vibrate) navigator.vibrate(10);
        if (!window.reviewerQuestions) {
            alert('Quiz questions are still being generated. Please wait a moment...');
            return;
        }
        window.location.href = '../GamesHub/index.html';
    });
}

function initScrollSpy() {
    const sections = document.querySelectorAll('.content-section');
    const tocItems = document.querySelectorAll('.toc-item');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.getAttribute('id');
                tocItems.forEach(item => item.classList.remove('active'));
                const activeTocItem = document.querySelector(`.toc-item[href="#${sectionId}"]`);
                if (activeTocItem) activeTocItem.classList.add('active');
            }
        });
    }, { root: null, rootMargin: '-20% 0px -70% 0px', threshold: 0 });
    
    sections.forEach(section => observer.observe(section));
}

console.log('✅ ReviewerPage script loaded - Navigation loop FIX applied + Mobile features integrated');