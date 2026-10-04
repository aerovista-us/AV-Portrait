export type AVIdentity = { authenticated: boolean; subject?: string; raw?: unknown };

function identityRequired() {
  if (process.env.AV_IDENTITY_REQUIRED === "false") return false;
  if (process.env.AV_IDENTITY_REQUIRED === "true") return true;
  return process.env.NODE_ENV === "production";
}

export async function resolveAVIdentity(request: Request): Promise<AVIdentity> {
  const base = process.env.AV_IDENTITY_URL;
  if (!base) {
    if (identityRequired()) throw new Error("AeroVista Identity is required but AV_IDENTITY_URL is not configured.");
    return { authenticated: false, subject: "development-user" };
  }

  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  const cookie = request.headers.get("cookie");
  if (authorization) headers.set("authorization", authorization);
  if (cookie) headers.set("cookie", cookie);

  const response = await fetch(new URL("/v1/me", base), { method: "GET", headers, cache: "no-store" });
  if (!response.ok) {
    if (identityRequired()) throw new Error("Authentication required.");
    return { authenticated: false, subject: "development-user" };
  }

  const raw = await response.json() as Record<string, any>;
  const subject = raw?.subject ?? raw?.sub ?? raw?.user?.id ?? raw?.identity?.id ?? raw?.profile?.id;
  return { authenticated: true, subject: typeof subject === "string" ? subject : undefined, raw };
}
