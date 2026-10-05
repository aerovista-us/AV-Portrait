export const AV_PORTRAIT_APP_ID = "av_portrait" as const;
export const AV_PORTRAIT_SESSION_COOKIE = "av_portrait_session" as const;
export const PORTRAIT_CAPABILITIES = {
  access: "portrait.access",
  generate: "portrait.generate",
  profileWrite: "portrait.profile.write",
  purchase: "portrait.purchase",
  admin: "portrait.admin",
} as const;
export type PortraitCapability = (typeof PORTRAIT_CAPABILITIES)[keyof typeof PORTRAIT_CAPABILITIES];
export function safePortraitNext(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/studio";
  if (value.startsWith("/api/") || value.startsWith("/auth/callback")) return "/studio";
  return value;
}
