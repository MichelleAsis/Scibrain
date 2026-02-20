// CameraScanner.js - Google Lens-style Document Scanner with Live Feedback
// Requires: Tesseract.js (already loaded in HTML)

class CameraScanner {
    constructor() {
        this.stream = null;
        this.videoElement = null;
        this.canvasElement = null;
        this.isScanning = false;
        this.qualityCheckInterval = null;
        
        // Quality thresholds
        this.BLUR_THRESHOLD = 100; // Lower = more blurry
        this.BRIGHTNESS_MIN = 60;
        this.BRIGHTNESS_MAX = 200;
        this.ANGLE_THRESHOLD = 15; // degrees
    }

    // ==================== //
    // Camera Controls
    // ==================== //
    
    async startCamera() {
        console.log('📷 Starting camera...');
        
        try {
            // Request camera with high resolution
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // Back camera on mobile
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });
            
            this.videoElement = document.getElementById('cameraStream');
            this.canvasElement = document.getElementById('captureCanvas');
            
            if (!this.videoElement || !this.canvasElement) {
                throw new Error('Camera elements not found');
            }
            
            this.videoElement.srcObject = this.stream;
            
            // Wait for video to load
            await new Promise((resolve) => {
                this.videoElement.onloadedmetadata = () => {
                    this.videoElement.play();
                    resolve();
                };
            });
            
            // Show camera view
            document.getElementById('startCameraContainer').style.display = 'none';
            document.getElementById('cameraView').style.display = 'block';
            
            // Start quality feedback
            this.startQualityFeedback();
            
            console.log('✅ Camera started successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Camera error:', error);
            
            let message = 'Could not access camera. ';
            if (error.name === 'NotAllowedError') {
                message += 'Please allow camera permission.';
            } else if (error.name === 'NotFoundError') {
                message += 'No camera found on this device.';
            } else {
                message += 'Please check your camera settings.';
            }
            
            alert(message);
            return false;
        }
    }
    
    stopCamera() {
        console.log('🛑 Stopping camera...');
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
        
        this.stopQualityFeedback();
        
        document.getElementById('cameraView').style.display = 'none';
        document.getElementById('startCameraContainer').style.display = 'block';
        
        console.log('✅ Camera stopped');
    }
    
    // ==================== //
    // Live Quality Feedback
    // ==================== //
    
    startQualityFeedback() {
        // Create feedback overlay if it doesn't exist
        if (!document.getElementById('qualityFeedback')) {
            this.createFeedbackOverlay();
        }
        
        // Check quality every 500ms
        this.qualityCheckInterval = setInterval(() => {
            this.checkImageQuality();
        }, 500);
    }
    
    stopQualityFeedback() {
        if (this.qualityCheckInterval) {
            clearInterval(this.qualityCheckInterval);
            this.qualityCheckInterval = null;
        }
        
        const feedback = document.getElementById('qualityFeedback');
        if (feedback) {
            feedback.remove();
        }
    }
    
    createFeedbackOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'qualityFeedback';
        overlay.style.cssText = `
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            z-index: 1000;
            min-width: 250px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            backdrop-filter: blur(10px);
        `;
        
        overlay.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <div id="feedbackStatus" style="font-size: 16px;">
                    📸 Position document
                </div>
                <div id="feedbackDetails" style="font-size: 12px; opacity: 0.8;">
                    Checking quality...
                </div>
                <div id="qualityIndicators" style="display: flex; gap: 12px; justify-content: center; margin-top: 4px;">
                    <div id="indicatorBlur" class="quality-indicator" title="Sharpness">
                        <span class="indicator-icon">🔍</span>
                        <span class="indicator-status">-</span>
                    </div>
                    <div id="indicatorLight" class="quality-indicator" title="Lighting">
                        <span class="indicator-icon">💡</span>
                        <span class="indicator-status">-</span>
                    </div>
                    <div id="indicatorAngle" class="quality-indicator" title="Angle">
                        <span class="indicator-icon">📐</span>
                        <span class="indicator-status">-</span>
                    </div>
                </div>
            </div>
        `;
        
        // Add CSS for indicators
        const style = document.createElement('style');
        style.textContent = `
            .quality-indicator {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                font-size: 10px;
            }
            .indicator-icon {
                font-size: 20px;
            }
            .indicator-status {
                font-weight: 600;
            }
            .indicator-good { color: #4CAF50; }
            .indicator-warning { color: #FFC107; }
            .indicator-bad { color: #F44336; }
        `;
        document.head.appendChild(style);
        
        document.getElementById('cameraView').appendChild(overlay);
    }
    
    async checkImageQuality() {
        if (!this.videoElement || !this.canvasElement) return;
        
        // Capture current frame
        const context = this.canvasElement.getContext('2d');
        this.canvasElement.width = this.videoElement.videoWidth;
        this.canvasElement.height = this.videoElement.videoHeight;
        context.drawImage(this.videoElement, 0, 0);
        
        const imageData = context.getImageData(0, 0, this.canvasElement.width, this.canvasElement.height);
        
        // Run quality checks
        const blur = this.detectBlur(imageData);
        const brightness = this.detectBrightness(imageData);
        const angle = this.detectAngle(imageData);
        
        // Update feedback
        this.updateFeedbackUI(blur, brightness, angle);
    }
    
    detectBlur(imageData) {
        // Laplacian variance method for blur detection
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // Sample every 4th pixel for performance
        const step = 4;
        let variance = 0;
        let count = 0;
        
        for (let y = 1; y < height - 1; y += step) {
            for (let x = 1; x < width - 1; x += step) {
                const i = (y * width + x) * 4;
                
                // Convert to grayscale
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                
                // Get neighboring pixels
                const grayTop = 0.299 * data[i - width * 4] + 0.587 * data[i - width * 4 + 1] + 0.114 * data[i - width * 4 + 2];
                const grayLeft = 0.299 * data[i - 4] + 0.587 * data[i - 3] + 0.114 * data[i - 2];
                
                // Laplacian
                const lap = Math.abs(4 * gray - grayTop - grayLeft);
                variance += lap * lap;
                count++;
            }
        }
        
        const blurScore = variance / count;
        
        return {
            score: blurScore,
            isGood: blurScore > this.BLUR_THRESHOLD,
            level: blurScore > 150 ? 'sharp' : blurScore > this.BLUR_THRESHOLD ? 'acceptable' : 'blurry'
        };
    }
    
    detectBrightness(imageData) {
        const data = imageData.data;
        let totalBrightness = 0;
        const sampleSize = data.length / 4; // Every 4th value (RGBA)
        
        // Sample pixels
        for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel
            const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            totalBrightness += brightness;
        }
        
        const avgBrightness = totalBrightness / (sampleSize / 4);
        
        return {
            score: avgBrightness,
            isGood: avgBrightness >= this.BRIGHTNESS_MIN && avgBrightness <= this.BRIGHTNESS_MAX,
            level: avgBrightness < this.BRIGHTNESS_MIN ? 'dark' : 
                   avgBrightness > this.BRIGHTNESS_MAX ? 'bright' : 'good'
        };
    }
    
    detectAngle(imageData) {
        // Simplified edge detection to estimate document angle
        // For production, you'd use more sophisticated methods like Hough Transform
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // Detect horizontal edges in center region
        let horizontalEdges = 0;
        const centerY = Math.floor(height / 2);
        const regionHeight = Math.floor(height / 4);
        
        for (let y = centerY - regionHeight; y < centerY + regionHeight; y += 4) {
            for (let x = 1; x < width - 1; x += 4) {
                const i = (y * width + x) * 4;
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                const grayLeft = 0.299 * data[i - 4] + 0.587 * data[i - 3] + 0.114 * data[i - 2];
                
                if (Math.abs(gray - grayLeft) > 30) {
                    horizontalEdges++;
                }
            }
        }
        
        // Estimate if document is reasonably aligned
        // This is a simplified check - real implementation would be more sophisticated
        const edgeDensity = horizontalEdges / (width * regionHeight / 16);
        const isAligned = edgeDensity > 0.1 && edgeDensity < 2;
        
        return {
            score: edgeDensity,
            isGood: isAligned,
            level: isAligned ? 'aligned' : 'tilted'
        };
    }
    
    updateFeedbackUI(blur, brightness, angle) {
        const statusElement = document.getElementById('feedbackStatus');
        const detailsElement = document.getElementById('feedbackDetails');
        
        const blurIndicator = document.getElementById('indicatorBlur');
        const lightIndicator = document.getElementById('indicatorLight');
        const angleIndicator = document.getElementById('indicatorAngle');
        
        if (!statusElement || !detailsElement) return;
        
        // Update indicators
        this.updateIndicator(blurIndicator, blur.isGood, blur.level === 'sharp' ? '✓' : blur.level === 'acceptable' ? '~' : '✗');
        this.updateIndicator(lightIndicator, brightness.isGood, brightness.level === 'good' ? '✓' : '✗');
        this.updateIndicator(angleIndicator, angle.isGood, angle.isGood ? '✓' : '✗');
        
        // Determine overall status
        const allGood = blur.isGood && brightness.isGood && angle.isGood;
        
        if (allGood) {
            statusElement.innerHTML = '✅ Ready to capture!';
            statusElement.style.color = '#4CAF50';
            detailsElement.innerHTML = 'Tap capture button';
        } else {
            statusElement.innerHTML = '📸 Adjust position';
            statusElement.style.color = '#FFC107';
            
            // Provide specific feedback
            const issues = [];
            if (!blur.isGood) issues.push('Hold steady');
            if (!brightness.isGood) {
                if (brightness.level === 'dark') issues.push('More light needed');
                if (brightness.level === 'bright') issues.push('Too bright');
            }
            if (!angle.isGood) issues.push('Straighten angle');
            
            detailsElement.innerHTML = issues.join(' • ');
        }
    }
    
    updateIndicator(element, isGood, statusText) {
        if (!element) return;
        
        const statusSpan = element.querySelector('.indicator-status');
        if (statusSpan) {
            statusSpan.textContent = statusText;
            statusSpan.className = 'indicator-status ' + (isGood ? 'indicator-good' : 'indicator-bad');
        }
    }
    
    // ==================== //
    // Capture & Process
    // ==================== //
    
    captureImage() {
        console.log('📸 Capturing image...');
        
        if (!this.videoElement || !this.canvasElement) {
            console.error('❌ Camera elements not ready');
            return null;
        }
        
        // Set canvas to video dimensions
        this.canvasElement.width = this.videoElement.videoWidth;
        this.canvasElement.height = this.videoElement.videoHeight;
        
        // Draw current video frame to canvas
        const context = this.canvasElement.getContext('2d');
        context.drawImage(this.videoElement, 0, 0);
        
        // Get image as data URL
        const imageDataUrl = this.canvasElement.toDataURL('image/jpeg', 0.95);
        
        console.log('✅ Image captured');
        
        // Stop quality feedback during processing
        this.stopQualityFeedback();
        
        return imageDataUrl;
    }
    
    async preprocessImage(imageDataUrl) {
        console.log('🔧 Preprocessing image for OCR...');
        
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                // Create temporary canvas for preprocessing
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = img.width;
                canvas.height = img.height;
                
                // Draw image
                ctx.drawImage(img, 0, 0);
                
                // Get image data
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                // Apply preprocessing:
                // 1. Convert to grayscale
                // 2. Increase contrast
                // 3. Apply threshold
                
                for (let i = 0; i < data.length; i += 4) {
                    // Grayscale
                    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                    
                    // Increase contrast
                    const contrast = 1.5;
                    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
                    let enhanced = factor * (gray - 128) + 128;
                    
                    // Apply threshold for cleaner text
                    const threshold = 128;
                    enhanced = enhanced > threshold ? 255 : 0;
                    
                    // Apply back to RGB
                    data[i] = enhanced;
                    data[i + 1] = enhanced;
                    data[i + 2] = enhanced;
                }
                
                ctx.putImageData(imageData, 0, 0);
                
                console.log('✅ Image preprocessed');
                resolve(canvas.toDataURL('image/jpeg', 0.95));
            };
            
            img.src = imageDataUrl;
        });
    }
    
    async extractText(imageDataUrl, onProgress) {
        console.log('📝 Starting OCR text extraction...');
        
        try {
            // Preprocess image for better OCR
            const processedImage = await this.preprocessImage(imageDataUrl);
            
            // Run Tesseract OCR
            const result = await Tesseract.recognize(
                processedImage,
                'eng',
                {
                    logger: (m) => {
                        if (m.status === 'recognizing text') {
                            const progress = Math.round(m.progress * 100);
                            console.log(`OCR Progress: ${progress}%`);
                            if (onProgress) {
                                onProgress(progress, `Extracting text: ${progress}%`);
                            }
                        }
                    }
                }
            );
            
            const extractedText = result.data.text.trim();
            
            if (!extractedText || extractedText.length < 10) {
                throw new Error('Could not extract enough text. Please try again with better lighting and focus.');
            }
            
            console.log('✅ Text extraction complete:', extractedText.length, 'characters');
            
            return {
                text: extractedText,
                confidence: result.data.confidence
            };
            
        } catch (error) {
            console.error('❌ OCR error:', error);
            throw error;
        }
    }
    
    // ==================== //
    // Cleanup
    // ==================== //
    
    cleanup() {
        this.stopCamera();
        this.stopQualityFeedback();
    }
}

// Export for use in script.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CameraScanner;
}