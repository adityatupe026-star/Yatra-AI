const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "Frontend");
const PORT = 8000;
const BACKEND_ORIGIN = "http://127.0.0.1:8001";

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function send(res, statusCode, contentType, body) {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(String(body), "utf8");
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Content-Length": buffer.length,
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
  });
  res.end(buffer);
}

function safeResolve(requestPath) {
  const normalized = decodeURIComponent(requestPath || "/").replace(/^\/+/, "");
  const requested = normalized || "index.html";
  const resolved = path.resolve(ROOT, requested);
  if (!resolved.startsWith(path.resolve(ROOT))) {
    return null;
  }
  return resolved;
}

function contentTypeFor(filePath) {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

async function proxyToBackend(req, res, bodyText) {
  const url = new URL(req.url, BACKEND_ORIGIN);
  const init = {
    method: req.method,
    headers: {
      "content-type": req.headers["content-type"] || "application/json",
    },
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = bodyText || "";
  }

  try {
    const response = await fetch(url, init);
    const arrayBuffer = await response.arrayBuffer();
    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    res.writeHead(response.status, headers);
    res.end(Buffer.from(arrayBuffer));
    return true;
  } catch {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    const pathname = url.pathname;

    if (pathname === "/health" || pathname === "/api/health") {
      try {
        const backend = await fetch(`${BACKEND_ORIGIN}/health`);
        if (backend.ok) {
          const text = await backend.text();
          send(res, backend.status, "application/json; charset=utf-8", text);
          return;
        }
      } catch {
        // fall through to frontend-only health
      }
      send(res, 200, "application/json; charset=utf-8", JSON.stringify({ status: "frontend-only" }));
      return;
    }

    if (pathname.startsWith("/api/")) {
      let bodyText = "";
      if (req.method !== "GET" && req.method !== "HEAD") {
        bodyText = await new Promise((resolve) => {
          let raw = "";
          req.setEncoding("utf8");
          req.on("data", (chunk) => {
            raw += chunk;
          });
          req.on("end", () => resolve(raw));
          req.on("error", () => resolve(""));
        });
      }

      const proxied = await proxyToBackend(req, res, bodyText);
      if (proxied) {
        return;
      }

      if (pathname === "/api/translate" && req.method === "POST") {
        let translated = "";
        try {
          const payload = JSON.parse(bodyText || "{}");
          translated = typeof payload.text === "string" ? payload.text : "";
        } catch {
          translated = "";
        }
        send(res, 200, "application/json; charset=utf-8", JSON.stringify({ translated }));
        return;
      }

      send(res, 503, "application/json; charset=utf-8", JSON.stringify({ detail: "Backend unavailable." }));
      return;
    }

    const filePath = safeResolve(pathname === "/" ? "/index.html" : pathname);
    if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      const fallback = path.join(ROOT, "index.html");
      const html = fs.readFileSync(fallback);
      send(res, 200, "text/html; charset=utf-8", html);
      return;
    }

    const file = fs.readFileSync(filePath);
    send(res, 200, contentTypeFor(filePath), file);
  } catch (error) {
    send(res, 500, "text/plain; charset=utf-8", error?.message || "Frontend server error");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`YatraAI frontend server listening at http://127.0.0.1:${PORT}/`);
});
