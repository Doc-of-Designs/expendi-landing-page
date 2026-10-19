"""Local preview server that disables browser caching, so edits show up on reload."""
import http.server
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()


if __name__ == "__main__":
    http.server.ThreadingHTTPServer(("", PORT), NoCacheHandler).serve_forever()
