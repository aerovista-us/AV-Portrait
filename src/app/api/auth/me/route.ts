import { NextResponse } from "next/server";
import { requirePortraitCapability } from "@/lib/aerovista/session";
import { PORTRAIT_CAPABILITIES } from "@/lib/aerovista/config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requirePortraitCapability(PORTRAIT_CAPABILITIES.access);
    return NextResponse.json({ identity: session.identity }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
}
