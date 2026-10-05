import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    service: "av-portrait",
    status: "ok",
    appAdapterConfigured: Boolean(process.env.IDGW_SERVICE_SECRET_AV_PORTRAIT),
    imageProviderConfigured: Boolean(process.env.OPENAI_API_KEY),
    squareCheckoutConfigured: Boolean(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID),
    squareWebhookConfigured: Boolean(
      process.env.SQUARE_WEBHOOK_SIGNATURE_KEY && process.env.SQUARE_WEBHOOK_NOTIFICATION_URL
    ),
    privateStorageConfigured: Boolean(process.env.BLOB_STORE_ID || process.env.VERCEL_OIDC_TOKEN),
  });
}
