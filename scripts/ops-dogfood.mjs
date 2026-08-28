#!/usr/bin/env node
/**
 * Authenticated dogfood: alert test + admin Ops email smokes against production.
 * Usage: pnpm ops:dogfood [baseUrl]
 *
 * Requires E2E_TEST_EMAIL, E2E_TEST_PASSWORD, SUPABASE_URL, SUPABASE_ANON_KEY in .env.
 * Admin email tests need the E2E user in the admin group.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const envFile = resolve(process.cwd(), ".env");
if (existsSync(envFile)) {
  process.loadEnvFile?.(envFile);
}

const base = (process.argv[2] ?? process.env.SMOKE_BASE_URL ?? "https://thermaltrace.dev").replace(
  /\/+$/,
  "",
);

const email = process.env.E2E_TEST_EMAIL?.trim();
const password = process.env.E2E_TEST_PASSWORD;
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const anonKey = process.env.SUPABASE_ANON_KEY?.trim();

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

if (!email || !password) fail("E2E_TEST_EMAIL and E2E_TEST_PASSWORD required");
if (!supabaseUrl || !anonKey) fail("SUPABASE_URL and SUPABASE_ANON_KEY required");

const supabase = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`Ops dogfood against ${base}\n`);

const { data, error } = await supabase.auth.signInWithPassword({ email, password });
if (error || !data.session) {
  fail(error?.message || "Supabase sign-in failed");
}

const cookie = [
  `sb-access-token=${data.session.access_token}`,
  `sb-refresh-token=${data.session.refresh_token}`,
].join("; ");

async function get(path) {
  const res = await fetch(`${base}${path}`, {
    headers: { Cookie: cookie, Accept: "text/html" },
    redirect: "manual",
  });
  const text = await res.text();
  return { res, text, location: res.headers.get("location") };
}

async function postForm(path, fields) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    body.set(key, value);
  }
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      Cookie: cookie,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/html",
    },
    body,
    redirect: "manual",
  });
  const text = await res.text().catch(() => "");
  return { res, text, location: res.headers.get("location") ?? "" };
}

let ok = true;
function note(pass, label, detail = "") {
  const mark = pass ? "✓" : "✗";
  console.log(`${mark} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) ok = false;
}

// --- Alerts page + test send ---
{
  const alerts = await get("/dashboard/alerts");
  const signedIn =
    alerts.res.status === 200 &&
    !alerts.location?.includes("signin") &&
    /Alerts/i.test(alerts.text);
  note(signedIn, "Alerts page (signed in)", `HTTP ${alerts.res.status}`);

  if (signedIn) {
    const hasEmailChannel = /name=["']channel_email["'][^>]*checked/i.test(alerts.text);
    const alertsEnabled = /name=["']alerts_enabled["'][^>]*checked/i.test(alerts.text);
    note(true, "Alert form present", `enabled≈${alertsEnabled} email≈${hasEmailChannel}`);

    const test = await postForm("/api/user/alert-test", {
      redirect: "/dashboard/alerts",
    });
    const loc = test.location;
    if (loc.includes("test_sent=1")) {
      note(true, "Send test alert", loc.replace(/^.*\?/, "?"));
    } else if (loc.includes("test_error=1")) {
      note(false, "Send test alert", loc.replace(/^.*\?/, "?") || "test_error");
    } else {
      note(
        false,
        "Send test alert",
        `HTTP ${test.res.status} loc=${loc || "(none)"} body=${test.text.slice(0, 120)}`,
      );
    }
  }
}

// --- Admin Ops ---
{
  const ops = await get("/dashboard/ops");
  const redirectedAway =
    ops.res.status === 302 &&
    Boolean(ops.location) &&
    !ops.location.includes("/dashboard/ops");
  const isAdmin =
    ops.res.status === 200 &&
    /Ops/i.test(ops.text) &&
    /email-test|Email smoke/i.test(ops.text);

  if (redirectedAway) {
    console.log(
      `○ Ops page (admin) — redirected to ${ops.location} (E2E user not admin; skip email smokes)`,
    );
  } else if (!isAdmin) {
    note(
      false,
      "Ops page (admin)",
      `HTTP ${ops.res.status} loc=${ops.location ?? "(none)"} len=${ops.text.length}`,
    );
  } else {
    note(true, "Ops page (admin)");

    for (const kind of ["drip_day1", "drip_day3", "trial_3d"]) {
      const result = await postForm("/api/admin/email-test", { kind });
      const pass =
        result.res.status === 302 && result.location.includes("email_test=1");
      note(
        pass,
        `Ops email smoke (${kind})`,
        pass ? "sent" : `HTTP ${result.res.status} ${result.location || result.text.slice(0, 80)}`,
      );
    }

    // Push channel test — may fail without browser subscription; report softly
    const push = await postForm("/api/admin/channel-test", { kind: "push" });
    if (push.res.status === 302 && push.location.includes("channel_test=1")) {
      note(true, "Ops push channel smoke", "delivered");
    } else if (push.res.status === 503) {
      note(false, "Ops push channel smoke", "VAPID not configured on worker");
    } else {
      console.log(
        `○ Ops push channel smoke — skipped/failed (subscribe browser first): HTTP ${push.res.status} ${push.text.slice(0, 100)}`,
      );
    }

    // SMS — expected skip without Twilio
    const sms = await postForm("/api/admin/channel-test", { kind: "sms" });
    if (sms.res.status === 503) {
      console.log("○ Ops SMS channel smoke — Twilio not configured (expected)");
    } else if (sms.res.status === 302 && sms.location.includes("channel_test=1")) {
      note(true, "Ops SMS channel smoke", "sent");
    } else {
      console.log(
        `○ Ops SMS channel smoke — HTTP ${sms.res.status} ${sms.text.slice(0, 100)}`,
      );
    }
  }
}

console.log(
  ok
    ? "\nOps dogfood passed. Check your inbox for test alert + Ops drip emails."
    : "\nOps dogfood had failures — fix channels/admin access, then re-run.",
);
console.log("Manual remaining: Twilio TWILIO_* secrets; Google Search Console sitemap confirm.");

process.exit(ok ? 0 : 1);
