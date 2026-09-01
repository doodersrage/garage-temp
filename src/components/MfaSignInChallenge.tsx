import { YUBIKEY_TOTP_SIGNIN_HINT } from "../lib/mfaWebAuthnUi";

type Props = {
  safeNext: string;
  userEmail: string;
  initialError?: string | null;
};

export default function MfaSignInChallenge({
  safeNext,
  userEmail,
  initialError = null,
}: Props) {
  return (
    <div>
      <header class="auth-intro page-header">
        <h1 class="page-header-title">Authenticator code</h1>
        <p class="page-header-lede">
          Enter the 6-digit code from your authenticator app for {userEmail}.
        </p>
      </header>

      <div class="form-panel">
        {initialError && (
          <div class="alert-warning mb-4" role="alert">
            <p class="m-0">{initialError}</p>
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

        <p class="text-sm text-[var(--color-text-muted)] mt-4 mb-0">
          {YUBIKEY_TOTP_SIGNIN_HINT}
        </p>

        <p class="m-0 mt-4 text-sm text-center">
          <a class="text-link" href="/api/auth/signout">
            Use a different account
          </a>
        </p>
      </div>
    </div>
  );
}
