// api/mark-checkedin.js — marks a guest as checked-in in Redis
// Uses plain fetch Upstash REST API

async function redis(command) {
  const url   = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    const res  = await fetch(url, {
      method:  "POST",
      headers: { Authorization:`Bearer ${token}`, "Content-Type":"application/json" },
      body:    JSON.stringify(command),
    });
    const json = await res.json();
    return json.result ?? null;
  } catch (e) { return null; }
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

  try {
    const key      = `reg:0xcdD5f72:${eventId}:${identifier.toLowerCase().trim()}`;
    const existing = await redis(["GET", key]);
    if (existing) {
      let data;
      try { data = typeof existing === "string" ? JSON.parse(existing) : existing; }
      catch { data = {}; }
      data.checkedIn   = true;
      data.checkedInAt = Date.now();
      await redis(["SET", key, JSON.stringify(data)]);
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[mark-checkedin]", err);
    return res.status(500).json({ error: "Failed to update." });
  }
};