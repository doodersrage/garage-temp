import { useState } from "preact/hooks";
import {
  YUBIKEY_OTP_SIGNIN_HINT,
  YUBIKEY_TOTP_SIGNIN_HINT,
} from "../lib/mfaWebAuthnUi";

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
  const [yubikeyOtp, setYubikeyOtp] = useState("");

  return (
    <div>
      <header class="auth-intro page-header">
        <h1 class="page-header-title">Two-factor authentication</h1>
        <p class="page-header-lede">
          Complete sign-in for {userEmail} with an authenticator code or YubiKey
          OTP.
        </p>
      </header>

      <div class="form-panel">
        {initialError && (
          <div class="alert-warning mb-4" role="alert">
            <p class="m-0">{initialError}</p>
          </div>
        )}

        <form action="/api/auth/mfa-verify" method="post" class="mb-4">
          <input type="hidden" name="next" value={safeNext} />
          <div class="form-field">
            <label class="form-label" for="code">
              Authenticator code
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
            />
          </div>
          <button class="btn-primary" type="submit">
            Verify code
          </button>
          <p class="text-sm text-[var(--color-text-muted)] mt-3 mb-0">
            {YUBIKEY_TOTP_SIGNIN_HINT}
          </p>
        </form>

        <div class="pt-4 border-t border-[var(--color-border)]">
          <form action="/api/auth/mfa-verify" method="post">
            <input type="hidden" name="next" value={safeNext} />
            <div class="form-field">
              <label class="form-label" for="yubikey_otp">
                YubiKey OTP
              </label>
              <input
                class="form-input font-mono text-sm"
                type="text"
                name="yubikey_otp"
                id="yubikey_otp"
                autocomplete="off"
                maxLength={48}
                value={yubikeyOtp}
                onInput={(e) =>
                  setYubikeyOtp((e.target as HTMLInputElement).value.trim())
                }
              />
            </div>
            <button
              class="btn-secondary w-full"
              type="submit"
              disabled={yubikeyOtp.length < 44}
            >
              Verify with YubiKey
            </button>
            <p class="text-sm text-[var(--color-text-muted)] mt-3 mb-0">
              {YUBIKEY_OTP_SIGNIN_HINT}
            </p>
          </form>
        </div>

        <p class="m-0 mt-4 text-sm text-center">
          <a class="text-link" href="/api/auth/signout">
            Use a different account
          </a>
        </p>
      </div>
    </div>
  );
}
