// MultipleChoiceGame/script.js - Complete Implementation

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
let selectedAnswer = null;

function loadQuizData() {
    console.log('📊 Loading Multiple Choice quiz data...');
    
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
            Array.isArray(q.options) && 
            q.options.length === 4 && 
            typeof q.correctIndex === 'number'
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
    selectedAnswer = null;
    
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
    
    // Display options
    const optionsGrid = document.getElementById('optionsGrid');
    if (optionsGrid) {
        const letters = ['A', 'B', 'C', 'D'];
        optionsGrid.innerHTML = '';
        
        question.options.forEach((option, index) => {
            const optionBtn = document.createElement('button');
            optionBtn.className = 'option-btn';
            optionBtn.dataset.index = index;
            optionBtn.innerHTML = `
                <span class="option-letter">${letters[index]}</span>
                <span class="option-text">${escapeHtml(option)}</span>
            `;
            optionBtn.addEventListener('click', () => selectAnswer(index));
            optionsGrid.appendChild(optionBtn);
        });
    }
    
    // Hide explanation and next button
    const explanation = document.getElementById('explanation');
    if (explanation) {
        explanation.style.display = 'none';
    }
    
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        nextBtn.style.display = 'none';
    }
}

// ==================== //
// Answer Selection
// ==================== //
function selectAnswer(answerIndex) {
    if (selectedAnswer !== null) return; // Already answered
    
    const question = questions[currentQuestionIndex];
    selectedAnswer = answerIndex;
    
    // Store user answer
    userAnswers[currentQuestionIndex] = answerIndex;
    
    const isCorrect = (answerIndex === question.correctIndex);
    
    if (isCorrect) {
        score++;
    }
    
    // Show feedback on all options
    const optionBtns = document.querySelectorAll('.option-btn');
    optionBtns.forEach((btn, index) => {
        btn.disabled = true;
        
        if (index === question.correctIndex) {
            btn.classList.add('correct');
        } else if (index === answerIndex && !isCorrect) {
            btn.classList.add('incorrect');
        }
    });
    
    // Show explanation
    const explanation = document.getElementById('explanation');
    const explanationText = document.getElementById('explanationText');
    
    if (explanation && explanationText && question.explanation) {
        explanationText.textContent = question.explanation;
        explanation.style.display = 'flex';
    }
    
    // Show next button or auto-advance
    if (currentQuestionIndex < questions.length - 1) {
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) {
            nextBtn.style.display = 'flex';
        }
        
        // Auto-advance after delay
        setTimeout(() => {
            nextQuestion();
        }, 3000);
    } else {
        // Last question - show finish button
        setTimeout(() => {
            endQuiz('completed');
        }, 3000);
    }
}

// ==================== //
// Next Question
// ==================== //
function nextQuestion() {
    currentQuestionIndex++;
    displayQuestion();
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
        quizType: 'Multiple Choice',
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
    console.log('🎯 Multiple Choice Quiz Loaded');
    
    const loaded = loadQuizData();
    
    if (loaded) {
        initQuizUI();
        
        // Setup exit button
        const exitBtn = document.getElementById('exitBtn');
        if (exitBtn) {
            exitBtn.addEventListener('click', showExitModal);
        }
        
        // Setup next button
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) {
            nextBtn.addEventListener('click', nextQuestion);
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (selectedAnswer !== null) return; // Already answered
            
            const key = e.key.toLowerCase();
            if (key === 'a' || key === '1') {
                selectAnswer(0);
            } else if (key === 'b' || key === '2') {
                selectAnswer(1);
            } else if (key === 'c' || key === '3') {
                selectAnswer(2);
            } else if (key === 'd' || key === '4') {
                selectAnswer(3);
            } else if (key === 'escape') {
                showExitModal();
            }
        });
        
        // Close modal on overlay click
        const exitModal = document.getElementById('exitModal');
        if (exitModal) {
            exitModal.addEventListener('click', (e) => {
                if (e.target.id === 'exitModal') {
                    closeExitModal();
                }
            });
        }
        
        console.log('✅ Multiple Choice Quiz initialized successfully');
    }
});