#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8000;
const dir = __dirname;

const server = http.createServer((req, res) => {
    // Serve index.html on root; otherwise serve the requested path
    let filePath = path.join(dir, req.url === '/' ? 'index.html' : req.url);
    
    // Security: prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(dir)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Access denied');
        return;
    }
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(`<h1>404 Not Found</h1><p>${filePath}</p>`);
            console.log(`[404] ${req.url}`);
            return;
        }
        
        // Set content type
        let contentType = 'application/octet-stream';
        const ext = path.extname(filePath).toLowerCase();
        const types = {
            '.html': 'text/html; charset=utf-8',
            '.js': 'application/javascript; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.json': 'application/json; charset=utf-8',
            '.glb': 'model/gltf-binary',
            '.gltf': 'model/gltf+json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg'
        };
        
        contentType = types[ext] || contentType;
        
        res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*'
        });
        res.end(data);
        
        const size = (data.length / 1024).toFixed(2);
        console.log(`[200] ${req.url} (${size} KB)`);
    });
});

server.listen(PORT, () => {
    console.log('');
    console.log('================================================');
    console.log('  OrbRPG 3D Model Viewer');
    console.log('================================================');
    console.log('');
    console.log(`✓ Server running at: http://localhost:${PORT}`);
    console.log(`✓ Viewer URL:    http://localhost:${PORT}/index.html`);
    console.log(`✓ Directory:     ${dir}`);
    console.log('');
    console.log('Controls:');
    console.log('  - Drag mouse to rotate');
    console.log('  - Scroll to zoom');
    console.log('  - Click Browse to load GLB files');
    console.log('');
    console.log('Press Ctrl+C to stop');
    console.log('');
    
    // Open browser
    const { exec } = require('child_process');
    const platform = process.platform;
    const cmd = {
        'win32': `start http://localhost:${PORT}/index.html`,
        'darwin': `open http://localhost:${PORT}/index.html`,
        'linux': `xdg-open http://localhost:${PORT}/index.html`
    }[platform];
    
    if (cmd) {
        exec(cmd, (err) => {
            if (err) console.log('Note: Could not open browser automatically');
        });
    }
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Error: Port ${PORT} is already in use`);
        console.error('Try killing other processes or changing the port');
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});
