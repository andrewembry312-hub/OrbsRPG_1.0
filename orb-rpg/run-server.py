#!/usr/bin/env python3
"""
Simple HTTP server for testing Orb RPG
Serves files from current directory on http://localhost:8000
"""
import http.server
import socketserver
import os
import webbrowser
import time

PORT = 8000
HANDLER = http.server.SimpleHTTPRequestHandler

# Change to the directory containing index.html
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

# Create the server
with socketserver.TCPServer(("", PORT), HANDLER) as httpd:
    print(f"Serving files from: {script_dir}")
    print(f"Server started on http://localhost:{PORT}/")
    print("Press Ctrl+C to stop the server")
    
    # Try to open browser after a short delay
    try:
        time.sleep(1)
        webbrowser.open(f'http://localhost:{PORT}/')
        print("Opened game in default browser")
    except:
        print("Could not auto-open browser - visit http://localhost:8000 manually")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
