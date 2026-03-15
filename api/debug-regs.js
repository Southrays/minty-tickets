// api/debug-regs.js — temporary diagnostic endpoint
// GET /api/debug-regs?eventId=X
// Shows exactly what keys exist in Redis for a given event

async function r(command) {
  const url   = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return { error: "no redis config" };
  const res  = await fetch(url.replace(/\/$/, ""), {
    method:  "POST",
    headers: { Authorization:`Bearer ${token}`, "Content-Type":"application/json" },
    body:    JSON.stringify(command),
  });
  return await res.json();
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).end();

  const { eventId } = req.query;
  if (!eventId) return res.status(400).json({ error: "eventId required" });

  const reglist    = await r(["SMEMBERS", `reglist:${eventId}`]);
  const emailCount = await r(["GET",      `ticket:emailcount:${eventId}`]);
  const dedupKeys  = (reglist?.result || []).map(id => `ticket:used:${eventId}:${id}`);

  const regRecords = [];
  for (const id of (reglist?.result || [])) {
    const raw = await r(["GET", `reg:${eventId}:${id}`]);
    regRecords.push({ id, raw: raw?.result });
  }

  return res.status(200).json({
    eventId,
    reglistKey: `reglist:${eventId}`,
    reglistResult: reglist,
    emailCount: emailCount,
    regRecords,
    dedupKeys,
  });
};