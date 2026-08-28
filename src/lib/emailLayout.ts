import { resolveSiteUrl } from "./schemaMarkup";

export type EmailCta = {
  label: string;
  url: string;
};

export type BrandedEmailContent = {
  /** Inbox preview text (hidden in body). */
  preheader?: string;
  /** Small label above the title (e.g. Welcome, Alerts). */
  eyebrow?: string;
  title: string;
  /** Lead paragraph under the title. */
  intro?: string;
  paragraphs?: string[];
  bullets?: string[];
  cta?: EmailCta;
  secondaryCta?: EmailCta;
  footerNote?: string;
  /** Visual tone for the accent bar / CTA. */
  tone?: "brand" | "alert" | "success";
};

const COLORS = {
  bg: "#090b0f",
  card: "#151b24",
  border: "#2a3441",
  text: "#f8fafc",
  muted: "#94a3b8",
  steel: "#c5cbd3",
  brand: "#e85500",
  brandSoft: "#ff9e4a",
  alert: "#f87171",
  success: "#22c55e",
} as const;

export function escapeEmailHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function accentForTone(tone: BrandedEmailContent["tone"]): string {
  if (tone === "alert") return COLORS.alert;
  if (tone === "success") return COLORS.success;
  return COLORS.brand;
}

function linkifyPlainUrls(text: string): string {
  return escapeEmailHtml(text).replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#ff9e4a;text-decoration:underline">$1</a>',
  );
}

export function buildBrandedEmailText(content: BrandedEmailContent): string {
  const lines: string[] = [];
  lines.push(content.title);
  lines.push("");
  if (content.intro) {
    lines.push(content.intro);
    lines.push("");
  }
  for (const paragraph of content.paragraphs ?? []) {
    lines.push(paragraph);
    lines.push("");
  }
  for (const bullet of content.bullets ?? []) {
    lines.push(`• ${bullet}`);
  }
  if (content.bullets?.length) lines.push("");
  if (content.cta) {
    lines.push(`${content.cta.label}: ${content.cta.url}`);
    lines.push("");
  }
  if (content.secondaryCta) {
    lines.push(`${content.secondaryCta.label}: ${content.secondaryCta.url}`);
    lines.push("");
  }
  lines.push(content.footerNote ?? "ThermalTrace — live probe curves, freeze alerts, and history.");
  const siteUrl = resolveSiteUrl(null);
  lines.push(`${siteUrl}/dashboard`);
  return lines.join("\n").trim() + "\n";
}

export function buildBrandedEmailHtml(content: BrandedEmailContent): string {
  const siteUrl = resolveSiteUrl(null);
  const accent = accentForTone(content.tone ?? "brand");
  const preheader = content.preheader ?? content.intro ?? content.title;
  const paragraphs = (content.paragraphs ?? [])
    .map(
      (p) =>
        `<p style="margin:0 0 16px;color:${COLORS.steel};font-size:16px;line-height:1.6">${linkifyPlainUrls(p)}</p>`,
    )
    .join("");
  const bullets =
    content.bullets && content.bullets.length > 0
      ? `<ul style="margin:0 0 20px;padding:0 0 0 20px;color:${COLORS.steel};font-size:16px;line-height:1.6">${content.bullets
          .map((item) => `<li style="margin:0 0 8px">${linkifyPlainUrls(item)}</li>`)
          .join("")}</ul>`
      : "";

  const ctaHtml = content.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px">
        <tr>
          <td style="border-radius:10px;background:${accent}">
            <a href="${escapeEmailHtml(content.cta.url)}" style="display:inline-block;padding:14px 22px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.01em">${escapeEmailHtml(content.cta.label)}</a>
          </td>
        </tr>
      </table>`
    : "";

  const secondaryHtml = content.secondaryCta
    ? `<p style="margin:0 0 20px;font-size:14px;line-height:1.5"><a href="${escapeEmailHtml(content.secondaryCta.url)}" style="color:${COLORS.brandSoft};text-decoration:underline">${escapeEmailHtml(content.secondaryCta.label)}</a></p>`
    : "";

  const eyebrow = content.eyebrow
    ? `<p style="margin:0 0 10px;color:${accent};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">${escapeEmailHtml(content.eyebrow)}</p>`
    : "";

  const intro = content.intro
    ? `<p style="margin:0 0 18px;color:${COLORS.text};font-size:17px;line-height:1.55;font-weight:500">${linkifyPlainUrls(content.intro)}</p>`
    : "";

  const footerNote = escapeEmailHtml(
    content.footerNote ??
      "You’re receiving this because you have a ThermalTrace account. Manage email preferences in Dashboard → Alerts.",
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeEmailHtml(content.title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};color:${COLORS.text}">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeEmailHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};padding:28px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${COLORS.card};border:1px solid ${COLORS.border};border-radius:16px;overflow:hidden">
          <tr>
            <td style="height:4px;background:linear-gradient(90deg, ${COLORS.brandSoft}, ${COLORS.brand});font-size:0;line-height:0">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px">
              <p style="margin:0;font-size:22px;font-weight:800;letter-spacing:-0.03em;line-height:1.2">
                <span style="color:${COLORS.steel}">Thermal</span><span style="color:${COLORS.brand}">Trace</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 28px 32px">
              ${eyebrow}
              <h1 style="margin:0 0 14px;color:${COLORS.text};font-size:24px;line-height:1.25;font-weight:700">${escapeEmailHtml(content.title)}</h1>
              ${intro}
              ${paragraphs}
              ${bullets}
              ${ctaHtml}
              ${secondaryHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 24px;border-top:1px solid ${COLORS.border};background:#10151d">
              <p style="margin:0 0 8px;color:${COLORS.muted};font-size:12px;line-height:1.55">${footerNote}</p>
              <p style="margin:0;font-size:12px;line-height:1.5">
                <a href="${escapeEmailHtml(siteUrl)}/dashboard" style="color:${COLORS.brandSoft};text-decoration:none">Dashboard</a>
                <span style="color:${COLORS.border}"> · </span>
                <a href="${escapeEmailHtml(siteUrl)}/dashboard/alerts" style="color:${COLORS.brandSoft};text-decoration:none">Alert settings</a>
                <span style="color:${COLORS.border}"> · </span>
                <a href="${escapeEmailHtml(siteUrl)}/about" style="color:${COLORS.brandSoft};text-decoration:none">Guides</a>
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:18px 0 0;color:${COLORS.muted};font-size:11px;line-height:1.4">© ThermalTrace · ${escapeEmailHtml(siteUrl.replace(/^https?:\/\//, ""))}</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function brandedEmailParts(content: BrandedEmailContent): {
  text: string;
  html: string;
} {
  return {
    text: buildBrandedEmailText(content),
    html: buildBrandedEmailHtml(content),
  };
}
