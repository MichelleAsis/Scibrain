// backend/server.js - COMPLETE WITH AUTHENTICATION + AUTOMATIC MOBILE SUPPORT
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { generateReviewer, generateQuizQuestions } = require('./services/ollamaService');
const authService = require('./services/authService');

// Database integration
let dbService = null;
let dbAvailable = false;

try {
    dbService = require('./database/service');
    const { initializeDatabase } = require('./database/init');
    
    console.log('🗄️ Database module found, initializing...');
    initializeDatabase();
    dbAvailable = true;
    console.log('✅ Database support enabled');
    
    // Clean up expired sessions on startup
    dbService.deleteExpiredSessions();
} catch (error) {
    console.log('ℹ️ Database module not found - running without database support');
}

// ==================== //
// AUTOMATIC IP DETECTION FOR MOBILE
// ==================== //
function getLocalIPAddress() {
    const interfaces = os.networkInterfaces();
    
    for (const interfaceName in interfaces) {
        const addresses = interfaces[interfaceName];
        
        for (const addressInfo of addresses) {
            // Skip internal (loopback) and non-IPv4 addresses
            if (addressInfo.family === 'IPv4' && !addressInfo.internal) {
                return addressInfo.address;
            }
        }
    }
    
    return 'localhost'; // Fallback
}

const LOCAL_IP = getLocalIPAddress();

// HTTPS options
const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, '../localhost+2-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../localhost+2.pem'))
};

// ==================== //
// Helper Functions
// ==================== //

// Get userId from request (from session token in headers)
function getUserIdFromRequest(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    
    const sessionToken = authHeader.substring(7);
    
    try {
        const session = dbService.getSessionByToken(sessionToken);
        return session ? session.user_id : null;
    } catch (error) {
        console.error('Session verification error:', error);
        return null;
    }
}

// Create HTTPS server
const server = https.createServer(httpsOptions, async (req, res) => {
    // ENHANCED CORS - Automatically allows local network IPs for mobile
    const allowedOrigins = [
        'https://localhost:5500',
        'https://127.0.0.1:5500',
        'https://127.0.0.1:8443',
        'https://localhost:8443',
        `https://${LOCAL_IP}:8443`,  // Auto-detected local IP for mobile
        'http://localhost:8000',
        'http://127.0.0.1:8000'
    ];
    
    const origin = req.headers.origin;
    
    // Allow from known origins OR any local network IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else if (origin && (origin.includes('192.168.') || origin.includes('10.0.') || origin.includes('172.16.') || origin.includes('172.17.') || origin.includes('172.18.') || origin.includes('172.19.') || origin.includes('172.20.') || origin.includes('172.21.') || origin.includes('172.22.') || origin.includes('172.23.') || origin.includes('172.24.') || origin.includes('172.25.') || origin.includes('172.26.') || origin.includes('172.27.') || origin.includes('172.28.') || origin.includes('172.29.') || origin.includes('172.30.') || origin.includes('172.31.'))) {
        // Allow any local network IP
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Health check
    if (req.url === '/api/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'ok', 
            message: 'SciBrain Backend Server with Authentication',
            version: '10.1',
            database: dbAvailable ? 'enabled' : 'disabled',
            authentication: dbAvailable ? 'enabled' : 'disabled',
            mobileSupport: true
        }));
        return;
    }

    // ========================================
    // AUTHENTICATION ENDPOINTS
    // ========================================

    // Sign Up
    if (req.url === '/api/auth/signup' && req.method === 'POST') {
        if (!dbAvailable) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Database not available' }));
            return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { fullName, email, password } = JSON.parse(body);
                
                console.log('📝 Sign up request:', email);
                
                if (!fullName || !email || !password) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'All fields are required' }));
                    return;
                }
                
                const sanitizedFullName = authService.sanitizeInput(fullName);
                const sanitizedEmail = authService.sanitizeInput(email).toLowerCase();
                
                if (!authService.isValidEmail(sanitizedEmail)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid email format' }));
                    return;
                }
                
                const existingUser = dbService.getUserByEmail(sanitizedEmail);
                if (existingUser) {
                    res.writeHead(409, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'User with this email already exists' }));
                    return;
                }
                
                const passwordHash = authService.hashPassword(password);
                const userId = dbService.createUser(sanitizedFullName, sanitizedEmail, passwordHash);
                
                const sessionToken = authService.generateSessionToken();
                const expiresAt = authService.generateSessionExpiry();
                dbService.createSession(userId, sessionToken, expiresAt);
                
                console.log(`✅ User created successfully: ${sanitizedEmail} (ID: ${userId})`);
                
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    userId: userId,
                    email: sanitizedEmail,
                    fullName: sanitizedFullName,
                    sessionToken: sessionToken
                }));
                
            } catch (error) {
                console.error('❌ Sign up error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to create account' }));
            }
        });
        return;
    }

    // Login
    if (req.url === '/api/auth/login' && req.method === 'POST') {
        if (!dbAvailable) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Database not available' }));
            return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { email, password } = JSON.parse(body);
                
                console.log('🔐 Login attempt:', email);
                
                if (!email || !password) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Email and password are required' }));
                    return;
                }
                
                const sanitizedEmail = authService.sanitizeInput(email).toLowerCase();
                const user = dbService.getUserByEmail(sanitizedEmail);
                
                if (!user) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid email or password' }));
                    return;
                }
                
                const passwordValid = authService.verifyPassword(password, user.password_hash);
                if (!passwordValid) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid email or password' }));
                    return;
                }
                
                dbService.updateLastLogin(user.id);
                
                const sessionToken = authService.generateSessionToken();
                const expiresAt = authService.generateSessionExpiry();
                dbService.createSession(user.id, sessionToken, expiresAt);
                
                console.log(`✅ Login successful: ${sanitizedEmail} (ID: ${user.id})`);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    userId: user.id,
                    email: user.email,
                    fullName: user.full_name,
                    sessionToken: sessionToken
                }));
                
            } catch (error) {
                console.error('❌ Login error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Login failed' }));
            }
        });
        return;
    }

    // Logout
    if (req.url === '/api/auth/logout' && req.method === 'POST') {
        if (!dbAvailable) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Database not available' }));
            return;
        }

        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const sessionToken = authHeader.substring(7);
            dbService.deleteSession(sessionToken);
            console.log('👋 User logged out');
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
    }

    // Verify Session
    if (req.url === '/api/auth/verify' && req.method === 'GET') {
        if (!dbAvailable) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Database not available' }));
            return;
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ valid: false }));
            return;
        }

        const sessionToken = authHeader.substring(7);
        const session = dbService.getSessionByToken(sessionToken);
        
        if (session) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                valid: true,
                userId: session.user_id,
                email: session.email,
                fullName: session.full_name
            }));
        } else {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ valid: false }));
        }
        return;
    }

    // ========================================
    // REVIEWER GENERATION ENDPOINTS (WITH AUTH)
    // ========================================

    // Generate Reviewer
    if (req.url === '/api/generate-reviewer' && req.method === 'POST') {
        const userId = getUserIdFromRequest(req);
        if (!userId) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { text, title } = JSON.parse(body);
                
                console.log(`📚 Generating reviewer for user ${userId}:`, title);
                
                const reviewerData = await generateReviewer(text, title);
                
                let documentId = Date.now();
                let reviewerId = Date.now() + 1;
                
                if (dbAvailable && dbService) {
                    try {
                        documentId = dbService.saveDocument(userId, title, text, 'text');
                        reviewerId = dbService.saveReviewer(userId, documentId, reviewerData);
                        console.log(`✅ Reviewer saved to database: Document ID ${documentId}, Reviewer ID ${reviewerId}`);
                    } catch (dbError) {
                        console.warn('⚠️ Failed to save to database:', dbError.message);
                    }
                }
                
                reviewerData.documentId = documentId;
                reviewerData.reviewerId = reviewerId;
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(reviewerData));
                
            } catch (error) {
                console.error('❌ Error generating reviewer:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // Generate Quiz Questions
    if (req.url === '/api/generate-questions' && req.method === 'POST') {
        const userId = getUserIdFromRequest(req);
        if (!userId) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { text, concepts, reviewerId } = JSON.parse(body);
                
                console.log('🎮 Generating quiz questions...');
                
                const questions = await generateQuizQuestions(text, concepts);
                
                if (dbAvailable && dbService && reviewerId) {
                    try {
                        dbService.saveQuizQuestions(reviewerId, questions);
                        console.log(`✅ Quiz questions saved for reviewer ${reviewerId}`);
                    } catch (dbError) {
                        console.warn('⚠️ Failed to save quiz questions:', dbError.message);
                    }
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(questions));
                
            } catch (error) {
                console.error('❌ Error generating questions:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // ========================================
    // DATABASE ENDPOINTS (WITH AUTH)
    // ========================================

    // Get All Reviewers (User-specific)
    if (req.url === '/api/reviewers' && req.method === 'GET') {
        if (!dbAvailable) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Database not available' }));
            return;
        }

        const userId = getUserIdFromRequest(req);
        if (!userId) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }

        try {
            const reviewers = dbService.getAllReviewers(userId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(reviewers));
        } catch (error) {
            console.error('❌ Error getting reviewers:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // Get Reviewer by ID
    if (req.url.startsWith('/api/reviewer/') && req.method === 'GET') {
        if (!dbAvailable) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Database not available' }));
            return;
        }

        const userId = getUserIdFromRequest(req);
        if (!userId) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }

        try {
            const id = parseInt(req.url.split('/')[3]);
            const reviewer = dbService.getReviewer(id, userId);
            
            if (reviewer) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(reviewer));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Reviewer not found' }));
            }
        } catch (error) {
            console.error('❌ Error getting reviewer:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // Delete Reviewer
    if (req.url.startsWith('/api/reviewer/') && req.method === 'DELETE') {
        if (!dbAvailable) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Database not available' }));
            return;
        }

        const userId = getUserIdFromRequest(req);
        if (!userId) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }

        try {
            const id = parseInt(req.url.split('/')[3]);
            const success = dbService.deleteReviewer(id, userId);
            
            if (success) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Reviewer deleted' }));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Reviewer not found' }));
            }
        } catch (error) {
            console.error('❌ Error deleting reviewer:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // Get Quiz Questions
    if (req.url.startsWith('/api/quiz-questions/') && req.method === 'GET') {
        if (!dbAvailable) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Database not available' }));
            return;
        }

        const userId = getUserIdFromRequest(req);
        if (!userId) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }

        try {
            const reviewerId = parseInt(req.url.split('/')[3]);
            const questions = dbService.getQuizQuestions(reviewerId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(questions));
        } catch (error) {
            console.error('❌ Error getting quiz questions:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // Get Statistics (User-specific)
    if (req.url === '/api/statistics' && req.method === 'GET') {
        if (!dbAvailable) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Database not available' }));
            return;
        }

        const userId = getUserIdFromRequest(req);
        if (!userId) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }

        try {
            const stats = dbService.getStatistics(userId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(stats));
        } catch (error) {
            console.error('❌ Error getting statistics:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // Save Quiz Attempt
    if (req.url === '/api/quiz-attempt' && req.method === 'POST') {
        if (!dbAvailable) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Database not available' }));
            return;
        }

        const userId = getUserIdFromRequest(req);
        if (!userId) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const attemptData = JSON.parse(body);
                const attemptId = dbService.saveQuizAttempt(userId, attemptData.reviewerId, attemptData);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, attemptId: attemptId }));
            } catch (error) {
                console.error('❌ Error saving quiz attempt:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // 404
    res.writeHead(404);
    res.end('Not Found');
});

const PORT = 3000;

// Listen on all network interfaces (0.0.0.0) for mobile access
server.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 SciBrain Backend Server running');
    console.log('📡 Ollama endpoint: http://localhost:11434');
    console.log('🔒 HTTPS enabled');
    console.log(`🗄️ Database: ${dbAvailable ? 'SQLite (enabled)' : 'Not installed'}`);
    console.log(`🔐 Authentication: ${dbAvailable ? 'Enabled' : 'Disabled'}`);
    console.log('');
    console.log('🌐 Access URLs:');
    console.log(`   💻 Computer:  https://localhost:${PORT}`);
    console.log(`   💻 Computer:  https://127.0.0.1:${PORT}`);
    console.log(`   📱 Mobile:    https://${LOCAL_IP}:${PORT}`);
    console.log('');
    console.log('💡 Mobile Access:');
    console.log(`   1. Connect phone to same WiFi network`);
    console.log(`   2. Open browser on phone`);
    console.log(`   3. Go to: https://${LOCAL_IP}:8443/src/pages/HomePage/index.html`);
    console.log(`   4. Accept security warning (it's safe - local network only)`);
    console.log('');
    console.log('✅ Ready!');
    
    if (dbAvailable) {
        console.log('\n📋 Authentication Endpoints:');
        console.log('  POST /api/auth/signup      - Create new account');
        console.log('  POST /api/auth/login       - Login');
        console.log('  POST /api/auth/logout      - Logout');
        console.log('  GET  /api/auth/verify      - Verify session');
        
        console.log('\n📋 Reviewer Endpoints (Auth Required):');
        console.log('  POST /api/generate-reviewer  - Generate reviewer');
        console.log('  POST /api/generate-questions - Generate quiz questions');
        console.log('  GET  /api/reviewers          - Get all reviewers');
        console.log('  GET  /api/reviewer/:id       - Get specific reviewer');
        console.log('  DELETE /api/reviewer/:id     - Delete reviewer');
        console.log('  GET  /api/quiz-questions/:id - Get quiz questions');
        console.log('  GET  /api/statistics         - Get user statistics');
        console.log('  POST /api/quiz-attempt       - Save quiz result');
    }
});