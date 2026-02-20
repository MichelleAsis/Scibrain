// backend/database/service.js - Database Service Layer (Updated with Authentication)
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'scibrain.db');

class DatabaseService {
    constructor() {
        this.db = null;
    }

    // ==================== //
    // Connection Management
    // ==================== //
    connect() {
        if (!this.db) {
            this.db = new Database(DB_PATH);
            this.db.pragma('foreign_keys = ON');
        }
        return this.db;
    }

    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    // ==================== //
    // USERS (Authentication)
    // ==================== //
    
    createUser(fullName, email, passwordHash) {
        const db = this.connect();
        const stmt = db.prepare(`
            INSERT INTO users (full_name, email, password_hash)
            VALUES (?, ?, ?)
        `);
        
        const result = stmt.run(fullName, email, passwordHash);
        console.log(`✅ User created: ID ${result.lastInsertRowid}, Email: ${email}`);
        
        return result.lastInsertRowid;
    }

    getUserByEmail(email) {
        const db = this.connect();
        const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
        return stmt.get(email);
    }

    getUserById(userId) {
        const db = this.connect();
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
        return stmt.get(userId);
    }

    updateLastLogin(userId) {
        const db = this.connect();
        const stmt = db.prepare(`
            UPDATE users 
            SET last_login = CURRENT_TIMESTAMP 
            WHERE id = ?
        `);
        stmt.run(userId);
    }

    // ==================== //
    // SESSIONS
    // ==================== //
    
    createSession(userId, sessionToken, expiresAt) {
        const db = this.connect();
        const stmt = db.prepare(`
            INSERT INTO sessions (user_id, session_token, expires_at)
            VALUES (?, ?, ?)
        `);
        
        const result = stmt.run(userId, sessionToken, expiresAt);
        console.log(`✅ Session created for user ${userId}`);
        
        return result.lastInsertRowid;
    }

    getSessionByToken(sessionToken) {
        const db = this.connect();
        const stmt = db.prepare(`
            SELECT s.*, u.full_name, u.email 
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.session_token = ? AND s.expires_at > datetime('now')
        `);
        return stmt.get(sessionToken);
    }

    deleteSession(sessionToken) {
        const db = this.connect();
        const stmt = db.prepare('DELETE FROM sessions WHERE session_token = ?');
        stmt.run(sessionToken);
    }

    deleteExpiredSessions() {
        const db = this.connect();
        const stmt = db.prepare(`DELETE FROM sessions WHERE expires_at <= datetime('now')`);
        const result = stmt.run();
        if (result.changes > 0) {
            console.log(`🗑️ Deleted ${result.changes} expired sessions`);
        }
    }

    // ==================== //
    // DOCUMENTS (Updated with user_id)
    // ==================== //
    
    saveDocument(userId, title, originalText, fileType = 'text') {
        const db = this.connect();
        const wordCount = originalText.split(/\s+/).length;
        
        const stmt = db.prepare(`
            INSERT INTO documents (user_id, title, original_text, file_type, word_count)
            VALUES (?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(userId, title, originalText, fileType, wordCount);
        console.log(`✅ Document saved: ID ${result.lastInsertRowid} for user ${userId}`);
        
        return result.lastInsertRowid;
    }

    getDocument(id, userId = null) {
        const db = this.connect();
        let stmt, result;
        
        if (userId) {
            stmt = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?');
            result = stmt.get(id, userId);
        } else {
            stmt = db.prepare('SELECT * FROM documents WHERE id = ?');
            result = stmt.get(id);
        }
        
        return result;
    }

    getAllDocuments(userId, limit = 50) {
        const db = this.connect();
        const stmt = db.prepare(`
            SELECT id, title, file_type, word_count, upload_date 
            FROM documents 
            WHERE user_id = ?
            ORDER BY upload_date DESC 
            LIMIT ?
        `);
        return stmt.all(userId, limit);
    }

    deleteDocument(id, userId) {
        const db = this.connect();
        const stmt = db.prepare('DELETE FROM documents WHERE id = ? AND user_id = ?');
        const result = stmt.run(id, userId);
        console.log(`🗑️ Document deleted: ID ${id}`);
        return result.changes > 0;
    }

    // ==================== //
    // REVIEWERS (Updated with user_id)
    // ==================== //
    
    saveReviewer(userId, documentId, reviewerData) {
        const db = this.connect();
        
        const stmt = db.prepare(`
            INSERT INTO reviewers (
                user_id, document_id, title, sections, concepts, metadata, original_text
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(
            userId,
            documentId,
            reviewerData.title,
            JSON.stringify(reviewerData.sections),
            JSON.stringify(reviewerData.concepts),
            JSON.stringify(reviewerData.metadata),
            reviewerData.originalText
        );
        
        console.log(`✅ Reviewer saved: ID ${result.lastInsertRowid} for user ${userId}`);
        return result.lastInsertRowid;
    }

    getReviewer(id, userId = null) {
        const db = this.connect();
        let stmt, row;
        
        if (userId) {
            stmt = db.prepare('SELECT * FROM reviewers WHERE id = ? AND user_id = ?');
            row = stmt.get(id, userId);
        } else {
            stmt = db.prepare('SELECT * FROM reviewers WHERE id = ?');
            row = stmt.get(id);
        }
        
        if (row) {
            return {
                id: row.id,
                userId: row.user_id,
                documentId: row.document_id,
                title: row.title,
                sections: JSON.parse(row.sections),
                concepts: JSON.parse(row.concepts),
                metadata: JSON.parse(row.metadata),
                originalText: row.original_text,
                generatedAt: row.generated_at
            };
        }
        return null;
    }

    getReviewerByDocumentId(documentId, userId) {
        const db = this.connect();
        const stmt = db.prepare(`
            SELECT * FROM reviewers 
            WHERE document_id = ? AND user_id = ?
            ORDER BY generated_at DESC 
            LIMIT 1
        `);
        const row = stmt.get(documentId, userId);
        
        if (row) {
            return {
                id: row.id,
                userId: row.user_id,
                documentId: row.document_id,
                title: row.title,
                sections: JSON.parse(row.sections),
                concepts: JSON.parse(row.concepts),
                metadata: JSON.parse(row.metadata),
                originalText: row.original_text,
                generatedAt: row.generated_at
            };
        }
        return null;
    }

    getAllReviewers(userId, limit = 50) {
        const db = this.connect();
        const stmt = db.prepare(`
            SELECT 
                r.id, r.title, r.generated_at,
                d.title as document_title,
                json_extract(r.metadata, '$.wordCount') as word_count
            FROM reviewers r
            LEFT JOIN documents d ON r.document_id = d.id
            WHERE r.user_id = ?
            ORDER BY r.generated_at DESC
            LIMIT ?
        `);
        return stmt.all(userId, limit);
    }

    deleteReviewer(id, userId) {
        const db = this.connect();
        const stmt = db.prepare('DELETE FROM reviewers WHERE id = ? AND user_id = ?');
        const result = stmt.run(id, userId);
        console.log(`🗑️ Reviewer deleted: ID ${id}`);
        return result.changes > 0;
    }

    // ==================== //
    // QUIZ QUESTIONS
    // ==================== //
    
    saveQuizQuestions(reviewerId, allQuestions) {
        const db = this.connect();
        
        const stmt = db.prepare(`
            INSERT INTO quiz_questions (reviewer_id, quiz_type, difficulty, questions)
            VALUES (?, ?, ?, ?)
        `);
        
        const insertMany = db.transaction((questions) => {
            for (const [quizType, difficulties] of Object.entries(questions)) {
                for (const [difficulty, questionData] of Object.entries(difficulties)) {
                    stmt.run(
                        reviewerId,
                        quizType,
                        difficulty,
                        JSON.stringify(questionData)
                    );
                }
            }
        });
        
        insertMany(allQuestions);
        console.log(`✅ Quiz questions saved for reviewer: ${reviewerId}`);
        return true;
    }

    getQuizQuestions(reviewerId) {
        const db = this.connect();
        const stmt = db.prepare(`
            SELECT quiz_type, difficulty, questions 
            FROM quiz_questions 
            WHERE reviewer_id = ?
        `);
        const rows = stmt.all(reviewerId);
        
        const allQuestions = {
            trueFalse: { easy: [], medium: [], hard: [] },
            multipleChoice: { easy: [], medium: [], hard: [] },
            identification: { easy: [], medium: [], hard: [] },
            matching: { easy: { pairs: [] }, medium: { pairs: [] }, hard: { pairs: [] } }
        };
        
        rows.forEach(row => {
            const questions = JSON.parse(row.questions);
            allQuestions[row.quiz_type][row.difficulty] = questions;
        });
        
        return allQuestions;
    }

    getQuizQuestionsByType(reviewerId, quizType, difficulty) {
        const db = this.connect();
        const stmt = db.prepare(`
            SELECT questions 
            FROM quiz_questions 
            WHERE reviewer_id = ? AND quiz_type = ? AND difficulty = ?
        `);
        const row = stmt.get(reviewerId, quizType, difficulty);
        return row ? JSON.parse(row.questions) : null;
    }

    // ==================== //
    // QUIZ ATTEMPTS (Updated with user_id)
    // ==================== //
    
    saveQuizAttempt(userId, reviewerId, attemptData) {
        const db = this.connect();
        
        const stmt = db.prepare(`
            INSERT INTO quiz_attempts (
                user_id, reviewer_id, quiz_type, difficulty,
                total_questions, correct_answers, wrong_answers,
                percentage, time_taken, user_answers, questions_used
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(
            userId,
            reviewerId,
            attemptData.quizType,
            attemptData.difficulty,
            attemptData.totalQuestions,
            attemptData.correctAnswers,
            attemptData.wrongAnswers,
            attemptData.percentage,
            attemptData.timeTaken,
            JSON.stringify(attemptData.userAnswers || []),
            JSON.stringify(attemptData.questionsUsed || [])
        );
        
        console.log(`✅ Quiz attempt saved: ID ${result.lastInsertRowid}`);
        return result.lastInsertRowid;
    }

    getQuizAttempt(id, userId = null) {
        const db = this.connect();
        let stmt, row;
        
        if (userId) {
            stmt = db.prepare('SELECT * FROM quiz_attempts WHERE id = ? AND user_id = ?');
            row = stmt.get(id, userId);
        } else {
            stmt = db.prepare('SELECT * FROM quiz_attempts WHERE id = ?');
            row = stmt.get(id);
        }
        
        if (row) {
            return {
                id: row.id,
                userId: row.user_id,
                reviewerId: row.reviewer_id,
                quizType: row.quiz_type,
                difficulty: row.difficulty,
                totalQuestions: row.total_questions,
                correctAnswers: row.correct_answers,
                wrongAnswers: row.wrong_answers,
                percentage: row.percentage,
                timeTaken: row.time_taken,
                userAnswers: JSON.parse(row.user_answers),
                questionsUsed: JSON.parse(row.questions_used),
                completedAt: row.completed_at
            };
        }
        return null;
    }

    getQuizAttemptsByReviewer(reviewerId, userId, limit = 20) {
        const db = this.connect();
        const stmt = db.prepare(`
            SELECT * FROM quiz_attempts 
            WHERE reviewer_id = ? AND user_id = ?
            ORDER BY completed_at DESC 
            LIMIT ?
        `);
        return stmt.all(reviewerId, userId, limit).map(row => ({
            id: row.id,
            userId: row.user_id,
            reviewerId: row.reviewer_id,
            quizType: row.quiz_type,
            difficulty: row.difficulty,
            totalQuestions: row.total_questions,
            correctAnswers: row.correct_answers,
            wrongAnswers: row.wrong_answers,
            percentage: row.percentage,
            timeTaken: row.time_taken,
            completedAt: row.completed_at
        }));
    }

    getAllQuizAttempts(userId, limit = 50) {
        const db = this.connect();
        const stmt = db.prepare(`
            SELECT 
                qa.*,
                r.title as reviewer_title
            FROM quiz_attempts qa
            LEFT JOIN reviewers r ON qa.reviewer_id = r.id
            WHERE qa.user_id = ?
            ORDER BY qa.completed_at DESC
            LIMIT ?
        `);
        return stmt.all(userId, limit);
    }

    getQuizStatistics(reviewerId, userId) {
        const db = this.connect();
        const stmt = db.prepare(`
            SELECT 
                quiz_type,
                difficulty,
                COUNT(*) as attempts,
                AVG(percentage) as avg_percentage,
                MAX(percentage) as best_percentage,
                MIN(percentage) as worst_percentage
            FROM quiz_attempts
            WHERE reviewer_id = ? AND user_id = ?
            GROUP BY quiz_type, difficulty
        `);
        return stmt.all(reviewerId, userId);
    }

    // ==================== //
    // ANNOTATIONS (Updated with user_id)
    // ==================== //
    
    saveAnnotation(userId, reviewerId, annotationData) {
        const db = this.connect();
        
        const stmt = db.prepare(`
            INSERT INTO annotations (
                user_id, reviewer_id, section_index, concept_term,
                annotation_text, annotation_type
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(
            userId,
            reviewerId,
            annotationData.sectionIndex || null,
            annotationData.conceptTerm || null,
            annotationData.text,
            annotationData.type || 'note'
        );
        
        console.log(`✅ Annotation saved: ID ${result.lastInsertRowid}`);
        return result.lastInsertRowid;
    }

    getAnnotationsByReviewer(reviewerId, userId) {
        const db = this.connect();
        const stmt = db.prepare(`
            SELECT * FROM annotations 
            WHERE reviewer_id = ? AND user_id = ?
            ORDER BY created_at DESC
        `);
        return stmt.all(reviewerId, userId);
    }

    updateAnnotation(id, userId, newText) {
        const db = this.connect();
        const stmt = db.prepare(`
            UPDATE annotations 
            SET annotation_text = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ? AND user_id = ?
        `);
        const result = stmt.run(newText, id, userId);
        return result.changes > 0;
    }

    deleteAnnotation(id, userId) {
        const db = this.connect();
        const stmt = db.prepare('DELETE FROM annotations WHERE id = ? AND user_id = ?');
        const result = stmt.run(id, userId);
        return result.changes > 0;
    }

    // ==================== //
    // UTILITY FUNCTIONS
    // ==================== //
    
    clearAllData() {
        const db = this.connect();
        console.log('⚠️ Clearing all data from database...');
        
        db.exec(`
            DELETE FROM sessions;
            DELETE FROM annotations;
            DELETE FROM quiz_attempts;
            DELETE FROM quiz_questions;
            DELETE FROM reviewers;
            DELETE FROM documents;
            DELETE FROM users;
        `);
        
        console.log('✅ All data cleared');
        return true;
    }

    getStatistics(userId) {
        const db = this.connect();
        
        const stats = {
            documents: db.prepare('SELECT COUNT(*) as count FROM documents WHERE user_id = ?').get(userId).count,
            reviewers: db.prepare('SELECT COUNT(*) as count FROM reviewers WHERE user_id = ?').get(userId).count,
            quizAttempts: db.prepare('SELECT COUNT(*) as count FROM quiz_attempts WHERE user_id = ?').get(userId).count,
            annotations: db.prepare('SELECT COUNT(*) as count FROM annotations WHERE user_id = ?').get(userId).count,
            avgQuizScore: db.prepare('SELECT AVG(percentage) as avg FROM quiz_attempts WHERE user_id = ?').get(userId).avg || 0
        };
        
        return stats;
    }

    exportData(userId) {
        const db = this.connect();
        
        return {
            user: db.prepare('SELECT id, full_name, email, created_at FROM users WHERE id = ?').get(userId),
            documents: db.prepare('SELECT * FROM documents WHERE user_id = ?').all(userId),
            reviewers: db.prepare('SELECT * FROM reviewers WHERE user_id = ?').all(userId),
            quizQuestions: db.prepare(`
                SELECT qq.* FROM quiz_questions qq
                JOIN reviewers r ON qq.reviewer_id = r.id
                WHERE r.user_id = ?
            `).all(userId),
            quizAttempts: db.prepare('SELECT * FROM quiz_attempts WHERE user_id = ?').all(userId),
            annotations: db.prepare('SELECT * FROM annotations WHERE user_id = ?').all(userId),
            exportedAt: new Date().toISOString()
        };
    }
}

// Create singleton instance
const dbService = new DatabaseService();

module.exports = dbService;