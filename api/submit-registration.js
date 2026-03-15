// api/submit-registration.js — stores guest registration data for an event
// Also sends organizer a notification email if they provided one.
// Dependencies: npm install @upstash/redis resend

const { Redis }  = require("@upstash/redis");
const { Resend } = require("resend");

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

  const { eventId, eventName, identifier, fields, organizerEmail } = body || {};
  if (!eventId || !identifier || !fields)
    return res.status(400).json({ error: "eventId, identifier and fields are required." });

  // ── Store in Redis ──────────────────────────────────────────────────────────
  const redis = getRedis();
  if (redis) {
    try {
      const key  = `reg:${eventId}:${identifier.toLowerCase().trim()}`;
      const data = {
        ...fields,
        identifier,
        ticketType:  fields.ticketType || "Regular",
        checkedIn:   false,
        submittedAt: Date.now(),
      };
      await Promise.all([
        redis.set(key, JSON.stringify(data)),
        redis.sadd(`reglist:${eventId}`, identifier.toLowerCase().trim()),
      ]);
    } catch (err) {
      console.error("[reg] write error:", err);
    }
  }

  // ── Notify organizer (wallet buyer) ────────────────────────────────────────
  if (organizerEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(organizerEmail)
      && process.env.RESEND_API_KEY && process.env.FROM_EMAIL) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const isWallet = identifier.startsWith("0x");
      const displayId = isWallet
        ? `${identifier.slice(0,6)}…${identifier.slice(-4)}`
        : identifier;

      const fieldRows = Object.entries(fields)
        .filter(([k]) => k !== "ticketType")
        .map(([k,v]) => v ? `<tr>
          <td style="padding:7px 12px;font-size:12px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #F3F4F6;">${k}</td>
          <td style="padding:7px 12px;font-size:13px;color:#111827;border-bottom:1px solid #F3F4F6;">${v}</td>
        </tr>` : "").join("");

      const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F8F7FF;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:white;border-radius:18px;overflow:hidden;box-shadow:0 4px 24px rgba(109,40,217,.1);">
  <tr><td style="background:linear-gradient(135deg,#7C3AED,#5B21B6);padding:24px 28px;">
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:rgba(255,255,255,.65);text-transform:uppercase;letter-spacing:.1em;">Minty Tickets · New Attendee</p>
    <p style="margin:0;font-size:20px;font-weight:800;color:white;">${eventName || `Event #${eventId}`}</p>
  </td></tr>
  <tr><td style="padding:24px 28px;">
    <p style="margin:0 0 16px;font-size:15px;color:#374151;">
      <strong style="color:#111827;">${displayId}</strong> just got ${isWallet ? "an NFT ticket" : "a ticket"} for your event.
    </p>
    <table style="width:100%;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;margin-bottom:16px;">
      <tr>
        <td style="padding:7px 12px;font-size:12px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #F3F4F6;">Ticket Type</td>
        <td style="padding:7px 12px;font-size:13px;color:#111827;border-bottom:1px solid #F3F4F6;">${fields.ticketType || "Regular"}</td>
      </tr>
      ${fieldRows}
    </table>
    <p style="margin:0;font-size:12px;color:#9CA3AF;">Check your Dashboard → event → Guests tab to see all attendees.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

      await resend.emails.send({
        from:    process.env.FROM_EMAIL,
        to:      organizerEmail,
        subject: `🎟️ New attendee for ${eventName || `Event #${eventId}`} — ${displayId}`,
        html,
      });
    } catch (err) {
      console.error("[organizer notif] failed:", err?.message);
    }
  }

  return res.status(200).json({ ok: true });
};