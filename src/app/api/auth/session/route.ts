import { NextResponse } from "next/server";
import { checkPortraitCapability } from "@/lib/aerovista/session";
import { PORTRAIT_CAPABILITIES } from "@/lib/aerovista/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await checkPortraitCapability(PORTRAIT_CAPABILITIES.access);
  return NextResponse.json(
    access.allowed && access.session
      ? { authenticated: true, identity: access.session.identity }
      : { authenticated: false, reason: access.reason },
    { headers: { "cache-control": "no-store" } },
  );
}
