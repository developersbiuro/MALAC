// Branded HTML email templates for every transactional MALAC email.
//
// Email-safe engineering rules followed here:
// - table-based layout, ALL CSS inline (no <style> blocks, no classes)
// - max width 600px, solid colours only (no gradients — Outlook/Gmail clip)
// - NO external images: the wordmark is styled text, so image blocking can
//   never break the design
// - web-safe font stacks only: Georgia (wordmark/headings), Arial/Helvetica
//   (body), 'Courier New' monospace (verification code)
// Every builder returns { html, text } — senders always send multipart so
// plain-text clients keep working exactly as before.

const CREAM = "#faf6ee";
const CARD_BORDER = "#e7ddcb";
const INK = "#0f172a";
const AMBER = "#f59e0b";
const BURNT = "#c2410c";
const BODY_TEXT = "#334155";
const MUTED = "#64748b";

const FONT_HEADING = "Georgia, 'Times New Roman', serif";
const FONT_BODY = "Arial, Helvetica, sans-serif";
const FONT_MONO = "'Courier New', Courier, monospace";

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Shared branded shell: cream page, white card, ink-navy header band with
// the MALAC wordmark, body slot, and the standard footer inside the card.
function layout(bodyRows) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MALAC</title>
</head>
<body style="margin:0; padding:0; background-color:${CREAM};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CREAM};">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background-color:#ffffff; border:1px solid ${CARD_BORDER};">
        <tr><td style="height:4px; line-height:4px; font-size:4px; background-color:${BURNT};">&nbsp;</td></tr>
        <tr>
          <td align="center" style="background-color:${INK}; padding:26px 28px 22px 28px;">
            <div style="font-family:${FONT_HEADING}; font-size:32px; letter-spacing:10px; color:${CREAM}; font-weight:bold;">MALAC</div>
            <div style="font-family:${FONT_BODY}; font-size:11px; letter-spacing:3px; color:${AMBER}; padding-top:8px;">M.A LUXURY APPAREL COLLECTION</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px; font-family:${FONT_BODY}; font-size:15px; line-height:1.55; color:${BODY_TEXT};">
${bodyRows}
          </td>
        </tr>
        <tr>
          <td align="center" style="border-top:1px solid ${CARD_BORDER}; padding:18px 28px 22px 28px; font-family:${FONT_BODY}; font-size:12px; line-height:1.6; color:${MUTED};">
            MALAC &mdash; M.A Luxury Apparel Collection<br>
            Online shopping across Pakistan &middot; WhatsApp +92 323 6016684<br>
            If you didn&rsquo;t request this email, you can safely ignore it.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function headingRow(text) {
  return `            <div style="font-family:${FONT_HEADING}; font-size:22px; color:${INK}; padding-bottom:10px;">${esc(text)}</div>`;
}

function paragraphRow(html, extraStyle = "") {
  return `            <p style="margin:0 0 14px 0; ${extraStyle}">${html}</p>`;
}

// OTP verification email. The code block is the centrepiece: big monospace
// digits on cream with a dashed burnt-orange border and user-select:all, so
// a tap/long-press selects the whole code for copying in one go. The code is
// repeated once more in a plain sentence below for screen readers and for
// clients that mangle the styled block.
export function otpEmail(code, ttlMinutes = 10) {
  const safeCode = esc(code);
  const body = [
    headingRow("Your verification code"),
    paragraphRow("Use this code to continue on MALAC:"),
    `            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 16px 0;">
              <tr>
                <td align="center" style="background-color:${CREAM}; border:2px dashed ${BURNT}; padding:20px 12px;">
                  <span style="font-family:${FONT_MONO}; font-size:36px; font-weight:bold; letter-spacing:10px; color:${INK}; user-select:all; -webkit-user-select:all; -moz-user-select:all;">${safeCode}</span>
                </td>
              </tr>
            </table>`,
    paragraphRow(`Code: <span style="font-family:${FONT_MONO}; font-weight:bold; color:${INK}; user-select:all; -webkit-user-select:all;">${safeCode}</span>`, "font-size:13px; color:" + MUTED + ";"),
    paragraphRow(`This code expires in ${ttlMinutes} minutes.`),
    paragraphRow(`<strong style="color:${INK};">Never share this code</strong> &mdash; MALAC will never ask you for it.`),
  ].join("\n");
  const text =
    `Your MALAC verification code is ${code}. It expires in ${ttlMinutes} minutes. Do not share it.\n` +
    `Never share this code — MALAC will never ask you for it.`;
  return { html: layout(body), text };
}

// Generic action-link email (password reset / staff setup links): an
// ink-navy pill button plus the raw URL printed below it as a copyable
// fallback. Pass `text` to keep an existing plain-text wording verbatim;
// otherwise a plain-text version is composed from the same parts.
export function actionLinkEmail({ heading, intro, buttonLabel, url, expiryNote, text }) {
  const safeUrl = esc(url);
  const body = [
    headingRow(heading),
    paragraphRow(esc(intro)),
    `            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 18px 0;">
              <tr>
                <td align="center" bgcolor="${INK}" style="background-color:${INK}; border-radius:999px; padding:14px 34px;">
                  <a href="${safeUrl}" style="font-family:${FONT_BODY}; font-size:15px; font-weight:bold; color:${CREAM}; text-decoration:none;">${esc(buttonLabel)}</a>
                </td>
              </tr>
            </table>`,
    paragraphRow(
      `Or copy this link into your browser:<br><a href="${safeUrl}" style="color:${BURNT}; word-break:break-all;">${safeUrl}</a>`,
      "font-size:13px; color:" + MUTED + ";"
    ),
    expiryNote ? paragraphRow(esc(expiryNote)) : "",
  ].join("\n");
  const plainText =
    text ||
    `${intro}\n${buttonLabel} using this link:\n${url}\n` +
      (expiryNote ? `${expiryNote}\n` : "") +
      `If you did not request this, ignore this email.`;
  return { html: layout(body), text: plainText };
}

export function reviewInviteEmail({ name, orderId, items }) {
  const firstName = esc(String(name || "Customer").split(" ")[0] || "Customer");
  const rows = (items || []).map((item) => {
    const url = esc(item.url);
    return `            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px 0; border:1px solid ${CARD_BORDER};">
              <tr>
                <td style="padding:12px 14px; font-family:${FONT_BODY}; font-size:14px; color:${INK};">${esc(item.title)}</td>
                <td align="right" style="padding:12px 14px;">
                  <a href="${url}" style="font-family:${FONT_BODY}; font-size:13px; font-weight:bold; color:${BURNT}; text-decoration:none;">Write a review &rarr;</a>
                </td>
              </tr>
            </table>`;
  }).join("\n");
  const body = [
    headingRow("Your order has been delivered"),
    paragraphRow(`Assalam-o-Alaikum ${firstName}, your order <strong style="color:${INK};">${esc(orderId)}</strong> has been delivered. We hope you love what you ordered!`),
    paragraphRow("Your review helps other customers shop with confidence — it only takes a minute, and every review is checked by our team before it appears on the store:"),
    rows,
    paragraphRow("Thank you for shopping with MALAC.", "font-size:13px; color:" + MUTED + ";"),
  ].join("\n");
  const text =
    `Your MALAC order ${orderId} has been delivered.\n` +
    `We would love your review — every review is checked by our team before it appears on the store:\n` +
    (items || []).map((i) => `- ${i.title}: ${i.url}`).join("\n") +
    `\nThank you for shopping with MALAC.`;
  return { html: layout(body), text };
}

// One order-lifecycle email for the customer: placed / shipped /
// delivered / cancelled. Same branded shell as every MALAC email; the
// caller supplies the heading, intro line and the order's own figures.
export function orderStatusEmail({ name, orderId, heading, intro, items, total, extra }) {
  const firstName = esc(String(name || "Customer").split(" ")[0] || "Customer");
  const rows = (items || []).map((i) =>
    `            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0; border:1px solid ${CARD_BORDER};">
              <tr>
                <td style="padding:10px 14px; font-family:${FONT_BODY}; font-size:14px; color:${INK};">${esc(i.title)}${i.variantLabel ? ` (${esc(i.variantLabel)})` : ""} &times; ${Number(i.qty) || 1}</td>
                <td align="right" style="padding:10px 14px; font-family:${FONT_BODY}; font-size:14px; color:${INK};">Rs. ${Number(i.price * i.qty).toLocaleString("en-PK")}</td>
              </tr>
            </table>`).join("\n");
  const body = [
    headingRow(heading),
    paragraphRow(`Assalam-o-Alaikum ${firstName}, ${intro}`),
    rows,
    total !== undefined && total !== null
      ? paragraphRow(`<strong style="color:${INK};">Order total: Rs. ${Number(total).toLocaleString("en-PK")}</strong>`)
      : "",
    extra ? paragraphRow(esc(extra)) : "",
    paragraphRow(`Track your order any time with your order ID <strong style="color:${INK};">${esc(orderId)}</strong> on the MALAC store's Track Order page.`, "font-size:13px; color:" + MUTED + ";"),
  ].join("\n");
  const text =
    `${heading}\n` +
    `Order ${orderId}: ${intro.replace(/<[^>]+>/g, "")}\n` +
    (items || []).map((i) => `- ${i.title}${i.variantLabel ? ` (${i.variantLabel})` : ""} x ${i.qty} — Rs. ${Number(i.price * i.qty).toLocaleString("en-PK")}`).join("\n") +
    (total !== undefined && total !== null ? `\nOrder total: Rs. ${Number(total).toLocaleString("en-PK")}` : "") +
    (extra ? `\n${extra}` : "") +
    `\nTrack your order on the MALAC store with order ID ${orderId}.`;
  return { html: layout(body), text };
}

export default { otpEmail, actionLinkEmail, reviewInviteEmail, orderStatusEmail };
