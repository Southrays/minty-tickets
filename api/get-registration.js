// api/get-registrations.js
// Uses individual Redis calls (same pattern as ticket-count which is confirmed working)

async function r(command) {
  const url   = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    const res  = await fetch(url.replace(/\/$/, ""), {
      method:  "POST",
      headers: { Authorization:`Bearer ${token}`, "Content-Type":"application/json" },
      body:    JSON.stringify(command),
    });
    const json = await res.json();
    if (json.error) console.error(`[redis] ${command[0]} error:`, json.error);
    return json.result ?? null;
  } catch (e) {
    console.error("[redis] error:", e?.message);
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
  if (!eventId) return res.status(400).json({ error: "eventId required" });

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN)
    return res.status(200).json({ registrations: [], debug: "no redis config" });

  try {
    // Step 1: get all registered identifiers for this event
    const identifiers = await r(["SMEMBERS", `reglist:${eventId}`]);
    console.log(`[get-regs] eventId=${eventId} identifiers=`, JSON.stringify(identifiers));

    if (!identifiers || !Array.isArray(identifiers) || identifiers.length === 0)
      return res.status(200).json({ registrations: [] });

    // Step 2: fetch each registration record individually
    const registrations = [];
    for (const id of identifiers) {
      const raw = await r(["GET", `reg:${eventId}:${id}`]);
      console.log(`[get-regs] GET reg:${eventId}:${id} →`, raw ? raw.slice(0, 80) : "null");
      if (!raw) continue;
      try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (parsed) registrations.push(parsed);
      } catch (e) {
        console.error("[get-regs] parse error for", id, e?.message);
      }
    }

    console.log(`[get-regs] returning ${registrations.length} registrations`);
    return res.status(200).json({ registrations });
  } catch (err) {
    console.error("[get-regs] error:", err);
    return res.status(200).json({ registrations: [] });
  }
};