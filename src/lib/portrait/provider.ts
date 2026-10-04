export type PortraitPreset = "executive" | "realtor" | "trades" | "creative" | "directory";
export type PortraitRequest = { subjectName: string; images: File[]; preset: PortraitPreset; direction?: string };
export type PortraitResult = { imageBase64: string; provider: string; requestId?: string };

const presetPrompts: Record<PortraitPreset, string> = {
  executive: "premium executive headshot, restrained modern business wardrobe, editorial corporate photography",
  realtor: "approachable real estate professional portrait, polished wardrobe, bright high-end property or neutral studio context",
  trades: "confident contractor or skilled-trades professional portrait, clean workwear or business-casual presentation, authentic professional environment",
  creative: "refined creative-professional portrait, expressive but credible wardrobe, editorial studio lighting",
  directory: "clean consistent team-directory portrait, neutral background, straightforward professional wardrobe, even flattering light",
};

function buildPrompt(input: PortraitRequest) {
  const lines = [
    "Create a professional portrait of the same consenting adult shown in every supplied reference image (" + input.subjectName + ").",
    "Preserve the subject's recognizable facial features and overall identity. Keep facial structure, apparent age, skin tone, hairline, hairstyle, eye shape, nose, mouth, facial hair, glasses when present, and natural proportions consistent with the references.",
    "Do not transform the person into a different identity. Change only presentation elements such as scene, lighting, framing, wardrobe, and background.",
    "Portrait direction: " + presetPrompts[input.preset] + ".",
    input.direction?.trim() ? "Additional presentation direction: " + input.direction.trim() : "",
    "Photorealistic professional photography. Natural skin texture. Realistic eyes and teeth. No text, logos, watermarks, duplicate people or extra limbs.",
  ];
  return lines.filter(Boolean).join("\n");
}

export async function generatePortrait(input: PortraitRequest): Promise<PortraitResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Image generation is not configured yet. OPENAI_API_KEY is missing.");

  const form = new FormData();
  form.append("model", process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2.5-sunburst");
  form.append("prompt", buildPrompt(input));
  form.append("quality", "high");
  form.append("size", "1024x1536");
  for (const image of input.images) form.append("image[]", image, image.name || "reference.jpg");

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey },
    body: form,
  });

  const requestId = response.headers.get("x-request-id") ?? undefined;
  const data = await response.json() as any;
  if (!response.ok) throw new Error(data?.error?.message ?? "The image provider rejected the generation request.");
  const imageBase64 = data?.data?.[0]?.b64_json;
  if (!imageBase64 || typeof imageBase64 !== "string") throw new Error("The image provider returned no portrait.");

  return {
    imageBase64,
    provider: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2.5-sunburst",
    requestId,
  };
}
