// api/send-ticket.js  —  Vercel serverless function
// Deps: npm install resend qrcode
//
// Required env vars (set in Vercel dashboard or .env.local):
//   RESEND_API_KEY   = re_xxxxxxxxxxxx
//   FROM_EMAIL       = tickets@yourdomain.com   (must be a verified Resend sender)

import { Resend } from "resend";
import QRCode from "qrcode";

export default async function handler(req, res) {
  // ── CORS (so localhost dev works too) ──────────────────────────────────────
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // ── Validate env ───────────────────────────────────────────────────────────
  if (!process.env.RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY");
    return res.status(500).json({ error: "Email service not configured." });
  }
  if (!process.env.FROM_EMAIL) {
    console.error("Missing FROM_EMAIL");
    return res.status(500).json({ error: "Sender email not configured." });
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  const { name, email, eventId, eventName, eventDate, eventLocation } = req.body ?? {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: "Valid email address is required." });
  if (!eventId || !eventName)
    return res.status(400).json({ error: "Event details are required." });

  // ── Build unique ticket reference ──────────────────────────────────────────
  // Format: MINTY-EMAIL|{eventId}|{issuedAt}|{ref6}
  // The scanner can read this QR and identify it as an email ticket.
  const issuedAt = Math.floor(Date.now() / 1000);
  const ref6 = Math.random().toString(36).slice(2, 8).toUpperCase();
  const qrPayload = `MINTY-EMAIL|${eventId}|${issuedAt}|${ref6}`;
  const ticketCode = `MT-${ref6}`;

  // ── Generate QR code as base64 PNG ─────────────────────────────────────────
  let qrDataUrl;
  try {
    qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 260,
      margin: 2,
      color: { dark: "#1F2937", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    });
  } catch (err) {
    console.error("QR generation failed:", err);
    return res.status(500).json({ error: "Failed to generate QR code." });
  }

  // Strip the data-url prefix to get raw base64 for embedding
  const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");

  // ── Build HTML email ───────────────────────────────────────────────────────
  const displayName = name?.trim() || "Attendee";
  const locationLine = eventLocation ? `<p style="margin:4px 0;color:#6B7280;font-size:14px;">📍 ${eventLocation}</p>` : "";

  const htmlEmail = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Your Ticket — ${eventName}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:#F3F4F6;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
        style="max-width:520px;background:#FFFFFF;border-radius:20px;
               overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

        <!-- Purple header -->
        <tr>
          <td style="background:linear-gradient(135deg,#7C3AED,#5B21B6);padding:32px 32px 28px;text-align:center;">
            <p style="margin:0 0 6px;font-size:28px;">🎫</p>
            <h1 style="margin:0;color:#FFFFFF;font-size:22px;font-weight:800;letter-spacing:-.3px;">
              You're In!
            </h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,.75);font-size:14px;">
              Here's your entry ticket for <strong style="color:#FFF;">${eventName}</strong>
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px 24px;">
            <p style="margin:0 0 4px;color:#111827;font-size:16px;font-weight:600;">
              Hi ${displayName} 👋
            </p>
            <p style="margin:0 0 24px;color:#6B7280;font-size:14px;line-height:1.6;">
              Your ticket is confirmed. Show the QR code below at the door — 
              the scanner will verify your entry.
            </p>

            <!-- Event details box -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
              style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;
                     margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 2px;color:#111827;font-size:16px;font-weight:700;">${eventName}</p>
                  ${eventDate ? `<p style="margin:4px 0;color:#6B7280;font-size:14px;">📅 ${eventDate}</p>` : ""}
                  ${locationLine}
                  <p style="margin:8px 0 0;color:#9CA3AF;font-size:12px;font-family:monospace;">
                    Ticket code: <strong style="color:#374151;">${ticketCode}</strong>
                  </p>
                </td>
              </tr>
            </table>

            <!-- QR code -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td align="center" style="padding-bottom:24px;">
                  <div style="display:inline-block;padding:14px;background:#FFFFFF;
                               border:2px solid #E5E7EB;border-radius:16px;">
                    <img src="cid:ticket-qr"
                         alt="Entry QR Code"
                         width="220" height="220"
                         style="display:block;border-radius:6px;"/>
                  </div>
                  <p style="margin:10px 0 0;color:#9CA3AF;font-size:12px;">
                    Scan this code at the venue entrance
                  </p>
                </td>
              </tr>
            </table>

            <!-- Notice -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
              style="background:#EDE9FE;border-radius:10px;margin-bottom:4px;">
              <tr>
                <td style="padding:12px 16px;">
                  <p style="margin:0;color:#5B21B6;font-size:12px;line-height:1.6;">
                    🔒 <strong>This ticket is non-transferable.</strong> 
                    It is valid for one person and will be marked as used upon entry.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F9FAFB;border-top:1px solid #E5E7EB;
                     padding:18px 32px;text-align:center;">
            <p style="margin:0;color:#9CA3AF;font-size:12px;line-height:1.6;">
              Powered by <strong style="color:#7C3AED;">Minty Tickets</strong> · 
              On-chain event ticketing on the 0G blockchain
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // ── Send via Resend ────────────────────────────────────────────────────────
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: `🎫 Your ticket for ${eventName}`,
      html: htmlEmail,
      attachments: [
        {
          filename: "ticket-qr.png",
          content: qrBase64,
          content_type: "image/png",
          content_id: "ticket-qr",   // matches cid:ticket-qr in the HTML
        },
      ],
    });

    return res.status(200).json({
      ok: true,
      message: "Ticket sent successfully.",
      ticketCode,
    });
  } catch (err) {
    console.error("Resend error:", err);
    const msg = err?.message || "Failed to send email.";
    return res.status(500).json({ error: msg });
  }
}