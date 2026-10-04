import { NextResponse } from "next/server";
import { resolveAVIdentity } from "@/lib/identity";
import { generatePortrait, PortraitPreset } from "@/lib/portrait/provider";

export const runtime = "nodejs";

const allowedPresets = new Set<PortraitPreset>(["executive","realtor","trades","creative","directory"]);
const imageTypes = new Set(["image/jpeg","image/png","image/webp"]);

export async function POST(request: Request) {
  try {
    const identity = await resolveAVIdentity(request);
    const form = await request.formData();

    if (form.get("adult") !== "yes" || form.get("authorized") !== "yes" || form.get("rights") !== "yes") {
      return NextResponse.json({ error: "Adult status, subject authorization and image rights must all be confirmed." }, { status: 400 });
    }

    const subjectName = String(form.get("subjectName") ?? "").trim();
    const preset = String(form.get("preset") ?? "executive") as PortraitPreset;
    const direction = String(form.get("direction") ?? "").trim();
    const images = form.getAll("images").filter((value): value is File => value instanceof File);

    if (!subjectName || subjectName.length > 80) return NextResponse.json({ error: "Enter a valid subject name." }, { status: 400 });
    if (!allowedPresets.has(preset)) return NextResponse.json({ error: "Invalid portrait direction." }, { status: 400 });
    if (images.length < 1 || images.length > 5) return NextResponse.json({ error: "Upload between 1 and 5 reference photos." }, { status: 400 });
    if (!images.every((image) => imageTypes.has(image.type))) return NextResponse.json({ error: "Reference photos must be JPEG, PNG or WebP." }, { status: 400 });
    if (images.some((image) => image.size > 12 * 1024 * 1024)) return NextResponse.json({ error: "Each reference photo must be 12 MB or smaller." }, { status: 400 });

    const result = await generatePortrait({ subjectName, preset, direction, images });

    return NextResponse.json({
      image: "data:image/png;base64," + result.imageBase64,
      provider: result.provider,
      requestId: result.requestId,
      identity: identity.subject ? "verified-session" : "session",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Portrait generation failed.";
    const status = /Authentication required|Identity is required/.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
