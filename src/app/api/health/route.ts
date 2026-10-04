import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    service: "av-portrait",
    status: "ok",
    imageProviderConfigured: Boolean(process.env.OPENAI_API_KEY),
    squareConfigured: Boolean(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID),
    identityConfigured: Boolean(process.env.AV_IDENTITY_URL),
  });
}
