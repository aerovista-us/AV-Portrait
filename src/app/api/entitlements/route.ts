import { NextResponse } from "next/server";
import { PORTRAIT_CAPABILITIES } from "@/lib/aerovista/config";
import { requirePortraitCapability } from "@/lib/aerovista/session";
import { listEntitlements } from "@/lib/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requirePortraitCapability(PORTRAIT_CAPABILITIES.access);
    const entitlements = await listEntitlements(session.identity.identityId);
    return NextResponse.json({ entitlements }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const status = Number((error as { status?: number }).status || 500);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Entitlements unavailable." },
      { status },
    );
  }
}
