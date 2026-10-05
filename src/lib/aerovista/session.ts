import "server-only";

import { cookies } from "next/headers";
import type { IdentityDescriptor } from "@/vendor/aerocore-app-adapter/types";
import { getAeroVistaServerAdapter } from "./app-adapter.server";
import { AV_PORTRAIT_SESSION_COOKIE, type PortraitCapability } from "./config";

export type PortraitSession = {
  sessionToken: string;
  identity: IdentityDescriptor;
};

export async function getPortraitSession(): Promise<PortraitSession | null> {
  const store = await cookies();
  const sessionToken = store.get(AV_PORTRAIT_SESSION_COOKIE)?.value;
  if (!sessionToken) return null;

  try {
    const av = getAeroVistaServerAdapter();
    const resolved = await av.auth.resolveSession(sessionToken);
    if (!resolved.authenticated || !resolved.identityId) return null;

    const described = await av.identity.describe(sessionToken);
    if (!described.authenticated || !described.identity) return null;
    if (described.identity.identityId !== resolved.identityId) return null;

    return { sessionToken, identity: described.identity };
  } catch {
    return null;
  }
}

export async function checkPortraitCapability(
  capability: PortraitCapability,
  resourceType: string | null = null,
  resourceId: string | null = null,
) {
  const session = await getPortraitSession();
  if (!session) {
    return { allowed: false as const, session: null, reason: "not_authenticated" as const };
  }

  try {
    const decision = await getAeroVistaServerAdapter().identity.can({
      identityId: session.identity.identityId,
      capability,
      resourceType,
      resourceId,
    });
    return decision.allowed
      ? { allowed: true as const, session, reason: "allowed" as const }
      : { allowed: false as const, session, reason: "capability_denied" as const };
  } catch {
    return { allowed: false as const, session, reason: "authorization_unavailable" as const };
  }
}

export async function requirePortraitCapability(capability: PortraitCapability) {
  const decision = await checkPortraitCapability(capability);
  if (!decision.allowed || !decision.session) {
    const error = new Error(decision.reason);
    Object.assign(error, {
      code: decision.reason,
      status: decision.reason === "not_authenticated" ? 401 : 403,
    });
    throw error;
  }
  return decision.session;
}
