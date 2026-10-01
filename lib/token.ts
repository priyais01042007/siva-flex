function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CRITICAL SECURITY CONFIGURATION ERROR: SESSION_SECRET environment variable is required in production."
      );
    }
    // Development fallback using non-predictable runtime warning
    console.warn(
      "[SECURITY WARNING]: SESSION_SECRET is not set in environment variables. Please configure SESSION_SECRET in .env.local."
    );
    return "dev-local-session-secret-key-32-chars-long-strictly-for-dev";
  }
  return secret;
}

const DEFAULT_SECRET = getSessionSecret();

/**
 * Sign an object payload into a base64url encoded HMAC-SHA256 token
 * Uses native Web Crypto API (fully compatible with Next.js Edge Runtime and Node.js)
 */
export async function signAuthToken(payload: Record<string, unknown>, secret: string = DEFAULT_SECRET): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const payloadString = JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
  });

  const payloadBase64 = Buffer.from(payloadString).toString("base64url");
  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(payloadBase64));
  const signatureBase64 = Buffer.from(signatureBuffer).toString("base64url");

  return `${payloadBase64}.${signatureBase64}`;
}

/**
 * Verify an HMAC-SHA256 signed token
 */
export async function verifyAuthToken<T = Record<string, unknown>>(
  token: string,
  secret: string = DEFAULT_SECRET
): Promise<T | null> {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;

  try {
    const [payloadBase64, signatureBase64] = token.split(".");
    if (!payloadBase64 || !signatureBase64) return null;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signatureBuffer = Buffer.from(signatureBase64, "base64url");
    const isValid = await crypto.subtle.verify(
      "HMAC",
      cryptoKey,
      signatureBuffer,
      encoder.encode(payloadBase64)
    );

    if (!isValid) return null;

    const jsonString = Buffer.from(payloadBase64, "base64url").toString("utf-8");
    const data = JSON.parse(jsonString);

    return data as T;
  } catch {
    return null;
  }
}
