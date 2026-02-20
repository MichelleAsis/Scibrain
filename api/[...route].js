const storage = require('./_lib/storage');
const { generateReviewer, generateQuizQuestions } = require('../backend/services/ollamaService');

function setCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function parseJsonBody(req) {
    if (req.body && typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') return JSON.parse(req.body || '{}');

    return await new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', (chunk) => {
            raw += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(raw ? JSON.parse(raw) : {});
            } catch (error) {
                reject(error);
            }
        });
        req.on('error', reject);
    });
}

function sendJson(res, status, payload) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
}

module.exports = async (req, res) => {
    setCors(res);

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }

    try {
        const route = Array.isArray(req.query.route) ? req.query.route : [];
        const endpoint = `/${route.join('/')}`;

        if (endpoint === '/health' && req.method === 'GET') {
            return sendJson(res, 200, {
                status: 'ok',
                message: 'SciBrain API running on Vercel',
                aiProvider: process.env.AI_PROVIDER || 'ollama',
                storage: storage.usingKV ? 'vercel-kv' : 'in-memory'
            });
        }

        if (endpoint === '/auth/signup' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const fullName = storage.authService.sanitizeInput(body.fullName || '');
            const email = storage.authService.sanitizeInput(body.email || '').toLowerCase();
            const password = body.password || '';

            if (!fullName || !email || !password) {
                return sendJson(res, 400, { error: 'All fields are required' });
            }
            if (!storage.authService.isValidEmail(email)) {
                return sendJson(res, 400, { error: 'Invalid email format' });
            }

            const existing = await storage.getUserByEmail(email);
            if (existing) {
                return sendJson(res, 409, { error: 'User with this email already exists' });
            }

            const passwordHash = storage.authService.hashPassword(password);
            const userId = await storage.createUser(fullName, email, passwordHash);
            const user = await storage.getUserByEmail(email);

            const sessionToken = storage.authService.generateSessionToken();
            const expiresAt = storage.authService.generateSessionExpiry();
            await storage.createSession(userId, sessionToken, expiresAt, user);

            return sendJson(res, 201, {
                success: true,
                userId,
                email,
                fullName,
                sessionToken
            });
        }

        if (endpoint === '/auth/login' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const email = storage.authService.sanitizeInput(body.email || '').toLowerCase();
            const password = body.password || '';

            if (!email || !password) {
                return sendJson(res, 400, { error: 'Email and password are required' });
            }

            const user = await storage.getUserByEmail(email);
            if (!user || !storage.authService.verifyPassword(password, user.password_hash)) {
                return sendJson(res, 401, { error: 'Invalid email or password' });
            }

            await storage.updateLastLogin(user.id);
            const sessionToken = storage.authService.generateSessionToken();
            const expiresAt = storage.authService.generateSessionExpiry();
            await storage.createSession(user.id, sessionToken, expiresAt, user);

            return sendJson(res, 200, {
                success: true,
                userId: user.id,
                email: user.email,
                fullName: user.full_name,
                sessionToken
            });
        }

        if (endpoint === '/auth/logout' && req.method === 'POST') {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                await storage.deleteSession(authHeader.substring(7));
            }
            return sendJson(res, 200, { success: true });
        }

        if (endpoint === '/auth/verify' && req.method === 'GET') {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return sendJson(res, 401, { valid: false });
            }
            const session = await storage.getSessionByToken(authHeader.substring(7));
            if (!session) {
                return sendJson(res, 401, { valid: false });
            }
            return sendJson(res, 200, {
                valid: true,
                userId: session.user_id,
                email: session.email,
                fullName: session.full_name
            });
        }

        if (endpoint === '/generate-reviewer' && req.method === 'POST') {
            const userId = await storage.getUserIdFromRequest(req);
            if (!userId) return sendJson(res, 401, { error: 'Unauthorized' });

            const body = await parseJsonBody(req);
            const reviewerData = await generateReviewer(body.text || '', body.title || 'Untitled');
            const documentId = await storage.saveDocument(userId, body.title || 'Untitled', body.text || '', 'text');
            const reviewerId = await storage.saveReviewer(userId, documentId, reviewerData);

            reviewerData.documentId = documentId;
            reviewerData.reviewerId = reviewerId;
            return sendJson(res, 200, reviewerData);
        }

        if (endpoint === '/generate-questions' && req.method === 'POST') {
            const userId = await storage.getUserIdFromRequest(req);
            if (!userId) return sendJson(res, 401, { error: 'Unauthorized' });

            const body = await parseJsonBody(req);
            const questions = await generateQuizQuestions(body.text || '', body.concepts || []);
            if (body.reviewerId) {
                await storage.saveQuizQuestions(body.reviewerId, questions);
            }
            return sendJson(res, 200, questions);
        }

        if (endpoint === '/reviewers' && req.method === 'GET') {
            const userId = await storage.getUserIdFromRequest(req);
            if (!userId) return sendJson(res, 401, { error: 'Unauthorized' });

            const reviewers = await storage.getAllReviewers(userId);
            return sendJson(res, 200, reviewers);
        }

        if (route[0] === 'reviewer' && route[1] && req.method === 'GET') {
            const userId = await storage.getUserIdFromRequest(req);
            if (!userId) return sendJson(res, 401, { error: 'Unauthorized' });
            const id = Number(route[1]);
            const reviewer = await storage.getReviewer(id, userId);
            if (!reviewer) return sendJson(res, 404, { error: 'Reviewer not found' });
            return sendJson(res, 200, reviewer);
        }

        if (route[0] === 'reviewer' && route[1] && req.method === 'DELETE') {
            const userId = await storage.getUserIdFromRequest(req);
            if (!userId) return sendJson(res, 401, { error: 'Unauthorized' });
            const id = Number(route[1]);
            const deleted = await storage.deleteReviewer(id, userId);
            if (!deleted) return sendJson(res, 404, { error: 'Reviewer not found' });
            return sendJson(res, 200, { success: true, message: 'Reviewer deleted' });
        }

        if (route[0] === 'quiz-questions' && route[1] && req.method === 'GET') {
            const userId = await storage.getUserIdFromRequest(req);
            if (!userId) return sendJson(res, 401, { error: 'Unauthorized' });
            const reviewerId = Number(route[1]);
            const reviewer = await storage.getReviewer(reviewerId, userId);
            if (!reviewer) return sendJson(res, 404, { error: 'Reviewer not found' });
            const questions = await storage.getQuizQuestions(reviewerId);
            return sendJson(res, 200, questions || {});
        }

        if (endpoint === '/statistics' && req.method === 'GET') {
            const userId = await storage.getUserIdFromRequest(req);
            if (!userId) return sendJson(res, 401, { error: 'Unauthorized' });
            const stats = await storage.getStatistics(userId);
            return sendJson(res, 200, stats);
        }

        if (endpoint === '/quiz-attempt' && req.method === 'POST') {
            const userId = await storage.getUserIdFromRequest(req);
            if (!userId) return sendJson(res, 401, { error: 'Unauthorized' });
            const body = await parseJsonBody(req);
            const attemptId = await storage.saveQuizAttempt(userId, body.reviewerId, body);
            return sendJson(res, 200, { success: true, attemptId });
        }

        return sendJson(res, 404, { error: 'Not Found' });
    } catch (error) {
        console.error('API error:', error);
        return sendJson(res, 500, { error: error.message || 'Internal server error' });
    }
};

