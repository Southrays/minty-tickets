// scripts/dev-api-server.js
// Run this alongside `npm start` so /api/* calls work on localhost.
//
// Setup:
//   npm install --save-dev express dotenv
//
// Usage (in a second terminal while `npm start` is running):
//   node scripts/dev-api-server.js

require("dotenv").config({ path: ".env.local" });

const express = require("express");
const app     = express();

app.use(express.json());
app.all("/api/send-ticket", require("../api/send-ticket"));

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\n[dev-api] API server → http://localhost:${PORT}`);
  console.log(`[dev-api] RESEND_API_KEY : ${process.env.RESEND_API_KEY ? "✓ set" : "✗ MISSING — check .env.local"}`);
  console.log(`[dev-api] FROM_EMAIL     : ${process.env.FROM_EMAIL     ? "✓ " + process.env.FROM_EMAIL : "✗ MISSING — check .env.local"}\n`);
});