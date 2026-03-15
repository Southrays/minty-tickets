// api/send-ticket.js — Vercel serverless function (CommonJS)
// Dependencies: npm install resend @upstash/redis

const { Resend } = require("resend");
const { Redis }  = require("@upstash/redis");

// Redis is only available when env vars are set (always true on Vercel,
// true locally if you copied them from the Upstash dashboard into .env.local)
function getRedis() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  return new Redis({
    url:   process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  const apiKey    = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL;
  if (!apiKey)    return res.status(500).json({ error: "RESEND_API_KEY is not set." });
  if (!fromEmail) return res.status(500).json({ error: "FROM_EMAIL is not set." });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "Invalid JSON body." }); }
  }

  const { name, email, eventId, eventName, eventDate, eventLocation,
          organizerEmail, guestFields, ticketType } = body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: "A valid email address is required." });
  if (!eventId || !eventName)
    return res.status(400).json({ error: "Event ID and name are required." });

  // ── Deduplication ─────────────────────────────────────────────────────────
  const redis    = getRedis();
  const dedupKey = `ticket:used:${eventId}:${email.toLowerCase().trim()}`;

  if (redis) {
    const alreadyUsed = await redis.get(dedupKey);
    if (alreadyUsed) {
      return res.status(409).json({ error: "This email already has a ticket for this event." });
    }
  }

  const displayName = (name || "").trim() || "there";

  const detailRows = [
    eventDate     && { icon: "📅", label: "Date",     value: eventDate     },
    eventLocation && { icon: "📍", label: "Location", value: eventLocation },
  ].filter(Boolean);

  const rowsHtml = detailRows.map(({ icon, label, value }) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #F3F4F6;font-size:15px;vertical-align:middle;width:32px;">${icon}</td>
      <td style="padding:12px 8px 12px 0;border-bottom:1px solid #F3F4F6;font-size:11px;font-weight:700;
                 color:#9CA3AF;text-transform:uppercase;letter-spacing:.07em;vertical-align:middle;white-space:nowrap;">${label}</td>
      <td style="padding:12px 20px 12px 12px;border-bottom:1px solid #F3F4F6;font-size:14px;
                 font-weight:600;color:#111827;vertical-align:middle;">${value}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>You're going to ${eventName}!</title></head>
<body style="margin:0;padding:0;background:#EEF2FF;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#EEF2FF;padding:40px 16px 52px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <tr><td align="center" style="padding-bottom:22px;">
          <p style="margin:0;font-size:13px;font-weight:700;color:#7C3AED;letter-spacing:.1em;text-transform:uppercase;">🎫 Minty Tickets</p>
        </td></tr>
        <tr><td style="background:#FFFFFF;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(109,40,217,.14);">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background:linear-gradient(145deg,#7C3AED 0%,#4C1D95 100%);padding:44px 32px 40px;text-align:center;">
              <p style="margin:0 0 16px;font-size:48px;line-height:1;">🎉</p>
              <h1 style="margin:0 0 10px;color:#FFFFFF;font-size:28px;font-weight:800;letter-spacing:-.4px;">You're going!</h1>
              <p style="margin:0;color:rgba(255,255,255,.8);font-size:15px;line-height:1.6;">
                Your spot at <strong style="color:#FFFFFF;">${eventName}</strong><br/>has been confirmed.
              </p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:#EEF2FF;width:20px;border-radius:0 0 50% 0;height:18px;"></td>
              <td style="border-top:2px dashed #E5E7EB;"></td>
              <td style="background:#EEF2FF;width:20px;border-radius:0 0 0 50%;height:18px;"></td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:30px 32px 0;">
              <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#111827;">Hi ${displayName} 👋</p>
              <p style="margin:0;font-size:14px;color:#6B7280;line-height:1.75;">Great news — your ticket is all set. We can't wait to see you there!</p>
            </td></tr>
          </table>
          ${detailRows.length > 0 ? `
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:22px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;">
                ${rowsHtml}
              </table>
            </td></tr>
          </table>` : ""}
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:22px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:14px;">
                <tr><td style="padding:18px 20px;">
                  <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.07em;">✅ You're all set</p>
                  <p style="margin:0;font-size:13px;color:#15803D;line-height:1.7;">Simply show this email at the entrance and the organiser will check you in.</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:20px 32px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:14px;">
                <tr><td style="padding:16px 20px;">
                  <p style="margin:0;font-size:12px;color:#9A3412;line-height:1.7;">
                    🔒 <strong>This ticket is personal and non-transferable.</strong> Valid for one entry only.
                  </p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:26px 0 0;text-align:center;">
          <p style="margin:0 0 4px;font-size:12px;color:#9CA3AF;">Sent by <strong style="color:#7C3AED;">Minty Tickets</strong></p>
          <p style="margin:0;font-size:11px;color:#C4B5FD;">On-chain event ticketing · 0G blockchain</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  // ── Send email ─────────────────────────────────────────────────────────────
  const resend = new Resend(apiKey);
  try {
    await resend.emails.send({
      from: fromEmail, to: email,
      subject: `🎉 You're going to ${eventName}!`,
      html,
    });
  } catch (err) {
    console.error("Resend error:", err);
    return res.status(500).json({ error: err?.message || "Failed to send email." });
  }

  // ── Persist to Redis AFTER successful send ────────────────────────────────
  if (redis) {
    try {
      const regKey  = `reg:${eventId}:${email.toLowerCase().trim()}`;
      const regData = JSON.stringify({
        identifier:  email.toLowerCase().trim(),
        ticketType:  ticketType || body?.ticketType || "Regular",
        name:        (name||"").trim() || undefined,
        ...(guestFields || {}),
        checkedIn:   false,
        submittedAt: Date.now(),
      });
      await Promise.all([
        redis.set(dedupKey, "1"),
        redis.incr(`ticket:emailcount:${eventId}`),
        redis.set(regKey, regData),
        redis.sadd(`reglist:${eventId}`, email.toLowerCase().trim()),
      ]);
      console.log(`[redis] Stored ticket for ${email}, event ${eventId}`);
    } catch (err) {
      console.error("[redis] Write error (non-fatal):", err);
    }
  } else {
    console.warn("[redis] Not configured — dedup and count not persisted");
  }

  // ── Notify organizer (if they provided a notification email) ──────────────
  if (organizerEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(organizerEmail)) {
    try {
      // Build a summary of guest fields
      const fieldRows = guestFields && Object.keys(guestFields).length > 0
        ? Object.entries(guestFields)
            .filter(([k]) => k !== "ticketType")
            .map(([k,v]) => `<tr>
              <td style="padding:7px 12px;font-size:12px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap;border-bottom:1px solid #F3F4F6;">${k}</td>
              <td style="padding:7px 12px;font-size:13px;color:#111827;border-bottom:1px solid #F3F4F6;">${v}</td>
            </tr>`).join("")
        : "";

      const notifHtml = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F8F7FF;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:white;border-radius:18px;overflow:hidden;box-shadow:0 4px 24px rgba(109,40,217,.1);">
  <tr><td style="background:linear-gradient(135deg,#7C3AED,#5B21B6);padding:24px 28px;">
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:rgba(255,255,255,.65);text-transform:uppercase;letter-spacing:.1em;">Minty Tickets · New Attendee</p>
    <p style="margin:0;font-size:20px;font-weight:800;color:white;">${eventName}</p>
  </td></tr>
  <tr><td style="padding:24px 28px;">
    <p style="margin:0 0 16px;font-size:15px;color:#374151;">
      <strong style="color:#111827;">${email}</strong> just got a ticket for your event.
    </p>
    <table style="width:100%;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;margin-bottom:16px;">
      <tr>
        <td style="padding:7px 12px;font-size:12px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #F3F4F6;">Ticket Type</td>
        <td style="padding:7px 12px;font-size:13px;color:#111827;border-bottom:1px solid #F3F4F6;">${ticketType || "Regular"}</td>
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
        from:    fromEmail,
        to:      organizerEmail,
        subject: `🎟️ New attendee for ${eventName} — ${email}`,
        html:    notifHtml,
      });
      console.log(`[organizer] Notification sent to ${organizerEmail}`);
    } catch (notifErr) {
      // Non-fatal — guest already got their ticket
      console.error("[organizer] Notification failed:", notifErr?.message);
    }
  }

  return res.status(200).json({ ok: true });
};