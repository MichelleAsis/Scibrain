// frontend-server.js - HTTPS Frontend Server with AUTOMATIC MOBILE SUPPORT
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8443;

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
    key: fs.readFileSync(path.join(__dirname, 'localhost+2-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'localhost+2.pem'))
};

// Create HTTPS server
const server = https.createServer(httpsOptions, (req, res) => {
    console.log(`📱 ${req.method} ${req.url} from ${req.headers['user-agent']?.includes('Mobile') ? '📱 Mobile' : '💻 Desktop'}`);
    
    // Set CORS headers for mobile access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Parse URL
    let filePath = '.' + req.url;
    if (filePath === './') filePath = './src/pages/HomePage/index.html';
    
    // Get file extension
    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff': 'application/font-woff',
        '.woff2': 'font/woff2',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.db': 'application/x-sqlite3',
        '.pdf': 'application/pdf'
    };
    
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    // Read and serve file
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1><p>Path: ' + filePath + '</p>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            res.end(content, 'utf-8');
        }
    });
});

// Listen on all network interfaces (0.0.0.0) for mobile access
server.listen(PORT, '0.0.0.0', () => {
    console.log('🌐 SciBrain Frontend Server (HTTPS)');
    console.log('🔒 HTTPS enabled');
    console.log('📂 Serving from:', __dirname);
    console.log('');
    console.log('🌐 Access URLs:');
    console.log(`   💻 Computer:  https://localhost:${PORT}`);
    console.log(`   💻 Computer:  https://127.0.0.1:${PORT}`);
    console.log(`   📱 Mobile:    https://${LOCAL_IP}:${PORT}`);
    console.log('');
    console.log('📄 Quick Links (Computer):');
    console.log(`   🏠 Home:      https://127.0.0.1:${PORT}/src/pages/HomePage/index.html`);
    console.log(`   📤 Upload:    https://127.0.0.1:${PORT}/src/pages/UploadPage/index.html`);
    console.log(`   📊 Dashboard: https://127.0.0.1:${PORT}/src/pages/Dashboard/index.html`);
    console.log('');
    console.log('📱 Mobile Homepage:');
    console.log(`   https://${LOCAL_IP}:${PORT}/src/pages/HomePage/index.html`);
    console.log('');
    console.log('💡 Mobile Access Instructions:');
    console.log('   1. Connect phone to SAME WiFi network');
    console.log('   2. Open browser on phone');
    console.log(`   3. Navigate to: https://${LOCAL_IP}:${PORT}/src/pages/HomePage/index.html`);
    console.log('   4. Accept security warning (tap "Advanced" → "Proceed")');
    console.log('   5. Enjoy SciBrain on mobile! 🎉');
    console.log('');
    console.log('🔌 Backend should be running on:');
    console.log(`   Computer: https://127.0.0.1:3000`);
    console.log(`   Mobile:   https://${LOCAL_IP}:3000`);
    console.log('');
    console.log('✅ Ready!');
});

// Handle server errors
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use!`);
        console.error('   Please stop any other servers or change the PORT.');
        process.exit(1);
    } else {
        console.error('❌ Server error:', error);
        process.exit(1);
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n👋 Shutting down frontend server...');
    server.close(() => {
        console.log('✅ Frontend server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n👋 Shutting down frontend server...');
    server.close(() => {
        console.log('✅ Frontend server closed');
        process.exit(0);
    });
});