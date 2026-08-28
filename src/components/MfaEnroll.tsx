import { useEffect, useState } from "preact/hooks";
import { supabase } from "../lib/supabase";
import { trackProductEvent } from "../lib/productAnalytics";

interface Props {
  accessToken: string;
  refreshToken: string;
}

export default function MfaEnroll({ accessToken, refreshToken }: Props) {
  const [status, setStatus] = useState("Checking MFA status…");
  const [message, setMessage] = useState("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      const { data } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;
      const totp = data?.totp ?? [];
      setStatus(
        totp.length > 0
          ? `${totp.length} authenticator factor(s) enrolled.`
          : "No MFA factors enrolled.",
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, refreshToken]);

  async function enroll() {
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator",
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
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verifyCode.trim(),
      });
      if (verifyError) throw verifyError;
      setMessage("Authenticator enrolled successfully.");
      setQrCode(null);
      setVerifyCode("");
      trackProductEvent("mfa_enrolled");
      const { data } = await supabase.auth.mfa.listFactors();
      const totp = data?.totp ?? [];
      setStatus(`${totp.length} authenticator factor(s) enrolled.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p class="text-sm text-[var(--color-text-muted)] mb-3">{status}</p>
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
