#!/usr/bin/env python3
"""Simple HTTP Server with no-cache headers"""
import http.server
import socketserver

PORT = 8000

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add no-cache headers
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    
    def log_message(self, format, *args):
        # Suppress log messages
        pass
    
    def copyfile(self, source, outputfile):
        """Copy data with proper error handling for broken connections"""
        try:
            super().copyfile(source, outputfile)
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            # Client hat die Verbindung abgebrochen - ignorieren
            pass

class QuietTCPServer(socketserver.TCPServer):
    """TCP Server that suppresses broken pipe errors"""
    def handle_error(self, request, client_address):
        """Override to suppress common connection errors"""
        import sys
        exc_type = sys.exc_info()[0]
        if exc_type in (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            # Verbindungsfehler ignorieren
            pass
        else:
            # Andere Fehler normal behandeln
            super().handle_error(request, client_address)

import os
os.chdir(os.path.join(os.path.dirname(__file__), '..', 'client'))

with QuietTCPServer(("", PORT), NoCacheHTTPRequestHandler) as httpd:
    print(f"Server läuft auf http://localhost:{PORT}")
    print("Drücke STRG+C zum Beenden")
    httpd.serve_forever()

