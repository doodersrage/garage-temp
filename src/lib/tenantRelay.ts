import { createServerClient } from "./supabase";
import { sendEmail } from "./mailer";
import { brandedEmailParts } from "./emailLayout";
import { resolveSiteUrl } from "./schemaMarkup";
import { canEditHousehold, getUserHouseholdRole } from "./households";

export type TenantNotifySettings = {
  email: string | null;
  name: string | null;
};

export async function getTenantNotifySettings(
  householdId: string,
): Promise<TenantNotifySettings> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("households")
    .select("tenant_notify_email, tenant_notify_name")
    .eq("id", householdId)
    .maybeSingle();

  return {
    email: data?.tenant_notify_email?.trim() || null,
    name: data?.tenant_notify_name?.trim() || null,
  };
}

export async function updateTenantNotifySettings(
  householdId: string,
  settings: TenantNotifySettings,
): Promise<{ error: string | null }> {
  const email = settings.email?.trim() || null;
  const name = settings.name?.trim() || null;

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Invalid email address." };
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from("households")
    .update({
      tenant_notify_email: email,
      tenant_notify_name: name,
    })
    .eq("id", householdId);

  return { error: error?.message ?? null };
}

export async function sendTenantFreezeRelay(input: {
  householdId: string;
  managerUserId: string;
  householdName: string;
  alertTitle: string;
  alertBody: string;
  siteUrl?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const role = await getUserHouseholdRole(input.managerUserId, input.householdId);
  if (!canEditHousehold(role)) {
    return { ok: false, error: "Not authorized to notify tenant." };
  }

  const tenant = await getTenantNotifySettings(input.householdId);
  if (!tenant.email) {
    return { ok: false, error: "No tenant contact configured." };
  }

  const siteUrl = input.siteUrl ?? resolveSiteUrl(null);
  const greeting = tenant.name ? `Hi ${tenant.name},` : "Hello,";
  const intro = `${greeting}\n\nThe property manager for ${input.householdName} asked us to pass along a freeze-risk alert:`;

  const parts = brandedEmailParts({
    eyebrow: "Tenant alert relay",
    preheader: input.alertTitle,
    title: input.alertTitle,
    intro: `${intro}\n\n${input.alertBody}`,
    cta: { label: "ThermalTrace", url: siteUrl },
    tone: "alert",
    footerNote:
      "You received this because the property owner listed you as an on-site contact. This is not a full dashboard login.",
  });

  try {
    await sendEmail(tenant.email, `[${input.householdName}] ${input.alertTitle}`, parts.text, {
      html: parts.html,
    });
    return { ok: true };
  } catch (error) {
    console.error("tenant relay email failed:", error);
    return { ok: false, error: "Email delivery failed." };
  }
}
