// GameResults/script.js - WITH DATABASE INTEGRATION
// ==================== //
// Global Configuration
// ==================== //

// ==================== //
// AUTOMATIC BACKEND URL DETECTION FOR MOBILE
// ==================== //
function getBackendURL() {
    return window.location.origin;
}

const BACKEND_URL = getBackendURL();
console.log('🔗 Using backend URL:', BACKEND_URL);

let quizResults = null;
let allQuestions = [];
let userAnswers = [];
let quizType = null;

// ==================== //
// Authentication Helper Functions
// ==================== //
function getSessionToken() {
    return sessionStorage.getItem('sessionToken');
}

function getUserId() {
    return sessionStorage.getItem('userId');
}

// ==================== //
// Initialize on Page Load
// ==================== //
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏆 Game Results Page Loaded - WITH DATABASE INTEGRATION');
    
    // Show loading
    showLoading();
    
    // Load results from session storage
    setTimeout(async () => {
        await loadResults();
        hideLoading();
    }, 500);
    
    // Setup event listeners
    initEventListeners();
});

// ==================== //
// Load Results from Session Storage
// ==================== //
async function loadResults() {
    try {
        // Get quiz results
        const resultsStr = sessionStorage.getItem('quizResults');
        if (!resultsStr) {
            console.error('❌ No quiz results found!');
            showError('No quiz results found. Please complete a quiz first.');
            return;
        }
        
        quizResults = JSON.parse(resultsStr);
        quizType = quizResults.quizType;
        console.log('✅ Quiz results loaded:', quizResults);
        
        // Get questions and user answers for review
        const questionsStr = sessionStorage.getItem('currentQuizQuestions');
        
        if (questionsStr) {
            const questionData = JSON.parse(questionsStr);
            
            // Handle different quiz types
            if (quizType === 'Match & Connect') {
                // For matching, questionData has { pairs: [...], instruction: "..." }
                allQuestions = questionData.pairs || [];
                
                // Get user matches
                const userMatchesStr = sessionStorage.getItem('userMatches');
                if (userMatchesStr) {
                    userAnswers = JSON.parse(userMatchesStr);
                }
            } else {
                // For other quiz types, questionData is an array
                allQuestions = questionData;
                
                // Get user answers array
                const userAnswersStr = sessionStorage.getItem('userAnswers');
                if (userAnswersStr) {
                    userAnswers = JSON.parse(userAnswersStr);
                }
            }
        }
        
        console.log('📝 Questions loaded:', allQuestions.length);
        console.log('📋 User answers loaded:', userAnswers);
        
        // Display results
        displayResults();
        displayReviewQuestions();
        
        // ✅ NEW: Save quiz attempt to database
        await saveQuizAttemptToDatabase();
        
    } catch (error) {
        console.error('❌ Error loading results:', error);
        showError('Error loading quiz results. Please try again.');
    }
}

// ==================== //
// ✅ NEW: Save Quiz Attempt to Database
// ==================== //
async function saveQuizAttemptToDatabase() {
    const sessionToken = getSessionToken();
    const userId = getUserId();
    const reviewerId = sessionStorage.getItem('reviewerId');
    
    if (!sessionToken || !userId) {
        console.warn('⚠️ No authentication found, skipping database save');
        return;
    }
    
    if (!reviewerId) {
        console.warn('⚠️ No reviewer ID found, skipping database save');
        return;
    }
    
    try {
        console.log('💾 Saving quiz attempt to database...');
        
        // Prepare attempt data
        const attemptData = {
            reviewerId: parseInt(reviewerId),
            quizType: quizResults.quizType,
            difficulty: quizResults.difficulty,
            totalQuestions: quizResults.totalQuestions,
            correctAnswers: quizResults.correctAnswers,
            wrongAnswers: quizResults.wrongAnswers,
            percentage: quizResults.percentage,
            timeTaken: quizResults.timeTaken || 0,
            userAnswers: userAnswers,
            questionsUsed: allQuestions
        };
        
        console.log('📤 Sending attempt data:', attemptData);
        
        const response = await fetch(`${BACKEND_URL}/api/quiz-attempt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify(attemptData)
        });
        
        if (!response.ok) {
            throw new Error(`Failed to save quiz attempt: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Quiz attempt saved to database:', result);
        
        // Store attempt ID for reference
        if (result.attemptId) {
            sessionStorage.setItem('lastAttemptId', result.attemptId.toString());
        }
        
    } catch (error) {
        console.error('❌ Error saving quiz attempt to database:', error);
        // Don't show error to user - this is a background operation
        // The quiz results will still display even if database save fails
    }
}

// ==================== //
// Display Results Summary
// ==================== //
function displayResults() {
    const { 
        totalQuestions, 
        correctAnswers, 
        wrongAnswers, 
        percentage, 
        quizType, 
        difficulty, 
        timeTaken,
        reason
    } = quizResults;
    
    // Update title and message based on performance
    updateResultsTitle(percentage);
    
    // Update score display
    document.getElementById('scoreCorrect').textContent = correctAnswers;
    document.getElementById('scoreTotal').textContent = totalQuestions;
    
    // Update percentage bar with animation
    updatePercentageBar(percentage);
    
    // Update stats
    document.getElementById('statCorrect').textContent = correctAnswers;
    document.getElementById('statIncorrect').textContent = wrongAnswers;
    
    // Update additional stats
    document.getElementById('quizType').textContent = quizType;
    
    const difficultyBadge = document.getElementById('difficultyBadge');
    difficultyBadge.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    difficultyBadge.className = `difficulty-badge difficulty-${difficulty.toLowerCase()}`;
    
    document.getElementById('timeTaken').textContent = formatTime(timeTaken);
}

// ==================== //
// Update Results Title Based on Performance
// ==================== //
function updateResultsTitle(percentage) {
    const title = document.getElementById('resultsTitle');
    const message = document.getElementById('resultsMessage');
    
    if (percentage >= 90) {
        title.textContent = 'Excellent Work!';
        title.className = 'results-title excellent';
        message.textContent = 'Outstanding performance! You have mastered this topic.';
    } else if (percentage >= 70) {
        title.textContent = 'Great Job!';
        title.className = 'results-title good';
        message.textContent = "You're making excellent progress!";
    } else if (percentage >= 50) {
        title.textContent = 'Good Effort!';
        title.className = 'results-title needs-improvement';
        message.textContent = 'Keep studying and you\'ll improve even more!';
    } else {
        title.textContent = 'Keep Practicing!';
        title.className = 'results-title keep-practicing';
        message.textContent = "Don't give up! Review the material and try again.";
    }
}

// ==================== //
// Update Percentage Bar with Animation
// ==================== //
function updatePercentageBar(percentage) {
    const fill = document.getElementById('percentageFill');
    const text = document.getElementById('percentageText');
    
    // Determine color class based on percentage
    let colorClass = 'low';
    if (percentage >= 70) {
        colorClass = 'high';
    } else if (percentage >= 50) {
        colorClass = 'medium';
    }
    
    // Animate the bar
    setTimeout(() => {
        fill.style.width = `${percentage}%`;
        fill.className = `percentage-fill ${colorClass}`;
        text.textContent = `${percentage}%`;
    }, 300);
}

// ==================== //
// Display Review Questions (Incorrect Answers Only)
// ==================== //
function displayReviewQuestions() {
    const questionsList = document.getElementById('questionsList');
    const reviewSection = document.getElementById('reviewSection');
    
    // Get incorrect questions based on quiz type
    const incorrectQuestions = getIncorrectQuestions();
    
    if (incorrectQuestions.length === 0) {
        // Show congratulations message
        questionsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎉</div>
                <h3 class="empty-title">Perfect Score!</h3>
                <p class="empty-message">You answered all questions correctly. Excellent work!</p>
            </div>
        `;
        reviewSection.querySelector('.review-title').textContent = 'Perfect Performance';
        reviewSection.querySelector('.review-subtitle').textContent = 'You got every question right!';
        return;
    }
    
    // Display incorrect questions
    questionsList.innerHTML = '';
    
    incorrectQuestions.forEach((item, index) => {
        const questionDiv = createQuestionReviewElement(item, index + 1);
        questionsList.appendChild(questionDiv);
    });
}

// ==================== //
// Get Incorrect Questions (Handles all quiz types)
// ==================== //
function getIncorrectQuestions() {
    const incorrect = [];
    
    if (quizType === 'Match & Connect') {
        // For matching, check each pair
        allQuestions.forEach((pair, index) => {
            const userMatchId = userAnswers[index];
            
            if (!userMatchId) {
                // Not answered
                incorrect.push({
                    pair: pair,
                    userMatchId: null,
                    index: index,
                    isCorrect: false
                });
                return;
            }
            
            // Extract the original index from the match ID (format: "def-N")
            const originalIndex = parseInt(userMatchId.split('-')[1]);
            const isCorrect = index === originalIndex;
            
            if (!isCorrect) {
                // Find which definition was selected
                let selectedDefinition = 'Unknown';
                if (originalIndex >= 0 && originalIndex < allQuestions.length) {
                    selectedDefinition = allQuestions[originalIndex].right;
                }
                
                incorrect.push({
                    pair: pair,
                    userMatchId: userMatchId,
                    selectedDefinition: selectedDefinition,
                    index: index,
                    isCorrect: false
                });
            }
        });
    } else {
        // For other quiz types (True/False, Multiple Choice, Identification)
        allQuestions.forEach((question, index) => {
            const userAnswer = userAnswers[index];
            const isCorrect = checkAnswer(question, userAnswer);
            
            if (!isCorrect) {
                incorrect.push({
                    question: question,
                    userAnswer: userAnswer,
                    index: index
                });
            }
        });
    }
    
    return incorrect;
}

// ==================== //
// Check if Answer is Correct
// ==================== //
function checkAnswer(question, userAnswer) {
    // For True/False
    if (question.answer === true || question.answer === false) {
        return question.answer === userAnswer;
    }
    
    // For Multiple Choice (correctIndex)
    if (question.hasOwnProperty('correctIndex')) {
        return question.correctIndex === userAnswer;
    }
    
    // For Identification (case-insensitive string comparison)
    if (question.hasOwnProperty('answer') && typeof question.answer === 'string') {
        return question.answer.toLowerCase().trim() === (userAnswer || '').toLowerCase().trim();
    }
    
    return false;
}

// ==================== //
// Create Question Review Element (Handles all quiz types)
// ==================== //
function createQuestionReviewElement(item, number) {
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-item';
    
    if (quizType === 'Match & Connect') {
        // Matching type review
        const { pair, selectedDefinition, index } = item;
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'question-header';
        headerDiv.innerHTML = `
            <div class="question-number">${number}</div>
            <div class="question-text">Match: ${escapeHtml(pair.left)}</div>
        `;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'question-content';
        contentDiv.innerHTML = `
            <div class="answer-row your-answer">
                <div class="answer-icon">✗</div>
                <div class="answer-label">Your match:</div>
                <div class="answer-value">${escapeHtml(selectedDefinition || 'No match')}</div>
            </div>
            <div class="answer-row correct-answer">
                <div class="answer-icon">✓</div>
                <div class="answer-label">Correct match:</div>
                <div class="answer-value">${escapeHtml(pair.right)}</div>
            </div>
        `;
        
        questionDiv.appendChild(headerDiv);
        questionDiv.appendChild(contentDiv);
        
    } else {
        // Other quiz types (True/False, Multiple Choice, Identification)
        const { question, userAnswer, index } = item;
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'question-header';
        headerDiv.innerHTML = `
            <div class="question-number">${number}</div>
            <div class="question-text">${escapeHtml(question.question)}</div>
        `;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'question-content';
        
        // Display based on question type
        if (question.answer === true || question.answer === false) {
            // True/False question
            contentDiv.innerHTML = `
                <div class="answer-row your-answer">
                    <div class="answer-icon">✗</div>
                    <div class="answer-label">Your answer:</div>
                    <div class="answer-value">${userAnswer === true ? 'True' : userAnswer === false ? 'False' : 'No answer'}</div>
                </div>
                <div class="answer-row correct-answer">
                    <div class="answer-icon">✓</div>
                    <div class="answer-label">Correct answer:</div>
                    <div class="answer-value">${question.answer === true ? 'True' : 'False'}</div>
                </div>
                ${question.explanation ? `
                    <div class="explanation">
                        <p>${escapeHtml(question.explanation)}</p>
                    </div>
                ` : ''}
            `;
        } else if (question.hasOwnProperty('options')) {
            // Multiple Choice question
            const userAnswerText = question.options[userAnswer] || 'No answer';
            const correctAnswerText = question.options[question.correctIndex];
            
            contentDiv.innerHTML = `
                <div class="answer-row your-answer">
                    <div class="answer-icon">✗</div>
                    <div class="answer-label">Your answer:</div>
                    <div class="answer-value">${escapeHtml(userAnswerText)}</div>
                </div>
                <div class="answer-row correct-answer">
                    <div class="answer-icon">✓</div>
                    <div class="answer-label">Correct answer:</div>
                    <div class="answer-value">${escapeHtml(correctAnswerText)}</div>
                </div>
                ${question.explanation ? `
                    <div class="explanation">
                        <p>${escapeHtml(question.explanation)}</p>
                    </div>
                ` : ''}
            `;
        } else {
            // Identification question
            contentDiv.innerHTML = `
                <div class="answer-row your-answer">
                    <div class="answer-icon">✗</div>
                    <div class="answer-label">Your answer:</div>
                    <div class="answer-value">${escapeHtml(userAnswer || 'No answer')}</div>
                </div>
                <div class="answer-row correct-answer">
                    <div class="answer-icon">✓</div>
                    <div class="answer-label">Correct answer:</div>
                    <div class="answer-value">${escapeHtml(question.answer)}</div>
                </div>
                ${question.hint ? `
                    <div class="explanation">
                        <p><strong>Hint:</strong> ${escapeHtml(question.hint)}</p>
                    </div>
                ` : ''}
            `;
        }
        
        questionDiv.appendChild(headerDiv);
        questionDiv.appendChild(contentDiv);
    }
    
    return questionDiv;
}

// ==================== //
// Event Listeners
// ==================== //
function initEventListeners() {
    // Back to Reviewer button
    const backBtn = document.getElementById('backToReviewBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = '../ReviewerPage/index.html';
        });
    }
    
    // Try Another Game button
    const tryAgainBtn = document.getElementById('tryAgainBtn');
    if (tryAgainBtn) {
        tryAgainBtn.addEventListener('click', () => {
            // Clear user answers for new attempt
            sessionStorage.removeItem('userAnswers');
            sessionStorage.removeItem('userMatches');
            window.location.href = '../GamesHub/index.html';
        });
    }
}

// ==================== //
// Helper Functions
// ==================== //
function formatTime(seconds) {
    if (!seconds) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('active');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

function showError(message) {
    alert(message);
    window.location.href = '../GamesHub/index.html';
}

// ==================== //
// Store User Answers During Quiz
// Note: This should be called from the quiz game pages
// ==================== //
function storeUserAnswer(questionIndex, answer) {
    let answers = [];
    const answersStr = sessionStorage.getItem('userAnswers');
    
    if (answersStr) {
        answers = JSON.parse(answersStr);
    }
    
    answers[questionIndex] = answer;
    sessionStorage.setItem('userAnswers', JSON.stringify(answers));
}

// Export for use in quiz pages
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { storeUserAnswer };
}

console.log('✅ Game Results script initialized WITH DATABASE INTEGRATION');