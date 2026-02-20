-- SciBrain Database Schema (Updated with Authentication)
-- SQLite database for storing users, documents, reviewers, quizzes, and results

-- ============================================
-- Table 1: Users (Authentication)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active INTEGER DEFAULT 1,
    profile_image TEXT
);

-- ============================================
-- Table 2: Documents (Uploaded Files)
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    original_text TEXT NOT NULL,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    file_type TEXT,
    word_count INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- Table 3: Reviewers (Generated Study Materials)
-- ============================================
CREATE TABLE IF NOT EXISTS reviewers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    document_id INTEGER,
    title TEXT NOT NULL,
    sections TEXT NOT NULL, -- JSON
    concepts TEXT NOT NULL, -- JSON
    metadata TEXT, -- JSON
    original_text TEXT,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- ============================================
-- Table 4: Quiz Questions (All Generated Questions)
-- ============================================
CREATE TABLE IF NOT EXISTS quiz_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reviewer_id INTEGER NOT NULL,
    quiz_type TEXT NOT NULL, -- 'trueFalse', 'multipleChoice', 'identification', 'matching'
    difficulty TEXT NOT NULL, -- 'easy', 'medium', 'hard'
    questions TEXT NOT NULL, -- JSON array of questions
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reviewer_id) REFERENCES reviewers(id) ON DELETE CASCADE
);

-- ============================================
-- Table 5: Quiz Attempts (User Results)
-- ============================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    reviewer_id INTEGER NOT NULL,
    quiz_type TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    wrong_answers INTEGER NOT NULL,
    percentage INTEGER NOT NULL,
    time_taken INTEGER, -- in seconds
    user_answers TEXT, -- JSON
    questions_used TEXT, -- JSON - specific questions for this attempt
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES reviewers(id) ON DELETE CASCADE
);

-- ============================================
-- Table 6: Annotations (User Notes)
-- ============================================
CREATE TABLE IF NOT EXISTS annotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    reviewer_id INTEGER NOT NULL,
    section_index INTEGER,
    concept_term TEXT,
    annotation_text TEXT NOT NULL,
    annotation_type TEXT DEFAULT 'note', -- 'note', 'highlight', 'question'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES reviewers(id) ON DELETE CASCADE
);

-- ============================================
-- Table 7: Sessions (Optional - for session management)
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- Indexes for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON documents(upload_date);
CREATE INDEX IF NOT EXISTS idx_reviewers_user_id ON reviewers(user_id);
CREATE INDEX IF NOT EXISTS idx_reviewers_document_id ON reviewers(document_id);
CREATE INDEX IF NOT EXISTS idx_reviewers_generated_at ON reviewers(generated_at);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_reviewer_id ON quiz_questions(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_type_difficulty ON quiz_questions(quiz_type, difficulty);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_reviewer_id ON quiz_attempts(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_completed_at ON quiz_attempts(completed_at);
CREATE INDEX IF NOT EXISTS idx_annotations_user_id ON annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_annotations_reviewer_id ON annotations(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);