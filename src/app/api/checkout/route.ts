import { NextResponse } from "next/server";
import { requirePortraitCapability } from "@/lib/aerovista/session";
import { PORTRAIT_CAPABILITIES } from "@/lib/aerovista/config";
import { createSquareCheckout, PLANS, PlanId } from "@/lib/square";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await requirePortraitCapability(PORTRAIT_CAPABILITIES.purchase);
    const body = await request.json();
    const plan = String(body?.plan ?? "") as PlanId;
    if (!(plan in PLANS)) return NextResponse.json({ error: "Unknown AV Portrait plan." }, { status: 400 });
    return NextResponse.json(await createSquareCheckout(plan, session.identity.identityId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed.";
    const status = Number((error as { status?: number }).status || 500);
    return NextResponse.json({ error: message }, { status });
  }
}
