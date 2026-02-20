// MatchConnect/script.js - Match & Connect with Drag-and-Drop (Mobile Enhanced)

// ==================== //
// Load Quiz Configuration & Questions
// ==================== //
let quizConfig = null;
let pairs = [];
let matches = {}; // Store user matches: { termIndex: definitionId }
let timeRemaining = 0;
let timerInterval = null;
let startTime = null;

function loadQuizData() {
    console.log('📊 Loading Match & Connect quiz data...');
    
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
        const questionData = JSON.parse(questionsStr);
        
        // Extract pairs from the matching data structure
        if (questionData.pairs && Array.isArray(questionData.pairs)) {
            pairs = questionData.pairs;
        } else {
            console.error('❌ Invalid matching data structure!');
            alert('Invalid quiz data. Returning to Games Hub...');
            window.location.href = '../GamesHub/index.html';
            return false;
        }
        
        console.log('✅ Quiz loaded:', {
            type: quizConfig.quizType,
            pairs: pairs.length,
            difficulty: quizConfig.difficulty,
            timer: quizConfig.timerEnabled ? `${quizConfig.timerSeconds}s` : 'disabled'
        });
        
        // Initialize matches object
        matches = {};
        
        return true;
    } catch (error) {
        console.error('❌ Error loading quiz data:', error);
        alert('Error loading quiz. Returning to Games Hub...');
        window.location.href = '../GamesHub/index.html';
        return false;
    }
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
    
    updatePairsCounter();
    
    // Update instruction text
    const instructionText = document.getElementById('instructionText');
    if (instructionText && pairs[0] && pairs[0].instruction) {
        instructionText.textContent = pairs[0].instruction;
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
    
    // Create scroll indicators for mobile
    createScrollIndicators();
    
    // Display matching items
    displayMatchingItems();
}

// ==================== //
// Create Scroll Indicators
// ==================== //
function createScrollIndicators() {
    // Only create on touch devices
    if (!('ontouchstart' in window)) return;
    
    // Top indicator
    const topIndicator = document.createElement('div');
    topIndicator.className = 'scroll-indicator top';
    topIndicator.id = 'scrollIndicatorTop';
    topIndicator.innerHTML = '↑';
    document.body.appendChild(topIndicator);
    
    // Bottom indicator
    const bottomIndicator = document.createElement('div');
    bottomIndicator.className = 'scroll-indicator bottom';
    bottomIndicator.id = 'scrollIndicatorBottom';
    bottomIndicator.innerHTML = '↓';
    document.body.appendChild(bottomIndicator);
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
            submitAnswers();
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
// Display Matching Items
// ==================== //
function displayMatchingItems() {
    const leftColumn = document.getElementById('leftColumn');
    const rightColumn = document.getElementById('rightColumn');
    
    if (!leftColumn || !rightColumn) return;
    
    // Clear existing content
    leftColumn.innerHTML = '';
    rightColumn.innerHTML = '';
    
    // Create left column items (terms - drop zones)
    pairs.forEach((pair, index) => {
        const item = document.createElement('div');
        item.className = 'match-item left';
        item.dataset.termIndex = index;
        
        item.innerHTML = `
            <div class="term-text">${escapeHtml(pair.left)}</div>
            <div class="drop-zone" data-term-index="${index}">
                <span class="placeholder">Drop here</span>
            </div>
        `;
        
        leftColumn.appendChild(item);
        
        // Add drop zone event listeners (mouse)
        const dropZone = item.querySelector('.drop-zone');
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('dragleave', handleDragLeave);
        dropZone.addEventListener('drop', handleDrop);
    });
    
    // Create right column items (definitions - draggable) - SHUFFLED
    const shuffledPairs = [...pairs]
        .map((pair, index) => ({ ...pair, originalIndex: index }))
        .sort(() => Math.random() - 0.5);
    
    shuffledPairs.forEach((pair, displayIndex) => {
        const item = document.createElement('div');
        item.className = 'match-item right';
        item.draggable = true;
        item.dataset.defId = `def-${pair.originalIndex}`;
        item.dataset.originalIndex = pair.originalIndex;
        
        item.innerHTML = `
            <div class="definition-content">${escapeHtml(pair.right)}</div>
        `;
        
        rightColumn.appendChild(item);
        
        // Add drag event listeners (mouse)
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        
        // Add touch event listeners (mobile)
        item.addEventListener('touchstart', handleTouchStart, { passive: false });
        item.addEventListener('touchmove', handleTouchMove, { passive: false });
        item.addEventListener('touchend', handleTouchEnd, { passive: false });
    });
}

// ==================== //
// Mouse Drag and Drop Handlers
// ==================== //
let draggedElement = null;

function handleDragStart(e) {
    draggedElement = e.currentTarget;
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
}

function handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
    return false;
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    e.preventDefault();
    
    const dropZone = e.currentTarget;
    dropZone.classList.remove('drag-over');
    
    if (!draggedElement) return false;
    
    const termIndex = parseInt(dropZone.dataset.termIndex);
    const defId = draggedElement.dataset.defId;
    const originalIndex = parseInt(draggedElement.dataset.originalIndex);
    
    // Remove previous match if exists
    if (matches[termIndex]) {
        const prevDefId = matches[termIndex];
        const prevDefElement = document.querySelector(`[data-def-id="${prevDefId}"]`);
        if (prevDefElement) {
            prevDefElement.classList.remove('matched');
        }
    }
    
    // Store the match
    matches[termIndex] = defId;
    
    // Update drop zone content
    dropZone.innerHTML = `
        <div class="definition-text">${draggedElement.querySelector('.definition-content').textContent}</div>
    `;
    
    // Mark the draggable as matched
    draggedElement.classList.add('matched');
    
    // Mark the match item as filled
    const matchItem = dropZone.closest('.match-item');
    if (matchItem) {
        matchItem.classList.add('filled');
    }
    
    // Update counter
    updatePairsCounter();
    
    // Enable submit button if all matched
    checkAllMatched();
    
    draggedElement = null;
    return false;
}

// ==================== //
// Touch Event Handlers for Mobile
// ==================== //
let touchElement = null;
let touchClone = null;
let touchStartX = 0;
let touchStartY = 0;
let currentDropZone = null;
let autoScrollInterval = null;

function handleTouchStart(e) {
    // Don't interfere if item is already matched
    if (e.currentTarget.classList.contains('matched')) {
        return;
    }
    
    touchElement = e.currentTarget;
    touchElement.classList.add('dragging');
    
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    
    // Create a clone for visual feedback
    touchClone = touchElement.cloneNode(true);
    touchClone.classList.add('touch-clone');
    touchClone.style.position = 'fixed';
    touchClone.style.width = touchElement.offsetWidth + 'px';
    touchClone.style.pointerEvents = 'none';
    touchClone.style.opacity = '0.8';
    touchClone.style.zIndex = '9999';
    touchClone.style.left = (touch.clientX - touchElement.offsetWidth / 2) + 'px';
    touchClone.style.top = (touch.clientY - touchElement.offsetHeight / 2) + 'px';
    
    document.body.appendChild(touchClone);
    
    e.preventDefault();
}

function handleTouchMove(e) {
    if (!touchElement || !touchClone) return;
    
    const touch = e.touches[0];
    
    // Move the clone
    touchClone.style.left = (touch.clientX - touchElement.offsetWidth / 2) + 'px';
    touchClone.style.top = (touch.clientY - touchElement.offsetHeight / 2) + 'px';
    
    // Auto-scroll when near screen edges
    handleAutoScroll(touch.clientY);
    
    // Find drop zone under touch point
    touchClone.style.display = 'none';
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    touchClone.style.display = 'block';
    
    // Remove drag-over from previous drop zone
    if (currentDropZone) {
        currentDropZone.classList.remove('drag-over');
    }
    
    // Find the drop zone
    const dropZone = elementBelow?.classList.contains('drop-zone') 
        ? elementBelow 
        : elementBelow?.closest('.drop-zone');
    
    if (dropZone) {
        currentDropZone = dropZone;
        dropZone.classList.add('drag-over');
    } else {
        currentDropZone = null;
    }
    
    e.preventDefault();
}

// Auto-scroll function for mobile dragging
function handleAutoScroll(touchY) {
    const scrollThreshold = 100; // Distance from edge to trigger scroll
    const scrollSpeed = 10; // Pixels to scroll per interval
    const viewportHeight = window.innerHeight;
    
    const topIndicator = document.getElementById('scrollIndicatorTop');
    const bottomIndicator = document.getElementById('scrollIndicatorBottom');
    
    // Stop any existing auto-scroll
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
    }
    
    // Hide both indicators
    if (topIndicator) topIndicator.classList.remove('active');
    if (bottomIndicator) bottomIndicator.classList.remove('active');
    
    // Check if near top edge
    if (touchY < scrollThreshold) {
        const intensity = 1 - (touchY / scrollThreshold); // 0 to 1
        const speed = Math.ceil(scrollSpeed * intensity);
        
        // Show top indicator
        if (topIndicator) topIndicator.classList.add('active');
        
        autoScrollInterval = setInterval(() => {
            window.scrollBy(0, -speed);
            
            // Update clone position while scrolling
            if (touchClone) {
                const currentTop = parseInt(touchClone.style.top);
                touchClone.style.top = (currentTop - speed) + 'px';
            }
        }, 20);
    }
    // Check if near bottom edge
    else if (touchY > viewportHeight - scrollThreshold) {
        const intensity = (touchY - (viewportHeight - scrollThreshold)) / scrollThreshold; // 0 to 1
        const speed = Math.ceil(scrollSpeed * intensity);
        
        // Show bottom indicator
        if (bottomIndicator) bottomIndicator.classList.add('active');
        
        autoScrollInterval = setInterval(() => {
            window.scrollBy(0, speed);
            
            // Update clone position while scrolling
            if (touchClone) {
                const currentTop = parseInt(touchClone.style.top);
                touchClone.style.top = (currentTop + speed) + 'px';
            }
        }, 20);
    }
}

function handleTouchEnd(e) {
    if (!touchElement) return;
    
    touchElement.classList.remove('dragging');
    
    // Stop auto-scrolling
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
    }
    
    // Hide scroll indicators
    const topIndicator = document.getElementById('scrollIndicatorTop');
    const bottomIndicator = document.getElementById('scrollIndicatorBottom');
    if (topIndicator) topIndicator.classList.remove('active');
    if (bottomIndicator) bottomIndicator.classList.remove('active');
    
    // Remove clone
    if (touchClone) {
        touchClone.remove();
        touchClone = null;
    }
    
    // Process the drop if over a drop zone
    if (currentDropZone) {
        currentDropZone.classList.remove('drag-over');
        
        const termIndex = parseInt(currentDropZone.dataset.termIndex);
        const defId = touchElement.dataset.defId;
        const originalIndex = parseInt(touchElement.dataset.originalIndex);
        
        // Remove previous match if exists
        if (matches[termIndex]) {
            const prevDefId = matches[termIndex];
            const prevDefElement = document.querySelector(`[data-def-id="${prevDefId}"]`);
            if (prevDefElement) {
                prevDefElement.classList.remove('matched');
            }
        }
        
        // Store the match
        matches[termIndex] = defId;
        
        // Update drop zone content
        currentDropZone.innerHTML = `
            <div class="definition-text">${touchElement.querySelector('.definition-content').textContent}</div>
        `;
        
        // Mark the draggable as matched
        touchElement.classList.add('matched');
        
        // Mark the match item as filled
        const matchItem = currentDropZone.closest('.match-item');
        if (matchItem) {
            matchItem.classList.add('filled');
        }
        
        // Update counter
        updatePairsCounter();
        
        // Enable submit button if all matched
        checkAllMatched();
    }
    
    // Reset
    touchElement = null;
    currentDropZone = null;
    
    e.preventDefault();
}

// ==================== //
// Update Pairs Counter
// ==================== //
function updatePairsCounter() {
    const matchedCount = Object.keys(matches).length;
    const totalPairs = pairs.length;
    const counter = document.getElementById('pairsCounter');
    
    if (counter) {
        counter.textContent = `${matchedCount} / ${totalPairs} Matched`;
    }
}

// ==================== //
// Check if All Matched
// ==================== //
function checkAllMatched() {
    const submitBtn = document.getElementById('submitBtn');
    if (!submitBtn) return;
    
    const allMatched = Object.keys(matches).length === pairs.length;
    submitBtn.disabled = !allMatched;
}

// ==================== //
// Submit Answers
// ==================== //
function submitAnswers() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    
    // Calculate results
    let correctCount = 0;
    let incorrectCount = 0;
    
    // Check each match
    Object.keys(matches).forEach(termIndex => {
        const defId = matches[termIndex];
        const originalIndex = parseInt(defId.split('-')[1]);
        
        if (parseInt(termIndex) === originalIndex) {
            correctCount++;
        } else {
            incorrectCount++;
        }
    });
    
    const totalPairs = pairs.length;
    const percentage = Math.round((correctCount / totalPairs) * 100);
    
    // Show visual feedback
    showAnswerFeedback();
    
    // Show results modal
    setTimeout(() => {
        showResultsModal(correctCount, incorrectCount, percentage);
    }, 1500);
    
    // Store for game results page
    const results = {
        quizType: 'Match & Connect',
        difficulty: quizConfig.difficulty,
        totalQuestions: totalPairs,
        correctAnswers: correctCount,
        wrongAnswers: incorrectCount,
        percentage: percentage,
        timeTaken: timeTaken,
        reason: 'completed'
    };
    
    sessionStorage.setItem('quizResults', JSON.stringify(results));
    sessionStorage.setItem('userMatches', JSON.stringify(matches));
}

// ==================== //
// Show Answer Feedback
// ==================== //
function showAnswerFeedback() {
    Object.keys(matches).forEach(termIndex => {
        const defId = matches[termIndex];
        const originalIndex = parseInt(defId.split('-')[1]);
        const isCorrect = parseInt(termIndex) === originalIndex;
        
        const matchItem = document.querySelector(`.match-item.left[data-term-index="${termIndex}"]`);
        if (matchItem) {
            if (isCorrect) {
                matchItem.classList.add('correct');
            } else {
                matchItem.classList.add('incorrect');
            }
        }
    });
}

// ==================== //
// Show Results Modal
// ==================== //
function showResultsModal(correct, incorrect, percentage) {
    const modal = document.getElementById('resultsModal');
    const icon = document.getElementById('resultsIcon');
    const title = document.getElementById('resultsTitle');
    const correctCount = document.getElementById('correctCount');
    const incorrectCount = document.getElementById('incorrectCount');
    const percentageScore = document.getElementById('percentageScore');
    
    if (!modal) return;
    
    // Update icon and title based on performance
    if (percentage >= 90) {
        icon.textContent = '🎉';
        title.textContent = 'Excellent Work!';
    } else if (percentage >= 70) {
        icon.textContent = '👏';
        title.textContent = 'Great Job!';
    } else if (percentage >= 50) {
        icon.textContent = '👍';
        title.textContent = 'Good Effort!';
    } else {
        icon.textContent = '📚';
        title.textContent = 'Keep Practicing!';
    }
    
    // Update stats
    correctCount.textContent = correct;
    incorrectCount.textContent = incorrect;
    percentageScore.textContent = `${percentage}%`;
    
    // Show modal
    modal.classList.add('active');
}

// ==================== //
// Review Answers
// ==================== //
function reviewAnswers() {
    const modal = document.getElementById('resultsModal');
    if (modal) {
        modal.classList.remove('active');
    }
    
    // Scroll to top to see all matches
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== //
// Finish Quiz
// ==================== //
function finishQuiz() {
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
    console.log('🧩 Match & Connect Quiz Loaded (with Touch Support)');
    
    const loaded = loadQuizData();
    
    if (loaded) {
        initQuizUI();
        
        // Setup exit button
        const exitBtn = document.getElementById('exitBtn');
        if (exitBtn) {
            exitBtn.addEventListener('click', showExitModal);
        }
        
        // Setup submit button
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', submitAnswers);
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
        
        const resultsModal = document.getElementById('resultsModal');
        if (resultsModal) {
            resultsModal.addEventListener('click', (e) => {
                if (e.target.id === 'resultsModal') {
                    // Don't allow closing by clicking overlay
                }
            });
        }
        
        console.log('✅ Match & Connect Quiz initialized successfully (Desktop + Mobile)');
    }
});