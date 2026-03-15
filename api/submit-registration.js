// api/submit-registration.js — stores a registration for wallet or email buyers
// Uses plain fetch Upstash REST API

const { Resend } = require("resend");

async function redisPipeline(commands) {
  const url   = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/pipeline`, {
      method:  "POST",
      headers: { Authorization:`Bearer ${token}`, "Content-Type":"application/json" },
      body:    JSON.stringify(commands),
    });
    return await res.json();
  } catch (e) {
    console.error("[redis pipeline]", e?.message);
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
    return res.status(400).json({ error: "eventId, identifier and fields are required." });

  // ── Store in Redis ──────────────────────────────────────────────────────────
  const key  = `reg:${eventId}:${identifier.toLowerCase().trim()}`;
  const data = JSON.stringify({
    identifier,
    ticketType:  fields.ticketType || "Regular",
    checkedIn:   false,
    submittedAt: Date.now(),
    // include any extra guest fields
    ...Object.fromEntries(
      Object.entries(fields).filter(([k]) => k !== "ticketType")
    ),
  });

  const result = await redisPipeline([
    ["SET",  key,                                              data                        ],
    ["SADD", `reglist:${eventId}`, identifier.toLowerCase().trim()                         ],
  ]);
  console.log(`[submit-reg] eventId=${eventId} identifier=${identifier} result=`, result);

  // ── Notify organizer if they provided a notification email ─────────────────
  if (organizerEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(organizerEmail)
      && process.env.RESEND_API_KEY && process.env.FROM_EMAIL) {
    try {
      const resend   = new Resend(process.env.RESEND_API_KEY);
      const isWallet = identifier.startsWith("0x");
      const dispId   = isWallet
        ? `${identifier.slice(0,6)}…${identifier.slice(-4)}`
        : identifier;

      const fieldEntries = Object.entries(fields)
        .filter(([k, v]) => k !== "ticketType" && v);
      const fieldRows = fieldEntries.map(([k, v]) =>
        `<tr>
          <td style="padding:7px 12px;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;border-bottom:1px solid #F3F4F6;">${k}</td>
          <td style="padding:7px 12px;font-size:13px;color:#111827;border-bottom:1px solid #F3F4F6;">${v}</td>
        </tr>`
      ).join("");

      const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F8F7FF;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:white;border-radius:18px;overflow:hidden;box-shadow:0 4px 24px rgba(109,40,217,.1);">
  <tr><td style="background:linear-gradient(135deg,#7C3AED,#5B21B6);padding:24px 28px;">
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:rgba(255,255,255,.65);text-transform:uppercase;letter-spacing:.1em;">Minty Tickets · New Attendee</p>
    <p style="margin:0;font-size:20px;font-weight:800;color:white;">${eventName || `Event #${eventId}`}</p>
  </td></tr>
  <tr><td style="padding:24px 28px;">
    <p style="margin:0 0 16px;font-size:15px;color:#374151;">
      <strong style="color:#111827;">${dispId}</strong> just got ${isWallet ? "an NFT ticket" : "a ticket"} for your event.
    </p>
    <table style="width:100%;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;margin-bottom:16px;">
      <tr>
        <td style="padding:7px 12px;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;border-bottom:1px solid ${fieldRows ? "#F3F4F6" : "none"};">Ticket Type</td>
        <td style="padding:7px 12px;font-size:13px;color:#111827;border-bottom:1px solid ${fieldRows ? "#F3F4F6" : "none"};">${fields.ticketType || "Regular"}</td>
      </tr>
      ${fieldRows}
    </table>
    <p style="margin:0;font-size:12px;color:#9CA3AF;">View all attendees: Dashboard → click event → Guests tab.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

      await resend.emails.send({
        from: process.env.FROM_EMAIL, to: organizerEmail,
        subject: `🎟️ New attendee for "${eventName || `Event #${eventId}`}" — ${dispId}`,
        html,
      });
    } catch (err) {
      console.error("[organizer notif] failed:", err?.message);
    }
  }

  return res.status(200).json({ ok: true });
};