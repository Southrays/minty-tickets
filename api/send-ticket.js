// api/send-ticket.js
const { Resend } = require("resend");

// Single Redis command via plain fetch — same approach as ticket-count (confirmed working)
async function r(command) {
  const url   = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) { console.warn("[redis] env vars missing"); return null; }
  try {
    const res  = await fetch(url.replace(/\/$/, ""), {
      method:  "POST",
      headers: { Authorization:`Bearer ${token}`, "Content-Type":"application/json" },
      body:    JSON.stringify(command),
    });
    const text = await res.text();
    console.log(`[redis] ${command[0]} ${command[1]} → status=${res.status} body=${text.slice(0,120)}`);
    const json = JSON.parse(text);
    if (json.error) console.error("[redis] command error:", json.error);
    return json.result ?? null;
  } catch (e) {
    console.error("[redis] fetch error:", e?.message);
    return null;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  const apiKey    = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL;
  if (!apiKey)    return res.status(500).json({ error: "RESEND_API_KEY not set" });
  if (!fromEmail) return res.status(500).json({ error: "FROM_EMAIL not set" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "Invalid JSON" }); }
  }

  const { name, email, eventId, eventName, eventDate, eventLocation,
          organizerEmail, guestFields, ticketType } = body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: "Valid email required." });
  if (!eventId || !eventName)
    return res.status(400).json({ error: "eventId and eventName required." });

  // ── Dedup check ────────────────────────────────────────────────────────────
  const cleanEmail  = email.toLowerCase().trim();
  const dedupKey    = `ticket:used:0xcdD5f72:${eventId}:${cleanEmail}`;
  const alreadyUsed = await r(["GET", dedupKey]);
  if (alreadyUsed) {
    return res.status(409).json({ error: "This email already has a ticket for this event." });
  }

  // ── Build guest email ──────────────────────────────────────────────────────
  const displayName = (name||"").trim() || "there";
  const detailRows = [
    eventDate     && { icon:"📅", label:"Date",     value:eventDate     },
    eventLocation && { icon:"📍", label:"Location", value:eventLocation },
  ].filter(Boolean);

  const rowsHtml = detailRows.map(({icon,label,value}) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #F3F4F6;font-size:15px;width:32px;">${icon}</td>
      <td style="padding:12px 8px;border-bottom:1px solid #F3F4F6;font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.07em;white-space:nowrap;">${label}</td>
      <td style="padding:12px 20px 12px 12px;border-bottom:1px solid #F3F4F6;font-size:14px;font-weight:600;color:#111827;">${value}</td>
    </tr>`).join("");

  const guestHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#EEF2FF;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#EEF2FF;padding:40px 16px 52px;">
<tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
<tr><td align="center" style="padding-bottom:22px;"><p style="margin:0;font-size:13px;font-weight:700;color:#7C3AED;letter-spacing:.1em;text-transform:uppercase;">🎫 Minty Tickets</p></td></tr>
<tr><td style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(109,40,217,.14);">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="background:linear-gradient(145deg,#7C3AED,#4C1D95);padding:44px 32px 40px;text-align:center;">
      <p style="margin:0 0 16px;font-size:48px;line-height:1;">🎉</p>
      <h1 style="margin:0 0 10px;color:#fff;font-size:28px;font-weight:800;">You're going!</h1>
      <p style="margin:0;color:rgba(255,255,255,.8);font-size:15px;line-height:1.6;">Your spot at <strong style="color:#fff;">${eventName}</strong> has been confirmed.</p>
    </td></tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:30px 32px 0;">
    <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#111827;">Hi ${displayName} 👋</p>
    <p style="margin:0;font-size:14px;color:#6B7280;line-height:1.75;">Your ticket is all set — we can't wait to see you there!</p>
  </td></tr></table>
  ${detailRows.length ? `<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:22px 32px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;">${rowsHtml}</table>
  </td></tr></table>` : ""}
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:22px 32px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:14px;">
      <tr><td style="padding:18px 20px;"><p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.07em;">✅ You're all set</p>
      <p style="margin:0;font-size:13px;color:#15803D;line-height:1.7;">Show this email at the entrance and the organiser will check you in.</p></td></tr>
    </table>
  </td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:20px 32px 36px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:14px;">
      <tr><td style="padding:16px 20px;"><p style="margin:0;font-size:12px;color:#9A3412;line-height:1.7;">🔒 <strong>Personal and non-transferable.</strong> Valid for one entry only.</p></td></tr>
    </table>
  </td></tr></table>
</td></tr>
<tr><td style="padding:26px 0 0;text-align:center;">
  <p style="margin:0 0 4px;font-size:12px;color:#9CA3AF;">Sent by <strong style="color:#7C3AED;">Minty Tickets</strong></p>
</td></tr>
</table></td></tr></table></body></html>`;

  // ── Send guest ticket email ────────────────────────────────────────────────
  const resend = new Resend(apiKey);
  try {
    await resend.emails.send({
      from: fromEmail, to: email,
      subject: `🎉 You're going to ${eventName}!`,
      html: guestHtml,
    });
    console.log(`[resend] Guest ticket sent to ${email} for event ${eventId}`);
  } catch (err) {
    console.error("[resend] error:", err);
    return res.status(500).json({ error: err?.message || "Failed to send email." });
  }

  // ── Persist to Redis — individual calls, each awaited separately ───────────
  // Using the same single-command approach as ticket-count.js (confirmed working)
  const regData = JSON.stringify({
    identifier:  cleanEmail,
    ticketType:  ticketType || "Regular",
    name:        (name||"").trim() || null,
    ...(guestFields && typeof guestFields === "object" ? guestFields : {}),
    checkedIn:   false,
    submittedAt: Date.now(),
  });

  const regKey = `reg:0xcdD5f72:${eventId}:${cleanEmail}`;

  // 1. Mark as used (dedup)
  await r(["SET", dedupKey, "1"]);
  // 2. Increment email ticket counter
  await r(["INCR", `ticket:emailcount:0xcdD5f72:${eventId}`]);
  // 3. Store registration record
  await r(["SET", regKey, regData]);
  // 4. Add email to the event's registration set
  await r(["SADD", `reglist:0xcdD5f72:${eventId}`, cleanEmail]);

  console.log(`[send-ticket] All Redis ops complete for ${cleanEmail} event=${eventId}`);

  // ── Notify organizer ──────────────────────────────────────────────────────
  if (organizerEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(organizerEmail)) {
    try {
      const fieldEntries = guestFields && typeof guestFields === "object"
        ? Object.entries(guestFields).filter(([k,v]) => k !== "ticketType" && v)
        : [];
      const fieldRows = fieldEntries.map(([k,v]) =>
        `<tr><td style="padding:6px 12px;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;border-bottom:1px solid #F3F4F6;">${k}</td>
         <td style="padding:6px 12px;font-size:13px;color:#111827;border-bottom:1px solid #F3F4F6;">${v}</td></tr>`
      ).join("");

      const orgHtml = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F8F7FF;font-family:'Helvetica Neue',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:white;border-radius:18px;overflow:hidden;box-shadow:0 4px 24px rgba(109,40,217,.1);">
  <tr><td style="background:linear-gradient(135deg,#7C3AED,#5B21B6);padding:24px 28px;">
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:rgba(255,255,255,.65);text-transform:uppercase;letter-spacing:.1em;">New Attendee · ${eventName}</p>
    <p style="margin:0;font-size:20px;font-weight:800;color:white;">${email}</p>
  </td></tr>
  <tr><td style="padding:24px 28px;">
    <table style="width:100%;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;margin-bottom:16px;">
      <tr><td style="padding:7px 12px;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;border-bottom:1px solid ${fieldRows?"#F3F4F6":"none"};">Ticket Type</td>
          <td style="padding:7px 12px;font-size:13px;color:#111827;border-bottom:1px solid ${fieldRows?"#F3F4F6":"none"};">${ticketType||"Regular"}</td></tr>
      ${fieldRows}
    </table>
    <p style="margin:0;font-size:12px;color:#9CA3AF;">Dashboard → click event → Guests tab to see all attendees.</p>
  </td></tr>
</table></td></tr></table></body></html>`;

      await resend.emails.send({
        from: fromEmail, to: organizerEmail,
        subject: `🎟️ New attendee for "${eventName}" — ${email}`,
        html: orgHtml,
      });
      console.log(`[send-ticket] Organizer notification sent to ${organizerEmail}`);
    } catch (orgErr) {
      console.error("[send-ticket] Organizer notification failed:", orgErr?.message);
    }
  } else {
    console.log(`[send-ticket] No organizer notification — organizerEmail="${organizerEmail}"`);
  }

  return res.status(200).json({ ok: true });
};