import "server-only";
import crypto from "node:crypto";

export function verifySquareWebhookSignature(
  rawBody: string,
  signature: string | null,
  notificationUrl: string,
) {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!key || !signature || !notificationUrl) return false;

  const expected = crypto
    .createHmac("sha256", key)
    .update(notificationUrl + rawBody, "utf8")
    .digest("base64");

  try {
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    return actualBuffer.length === expectedBuffer.length
      && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
  } catch {
    return false;
  }
}
