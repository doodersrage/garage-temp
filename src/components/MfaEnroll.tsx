import { useEffect, useState } from "preact/hooks";
import { supabase } from "../lib/supabase";
import { trackProductEvent } from "../lib/productAnalytics";

interface Props {
  accessToken: string;
  refreshToken: string;
}

type FactorRow = {
  id: string;
  friendly_name?: string | null;
  status: string;
};

export default function MfaEnroll({ accessToken, refreshToken }: Props) {
  const [status, setStatus] = useState("Checking MFA status…");
  const [message, setMessage] = useState("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [factors, setFactors] = useState<FactorRow[]>([]);
  const [verifyCode, setVerifyCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function refreshFactorList() {
    const { data } = await supabase.auth.mfa.listFactors();
    const totp = (data?.totp ?? []) as FactorRow[];
    setFactors(totp);
    setStatus(
      totp.length > 0
        ? `${totp.length} authenticator factor(s) enrolled.`
        : "No MFA factors enrolled.",
    );
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (cancelled) return;
      await refreshFactorList();
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, refreshToken]);

  async function syncCookiesFromClientSession() {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) return;
    await fetch("/api/auth/set-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }),
    });
  }

  async function enroll() {
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Authenticator ${new Date().toLocaleDateString()}`,
      });
      if (error) throw error;
      setQrCode(data?.totp?.qr_code ?? null);
      setFactorId(data?.id ?? null);
      setMessage("Scan the QR code, then enter a verification code below.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Enrollment failed");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!factorId || !verifyCode.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: verifyCode.trim(),
      });
      if (error) throw error;
      if (data?.access_token && data.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        await syncCookiesFromClientSession();
      }
      setMessage("Authenticator enrolled successfully. Sign-in will ask for a code next time.");
      setQrCode(null);
      setFactorId(null);
      setVerifyCode("");
      trackProductEvent("mfa_enrolled");
      await refreshFactorList();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  async function unenroll(id: string) {
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
      if (error) throw error;
      setMessage("Authenticator removed.");
      if (factorId === id) {
        setFactorId(null);
        setQrCode(null);
      }
      await refreshFactorList();
      await syncCookiesFromClientSession();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not remove factor");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p class="text-sm text-[var(--color-text-muted)] mb-3">{status}</p>
      {factors.length > 0 && (
        <ul class="mb-3 space-y-2 text-sm">
          {factors.map((factor) => (
            <li class="flex flex-wrap items-center gap-2" key={factor.id}>
              <span>
                {factor.friendly_name || "Authenticator"} ({factor.status})
              </span>
              <button
                type="button"
                class="btn-ghost"
                disabled={busy}
                onClick={() => void unenroll(factor.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div class="flex flex-wrap gap-2 mb-3">
        <button type="button" class="btn-secondary" disabled={busy} onClick={enroll}>
          Enroll authenticator
        </button>
      </div>
      {qrCode && (
        <img src={qrCode} alt="TOTP QR code" width={180} height={180} class="mb-3" />
      )}
      {factorId && (
        <div class="form-field mb-3">
          <label class="form-label" for="mfa-verify-code">
            Verification code
          </label>
          <input
            class="form-input"
            id="mfa-verify-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={verifyCode}
            onInput={(e) => setVerifyCode((e.target as HTMLInputElement).value)}
          />
          <button type="button" class="btn-primary mt-2" disabled={busy} onClick={verify}>
            Verify & activate
          </button>
        </div>
      )}
      {message && (
        <p class="text-sm text-[var(--color-text-muted)] mb-0" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
