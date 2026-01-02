#!/usr/bin/env python3
"""
Simple HTTP server for OrbRPG 3D Model Preview
Serves preview.html and model files with CORS headers
"""

import http.server
import socketserver
import os
import shutil
import webbrowser
import time
from pathlib import Path

# Configuration
PORT = 8080
EDITOR_DIR = Path(__file__).parent.absolute()
PUBLIC_DIR = EDITOR_DIR / "public"

def setup_public_directory():
    """Create public directory and copy files"""
    if PUBLIC_DIR.exists():
        shutil.rmtree(PUBLIC_DIR)
    PUBLIC_DIR.mkdir()
    
    # Copy preview.html
    preview_src = EDITOR_DIR / "preview.html"
    if preview_src.exists():
        shutil.copy(preview_src, PUBLIC_DIR / "preview.html")
        print(f"✓ Copied preview.html")
    
    # Copy Warrior Test.glb
    warrior_src = EDITOR_DIR.parent / "Warrior Test.glb"
    if warrior_src.exists():
        shutil.copy(warrior_src, PUBLIC_DIR / "Warrior Test.glb")
        print(f"✓ Copied Warrior Test.glb")
    else:
        print(f"⚠ Warning: Warrior Test.glb not found at {warrior_src}")

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP handler with CORS headers"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC_DIR), **kwargs)
    
    def end_headers(self):
        """Add CORS headers"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()
    
    def do_OPTIONS(self):
        """Handle OPTIONS requests"""
        self.send_response(200)
        self.end_headers()
    
    def log_message(self, format, *args):
        """Custom logging"""
        print(f"[Server] {format % args}")

def main():
    """Start HTTP server"""
    print("\n" + "="*50)
    print("OrbRPG 3D Model Preview Server")
    print("="*50)
    
    # Setup
    print("\nSetting up public directory...")
    setup_public_directory()
    
    # Start server
    print(f"\n▶ Starting HTTP server on port {PORT}...")
    print(f"   Files served from: {PUBLIC_DIR}")
    
    try:
        with socketserver.TCPServer(("", PORT), CORSRequestHandler) as httpd:
            print(f"\n✓ Server running!")
            print(f"✓ Preview URL: http://localhost:{PORT}/preview.html?model=Warrior Test.glb")
            print(f"\n  Open the URL in your browser to see the model.")
            print(f"  Press Ctrl+C to stop the server.\n")
            
            # Open browser after a short delay
            time.sleep(0.5)
            try:
                webbrowser.open(f"http://localhost:{PORT}/preview.html?model=Warrior%20Test.glb", new=2)
                print("  → Browser opening...\n")
            except:
                print("  (Please open the URL manually in your browser)\n")
            
            httpd.serve_forever()
    
    except KeyboardInterrupt:
        print("\n\n✓ Server stopped")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"\n✗ Error: Port {PORT} is already in use")
            print(f"  Try killing existing processes or use a different port")
        else:
            print(f"\n✗ Error: {e}")

if __name__ == "__main__":
    main()
