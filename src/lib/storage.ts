import "server-only";
import { get, list, put } from "@vercel/blob";

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 180);
}

export function identityPath(identityId: string, suffix: string) {
  return `identity/${safeSegment(identityId)}/${suffix}`;
}

export async function writePrivateJson(pathname: string, value: unknown) {
  return put(pathname, JSON.stringify(value, null, 2), {
    access: "private",
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "application/json",
  });
}

export async function readPrivateJson<T>(pathname: string): Promise<T | null> {
  const found = await list({ prefix: pathname, limit: 10 });
  const blob = found.blobs.find((item) => item.pathname === pathname);
  if (!blob) return null;
  const result = await get(blob.url, { access: "private" });
  if (!result) return null;
  return new Response(result.stream).json() as Promise<T>;
}
