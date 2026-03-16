// api/submit-registration.js — for wallet buyers
const { Resend } = require("resend");

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
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "Invalid JSON" }); }
  }

  const { eventId, eventName, identifier, fields, organizerEmail } = body || {};
  if (!eventId || !identifier || !fields)
    return res.status(400).json({ error: "eventId, identifier, fields required" });

  const cleanId = identifier.toLowerCase().trim();
  const key     = `reg:0xcdD5f72:${eventId}:${cleanId}`;
  const data    = JSON.stringify({
    identifier,
    ticketType:  fields.ticketType || "Regular",
    checkedIn:   false,
    submittedAt: Date.now(),
    ...Object.fromEntries(Object.entries(fields).filter(([k]) => k !== "ticketType")),
  });

  await r(["SET",  key,                                       data    ]);
  await r(["SADD", `reglist:0xcdD5f72:${eventId}`, cleanId                      ]);
  console.log(`[submit-reg] stored eventId=${eventId} identifier=${identifier}`);

  // Notify organizer
  if (organizerEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(organizerEmail)
      && process.env.RESEND_API_KEY && process.env.FROM_EMAIL) {
    try {
      const resend   = new Resend(process.env.RESEND_API_KEY);
      const isWallet = identifier.startsWith("0x");
      const dispId   = isWallet ? `${identifier.slice(0,6)}…${identifier.slice(-4)}` : identifier;
      const ttName   = fields.ticketType || "Regular";

      await resend.emails.send({
        from: process.env.FROM_EMAIL, to: organizerEmail,
        subject: `🎟️ New ${isWallet?"NFT":"email"} ticket for "${eventName||`Event #${eventId}`}" — ${dispId}`,
        html: `<p style="font-family:sans-serif;font-size:15px;color:#111827;">
          <strong>${dispId}</strong> just got a <strong>${ttName}</strong> ticket for <strong>${eventName||`Event #${eventId}`}</strong>.<br/><br/>
          <span style="color:#6B7280;font-size:13px;">View all attendees: Dashboard → click the event → Guests tab.</span>
        </p>`,
      });
      console.log(`[submit-reg] Organizer notified at ${organizerEmail}`);
    } catch (e) {
      console.error("[submit-reg] organizer notify failed:", e?.message);
    }
  }

  return res.status(200).json({ ok: true });
};