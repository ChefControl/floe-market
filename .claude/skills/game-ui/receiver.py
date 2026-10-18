"""Saves the cropped screenshots that shot.js posts from the game's page, for the UI check's page.

    python3 -I .claude/skills/game-ui/receiver.py <out-dir> [port]

Listens on 127.0.0.1 only (port 5199 by default). A POST to /<name>.jpg writes the body to <out-dir>/<name>.jpg; the
name may hold only letters, digits, dashes and underscores. Stop it with Ctrl-C (or stop the background task).
"""
import http.server
import os
import re
import sys

OUT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 5199
NAME = re.compile(r'^/([A-Za-z0-9_-]{1,80})\.jpg$')


class Receiver(http.server.BaseHTTPRequestHandler):
    def cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.end_headers()

    def do_POST(self):
        m = NAME.match(self.path)
        size = int(self.headers.get('Content-Length') or 0)
        if not m or size <= 0 or size > 5_000_000:
            self.send_response(400)
            self.cors()
            self.end_headers()
            return
        path = os.path.join(OUT, m.group(1) + '.jpg')
        with open(path, 'wb') as f:
            f.write(self.rfile.read(size))
        self.send_response(200)
        self.cors()
        self.end_headers()
        print('saved', path, flush=True)


os.makedirs(OUT, exist_ok=True)
print(f'saving to {OUT} on 127.0.0.1:{PORT}', flush=True)
http.server.HTTPServer(('127.0.0.1', PORT), Receiver).serve_forever()
