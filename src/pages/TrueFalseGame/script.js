// TrueFalseGame/script.js - FIXED VERSION with correct element IDs and answer tracking

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
let userAnswers = []; // Track user answers for review

function loadQuizData() {
    console.log('📊 Loading quiz data...');
    
    // Load configuration
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
    
    // Update score display
    const scoreValue = document.getElementById('scoreValue');
    if (scoreValue) {
        scoreValue.textContent = `${score}/${currentQuestionIndex}`;
    }
    
    // Display question text
    const questionText = document.getElementById('questionText');
    if (questionText) {
        questionText.textContent = question.question;
    }
    
    // Reset button states
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.classList.remove('correct', 'incorrect', 'disabled');
        btn.disabled = false;
    });
    
    // Hide explanation - FIXED: Use correct element ID
    const explanationBox = document.getElementById('explanationBox');
    if (explanationBox) {
        explanationBox.style.display = 'none';
    }
}

// ==================== //
// Answer Selection
// ==================== //
function selectAnswer(answer) {
    const question = questions[currentQuestionIndex];
    const isCorrect = (answer === question.answer);
    
    // Store user answer
    userAnswers[currentQuestionIndex] = answer;
    
    console.log(`Question ${currentQuestionIndex + 1}: User answered ${answer}, Correct answer: ${question.answer}, Is Correct: ${isCorrect}`);
    
    if (isCorrect) {
        score++;
    }
    
    // Show feedback
    const trueBtn = document.getElementById('trueBtn');
    const falseBtn = document.getElementById('falseBtn');
    
    if (question.answer === true) {
        trueBtn.classList.add('correct');
        if (!isCorrect) falseBtn.classList.add('incorrect');
    } else {
        falseBtn.classList.add('correct');
        if (!isCorrect) trueBtn.classList.add('incorrect');
    }
    
    // Disable buttons
    trueBtn.disabled = true;
    falseBtn.disabled = true;
    
    // Show explanation - FIXED: Use correct element ID
    const explanationBox = document.getElementById('explanationBox');
    const explanationText = document.getElementById('explanationText');
    
    if (explanationBox && explanationText && question.explanation) {
        explanationText.textContent = question.explanation;
        explanationBox.style.display = 'flex';
    }
    
    // Auto-advance after delay
    setTimeout(() => {
        currentQuestionIndex++;
        displayQuestion();
    }, 2500);
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
        quizType: 'True or False',
        difficulty: quizConfig.difficulty,
        totalQuestions: questions.length,
        correctAnswers: score,
        wrongAnswers: questions.length - score,
        percentage: Math.round((score / questions.length) * 100),
        timeTaken: timeTaken,
        reason: reason
    };
    
    console.log('🎯 Quiz completed:', results);
    console.log('📝 User answers:', userAnswers);
    
    // Store results and user answers
    sessionStorage.setItem('quizResults', JSON.stringify(results));
    sessionStorage.setItem('userAnswers', JSON.stringify(userAnswers));
    
    // IMPORTANT: Also store the questions for review
    sessionStorage.setItem('currentQuizQuestions', JSON.stringify(questions));
    
    // Navigate to results page
    window.location.href = '../GameResults/index.html';
}

// ==================== //
// Initialize Everything
// ==================== //
document.addEventListener('DOMContentLoaded', () => {
    console.log('❓ True or False Quiz Loaded - FIXED VERSION');
    
    const loaded = loadQuizData();
    
    if (loaded) {
        initQuizUI();
        
        // Setup answer buttons
        const trueBtn = document.getElementById('trueBtn');
        const falseBtn = document.getElementById('falseBtn');
        
        if (trueBtn) trueBtn.addEventListener('click', () => selectAnswer(true));
        if (falseBtn) falseBtn.addEventListener('click', () => selectAnswer(false));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'f' || e.key === 'F') {
                if (falseBtn && !falseBtn.disabled) selectAnswer(false);
            } else if (e.key === 'ArrowRight' || e.key === 't' || e.key === 'T') {
                if (trueBtn && !trueBtn.disabled) selectAnswer(true);
            }
        });
        
        console.log('✅ Quiz initialized successfully - Element IDs fixed');
    }
});