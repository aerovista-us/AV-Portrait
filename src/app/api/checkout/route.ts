import { NextResponse } from "next/server";
import { resolveAVIdentity } from "@/lib/identity";
import { createSquareCheckout, PLANS, PlanId } from "@/lib/square";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await resolveAVIdentity(request);
    const body = await request.json();
    const plan = String(body?.plan ?? "") as PlanId;
    if (!(plan in PLANS)) return NextResponse.json({ error: "Unknown AV Portrait plan." }, { status: 400 });
    return NextResponse.json(await createSquareCheckout(plan));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed.";
    const status = /Authentication required|Identity is required/.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
