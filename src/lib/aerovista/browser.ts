"use client";

import { createBrowserAppAdapter } from "@/vendor/aerocore-app-adapter/browser";
import { AV_PORTRAIT_APP_ID } from "./config";

export function createAVPortraitBrowserAdapter() {
  return createBrowserAppAdapter({
    appId: AV_PORTRAIT_APP_ID,
    appOrigin: window.location.origin,
    callbackPath: "/auth/callback",
    localEndpoints: {
      session: "/api/auth/session",
      handoffExchange: "/api/auth/handoff-exchange",
      capabilityCheck: "/api/auth/capability-check",
      identityMe: "/api/auth/me",
      logout: "/api/auth/logout",
    },
  });
}
