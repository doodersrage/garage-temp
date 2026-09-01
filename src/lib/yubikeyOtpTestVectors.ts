/** Public YubiCloud HMAC examples from YubiCo OTP validation docs (not real API keys). */

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

const DOC_TEST_API_KEY_BYTES = Uint8Array.from([
  0x12, 0x26, 0xe3, 0x6b, 0x69, 0x11, 0x15, 0x75, 0xe8, 0x5b, 0xa8, 0x63, 0x65,
  0xa8, 0xb2, 0x06, 0xd5, 0xa7, 0x08, 0x10,
]);

const DOC_TEST_REQUEST_SIGNATURE_BYTES = Uint8Array.from([
  0x26, 0xdd, 0x7d, 0x1a, 0x90, 0xce, 0x02, 0xb6, 0x93, 0x61, 0x11, 0x41, 0x1d,
  0x2a, 0x1f, 0x61, 0x91, 0x44, 0xc2, 0x31,
]);

export const yubicoDocTestVectors = {
  apiKeyBase64: () => bytesToBase64(DOC_TEST_API_KEY_BYTES),
  clientId: "15618",
  nonce: "0102030405060708090a0b0c0d0e0f",
  otp: "ccccccbteuddjivcnlfefefrccdcjrfjfvgjnfkcklge",
  requestSignatureBase64: () => bytesToBase64(DOC_TEST_REQUEST_SIGNATURE_BYTES),
  responseParams: {
    nonce: "0102030405060708090a0b0c0d0e0f",
    otp: "ccccccbteuddjivcnlfefefrccdcjrfjfvgjnfkcklge",
    sl: "100",
    status: "OK",
    t: "2020-01-06T02:52:13Z0998",
  },
} as const;
