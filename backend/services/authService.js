// backend/services/authService.js - Authentication Service
const crypto = require('crypto');

class AuthService {
    // Hash password using crypto (built-in Node.js module)
    hashPassword(password) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        return `${salt}:${hash}`;
    }

    // Verify password
    verifyPassword(password, storedHash) {
        const [salt, hash] = storedHash.split(':');
        const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        return hash === verifyHash;
    }

    // Generate session token
    generateSessionToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    // Generate session expiry (24 hours from now)
    generateSessionExpiry() {
        const now = new Date();
        now.setHours(now.getHours() + 24);
        return now.toISOString();
    }

    // Validate email format
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Sanitize user input
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input.trim();
    }
}

module.exports = new AuthService();