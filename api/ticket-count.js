// api/ticket-count.js — returns email ticket count for an event
// Dependencies: npm install @upstash/redis

const { Redis } = require("@upstash/redis");

function getRedis() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  return new Redis({
    url:   process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")    return res.status(405).json({ error: "Method not allowed" });

  const { eventId } = req.query;
  if (!eventId) return res.status(400).json({ error: "eventId is required." });

  try {
    const redis = getRedis();
    if (!redis) {
      console.warn("[redis] Not configured — returning 0");
      return res.status(200).json({ emailCount: 0 });
    }
    const count = await redis.get(`ticket:emailcount:${eventId}`);
    console.log(`[redis] emailcount for event ${eventId}:`, count);
    return res.status(200).json({ emailCount: parseInt(count || "0", 10) });
  } catch (err) {
    console.error("[redis] Read error:", err);
    return res.status(200).json({ emailCount: 0 });
  }
};