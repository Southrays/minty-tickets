// api/get-registrations.js — returns all guest registrations for an event
// Uses plain fetch Upstash REST API — no npm package

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
  } catch (e) {
    console.error("[redis]", e?.message);
    return null;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")    return res.status(405).json({ error: "Method not allowed" });

  const { eventId } = req.query;
  if (!eventId) return res.status(400).json({ error: "eventId is required." });

  const hasRedis = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  if (!hasRedis) return res.status(200).json({ registrations: [] });

  try {
    // Get list of all registered identifiers for this event
    const identifiers = await redis(["SMEMBERS", `reglist:${eventId}`]);
    console.log(`[regs] eventId=${eventId} identifiers=`, identifiers);

    if (!identifiers || !Array.isArray(identifiers) || identifiers.length === 0)
      return res.status(200).json({ registrations: [] });

    // Fetch each registration record
    const url   = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    // Use pipeline to fetch all in one round trip
    const pipeline = identifiers.map(id => ["GET", `reg:${eventId}:${id}`]);
    const pRes = await fetch(`${url}/pipeline`, {
      method:  "POST",
      headers: { Authorization:`Bearer ${token}`, "Content-Type":"application/json" },
      body:    JSON.stringify(pipeline),
    });
    const pData = await pRes.json();
    console.log(`[regs] pipeline results count=`, pData?.length);

    const registrations = (Array.isArray(pData) ? pData : [])
      .map(item => {
        const v = item?.result;
        if (!v) return null;
        try { return typeof v === "string" ? JSON.parse(v) : v; }
        catch { return null; }
      })
      .filter(Boolean);

    return res.status(200).json({ registrations });
  } catch (err) {
    console.error("[regs] error:", err);
    return res.status(200).json({ registrations: [] });
  }
};