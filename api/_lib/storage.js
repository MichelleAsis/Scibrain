const authService = require('../../backend/services/authService');

let kv = null;
try {
    kv = require('@vercel/kv').kv;
} catch (error) {
    kv = null;
}

const memory = {
    counters: {
        users: 0,
        sessions: 0,
        documents: 0,
        reviewers: 0,
        attempts: 0
    },
    usersByEmail: new Map(),
    sessionsByToken: new Map(),
    documentsById: new Map(),
    reviewersById: new Map(),
    reviewerIdsByUser: new Map(),
    quizByReviewer: new Map(),
    attemptsByUser: new Map()
};

function nowISO() {
    return new Date().toISOString();
}

async function nextId(name) {
    if (kv) {
        return await kv.incr(`counter:${name}`);
    }
    memory.counters[name] += 1;
    return memory.counters[name];
}

function getAuthToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    return authHeader.slice(7);
}

async function kvGetArray(key) {
    const value = await kv.get(key);
    return Array.isArray(value) ? value : [];
}

const storage = {
    usingKV: Boolean(kv),

    async createUser(fullName, email, passwordHash) {
        const userId = await nextId('users');
        const user = {
            id: userId,
            full_name: fullName,
            email,
            password_hash: passwordHash,
            created_at: nowISO(),
            last_login: null
        };

        if (kv) {
            await kv.set(`user:email:${email}`, user);
            await kv.set(`user:id:${userId}`, user);
            return userId;
        }

        memory.usersByEmail.set(email, user);
        return userId;
    },

    async getUserByEmail(email) {
        if (kv) {
            return await kv.get(`user:email:${email}`);
        }
        return memory.usersByEmail.get(email) || null;
    },

    async updateLastLogin(userId) {
        if (kv) {
            const user = await kv.get(`user:id:${userId}`);
            if (!user) return;
            user.last_login = nowISO();
            await kv.set(`user:id:${userId}`, user);
            await kv.set(`user:email:${user.email}`, user);
            return;
        }

        for (const [email, user] of memory.usersByEmail.entries()) {
            if (user.id === userId) {
                user.last_login = nowISO();
                memory.usersByEmail.set(email, user);
                break;
            }
        }
    },

    async createSession(userId, sessionToken, expiresAt, user) {
        const session = {
            id: await nextId('sessions'),
            user_id: userId,
            session_token: sessionToken,
            expires_at: expiresAt,
            email: user.email,
            full_name: user.full_name
        };

        if (kv) {
            await kv.set(`session:${sessionToken}`, session, { ex: 60 * 60 * 24 });
            return session.id;
        }

        memory.sessionsByToken.set(sessionToken, session);
        return session.id;
    },

    async getSessionByToken(sessionToken) {
        const session = kv
            ? await kv.get(`session:${sessionToken}`)
            : memory.sessionsByToken.get(sessionToken);

        if (!session) return null;

        if (new Date(session.expires_at).getTime() <= Date.now()) {
            if (kv) {
                await kv.del(`session:${sessionToken}`);
            } else {
                memory.sessionsByToken.delete(sessionToken);
            }
            return null;
        }

        return session;
    },

    async deleteSession(sessionToken) {
        if (kv) {
            await kv.del(`session:${sessionToken}`);
            return;
        }
        memory.sessionsByToken.delete(sessionToken);
    },

    async saveDocument(userId, title, originalText, fileType = 'text') {
        const id = await nextId('documents');
        const record = {
            id,
            user_id: userId,
            title,
            original_text: originalText,
            file_type: fileType,
            word_count: originalText.split(/\s+/).length,
            upload_date: nowISO()
        };

        if (kv) {
            await kv.set(`document:${id}`, record);
        } else {
            memory.documentsById.set(id, record);
        }

        return id;
    },

    async saveReviewer(userId, documentId, reviewerData) {
        const id = await nextId('reviewers');
        const record = {
            id,
            user_id: userId,
            document_id: documentId,
            title: reviewerData.title,
            sections: reviewerData.sections,
            concepts: reviewerData.concepts,
            metadata: reviewerData.metadata,
            original_text: reviewerData.originalText,
            generated_at: nowISO()
        };

        if (kv) {
            await kv.set(`reviewer:${id}`, record);
            const listKey = `user:${userId}:reviewers`;
            const ids = await kvGetArray(listKey);
            ids.unshift(id);
            await kv.set(listKey, ids);
        } else {
            memory.reviewersById.set(id, record);
            const current = memory.reviewerIdsByUser.get(userId) || [];
            current.unshift(id);
            memory.reviewerIdsByUser.set(userId, current);
        }

        return id;
    },

    async getAllReviewers(userId, limit = 50) {
        if (kv) {
            const ids = await kvGetArray(`user:${userId}:reviewers`);
            const reviewers = [];
            for (const id of ids.slice(0, limit)) {
                const reviewer = await kv.get(`reviewer:${id}`);
                if (reviewer) {
                    reviewers.push({
                        id: reviewer.id,
                        title: reviewer.title,
                        generated_at: reviewer.generated_at,
                        word_count: reviewer.metadata?.wordCount || 0
                    });
                }
            }
            return reviewers;
        }

        const ids = memory.reviewerIdsByUser.get(userId) || [];
        return ids.slice(0, limit).map((id) => {
            const reviewer = memory.reviewersById.get(id);
            return {
                id: reviewer.id,
                title: reviewer.title,
                generated_at: reviewer.generated_at,
                word_count: reviewer.metadata?.wordCount || 0
            };
        }).filter(Boolean);
    },

    async getReviewer(id, userId) {
        const reviewer = kv ? await kv.get(`reviewer:${id}`) : memory.reviewersById.get(id);
        if (!reviewer || reviewer.user_id !== userId) return null;

        return {
            id: reviewer.id,
            userId: reviewer.user_id,
            documentId: reviewer.document_id,
            title: reviewer.title,
            sections: reviewer.sections,
            concepts: reviewer.concepts,
            metadata: reviewer.metadata,
            originalText: reviewer.original_text,
            generatedAt: reviewer.generated_at
        };
    },

    async deleteReviewer(id, userId) {
        const reviewer = kv ? await kv.get(`reviewer:${id}`) : memory.reviewersById.get(id);
        if (!reviewer || reviewer.user_id !== userId) return false;

        if (kv) {
            await kv.del(`reviewer:${id}`);
            await kv.del(`quiz:${id}`);
            const listKey = `user:${userId}:reviewers`;
            const ids = await kvGetArray(listKey);
            await kv.set(listKey, ids.filter((existingId) => existingId !== id));
            return true;
        }

        memory.reviewersById.delete(id);
        memory.quizByReviewer.delete(id);
        const ids = memory.reviewerIdsByUser.get(userId) || [];
        memory.reviewerIdsByUser.set(userId, ids.filter((existingId) => existingId !== id));
        return true;
    },

    async saveQuizQuestions(reviewerId, allQuestions) {
        if (kv) {
            await kv.set(`quiz:${reviewerId}`, allQuestions);
            return true;
        }
        memory.quizByReviewer.set(reviewerId, allQuestions);
        return true;
    },

    async getQuizQuestions(reviewerId) {
        if (kv) {
            return await kv.get(`quiz:${reviewerId}`);
        }
        return memory.quizByReviewer.get(reviewerId) || null;
    },

    async saveQuizAttempt(userId, reviewerId, attemptData) {
        const id = await nextId('attempts');
        const attempt = {
            id,
            user_id: userId,
            reviewer_id: reviewerId,
            quiz_type: attemptData.quizType,
            difficulty: attemptData.difficulty,
            total_questions: attemptData.totalQuestions,
            correct_answers: attemptData.correctAnswers,
            wrong_answers: attemptData.wrongAnswers,
            percentage: attemptData.percentage,
            time_taken: attemptData.timeTaken,
            completed_at: nowISO()
        };

        if (kv) {
            const key = `attempts:user:${userId}`;
            const attempts = await kvGetArray(key);
            attempts.unshift(attempt);
            await kv.set(key, attempts);
            return id;
        }

        const attempts = memory.attemptsByUser.get(userId) || [];
        attempts.unshift(attempt);
        memory.attemptsByUser.set(userId, attempts);
        return id;
    },

    async getStatistics(userId) {
        if (kv) {
            const reviewerIds = await kvGetArray(`user:${userId}:reviewers`);
            const attempts = await kvGetArray(`attempts:user:${userId}`);
            const sum = attempts.reduce((acc, item) => acc + (item.percentage || 0), 0);
            return {
                documents: reviewerIds.length,
                reviewers: reviewerIds.length,
                quizAttempts: attempts.length,
                annotations: 0,
                avgQuizScore: attempts.length ? (sum / attempts.length) : 0
            };
        }

        const reviewers = memory.reviewerIdsByUser.get(userId) || [];
        const attempts = memory.attemptsByUser.get(userId) || [];
        const sum = attempts.reduce((acc, item) => acc + (item.percentage || 0), 0);
        return {
            documents: reviewers.length,
            reviewers: reviewers.length,
            quizAttempts: attempts.length,
            annotations: 0,
            avgQuizScore: attempts.length ? (sum / attempts.length) : 0
        };
    },

    async getUserIdFromRequest(req) {
        const token = getAuthToken(req);
        if (!token) return null;
        const session = await this.getSessionByToken(token);
        return session ? session.user_id : null;
    },

    authService
};

module.exports = storage;

