import { useState } from "preact/hooks";
import {
  browserSupportsWebAuthn,
  performWebAuthnGet,
} from "../lib/webauthnMfaBrowser";

type Props = {
  safeNext: string;
  userEmail: string;
  initialError?: string | null;
};

type ChallengePayload = {
  factorId?: string;
  challengeId?: string;
  ceremonyType?: "create" | "request";
  publicKey?: Record<string, unknown>;
  error?: string;
};

export default function MfaSignInChallenge({
  safeNext,
  userEmail,
  initialError = null,
}: Props) {
  const [webauthnBusy, setWebauthnBusy] = useState(false);
  const [webauthnError, setWebauthnError] = useState<string | null>(
    initialError,
  );
  const webauthnSupported = browserSupportsWebAuthn();

  async function verifyWithSecurityKey() {
    if (!webauthnSupported) return;
    setWebauthnBusy(true);
    setWebauthnError(null);
    try {
      const challengeRes = await fetch("/api/auth/mfa-verify", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "webauthn_challenge" }),
      });
      const challenge = (await challengeRes.json().catch(() => ({}))) as ChallengePayload;
      if (!challengeRes.ok) {
        throw new Error(challenge.error ?? "Could not start security key verification");
      }

      const credentialResponse = await performWebAuthnGet(
        challenge.publicKey ?? {},
      );

      const verifyRes = await fetch("/api/auth/mfa-verify", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "webauthn_verify",
          factorId: challenge.factorId,
          challengeId: challenge.challengeId,
          ceremonyType: challenge.ceremonyType ?? "request",
          credentialResponse,
        }),
      });
      const verify = (await verifyRes.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!verifyRes.ok || !verify.ok) {
        throw new Error(verify.error ?? "Security key verification failed");
      }

      window.location.assign(safeNext);
    } catch (err) {
      setWebauthnError(
        err instanceof Error ? err.message : "Security key verification failed",
      );
    } finally {
      setWebauthnBusy(false);
    }
  }

  return (
    <div>
      <header class="auth-intro page-header">
        <h1 class="page-header-title">Two-factor authentication</h1>
        <p class="page-header-lede">
          Enter a code from your authenticator app or use a security key for{" "}
          {userEmail}.
        </p>
      </header>

      <div class="form-panel">
        {webauthnError && (
          <div class="alert-warning mb-4" role="alert">
            <p class="m-0">{webauthnError}</p>
          </div>
        )}
        <form action="/api/auth/mfa-verify" method="post">
          <input type="hidden" name="next" value={safeNext} />
          <div class="form-field">
            <label class="form-label" for="code">
              Authentication code
            </label>
            <input
              class="form-input"
              type="text"
              name="code"
              id="code"
              inputmode="numeric"
              pattern="[0-9]{6}"
              autocomplete="one-time-code"
              maxLength={6}
              required
              autofocus
            />
          </div>
          <button class="btn-primary" type="submit">
            Verify and continue
          </button>
        </form>

        {webauthnSupported && (
          <div class="mt-4 pt-4 border-t border-[var(--color-border)]">
            <p class="text-sm text-[var(--color-text-muted)] mb-3">
              Or tap your YubiKey or other security key.
            </p>
            <button
              type="button"
              class="btn-secondary w-full"
              disabled={webauthnBusy}
              onClick={() => void verifyWithSecurityKey()}
            >
              {webauthnBusy ? "Waiting for security key…" : "Use security key"}
            </button>
          </div>
        )}

        <p class="m-0 mt-4 text-sm text-center">
          <a class="text-link" href="/api/auth/signout">
            Use a different account
          </a>
        </p>
      </div>
    </div>
  );
}
