require("dotenv").config({ path: ".env.local" });

const express = require("express");
const app     = express();

// Raw body for image uploads — must be BEFORE json middleware
app.use((req, res, next) => {
  if (req.path === "/api/upload-image") {
    express.raw({ type: "*/*", limit: "10mb" })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});

app.all("/api/send-ticket",          require("../api/send-ticket"));
app.all("/api/ticket-count",         require("../api/ticket-count"));
app.all("/api/upload-image",         require("../api/upload-image"));
app.all("/api/submit-registration",  require("../api/submit-registration"));
app.all("/api/get-registrations",    require("../api/get-registrations"));
app.all("/api/mark-checkedin",       require("../api/mark-checkedin"));
app.all("/api/debug-regs",           require("../api/debug-regs"));

// Always return JSON errors — never HTML
app.use((req, res) => res.status(404).json({ error: `Not found: ${req.method} ${req.path}` }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: err?.message || "Server error" }); });

const PORT = 3001;
app.listen(PORT, () => {
  const e = process.env;
  const ok = v => v ? "✓" : "✗";
  console.log(`\n[dev-api] → http://localhost:${PORT}`);
  console.log(`[dev-api] RESEND_API_KEY        ${ok(e.RESEND_API_KEY)}  ${e.RESEND_API_KEY ? "set" : "MISSING"}`);
  console.log(`[dev-api] FROM_EMAIL            ${ok(e.FROM_EMAIL)}  ${e.FROM_EMAIL || "MISSING"}`);
  console.log(`[dev-api] KV_REST_API_URL       ${ok(e.KV_REST_API_URL)}  ${e.KV_REST_API_URL ? "set" : "MISSING"}`);
  console.log(`[dev-api] BLOB_READ_WRITE_TOKEN ${ok(e.BLOB_READ_WRITE_TOKEN)}  ${e.BLOB_READ_WRITE_TOKEN ? "set" : "MISSING"}\n`);
});