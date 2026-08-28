import { useEffect, useState } from "preact/hooks";
import { trackProductEvent } from "../lib/productAnalytics";

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
  const [verifyCode, setVerifyCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function refreshFactorList() {
    const res = await mfaFetch({ method: "GET" });
    const payload = (await res.json().catch(() => ({}))) as {
      factors?: FactorRow[];
      error?: string;
    };
    if (!res.ok) {
      throw new Error(payload.error ?? "Could not load MFA status");
    }
    const totp = payload.factors ?? [];
    setFactors(totp);
    const verified = totp.filter((f) => f.status === "verified").length;
    const pending = totp.length - verified;
    if (totp.length === 0) {
      setStatus("No MFA factors enrolled.");
    } else if (verified > 0 && pending === 0) {
      setStatus(
        `${verified} authenticator factor${verified === 1 ? "" : "s"} enrolled.`,
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
      setMessage("Scan the QR code, then enter a verification code below.");
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
      <div class="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          class="btn-secondary"
          disabled={blocked || loadState === "error"}
          onClick={() => void enroll()}
        >
          {loading ? "Loading…" : "Enroll authenticator"}
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
