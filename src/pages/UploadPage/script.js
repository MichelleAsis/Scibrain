// UploadPage/script.js - WITH AUTHENTICATION AND CAMERA SCANNER

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
let uploadedFile = null;
let currentTab = 'upload';
let cameraScanner = null;

// ==================== //
// Authentication Helper Functions
// ==================== //
function getUserId() {
    return sessionStorage.getItem('userId');
}

function getSessionToken() {
    return sessionStorage.getItem('sessionToken');
}

async function verifyAuthentication() {
    const userId = getUserId();
    const sessionToken = getSessionToken();
    
    if (!userId || !sessionToken) {
        console.log('❌ No authentication found, redirecting to login...');
        window.location.href = '../LoginPage/index.html';
        return false;
    }
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${sessionToken}`
            }
        });
        
        if (!response.ok) {
            console.log('❌ Session invalid, redirecting to login...');
            sessionStorage.clear();
            window.location.href = '../LoginPage/index.html';
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('❌ Authentication verification failed:', error);
        window.location.href = '../LoginPage/index.html';
        return false;
    }
}

// Configure PDF.js
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ==================== //
// Loading Modal
// ==================== //
function showLoading(message = 'Processing...') {
    const modal = document.getElementById('loadingModal');
    const text = document.getElementById('loadingText');
    const progressBar = document.getElementById('progressBar');
    
    if (modal && text && progressBar) {
        text.textContent = message;
        progressBar.style.width = '0%';
        modal.classList.add('active');
    }
}

function updateLoadingProgress(percent, message) {
    const text = document.getElementById('loadingText');
    const progressBar = document.getElementById('progressBar');
    
    if (text && message) text.textContent = message;
    if (progressBar) progressBar.style.width = `${percent}%`;
}

function hideLoading() {
    const modal = document.getElementById('loadingModal');
    if (modal) modal.classList.remove('active');
}

// ==================== //
// Success Dialog
// ==================== //
function showSuccessDialog(reviewerData) {
    console.log('🎉 Showing success dialog');
    
    const existing = document.getElementById('successDialog');
    if (existing) existing.remove();
    
    const overlay = document.createElement('div');
    overlay.id = 'successDialog';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(5px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        border-radius: 20px;
        padding: 40px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.4s ease;
    `;
    
    const sectionsCount = reviewerData.sections?.length || 0;
    const conceptsCount = reviewerData.concepts?.length || 0;
    
    dialog.innerHTML = `
        <div style="text-align: center;">
            <div style="
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 50%;
                margin: 0 auto 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </div>
            
            <h2 style="font-size: 28px; font-weight: 700; color: #2C3E50; margin: 0 0 12px 0;">
                Reviewer Generated!
            </h2>
            
            <p style="font-size: 16px; color: #7F8C8D; margin: 0 0 32px 0;">
                Your study material is ready
            </p>
            
            <div style="
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                border-radius: 16px;
                padding: 24px;
                margin-bottom: 32px;
                text-align: left;
            ">
                <div style="
                    font-size: 20px;
                    font-weight: 600;
                    color: #2C3E50;
                    margin-bottom: 20px;
                ">
                    📚 ${reviewerData.title}
                </div>
                
                <div style="
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                ">
                    <div style="
                        background: white;
                        padding: 16px;
                        border-radius: 12px;
                        text-align: center;
                    ">
                        <div style="color: #667eea; font-weight: 700; font-size: 24px;">
                            ${sectionsCount}
                        </div>
                        <div style="color: #7F8C8D; font-size: 13px; margin-top: 4px;">
                            Sections
                        </div>
                    </div>
                    
                    <div style="
                        background: white;
                        padding: 16px;
                        border-radius: 12px;
                        text-align: center;
                    ">
                        <div style="color: #667eea; font-weight: 700; font-size: 24px;">
                            ${conceptsCount}
                        </div>
                        <div style="color: #7F8C8D; font-size: 13px; margin-top: 4px;">
                            Key Terms
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; gap: 16px;">
                <button id="btnGoToDashboard" style="
                    flex: 1;
                    padding: 16px 24px;
                    background: white;
                    border: 2px solid #667eea;
                    border-radius: 12px;
                    color: #667eea;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                ">
                    Dashboard
                </button>
                
                <button id="btnOpenReviewer" style="
                    flex: 1;
                    padding: 16px 24px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border: none;
                    border-radius: 12px;
                    color: white;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                ">
                    Open Reviewer →
                </button>
            </div>
        </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        #btnGoToDashboard:hover {
            background: #667eea;
            color: white;
            transform: translateY(-2px);
        }
        #btnOpenReviewer:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
        }
    `;
    document.head.appendChild(style);
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    setTimeout(() => {
        const dashboardBtn = document.getElementById('btnGoToDashboard');
        const reviewerBtn = document.getElementById('btnOpenReviewer');
        
        if (dashboardBtn) {
            dashboardBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('📊 User chose: Dashboard');
                window.location.href = '../Dashboard/index.html';
            };
        }
        
        if (reviewerBtn) {
            reviewerBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('📖 User chose: Open Reviewer');
                window.location.href = '../ReviewerPage/index.html';
            };
        }
    }, 100);
}

// ==================== //
// Main Generation Function - WITH AUTH
// ==================== //
async function generateReviewer(text, title) {
    try {
        console.log('🚀 Starting reviewer generation...');
        
        const userId = getUserId();
        const sessionToken = getSessionToken();
        
        if (!userId || !sessionToken) {
            throw new Error('Not authenticated');
        }
        
        // STEP 1: Generate reviewer via backend
        showLoading('Generating reviewer...');
        updateLoadingProgress(20, 'Analyzing content...');
        
        const response = await fetch(`${BACKEND_URL}/api/generate-reviewer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify({
                userId: userId,
                text: text,
                title: title
            })
        });
        
        if (!response.ok) {
            throw new Error(`Backend error: ${response.status} ${response.statusText}`);
        }
        
        updateLoadingProgress(50, 'AI processing...');
        const reviewerData = await response.json();
        
        console.log('✅ Reviewer generated');
        console.log('📊 Reviewer ID:', reviewerData.reviewerId);
        console.log('📊 Document ID:', reviewerData.documentId);
        
        // STEP 2: Store to sessionStorage
        updateLoadingProgress(85, 'Preparing data...');
        
        const completeData = {
            ...reviewerData,
            title: title,
            timestamp: Date.now()
        };
        
        sessionStorage.setItem('reviewerData', JSON.stringify(completeData));
        sessionStorage.setItem('reviewerTitle', title);
        
        if (reviewerData.reviewerId) {
            sessionStorage.setItem('reviewerId', reviewerData.reviewerId.toString());
        }
        if (reviewerData.documentId) {
            sessionStorage.setItem('documentId', reviewerData.documentId.toString());
        }
        
        console.log('✅ Data stored to sessionStorage');
        
        // STEP 3: Complete
        updateLoadingProgress(100, 'Complete!');
        
        await new Promise(resolve => setTimeout(resolve, 500));
        hideLoading();
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // STEP 4: Show dialog
        showSuccessDialog(reviewerData);
        
    } catch (error) {
        console.error('❌ Error:', error);
        hideLoading();
        alert(`Error generating reviewer:\n\n${error.message}\n\nPlease try again.`);
    }
}

// ==================== //
// Text Extraction
// ==================== //
async function extractPDFText(file) {
    showLoading('Reading PDF...');
    updateLoadingProgress(10);
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n\n';
        
        updateLoadingProgress(10 + (i / pdf.numPages) * 40, `Processing page ${i}/${pdf.numPages}...`);
    }
    
    return fullText.trim();
}

async function extractImageText(file) {
    showLoading('Extracting text from image...');
    updateLoadingProgress(10);
    
    const { data: { text } } = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
            if (m.status === 'recognizing text') {
                updateLoadingProgress(10 + m.progress * 60, `OCR: ${Math.round(m.progress * 100)}%`);
            }
        }
    });
    
    return text.trim();
}

async function extractTextFile(file) {
    showLoading('Reading text file...');
    updateLoadingProgress(50);
    return await file.text();
}

async function extractText(file) {
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.pdf')) {
        return await extractPDFText(file);
    } else if (fileName.match(/\.(jpg|jpeg|png)$/)) {
        return await extractImageText(file);
    } else if (fileName.endsWith('.txt')) {
        return await extractTextFile(file);
    } else {
        throw new Error('Unsupported file type');
    }
}

// ==================== //
// UI Functions
// ==================== //
function handleFile(file) {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'text/plain'];
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
        alert('Please upload PDF, Image (JPG/PNG), or Text file only');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        alert('File must be less than 10MB');
        return;
    }
    
    uploadedFile = file;
    
    document.getElementById('uploadArea').style.display = 'none';
    document.getElementById('filePreview').style.display = 'block';
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatFileSize(file.size);
    
    updateGenerateButton();
}

function removeFile() {
    uploadedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('uploadArea').style.display = 'block';
    document.getElementById('filePreview').style.display = 'none';
    updateGenerateButton();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function updateGenerateButton() {
    const generateBtn = document.getElementById('generateBtn');
    if (!generateBtn) return;
    
    let isValid = false;
    
    if (currentTab === 'upload') {
        const titleInput = document.getElementById('topicTitle');
        isValid = uploadedFile !== null && titleInput && titleInput.value.trim().length > 0;
    } else if (currentTab === 'paste') {
        const titleInput = document.getElementById('pasteTopicTitle');
        const contentInput = document.getElementById('pasteContent');
        isValid = titleInput && contentInput && 
                  titleInput.value.trim().length > 0 && 
                  contentInput.value.trim().length > 0;
    } else if (currentTab === 'scan') {
        const titleInput = document.getElementById('scanTopicTitle');
        isValid = titleInput && titleInput.value.trim().length > 0 && 
                  cameraScanner && cameraScanner.capturedImage !== null;
    }
    
    generateBtn.disabled = !isValid;
}

// ==================== //
// Event Handlers
// ==================== //
async function handleUploadGeneration() {
    const title = document.getElementById('topicTitle').value.trim();
    
    if (!uploadedFile || !title) {
        alert('Please upload a file and enter a title');
        return;
    }
    
    try {
        const text = await extractText(uploadedFile);
        
        if (!text || text.length < 50) {
            hideLoading();
            alert('Could not extract enough text from the file. Please try a different file.');
            return;
        }
        
        await generateReviewer(text, title);
        
    } catch (error) {
        console.error('❌ Error:', error);
        hideLoading();
        alert(`Error: ${error.message}`);
    }
}

async function handlePasteGeneration() {
    const title = document.getElementById('pasteTopicTitle').value.trim();
    const content = document.getElementById('pasteContent').value.trim();
    
    if (!title || !content) {
        alert('Please enter both title and content');
        return;
    }
    
    if (content.length < 50) {
        alert('Please enter more content (at least 50 characters)');
        return;
    }
    
    await generateReviewer(content, title);
}

async function handleScanGeneration() {
    const title = document.getElementById('scanTopicTitle').value.trim();
    
    if (!title) {
        alert('Please enter a title for your scanned document');
        return;
    }
    
    if (!cameraScanner || !cameraScanner.capturedImage) {
        alert('Please capture an image first');
        return;
    }
    
    try {
        // Extract text from captured image
        showLoading('Extracting text from image...');
        
        const result = await cameraScanner.extractText(
            cameraScanner.capturedImage,
            (progress, message) => {
                updateLoadingProgress(progress, message);
            }
        );
        
        const text = result.text;
        
        if (!text || text.length < 50) {
            hideLoading();
            alert('Could not extract enough text from the image. Please try:\n• Better lighting\n• Clearer focus\n• Darker text on lighter background');
            return;
        }
        
        console.log('✅ Text extracted:', text.length, 'characters');
        console.log('📊 OCR Confidence:', Math.round(result.confidence), '%');
        
        // Generate reviewer
        await generateReviewer(text, title);
        
    } catch (error) {
        console.error('❌ Error:', error);
        hideLoading();
        alert(`Error processing scanned image:\n\n${error.message}`);
    }
}

// ==================== //
// Tab Switching
// ==================== //
function initTabSwitching() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            
            if (tabName === 'upload') {
                document.getElementById('uploadTab').classList.add('active');
                currentTab = 'upload';
                
                // Stop camera if active
                if (cameraScanner) {
                    cameraScanner.stopCamera();
                }
            } else if (tabName === 'paste') {
                document.getElementById('pasteTab').classList.add('active');
                currentTab = 'paste';
                
                // Stop camera if active
                if (cameraScanner) {
                    cameraScanner.stopCamera();
                }
            } else if (tabName === 'scan') {
                document.getElementById('scanTab').classList.add('active');
                currentTab = 'scan';
            }
            
            updateGenerateButton();
        });
    });
}

// ==================== //
// Initialize - WITH AUTH CHECK
// ==================== //
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📱 UploadPage loaded - WITH AUTHENTICATION AND CAMERA SCANNER');
    
    // CRITICAL: Verify authentication first
    const isAuthenticated = await verifyAuthentication();
    if (!isAuthenticated) {
        return; // Stop execution if not authenticated
    }
    
    // Initialize camera scanner
    cameraScanner = new CameraScanner();
    
    // Prevent all form submissions
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('⚠️ Form submission blocked');
        });
    });
    
    // Initialize tabs
    initTabSwitching();
    
    // File upload
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.querySelector('.btn-browse');
    const removeFileBtn = document.getElementById('removeFile');
    
    if (uploadArea) {
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
        });
    }
    
    if (browseBtn) {
        browseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });
    }
    
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) handleFile(e.target.files[0]);
        });
    }
    
    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFile();
        });
    }
    
    // Camera controls
    const startCameraBtn = document.getElementById('startCameraBtn');
    const stopCameraBtn = document.getElementById('stopCameraBtn');
    const captureBtn = document.getElementById('captureBtn');
    const retakeBtn = document.getElementById('retakeBtn');
    const processImageBtn = document.getElementById('processImageBtn');
    
    if (startCameraBtn) {
        startCameraBtn.addEventListener('click', async () => {
            await cameraScanner.startCamera();
        });
    }
    
    if (stopCameraBtn) {
        stopCameraBtn.addEventListener('click', () => {
            cameraScanner.stopCamera();
        });
    }
    
    if (captureBtn) {
        captureBtn.addEventListener('click', () => {
            const imageDataUrl = cameraScanner.captureImage();
            
            if (imageDataUrl) {
                // Show preview
                document.getElementById('cameraView').style.display = 'none';
                document.getElementById('capturedPreview').style.display = 'block';
                document.getElementById('capturedImage').src = imageDataUrl;
                
                // Store captured image
                cameraScanner.capturedImage = imageDataUrl;
                
                // Stop camera
                cameraScanner.stopCamera();
                
                // Update button state
                updateGenerateButton();
            }
        });
    }
    
    if (retakeBtn) {
        retakeBtn.addEventListener('click', () => {
            // Hide preview
            document.getElementById('capturedPreview').style.display = 'none';
            
            // Clear captured image
            cameraScanner.capturedImage = null;
            
            // Restart camera
            cameraScanner.startCamera();
            
            // Update button state
            updateGenerateButton();
        });
    }
    
    if (processImageBtn) {
        processImageBtn.addEventListener('click', async () => {
            // This button is kept for clarity, but actual processing happens in handleScanGeneration
            const generateBtn = document.getElementById('generateBtn');
            if (generateBtn && !generateBtn.disabled) {
                generateBtn.click();
            } else {
                alert('Please enter a title first');
            }
        });
    }
    
    // Title inputs
    const topicTitle = document.getElementById('topicTitle');
    const pasteTopicTitle = document.getElementById('pasteTopicTitle');
    const scanTopicTitle = document.getElementById('scanTopicTitle');
    const pasteContent = document.getElementById('pasteContent');
    const charCount = document.getElementById('charCount');
    
    if (topicTitle) topicTitle.addEventListener('input', updateGenerateButton);
    if (pasteTopicTitle) pasteTopicTitle.addEventListener('input', updateGenerateButton);
    if (scanTopicTitle) scanTopicTitle.addEventListener('input', updateGenerateButton);
    
    if (pasteContent) {
        pasteContent.addEventListener('input', () => {
            if (charCount) charCount.textContent = `${pasteContent.value.length} characters`;
            updateGenerateButton();
        });
    }
    
    // Generate button
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🚀 Generate button clicked for tab:', currentTab);
            
            if (currentTab === 'upload') {
                await handleUploadGeneration();
            } else if (currentTab === 'paste') {
                await handlePasteGeneration();
            } else if (currentTab === 'scan') {
                await handleScanGeneration();
            }
        });
    }
    
    // Back button
    const backBtn = document.querySelector('.btn-back');
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Stop camera if running
            if (cameraScanner) {
                cameraScanner.cleanup();
            }
            
            window.location.href = '../HomePage/index.html';
        });
    }

    // Dashboard navigation link
    const dashboardNavLink = document.querySelector('.nav-link');
    if (dashboardNavLink) {
        dashboardNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🏠 Dashboard link clicked');
            
            // Stop camera if running
            if (cameraScanner) {
                cameraScanner.cleanup();
            }
            
            window.location.href = '../Dashboard/index.html';
        });
    }
    
    console.log('✅ UploadPage initialized with authentication and camera scanner');
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (cameraScanner) {
        cameraScanner.cleanup();
    }
});