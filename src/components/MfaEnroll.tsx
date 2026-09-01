import { useEffect, useState } from "preact/hooks";
import { trackProductEvent } from "../lib/productAnalytics";
import {
  browserSupportsWebAuthn,
  performWebAuthnCreate,
} from "../lib/webauthnMfaBrowser";
import {
  MFA_WEBAUTHN_UI_ENABLED,
  YUBIKEY_OTP_ENROLL_HINT,
  YUBIKEY_TOTP_ENROLL_HINT,
} from "../lib/mfaWebAuthnUi";

type FactorRow = {
  id: string;
  friendly_name?: string | null;
  status: string;
};

type LoadState = "loading" | "ready" | "error";

async function mfaFetch(
  init?: RequestInit & { method?: string },
): Promise<Response> {
  return fetch("/api/auth/mfa-manage", {
    credentials: "same-origin",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

export default function MfaEnroll() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [status, setStatus] = useState("Checking MFA status…");
  const [message, setMessage] = useState("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [factors, setFactors] = useState<FactorRow[]>([]);
  const [webauthnFactors, setWebauthnFactors] = useState<FactorRow[]>([]);
  const [yubikeyPublicIds, setYubikeyPublicIds] = useState<string[]>([]);
  const [yubikeyConfigured, setYubikeyConfigured] = useState(false);
  const [yubikeyOtp, setYubikeyOtp] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [busy, setBusy] = useState(false);
  const webauthnSupported =
    MFA_WEBAUTHN_UI_ENABLED && browserSupportsWebAuthn();

  async function refreshFactorList() {
    const res = await mfaFetch({ method: "GET" });
    const payload = (await res.json().catch(() => ({}))) as {
      factors?: FactorRow[];
      totp?: FactorRow[];
      webauthn?: FactorRow[];
      yubikeyPublicIds?: string[];
      yubikeyOtpConfigured?: boolean;
      error?: string;
    };
    if (!res.ok) {
      throw new Error(payload.error ?? "Could not load MFA status");
    }
    const totp = payload.totp ?? payload.factors ?? [];
    const webauthn = payload.webauthn ?? [];
    setFactors(totp);
    setWebauthnFactors(webauthn);
    setYubikeyPublicIds(payload.yubikeyPublicIds ?? []);
    setYubikeyConfigured(payload.yubikeyOtpConfigured === true);
    const verifiedTotp = totp.filter((f) => f.status === "verified").length;
    const pendingTotp = totp.length - verifiedTotp;
    const verifiedWebauthn = webauthn.filter((f) => f.status === "verified").length;
    const pendingWebauthn = webauthn.length - verifiedWebauthn;
    const yubiCount = (payload.yubikeyPublicIds ?? []).length;
    const verifiedKeys = verifiedWebauthn + yubiCount;
    const pendingKeys = pendingWebauthn;
    const verified = verifiedTotp + verifiedKeys;
    const pending = pendingTotp + pendingKeys;
    const total = totp.length + webauthn.length + yubiCount;
    if (total === 0) {
      setStatus("No MFA factors enrolled.");
    } else if (verified > 0 && pending === 0) {
      const keyPart =
        verifiedKeys > 0
          ? ` (${verifiedTotp} app · ${verifiedKeys} key${verifiedKeys === 1 ? "" : "s"})`
          : "";
      setStatus(
        `${verified} MFA factor${verified === 1 ? "" : "s"} enrolled${keyPart}.`,
      );
    } else if (verified > 0) {
      setStatus(
        `${verified} enrolled · ${pending} unfinished enrollment${pending === 1 ? "" : "s"} (remove if stuck).`,
      );
    } else {
      setStatus(
        `${pending} unfinished enrollment${pending === 1 ? "" : "s"} — verify or remove to continue.`,
      );
    }
    setLoadState("ready");
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshFactorList();
      } catch (err) {
        if (cancelled) return;
        setLoadState("error");
        setStatus(
          err instanceof Error ? err.message : "Could not load MFA status",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enroll() {
    setBusy(true);
    setMessage("");
    try {
      const res = await mfaFetch({
        method: "POST",
        body: JSON.stringify({ action: "enroll" }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        factorId?: string | null;
        qrCode?: string | null;
        error?: string;
      };
      if (!res.ok) throw new Error(payload.error ?? "Enrollment failed");
      setQrCode(payload.qrCode ?? null);
      setFactorId(payload.factorId ?? null);
      setMessage(
        "Scan the QR code with your authenticator app (or Yubico Authenticator on a YubiKey), then enter a verification code below.",
      );
      await refreshFactorList();
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
      const res = await mfaFetch({
        method: "POST",
        body: JSON.stringify({
          action: "verify",
          factorId,
          code: verifyCode.trim(),
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Verification failed");
      setMessage(
        "Authenticator enrolled successfully. Sign-in will ask for a code next time.",
      );
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

  async function enrollSecurityKey() {
    if (!webauthnSupported) return;
    setBusy(true);
    setMessage("");
    try {
      const enrollRes = await mfaFetch({
        method: "POST",
        body: JSON.stringify({ action: "webauthn_enroll" }),
      });
      const enrolled = (await enrollRes.json().catch(() => ({}))) as {
        factorId?: string;
        error?: string;
      };
      if (!enrollRes.ok || !enrolled.factorId) {
        throw new Error(enrolled.error ?? "Could not enroll security key");
      }

      const challengeRes = await mfaFetch({
        method: "POST",
        body: JSON.stringify({
          action: "webauthn_challenge",
          factorId: enrolled.factorId,
        }),
      });
      const challenge = (await challengeRes.json().catch(() => ({}))) as {
        factorId?: string;
        challengeId?: string;
        ceremonyType?: "create" | "request";
        publicKey?: Record<string, unknown>;
        error?: string;
      };
      if (!challengeRes.ok || !challenge.publicKey) {
        throw new Error(
          challenge.error ?? "Could not start security key registration",
        );
      }

      const credentialResponse = await performWebAuthnCreate(challenge.publicKey);

      const verifyRes = await mfaFetch({
        method: "POST",
        body: JSON.stringify({
          action: "webauthn_verify",
          factorId: challenge.factorId ?? enrolled.factorId,
          challengeId: challenge.challengeId,
          ceremonyType: challenge.ceremonyType ?? "create",
          credentialResponse,
        }),
      });
      const verified = (await verifyRes.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!verifyRes.ok || !verified.ok) {
        throw new Error(verified.error ?? "Security key verification failed");
      }

      setMessage(
        "Security key enrolled successfully. Sign-in will ask for your key or authenticator code next time.",
      );
      trackProductEvent("mfa_enrolled");
      await refreshFactorList();
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Security key enrollment failed",
      );
    } finally {
      setBusy(false);
    }
  }

  async function enrollYubiKey() {
    if (!yubikeyOtp.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await mfaFetch({
        method: "POST",
        body: JSON.stringify({
          action: "yubikey_enroll",
          otp: yubikeyOtp.trim(),
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        publicId?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(payload.error ?? "YubiKey enrollment failed");
      setYubikeyOtp("");
      setMessage(
        "YubiKey enrolled. Sign-in will ask for a YubiKey tap or authenticator code next time.",
      );
      trackProductEvent("mfa_enrolled");
      await refreshFactorList();
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "YubiKey enrollment failed",
      );
    } finally {
      setBusy(false);
    }
  }

  async function unenrollYubiKey(publicId: string) {
    setBusy(true);
    setMessage("");
    try {
      const res = await mfaFetch({
        method: "POST",
        body: JSON.stringify({
          action: "yubikey_unenroll",
          publicId,
          otp: yubikeyOtp.trim() || undefined,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Could not remove YubiKey");
      setYubikeyOtp("");
      setMessage("YubiKey removed.");
      await refreshFactorList();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not remove YubiKey");
    } finally {
      setBusy(false);
    }
  }

  async function unenroll(id: string) {
    setBusy(true);
    setMessage("");
    try {
      const res = await mfaFetch({
        method: "POST",
        body: JSON.stringify({ action: "unenroll", factorId: id }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Could not remove factor");
      setMessage("Authenticator removed.");
      if (factorId === id) {
        setFactorId(null);
        setQrCode(null);
      }
      await refreshFactorList();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not remove factor");
    } finally {
      setBusy(false);
    }
  }

  const loading = loadState === "loading";
  const blocked = busy || loading;

  return (
    <div>
      <p
        class="text-sm text-[var(--color-text-muted)] mb-3"
        role="status"
        aria-live="polite"
      >
        {status}
      </p>
      {loadState === "error" && (
        <button
          type="button"
          class="btn-secondary mb-3"
          disabled={busy}
          onClick={() => {
            setLoadState("loading");
            setStatus("Checking MFA status…");
            void refreshFactorList().catch((err) => {
              setLoadState("error");
              setStatus(
                err instanceof Error ? err.message : "Could not load MFA status",
              );
            });
          }}
        >
          Retry
        </button>
      )}
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
                disabled={blocked}
                onClick={() => void unenroll(factor.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {webauthnFactors.length > 0 && (
        <ul class="mb-3 space-y-2 text-sm">
          {webauthnFactors.map((factor) => (
            <li class="flex flex-wrap items-center gap-2" key={factor.id}>
              <span>
                {factor.friendly_name || "Security key"} ({factor.status})
              </span>
              <button
                type="button"
                class="btn-ghost"
                disabled={blocked}
                onClick={() => void unenroll(factor.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <p class="text-sm text-[var(--color-text-muted)] mb-3">
        {YUBIKEY_TOTP_ENROLL_HINT}
      </p>
      <div class="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          class="btn-secondary"
          disabled={blocked || loadState === "error"}
          onClick={() => void enroll()}
        >
          {loading ? "Loading…" : "Enroll authenticator app"}
        </button>
        {webauthnSupported && (
          <button
            type="button"
            class="btn-secondary"
            disabled={blocked || loadState === "error"}
            onClick={() => void enrollSecurityKey()}
          >
            {busy ? "Waiting for key…" : "Add security key"}
          </button>
        )}
      </div>
      {yubikeyConfigured && (
        <div class="mb-3 pt-3 border-t border-[var(--color-border)]">
          <p class="text-sm text-[var(--color-text-muted)] mb-3">
            {YUBIKEY_OTP_ENROLL_HINT}
          </p>
          {yubikeyPublicIds.length > 0 && (
            <ul class="mb-3 space-y-2 text-sm">
              {yubikeyPublicIds.map((publicId) => (
                <li class="flex flex-wrap items-center gap-2" key={publicId}>
                  <span class="font-mono">YubiKey …{publicId.slice(-6)}</span>
                  <button
                    type="button"
                    class="btn-ghost"
                    disabled={blocked}
                    onClick={() => void unenrollYubiKey(publicId)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div class="form-field mb-3">
            <label class="form-label" for="yubikey-enroll-otp">
              YubiKey OTP
            </label>
            <input
              class="form-input font-mono text-sm"
              id="yubikey-enroll-otp"
              type="text"
              autoComplete="off"
              value={yubikeyOtp}
              onInput={(e) => setYubikeyOtp((e.target as HTMLInputElement).value.trim())}
            />
          </div>
          <button
            type="button"
            class="btn-secondary"
            disabled={blocked || yubikeyOtp.length < 44}
            onClick={() => void enrollYubiKey()}
          >
            Add YubiKey (OTP)
          </button>
        </div>
      )}
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
          <button
            type="button"
            class="btn-primary mt-2"
            disabled={blocked}
            onClick={() => void verify()}
          >
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
