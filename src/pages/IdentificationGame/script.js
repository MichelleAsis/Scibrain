// IdentificationGame/script.js - Complete Implementation

// ==================== //
// Load Quiz Configuration & Questions
// ==================== //
let quizConfig = null;
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let timeRemaining = 0;
let timerInterval = null;
let startTime = null;
let userAnswers = [];
let hintUsed = false;

function loadQuizData() {
    console.log('📊 Loading Identification quiz data...');
    
    const configStr = sessionStorage.getItem('currentQuizConfig');
    const questionsStr = sessionStorage.getItem('currentQuizQuestions');
    
    if (!configStr || !questionsStr) {
        console.error('❌ Missing quiz data!');
        alert('Quiz configuration not found. Returning to Games Hub...');
        window.location.href = '../GamesHub/index.html';
        return false;
    }
    
    try {
        quizConfig = JSON.parse(configStr);
        questions = JSON.parse(questionsStr);
        
        console.log('✅ Quiz loaded:', {
            type: quizConfig.quizType,
            questions: questions.length,
            difficulty: quizConfig.difficulty,
            timer: quizConfig.timerEnabled ? `${quizConfig.timerSeconds}s` : 'disabled'
        });
        
        // Validate questions have required fields
        questions = questions.filter(q => 
            q.question && 
            q.answer &&
            typeof q.answer === 'string'
        );
        
        if (questions.length === 0) {
            console.error('❌ No valid questions found!');
            alert('Invalid quiz data. Returning to Games Hub...');
            window.location.href = '../GamesHub/index.html';
            return false;
        }
        
        // Shuffle questions
        questions = shuffleArray(questions);
        
        // Initialize user answers array
        userAnswers = new Array(questions.length).fill(null);
        
        return true;
    } catch (error) {
        console.error('❌ Error loading quiz data:', error);
        alert('Error loading quiz. Returning to Games Hub...');
        window.location.href = '../GamesHub/index.html';
        return false;
    }
}

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ==================== //
// Initialize Quiz UI
// ==================== //
function initQuizUI() {
    // Update header info
    const difficultyBadge = document.getElementById('difficultyBadge');
    if (difficultyBadge) {
        difficultyBadge.textContent = quizConfig.difficulty.charAt(0).toUpperCase() + 
                                      quizConfig.difficulty.slice(1);
        difficultyBadge.className = `difficulty-badge difficulty-${quizConfig.difficulty}`;
    }
    
    const questionCount = document.getElementById('questionCount');
    if (questionCount) {
        questionCount.textContent = `${questions.length} Questions`;
    }
    
    // Initialize timer if enabled
    if (quizConfig.timerEnabled) {
        timeRemaining = quizConfig.timerSeconds;
        initTimer();
        startTimer();
    } else {
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            timerElement.style.display = 'none';
        }
    }
    
    // Record start time
    startTime = Date.now();
    
    // Display first question
    displayQuestion();
}

// ==================== //
// Timer Functions
// ==================== //
function initTimer() {
    const timerElement = document.getElementById('timer');
    if (!timerElement) return;
    
    timerElement.style.display = 'flex';
    updateTimerDisplay();
}

function startTimer() {
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            endQuiz('timeout');
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const timerText = document.getElementById('timerText');
    
    if (timerText) {
        timerText.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Change color when time is running out
    const timerElement = document.getElementById('timer');
    if (timeRemaining <= 60 && timerElement) {
        timerElement.style.background = '#FFE5E5';
        timerElement.style.borderColor = '#E74C3C';
        timerText.style.color = '#E74C3C';
    }
}

// ==================== //
// Display Question
// ==================== //
function displayQuestion() {
    if (currentQuestionIndex >= questions.length) {
        endQuiz('completed');
        return;
    }
    
    const question = questions[currentQuestionIndex];
    hintUsed = false;
    
    // Update progress
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
        progressBar.style.width = `${progress}%`;
    }
    
    const questionNumber = document.getElementById('questionNumber');
    if (questionNumber) {
        questionNumber.textContent = `Question ${currentQuestionIndex + 1}/${questions.length}`;
    }
    
    // Display question text
    const questionText = document.getElementById('questionText');
    if (questionText) {
        questionText.textContent = question.question;
    }
    
    // Reset input field
    const answerInput = document.getElementById('answerInput');
    if (answerInput) {
        answerInput.value = '';
        answerInput.disabled = false;
        answerInput.classList.remove('correct', 'incorrect');
        answerInput.focus();
    }
    
    // Hide hint and explanation
    const hintContainer = document.getElementById('hintContainer');
    if (hintContainer) {
        hintContainer.style.display = 'none';
    }
    
    const explanation = document.getElementById('explanation');
    if (explanation) {
        explanation.style.display = 'none';
    }
    
    // Reset buttons
    const submitBtn = document.getElementById('submitBtn');
    const nextBtn = document.getElementById('nextBtn');
    const hintBtn = document.getElementById('hintBtn');
    
    if (submitBtn) {
        submitBtn.style.display = 'flex';
        submitBtn.disabled = false;
    }
    
    if (nextBtn) {
        nextBtn.style.display = 'none';
    }
    
    if (hintBtn) {
        hintBtn.disabled = false;
    }
}

// ==================== //
// Show Hint
// ==================== //
function showHint() {
    const question = questions[currentQuestionIndex];
    
    if (!question.hint) return;
    
    const hintContainer = document.getElementById('hintContainer');
    const hintText = document.getElementById('hintText');
    const hintBtn = document.getElementById('hintBtn');
    
    if (hintContainer && hintText) {
        hintText.textContent = question.hint;
        hintContainer.style.display = 'flex';
    }
    
    if (hintBtn) {
        hintBtn.disabled = true;
    }
    
    hintUsed = true;
}

// ==================== //
// Submit Answer
// ==================== //
function submitAnswer() {
    const question = questions[currentQuestionIndex];
    const answerInput = document.getElementById('answerInput');
    const userAnswer = answerInput.value.trim();
    
    if (!userAnswer) {
        alert('Please enter an answer before submitting.');
        answerInput.focus();
        return;
    }
    
    // Store user answer
    userAnswers[currentQuestionIndex] = userAnswer;
    
    // Check answer (case-insensitive)
    const isCorrect = checkAnswer(question.answer, userAnswer);
    
    if (isCorrect) {
        score++;
    }
    
    // Show feedback
    showFeedback(isCorrect, question);
    
    // Disable input and submit button
    answerInput.disabled = true;
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.style.display = 'none';
    }
    
    // Show next button or finish
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        if (currentQuestionIndex < questions.length - 1) {
            nextBtn.textContent = 'Next Question';
            nextBtn.innerHTML = `
                Next Question
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
            `;
        } else {
            nextBtn.textContent = 'Finish Quiz';
            nextBtn.innerHTML = `
                Finish Quiz
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            `;
        }
        nextBtn.style.display = 'flex';
    }
}

// ==================== //
// Check Answer (Case-Insensitive)
// ==================== //
function checkAnswer(correctAnswer, userAnswer) {
    const correct = correctAnswer.toLowerCase().trim();
    const user = userAnswer.toLowerCase().trim();
    
    // Exact match
    if (correct === user) return true;
    
    // Allow for minor variations (plurals, articles)
    // Remove common articles and check again
    const cleanCorrect = correct.replace(/^(the|a|an)\s+/i, '');
    const cleanUser = user.replace(/^(the|a|an)\s+/i, '');
    
    if (cleanCorrect === cleanUser) return true;
    
    // Check if answers are similar enough (allow for typos)
    // Simple similarity: if 80% of characters match
    if (calculateSimilarity(correct, user) >= 0.8) return true;
    
    return false;
}

// ==================== //
// Calculate String Similarity
// ==================== //
function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

function getEditDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

// ==================== //
// Show Feedback
// ==================== //
function showFeedback(isCorrect, question) {
    const answerInput = document.getElementById('answerInput');
    const explanation = document.getElementById('explanation');
    const explanationIcon = document.getElementById('explanationIcon');
    const explanationTitle = document.getElementById('explanationTitle');
    const explanationText = document.getElementById('explanationText');
    
    if (answerInput) {
        if (isCorrect) {
            answerInput.classList.add('correct');
        } else {
            answerInput.classList.add('incorrect');
        }
    }
    
    if (explanation && explanationIcon && explanationTitle && explanationText) {
        if (isCorrect) {
            explanation.classList.add('correct');
            explanation.classList.remove('incorrect');
            explanationIcon.textContent = '✓';
            explanationTitle.textContent = 'Correct!';
            explanationText.textContent = `The answer is "${question.answer}".`;
        } else {
            explanation.classList.add('incorrect');
            explanation.classList.remove('correct');
            explanationIcon.textContent = '✗';
            explanationTitle.textContent = 'Incorrect';
            explanationText.textContent = `The correct answer is "${question.answer}".`;
        }
        
        explanation.style.display = 'block';
    }
}

// ==================== //
// Next Question
// ==================== //
function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
    } else {
        endQuiz('completed');
    }
}

// ==================== //
// End Quiz
// ==================== //
function endQuiz(reason) {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    
    // Calculate results
    const results = {
        quizType: 'Identification',
        difficulty: quizConfig.difficulty,
        totalQuestions: questions.length,
        correctAnswers: score,
        wrongAnswers: questions.length - score,
        percentage: Math.round((score / questions.length) * 100),
        timeTaken: timeTaken,
        reason: reason
    };
    
    console.log('🎯 Quiz completed:', results);
    
    // Store results and user answers
    sessionStorage.setItem('quizResults', JSON.stringify(results));
    sessionStorage.setItem('userAnswers', JSON.stringify(userAnswers));
    
    // Navigate to results page
    window.location.href = '../GameResults/index.html';
}

// ==================== //
// Exit Modal Functions
// ==================== //
function showExitModal() {
    const modal = document.getElementById('exitModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeExitModal() {
    const modal = document.getElementById('exitModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function confirmExit() {
    window.location.href = '../GamesHub/index.html';
}

// ==================== //
// Helper Functions
// ==================== //
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== //
// Initialize Everything
// ==================== //
document.addEventListener('DOMContentLoaded', () => {
    console.log('💡 Identification Quiz Loaded');
    
    const loaded = loadQuizData();
    
    if (loaded) {
        initQuizUI();
        
        // Setup exit button
        const exitBtn = document.getElementById('exitBtn');
        if (exitBtn) {
            exitBtn.addEventListener('click', showExitModal);
        }
        
        // Setup hint button
        const hintBtn = document.getElementById('hintBtn');
        if (hintBtn) {
            hintBtn.addEventListener('click', showHint);
        }
        
        // Setup submit button
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', submitAnswer);
        }
        
        // Setup next button
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) {
            nextBtn.addEventListener('click', nextQuestion);
        }
        
        // Setup Enter key to submit
        const answerInput = document.getElementById('answerInput');
        if (answerInput) {
            answerInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !answerInput.disabled) {
                    submitAnswer();
                }
            });
        }
        
        // Close modal on overlay click
        const exitModal = document.getElementById('exitModal');
        if (exitModal) {
            exitModal.addEventListener('click', (e) => {
                if (e.target.id === 'exitModal') {
                    closeExitModal();
                }
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                showExitModal();
            }
        });
        
        console.log('✅ Identification Quiz initialized successfully');
    }
});