import { NextResponse } from "next/server";
import { checkPortraitCapability } from "@/lib/aerovista/session";
import { PORTRAIT_CAPABILITIES, type PortraitCapability } from "@/lib/aerovista/config";

const ALLOWED = new Set<PortraitCapability>(Object.values(PORTRAIT_CAPABILITIES));
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    capability?: PortraitCapability;
    resourceType?: string | null;
    resourceId?: string | null;
  } | null;

  const capability = body?.capability;
  if (!capability || !ALLOWED.has(capability)) {
    return NextResponse.json({ allowed: false, code: "unsupported_capability" }, { status: 400 });
  }

  const decision = await checkPortraitCapability(
    capability,
    body?.resourceType ?? null,
    body?.resourceId ?? null,
  );

  const status = decision.reason === "not_authenticated"
    ? 401
    : decision.reason === "authorization_unavailable"
      ? 503
      : 200;

  return NextResponse.json(
    { allowed: decision.allowed, code: decision.allowed ? undefined : decision.reason },
    { status, headers: { "cache-control": "no-store" } },
  );
}
