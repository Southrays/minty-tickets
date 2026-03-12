// scripts/dev-api-server.js
// Run alongside `npm start` so /api/* calls work on localhost.
// Usage: node scripts/dev-api-server.js
// Requires: npm install --save-dev express dotenv

require("dotenv").config({ path: ".env.local" });

const express = require("express");
const app     = express();

// ── Body parsing ─────────────────────────────────────────────────────────────
// Image upload route gets raw bytes — register BEFORE json middleware
// and explicitly SKIP json parsing for that path
app.use((req, res, next) => {
  if (req.path === "/api/upload-image") {
    // Read raw bytes into req.body as a Buffer
    express.raw({ type: "*/*", limit: "10mb" })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.all("/api/send-ticket",  require("../api/send-ticket"));
app.all("/api/ticket-count", require("../api/ticket-count"));
app.all("/api/upload-image", require("../api/upload-image"));

// ── Catch-all: return JSON 404 instead of Express HTML page ──────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ── Global error handler: always return JSON, never HTML ─────────────────────
app.use((err, req, res, next) => {
  console.error("[dev-api] Unhandled error:", err);
  res.status(500).json({ error: err?.message || "Internal server error" });
});

const PORT = 3001;
app.listen(PORT, () => {
  const ok  = v => v ? "✓" : "✗";
  const env = process.env;
  console.log(`\n[dev-api] API server → http://localhost:${PORT}`);
  console.log(`[dev-api] RESEND_API_KEY        ${ok(env.RESEND_API_KEY)}  ${env.RESEND_API_KEY    ? "set" : "MISSING"}`);
  console.log(`[dev-api] FROM_EMAIL            ${ok(env.FROM_EMAIL)}  ${env.FROM_EMAIL        ? env.FROM_EMAIL : "MISSING"}`);
  console.log(`[dev-api] KV_REST_API_URL       ${ok(env.KV_REST_API_URL)}  ${env.KV_REST_API_URL   ? "set (dedup + count enabled)" : "MISSING — dedup disabled"}`);
  console.log(`[dev-api] KV_REST_API_TOKEN     ${ok(env.KV_REST_API_TOKEN)}  ${env.KV_REST_API_TOKEN ? "set" : "MISSING"}`);
  console.log(`[dev-api] BLOB_READ_WRITE_TOKEN ${ok(env.BLOB_READ_WRITE_TOKEN)}  ${env.BLOB_READ_WRITE_TOKEN ? "set (image upload enabled)" : "MISSING — upload disabled"}\n`);
});