import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { getUserEntitlements } from "../../../lib/entitlements";
import { getSiteUrl } from "../../../lib/stripe";
import { formRedirectPath } from "../../../lib/siteUrl";
import { generateClaimsPackForUser } from "../../../lib/claimsPackGenerate";
import { createClaimsPackExport } from "../../../lib/claimsPackExports";
import { sendEmail, isMailerRecipientNotAllowed } from "../../../lib/mailer";
import { brandedEmailParts } from "../../../lib/emailLayout";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user) {
    return redirect("/signin");
  }

  const formData = await request.formData();
  const redirectTo = formRedirectPath(formData, "/dashboard/history");
  const adjusterEmail = formData.get("adjuster_email")?.toString().trim() ?? "";

  // Same gate as the existing authenticated download route
  // (api/claims/pack.ts) -- that route has no extra household-role check
  // today, so this matches it rather than introducing a stricter,
  // inconsistent gate for the same underlying report.
  const entitlements = await getUserEntitlements(user.id);
  if (!entitlements.canUseClaimsPack) {
    return redirect(`${redirectTo}?claims_error=pro_required`);
  }

  if (!adjusterEmail || !adjusterEmail.includes("@")) {
    return redirect(`${redirectTo}?claims_error=invalid_email`);
  }

  const siteUrl = getSiteUrl(request).replace(/\/$/, "");
  const { pack, householdId } = await generateClaimsPackForUser(
    user,
    entitlements,
    { from: formData.get("from")?.toString(), to: formData.get("to")?.toString() },
    siteUrl,
  );

  if (!householdId) {
    return redirect(`${redirectTo}?claims_error=no_household`);
  }

  const { token, contentHash, error } = await createClaimsPackExport(
    householdId,
    pack,
    user.id,
  );
  if (!token) {
    console.error("Failed to persist claims pack export for email:", error);
    return redirect(`${redirectTo}?claims_error=send_failed`);
  }

  const verifyUrl = `${siteUrl}/api/claims/pack/${token}`;
  const rangeLabel = `${pack.rangeFrom.slice(0, 10)} to ${pack.rangeTo.slice(0, 10)}`;

  try {
    const parts = brandedEmailParts({
      eyebrow: "Claims pack",
      preheader: `A ThermalTrace freeze-exposure report for ${pack.householdLabel} is ready to view.`,
      title: `Claims pack: ${pack.householdLabel}`,
      intro: `A ThermalTrace household member shared a freeze-exposure and alert-history report covering ${rangeLabel}.`,
      paragraphs: [
        "The report includes freeze-exposure stats, device and probe tables, and a timeline of critical alerts for the selected period, with a verification code so this specific export can be reconfirmed later.",
        `Verification code: ${contentHash}`,
      ],
      cta: { label: "View claims pack", url: verifyUrl },
      tone: "brand",
      footerNote:
        "This report was sent by a ThermalTrace household member. It's a monitoring summary, not a certified inspection -- see the report itself for full context.",
    });
    await sendEmail(adjusterEmail, `Claims pack: ${pack.householdLabel}`, parts.text, {
      html: parts.html,
    });
  } catch (err) {
    if (isMailerRecipientNotAllowed(err)) {
      return redirect(`${redirectTo}?claims_error=recipient_not_allowed`);
    }
    console.error("Failed to send claims pack email:", err);
    return redirect(`${redirectTo}?claims_error=send_failed`);
  }

  return redirect(`${redirectTo}?claims_emailed=1`);
};
