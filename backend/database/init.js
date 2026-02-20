// backend/database/init.js - Database Initialization
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'scibrain.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

function initializeDatabase() {
    console.log('🗄️ Initializing SciBrain database...');
    
    try {
        // Create database connection
        const db = new Database(DB_PATH);
        
        // Enable foreign keys
        db.pragma('foreign_keys = ON');
        
        // Read and execute schema
        const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
        db.exec(schema);
        
        console.log('✅ Database initialized successfully');
        console.log(`📍 Database location: ${DB_PATH}`);
        
        // Show table counts
        const tables = db.prepare(`
            SELECT name FROM sqlite_master 
            WHERE type='table' 
            AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        `).all();
        
        console.log('📊 Tables created:');
        tables.forEach(table => {
            const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
            console.log(`   - ${table.name}: ${count.count} records`);
        });
        
        db.close();
        return true;
        
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        return false;
    }
}

// Run if called directly
if (require.main === module) {
    initializeDatabase();
}

module.exports = { initializeDatabase };