import { NextResponse } from "next/server";
import { PORTRAIT_CAPABILITIES } from "@/lib/aerovista/config";
import { requirePortraitCapability } from "@/lib/aerovista/session";
import { getVisualIdentityProfile, saveVisualIdentityProfile } from "@/lib/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const presets = new Set(["executive", "realtor", "trades", "creative", "directory"]);

export async function GET() {
  try {
    const session = await requirePortraitCapability(PORTRAIT_CAPABILITIES.access);
    const profile = await getVisualIdentityProfile(session.identity.identityId);
    return NextResponse.json({ profile }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const status = Number((error as { status?: number }).status || 500);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Profile unavailable." }, { status });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requirePortraitCapability(PORTRAIT_CAPABILITIES.profileWrite);
    const body = await request.json() as Record<string, unknown>;

    const subjectLabel = String(body.subjectLabel || "").trim().slice(0, 80);
    const preferredPreset = String(body.preferredPreset || "executive");
    if (!subjectLabel) return NextResponse.json({ error: "Subject label is required." }, { status: 400 });
    if (!presets.has(preferredPreset)) return NextResponse.json({ error: "Invalid portrait preset." }, { status: 400 });
    if (body.consentConfirmed !== true) return NextResponse.json({ error: "Consent confirmation is required." }, { status: 400 });

    const clean = (value: unknown, max = 500) => String(value || "").trim().slice(0, max);
    const profile = await saveVisualIdentityProfile(session.identity.identityId, {
      subjectLabel,
      preferredPreset: preferredPreset as "executive" | "realtor" | "trades" | "creative" | "directory",
      wardrobeNotes: clean(body.wardrobeNotes),
      backgroundNotes: clean(body.backgroundNotes),
      framingNotes: clean(body.framingNotes),
      appearanceNotes: clean(body.appearanceNotes),
      consentConfirmedAt: new Date().toISOString(),
    });

    return NextResponse.json({ profile }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const status = Number((error as { status?: number }).status || 500);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Profile save failed." }, { status });
  }
}
