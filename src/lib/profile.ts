import "server-only";
import { identityPath, readPrivateJson, writePrivateJson } from "./storage";

export type VisualIdentityProfile = {
  version: 1;
  identityId: string;
  subjectLabel: string;
  preferredPreset: "executive" | "realtor" | "trades" | "creative" | "directory";
  wardrobeNotes: string;
  backgroundNotes: string;
  framingNotes: string;
  appearanceNotes: string;
  consentVersion: "2026-10-v1";
  consentConfirmedAt: string;
  updatedAt: string;
};

function path(identityId: string) {
  return identityPath(identityId, "visual-profile.json");
}

export async function getVisualIdentityProfile(identityId: string) {
  return readPrivateJson<VisualIdentityProfile>(path(identityId));
}

export async function saveVisualIdentityProfile(
  identityId: string,
  input: Omit<VisualIdentityProfile, "version" | "identityId" | "updatedAt" | "consentVersion">,
) {
  const profile: VisualIdentityProfile = {
    version: 1,
    identityId,
    consentVersion: "2026-10-v1",
    updatedAt: new Date().toISOString(),
    ...input,
  };
  await writePrivateJson(path(identityId), profile);
  return profile;
}
