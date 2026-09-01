import type { WebAuthnCredentialResponse } from "./webauthnMfaApi";

export function browserSupportsWebAuthn(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined" &&
    typeof window.navigator?.credentials?.create === "function" &&
    typeof window.navigator?.credentials?.get === "function"
  );
}

function parseCreationOptions(
  publicKey: Record<string, unknown>,
): PublicKeyCredentialCreationOptions {
  const cred = PublicKeyCredential as unknown as {
    parseCreationOptionsFromJSON?: (
      options: PublicKeyCredentialCreationOptionsJSON,
    ) => PublicKeyCredentialCreationOptions;
  };
  if (typeof cred.parseCreationOptionsFromJSON === "function") {
    return cred.parseCreationOptionsFromJSON(
      publicKey as unknown as PublicKeyCredentialCreationOptionsJSON,
    );
  }
  throw new Error("This browser does not support WebAuthn registration");
}

function parseRequestOptions(
  publicKey: Record<string, unknown>,
): PublicKeyCredentialRequestOptions {
  const cred = PublicKeyCredential as unknown as {
    parseRequestOptionsFromJSON?: (
      options: PublicKeyCredentialRequestOptionsJSON,
    ) => PublicKeyCredentialRequestOptions;
  };
  if (typeof cred.parseRequestOptionsFromJSON === "function") {
    return cred.parseRequestOptionsFromJSON(
      publicKey as unknown as PublicKeyCredentialRequestOptionsJSON,
    );
  }
  throw new Error("This browser does not support WebAuthn authentication");
}

function credentialToJson(credential: Credential): WebAuthnCredentialResponse {
  const withJson = credential as PublicKeyCredential & {
    toJSON?: () => WebAuthnCredentialResponse;
  };
  if (typeof withJson.toJSON === "function") {
    return withJson.toJSON();
  }
  throw new Error("Could not serialize WebAuthn credential");
}

export async function performWebAuthnCreate(
  publicKey: Record<string, unknown>,
): Promise<WebAuthnCredentialResponse> {
  const options = parseCreationOptions(publicKey);
  const credential = await navigator.credentials.create({ publicKey: options });
  if (!credential) {
    throw new Error("Security key registration was cancelled");
  }
  return credentialToJson(credential);
}

export async function performWebAuthnGet(
  publicKey: Record<string, unknown>,
): Promise<WebAuthnCredentialResponse> {
  const options = parseRequestOptions(publicKey);
  const credential = await navigator.credentials.get({ publicKey: options });
  if (!credential) {
    throw new Error("Security key verification was cancelled");
  }
  return credentialToJson(credential);
}
