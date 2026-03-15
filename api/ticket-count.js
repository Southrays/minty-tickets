// api/ticket-count.js — returns email ticket count for an event
// Uses plain fetch Upstash REST API

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")    return res.status(405).json({ error: "Method not allowed" });

  const { eventId } = req.query;
  if (!eventId) return res.status(400).json({ error: "eventId is required." });

  const url   = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return res.status(200).json({ emailCount: 0 });

  try {
    const r    = await fetch(url, {
      method:  "POST",
      headers: { Authorization:`Bearer ${token}`, "Content-Type":"application/json" },
      body:    JSON.stringify(["GET", `ticket:emailcount:${eventId}`]),
    });
    const json = await r.json();
    const count = parseInt(json.result || "0", 10);
    return res.status(200).json({ emailCount: isNaN(count) ? 0 : count });
  } catch (err) {
    console.error("[ticket-count]", err);
    return res.status(200).json({ emailCount: 0 });
  }
};