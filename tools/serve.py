"""Local dev server for Steel Tide: serves app/public with caching off so every reload picks up edits.
The page is served silent (test runs were waking the house); add ?sound to the URL to hear it."""
import os, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app", "public")
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8820
MUTE = b"""<script>if (!/[?&]sound\\b/.test(location.search)) { const AC = window.AudioContext;
  window.AudioContext = class extends AC { constructor(o) { super(o); this.suspend(); } resume() { return Promise.resolve(); } };
  HTMLMediaElement.prototype.play = function () { return Promise.resolve(); }; }</script>"""

class NoCache(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript", ".mjs": "text/javascript", ".glb": "model/gltf-binary"}
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def do_GET(self):
        if self.path.split("?")[0] in ("/", "/index.html"):
            body = open(os.path.join(ROOT, "index.html"), "rb").read().replace(b"<head>", b"<head>" + MUTE, 1)
            self.send_response(200); self.send_header("Content-Type", "text/html; charset=utf-8"); self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body); return
        super().do_GET()
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()
    def log_message(self, *a): pass

ThreadingHTTPServer(("127.0.0.1", PORT), NoCache).serve_forever()
