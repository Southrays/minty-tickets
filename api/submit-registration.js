// api/submit-registration.js — stores guest registration data for an event
// Uses Upstash Redis. Key: reg:{eventId}:{identifier}

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

  const { eventId, identifier, fields } = body || {};
  if (!eventId || !identifier || !fields)
    return res.status(400).json({ error: "eventId, identifier and fields are required." });

  const redis = getRedis();
  if (!redis) return res.status(200).json({ ok: true, note: "Redis not configured — data not persisted" });

  try {
    const key  = `reg:${eventId}:${identifier.toLowerCase().trim()}`;
    const data = { ...fields, identifier, submittedAt: Date.now() };
    await Promise.all([
      redis.set(key, JSON.stringify(data)),
      redis.sadd(`reglist:${eventId}`, identifier.toLowerCase().trim()),
    ]);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[reg] write error:", err);
    return res.status(500).json({ error: "Failed to store registration." });
  }
};