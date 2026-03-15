// api/mark-checkedin.js — marks a guest as checked-in in Redis
// Called after a successful on-chain organizerCheckIn
// POST { eventId, identifier }

const { Redis } = require("@upstash/redis");

function getRedis() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  return new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "Invalid JSON" }); }
  }

  const { eventId, identifier } = body || {};
  if (!eventId || !identifier) return res.status(400).json({ error: "eventId and identifier required" });

  const redis = getRedis();
  if (!redis) return res.status(200).json({ ok: true, note: "Redis not configured" });

  try {
    const key  = `reg:${eventId}:${identifier.toLowerCase().trim()}`;
    const existing = await redis.get(key);
    if (existing) {
      const data = typeof existing === "string" ? JSON.parse(existing) : existing;
      data.checkedIn = true;
      data.checkedInAt = Date.now();
      await redis.set(key, JSON.stringify(data));
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[mark-checkedin] error:", err);
    return res.status(500).json({ error: "Failed to update check-in status." });
  }
};