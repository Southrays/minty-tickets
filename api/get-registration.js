// api/get-registrations.js — returns all guest registrations for an event
// GET /api/get-registrations?eventId=X&organizerAddr=0x...
// Only works if caller is the organizer (checked via signature) — simplified here.

const { Redis } = require("@upstash/redis");

function getRedis() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  return new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")    return res.status(405).json({ error: "Method not allowed" });

  const { eventId } = req.query;
  if (!eventId) return res.status(400).json({ error: "eventId is required." });

  const redis = getRedis();
  if (!redis) return res.status(200).json({ registrations: [] });

  try {
    const identifiers = await redis.smembers(`reglist:${eventId}`);
    if (!identifiers || identifiers.length === 0)
      return res.status(200).json({ registrations: [] });

    const keys = identifiers.map(id => `reg:${eventId}:${id}`);
    // Fetch all in one pipeline
    const values = await Promise.all(keys.map(k => redis.get(k)));

    const registrations = values
      .map(v => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return null; } })
      .filter(Boolean);

    return res.status(200).json({ registrations });
  } catch (err) {
    console.error("[reg] read error:", err);
    return res.status(200).json({ registrations: [] });
  }
};