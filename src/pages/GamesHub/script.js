// GamesHub/script.js - WITH REVIEWER TITLE & DASHBOARD BUTTON

// ==================== //
// AUTOMATIC BACKEND URL DETECTION FOR MOBILE
// ==================== //
function getBackendURL() {
    return window.location.origin;
}

const BACKEND_URL = getBackendURL();
console.log('🔗 Using backend URL:', BACKEND_URL);

// ==================== //
// Global Variables
// ==================== //
let quizQuestions = null;

let quizConfig = {
    quizType: 'trueFalse',
    numberOfQuestions: 10,
    difficulty: 'easy',
    timerEnabled: false,
    timerSeconds: 600,
    availableQuestions: { easy: 15, medium: 12, hard: 10 }
};

// ==================== //
// Load and Display Reviewer Title
// ==================== //
function loadReviewerTitle() {
    // Try to get reviewer title from sessionStorage
    const reviewerTitle = sessionStorage.getItem('reviewerTitle');
    
    if (reviewerTitle) {
        const topicNameElement = document.getElementById('topicName');
        if (topicNameElement) {
            topicNameElement.textContent = reviewerTitle;
            console.log('✅ Reviewer title loaded:', reviewerTitle);
        }
    } else {
        console.warn('⚠️ No reviewer title found in sessionStorage');
        // Fallback to default text
        const topicNameElement = document.getElementById('topicName');
        if (topicNameElement) {
            topicNameElement.textContent = 'Study Reviewer';
        }
    }
}

// ==================== //
// Load Quiz Questions - Database Support
// ==================== //
async function loadQuizQuestions() {
    console.log('📊 Loading quiz questions...');
    
    // Get reviewer ID
    const reviewerId = sessionStorage.getItem('reviewerId') || 
                      window.currentReviewerId;
    
    console.log('🆔 Reviewer ID:', reviewerId);
    
    if (!reviewerId) {
        console.error('❌ No reviewer ID found!');
        showQuizNotReadyMessage('No reviewer selected. Please open a reviewer first.');
        return false;
    }
    
    // STEP 1: Try sessionStorage first (fastest)
    const sessionData = sessionStorage.getItem('quizQuestions');
    
    if (sessionData) {
        try {
            quizQuestions = JSON.parse(sessionData);
            console.log('✅ Quiz questions loaded from sessionStorage');
            logQuestionCounts();
            return true;
        } catch (error) {
            console.warn('⚠️ Failed to parse sessionStorage quiz questions:', error);
        }
    }
    
    // STEP 2: Fetch from database
    console.log('📥 Fetching quiz questions from database...');
    
    try {
        showLoadingOverlay('Loading quiz questions...');
        
        const response = await fetch(`${BACKEND_URL}/api/quiz-questions/${reviewerId}`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }
        
        quizQuestions = await response.json();
        
        // Verify we got valid questions
        const totalQuestions = countTotalQuestions(quizQuestions);
        
        if (totalQuestions === 0) {
            throw new Error('No quiz questions found in database. Questions may still be generating.');
        }
        
        console.log('✅ Quiz questions loaded from database');
        console.log(`📊 Total questions: ${totalQuestions}`);
        logQuestionCounts();
        
        // Store back to sessionStorage for next time
        sessionStorage.setItem('quizQuestions', JSON.stringify(quizQuestions));
        
        hideLoadingOverlay();
        return true;
        
    } catch (error) {
        console.error('❌ Failed to load quiz questions:', error);
        hideLoadingOverlay();
        
        showQuizNotReadyMessage(
            'Quiz questions not available yet. They may still be generating. ' +
            'Please return to the reviewer and wait for the notification.'
        );
        
        return false;
    }
}

function countTotalQuestions(questions) {
    if (!questions) return 0;
    
    const tf = Object.values(questions.trueFalse || {}).flat().length;
    const mc = Object.values(questions.multipleChoice || {}).flat().length;
    const id = Object.values(questions.identification || {}).flat().length;
    const match = Object.values(questions.matching || {}).reduce((sum, m) => sum + (m.pairs?.length || 0), 0);
    
    return tf + mc + id + match;
}

function logQuestionCounts() {
    console.log('✅ Quiz questions loaded:', {
        trueFalse: {
            easy: quizQuestions.trueFalse.easy.length,
            medium: quizQuestions.trueFalse.medium.length,
            hard: quizQuestions.trueFalse.hard.length
        },
        multipleChoice: {
            easy: quizQuestions.multipleChoice.easy.length,
            medium: quizQuestions.multipleChoice.medium.length,
            hard: quizQuestions.multipleChoice.hard.length
        },
        identification: {
            easy: quizQuestions.identification.easy.length,
            medium: quizQuestions.identification.medium.length,
            hard: quizQuestions.identification.hard.length
        },
        matching: {
            easy: quizQuestions.matching.easy.pairs ? quizQuestions.matching.easy.pairs.length : 0,
            medium: quizQuestions.matching.medium.pairs ? quizQuestions.matching.medium.pairs.length : 0,
            hard: quizQuestions.matching.hard.pairs ? quizQuestions.matching.hard.pairs.length : 0
        }
    });
}

// ==================== //
// Loading Overlay
// ==================== //
function showLoadingOverlay(message) {
    const existing = document.getElementById('loadingOverlay');
    if (existing) return;
    
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    overlay.innerHTML = `
        <div style="
            background: white;
            padding: 40px;
            border-radius: 16px;
            text-align: center;
            max-width: 400px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        ">
            <div style="
                width: 48px;
                height: 48px;
                border: 4px solid #2ECC71;
                border-top-color: transparent;
                border-radius: 50%;
                margin: 0 auto 20px;
                animation: spin 1s linear infinite;
            "></div>
            <h3 style="font-size: 20px; font-weight: 700; color: #2C3E50; margin-bottom: 8px;">
                ${message}
            </h3>
            <p style="font-size: 14px; color: #7F8C8D;">Please wait...</p>
        </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
    
    document.body.appendChild(overlay);
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.remove();
}

// ==================== //
// Show "Not Ready" Message
// ==================== //
function showQuizNotReadyMessage(customMessage) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    const message = document.createElement('div');
    message.style.cssText = `
        background: white;
        padding: 40px;
        border-radius: 16px;
        text-align: center;
        max-width: 400px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    `;
    
    message.innerHTML = `
        <div style="font-size: 64px; margin-bottom: 20px;">⏳</div>
        <h2 style="font-size: 24px; font-weight: 700; color: #2C3E50; margin-bottom: 12px;">
            Quiz Questions Not Ready
        </h2>
        <p style="font-size: 15px; color: #7F8C8D; margin-bottom: 24px;">
            ${customMessage || 'The quiz questions are still being generated. Please return to the reviewer and wait for the notification.'}
        </p>
        <button onclick="window.location.href='../ReviewerPage/index.html'" style="
            padding: 14px 32px;
            background: #2ECC71;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
        ">Back to Reviewer</button>
    `;
    
    overlay.appendChild(message);
    document.body.appendChild(overlay);
}

// ==================== //
// Initialize Game Cards
// ==================== //
function initGameCards() {
    // True or False
    const tfCard = document.querySelector('[data-game="true-false"]');
    if (tfCard) {
        tfCard.addEventListener('click', () => {
            if (!quizQuestions) {
                alert('Quiz questions not loaded yet!');
                return;
            }
            
            openQuizConfig(
                'trueFalse',
                '❓',
                'Configure True or False',
                {
                    easy: quizQuestions.trueFalse.easy.length,
                    medium: quizQuestions.trueFalse.medium.length,
                    hard: quizQuestions.trueFalse.hard.length
                }
            );
        });
    }
    
    // Multiple Choice
    const mcCard = document.querySelector('[data-game="multiple-choice"]');
    if (mcCard) {
        mcCard.addEventListener('click', () => {
            if (!quizQuestions) {
                alert('Quiz questions not loaded yet!');
                return;
            }
            
            openQuizConfig(
                'multipleChoice',
                '🎯',
                'Configure Multiple Choice',
                {
                    easy: quizQuestions.multipleChoice.easy.length,
                    medium: quizQuestions.multipleChoice.medium.length,
                    hard: quizQuestions.multipleChoice.hard.length
                }
            );
        });
    }
    
    // Identification
    const idCard = document.querySelector('[data-game="identification"]');
    if (idCard) {
        idCard.addEventListener('click', () => {
            if (!quizQuestions) {
                alert('Quiz questions not loaded yet!');
                return;
            }
            
            openQuizConfig(
                'identification',
                '💡',
                'Configure Identification',
                {
                    easy: quizQuestions.identification.easy.length,
                    medium: quizQuestions.identification.medium.length,
                    hard: quizQuestions.identification.hard.length
                }
            );
        });
    }
    
    // Match & Connect
    const matchCard = document.querySelector('[data-game="match-connect"]');
    if (matchCard) {
        matchCard.addEventListener('click', () => {
            if (!quizQuestions) {
                alert('Quiz questions not loaded yet!');
                return;
            }
            
            openQuizConfig(
                'matching',
                '🧩',
                'Configure Match & Connect',
                {
                    easy: quizQuestions.matching.easy.pairs ? quizQuestions.matching.easy.pairs.length : 0,
                    medium: quizQuestions.matching.medium.pairs ? quizQuestions.matching.medium.pairs.length : 0,
                    hard: quizQuestions.matching.hard.pairs ? quizQuestions.matching.hard.pairs.length : 0
                }
            );
        });
    }
}

// ==================== //
// Quiz Configuration Modal Functions
// ==================== //
function openQuizConfig(quizType, icon, title, availableQuestions) {
    quizConfig.quizType = quizType;
    quizConfig.availableQuestions = availableQuestions;
    
    // Update modal UI
    document.getElementById('modalIcon').textContent = icon;
    document.getElementById('modalTitle').textContent = title;
    
    // Reset to defaults based on available questions
    const maxEasy = availableQuestions.easy;
    quizConfig.numberOfQuestions = Math.min(10, maxEasy);
    quizConfig.difficulty = 'easy';
    
    // Update question number display
    document.getElementById('questionNumber').value = quizConfig.numberOfQuestions;
    
    updateNumberHint();
    selectDifficulty('easy');
    
    // Show modal
    document.getElementById('quizConfigModal').classList.add('active');
}

function closeQuizConfig() {
    document.getElementById('quizConfigModal').classList.remove('active');
}

function decreaseNumber() {
    const currentDifficulty = quizConfig.difficulty;
    const max = quizConfig.availableQuestions[currentDifficulty];
    const min = Math.min(5, max);
    
    if (quizConfig.numberOfQuestions > min) {
        quizConfig.numberOfQuestions--;
        document.getElementById('questionNumber').value = quizConfig.numberOfQuestions;
        updateButtonStates();
    }
}

function increaseNumber() {
    const currentDifficulty = quizConfig.difficulty;
    const max = quizConfig.availableQuestions[currentDifficulty];
    
    if (quizConfig.numberOfQuestions < max) {
        quizConfig.numberOfQuestions++;
        document.getElementById('questionNumber').value = quizConfig.numberOfQuestions;
        updateButtonStates();
    }
}

function updateButtonStates() {
    const currentDifficulty = quizConfig.difficulty;
    const max = quizConfig.availableQuestions[currentDifficulty];
    const min = Math.min(5, max);
    
    const decreaseBtn = document.getElementById('decreaseBtn');
    const increaseBtn = document.getElementById('increaseBtn');
    
    if (decreaseBtn) {
        decreaseBtn.disabled = quizConfig.numberOfQuestions <= min;
    }
    
    if (increaseBtn) {
        increaseBtn.disabled = quizConfig.numberOfQuestions >= max;
    }
}

function updateNumberHint() {
    const currentDifficulty = quizConfig.difficulty;
    const max = quizConfig.availableQuestions[currentDifficulty];
    const min = Math.min(5, max);
    
    // Update hint text based on quiz type
    const hintElement = document.getElementById('numberHint');
    if (quizConfig.quizType === 'matching') {
        hintElement.textContent = `Choose between ${min} and ${max} pairs`;
    } else {
        hintElement.textContent = `Choose between ${min} and ${max} questions`;
    }
    
    updateButtonStates();
}

function selectDifficulty(difficulty) {
    quizConfig.difficulty = difficulty;
    
    // Remove 'active' from all difficulty buttons
    document.querySelectorAll('.btn-difficulty').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add 'active' to the clicked button
    const selectedBtn = document.querySelector(`[data-difficulty="${difficulty}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    // Adjust number if it exceeds max for this difficulty
    const max = quizConfig.availableQuestions[difficulty];
    if (quizConfig.numberOfQuestions > max) {
        quizConfig.numberOfQuestions = max;
        document.getElementById('questionNumber').value = max;
    }
    
    updateNumberHint();
}

function toggleTimer() {
    const toggle = document.getElementById('timeLimitToggle');
    const timeSettings = document.getElementById('timeSettings');
    
    quizConfig.timerEnabled = toggle.checked;
    
    if (quizConfig.timerEnabled) {
        timeSettings.style.display = 'block';
    } else {
        timeSettings.style.display = 'none';
    }
}

function selectTime(seconds) {
    quizConfig.timerSeconds = parseInt(seconds);
}

function startQuiz() {
    console.log('🎮 Starting quiz with config:', quizConfig);
    
    // Handle matching type differently AND limit the number of pairs
    if (quizConfig.quizType === 'matching') {
        // Get the full matching data for this difficulty
        const matchingData = quizQuestions.matching[quizConfig.difficulty];
        
        // Shuffle and limit the pairs to the requested number
        const allPairs = matchingData.pairs || [];
        const shuffledPairs = [...allPairs].sort(() => Math.random() - 0.5);
        const selectedPairs = shuffledPairs.slice(0, quizConfig.numberOfQuestions);
        
        console.log(`🧩 Match & Connect: Selected ${selectedPairs.length} pairs from ${allPairs.length} available`);
        
        // Create a new matching data object with only the selected pairs
        const limitedMatchingData = {
            pairs: selectedPairs,
            instruction: matchingData.instruction || 'Match each term with its definition.'
        };
        
        // Store the limited matching data structure
        sessionStorage.setItem('currentQuizConfig', JSON.stringify(quizConfig));
        sessionStorage.setItem('currentQuizQuestions', JSON.stringify(limitedMatchingData));
        
        console.log('Matching data stored:', limitedMatchingData);
    } else {
        // For other quiz types (trueFalse, multipleChoice, identification)
        const allQuestionsForDifficulty = quizQuestions[quizConfig.quizType][quizConfig.difficulty];
        
        // Shuffle and take exactly the requested number
        const shuffled = [...allQuestionsForDifficulty].sort(() => Math.random() - 0.5);
        const selectedQuestions = shuffled.slice(0, quizConfig.numberOfQuestions);
        
        console.log(`Selected ${selectedQuestions.length} questions from ${allQuestionsForDifficulty.length} available`);
        
        // Store config and questions
        sessionStorage.setItem('currentQuizConfig', JSON.stringify(quizConfig));
        sessionStorage.setItem('currentQuizQuestions', JSON.stringify(selectedQuestions));
    }
    
    // Navigate to quiz page
    const quizPages = {
        trueFalse: '../TrueFalseGame/index.html',
        multipleChoice: '../MultipleChoiceGame/index.html',
        identification: '../IdentificationGame/index.html',
        matching: '../MatchConnect/index.html'
    };
    
    const targetPage = quizPages[quizConfig.quizType];
    console.log(`🎯 Navigating to: ${targetPage}`);
    
    window.location.href = targetPage;
}

// ==================== //
// Navigation Functions
// ==================== //
function initBackButton() {
    const backBtn = document.querySelector('.btn-back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = '../ReviewerPage/index.html';
        });
    }
}

function initDashboardButton() {
    const dashboardBtn = document.querySelector('.btn-dashboard');
    if (dashboardBtn) {
        dashboardBtn.addEventListener('click', () => {
            window.location.href = '../Dashboard/index.html';
        });
        console.log('✅ Dashboard button initialized');
    }
}

// ==================== //
// Initialize Everything
// ==================== //
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎮 Games Hub Loaded - WITH REVIEWER TITLE & DASHBOARD BUTTON');
    
    // Load and display reviewer title
    loadReviewerTitle();
    
    // Load questions (async with database support)
    const questionsLoaded = await loadQuizQuestions();
    
    if (questionsLoaded) {
        initGameCards();
    }
    
    // Initialize navigation buttons
    initBackButton();
    initDashboardButton();
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeQuizConfig();
        }
    });
    
    // Close modal on overlay click
    const modal = document.getElementById('quizConfigModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'quizConfigModal') {
                closeQuizConfig();
            }
        });
    }
    
    console.log('✅ Games Hub fully initialized');
});