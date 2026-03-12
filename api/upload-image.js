// api/upload-image.js — Vercel serverless function (CommonJS)
// Dependencies: npm install @vercel/blob

const { put } = require("@vercel/blob");

// Required for Vercel Pages API routes — disables body parsing
// so we receive raw file bytes (not a mangled string)
module.exports.config = {
  api: { bodyParser: false },
};

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  if (!process.env.BLOB_READ_WRITE_TOKEN)
    return res.status(500).json({ error: "BLOB_READ_WRITE_TOKEN is not set." });

  try {
    const filename    = req.query.filename    || `event-${Date.now()}.jpg`;
    const contentType = req.query.contentType || "image/jpeg";

    // On Vercel: req is a raw readable stream
    // On local Express with express.raw(): file bytes land in req.body as a Buffer
    const source = (req.body && Buffer.isBuffer(req.body) && req.body.length > 0)
      ? req.body
      : req;

    const blob = await put(filename, source, {
      access:      "public",
      contentType,
      token:       process.env.BLOB_READ_WRITE_TOKEN,
    });

    console.log("[blob] Uploaded:", blob.url);
    return res.status(200).json({ url: blob.url });
  } catch (err) {
    console.error("[blob] Upload error:", err);
    return res.status(500).json({ error: err?.message || "Upload failed." });
  }
};