import "server-only";

import { list } from "@vercel/blob";
import { identityPath, readPrivateJson, writePrivateJson } from "./storage";
import type { PlanId } from "./square";

export type PurchaseRecord = {
  version: 1;
  purchaseId: string;
  identityId: string;
  planId: PlanId;
  amount: number;
  currency: "USD";
  status: "pending" | "paid" | "failed" | "refunded";
  paymentLinkId: string;
  orderId: string;
  createdAt: string;
  updatedAt: string;
  paymentId?: string;
};

export type PortraitEntitlement = {
  version: 1;
  entitlementId: string;
  purchaseId: string;
  identityId: string;
  planId: PlanId;
  status: "active" | "revoked";
  generationUnits: number;
  grantedAt: string;
  paymentId: string;
};

const planUnits: Record<PlanId, number> = {
  "portrait-pack": 10,
  professional: 30,
  "brand-kit": 30,
};

export function purchasePath(orderId: string) {
  return `purchases/by-order/${orderId.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`;
}

export async function savePurchase(record: PurchaseRecord) {
  await writePrivateJson(purchasePath(record.orderId), record);
  return record;
}

export async function getPurchaseByOrder(orderId: string) {
  return readPrivateJson<PurchaseRecord>(purchasePath(orderId));
}

export async function grantPurchaseEntitlement(purchase: PurchaseRecord, paymentId: string) {
  const now = new Date().toISOString();
  const entitlement: PortraitEntitlement = {
    version: 1,
    entitlementId: `purchase:${purchase.purchaseId}`,
    purchaseId: purchase.purchaseId,
    identityId: purchase.identityId,
    planId: purchase.planId,
    status: "active",
    generationUnits: planUnits[purchase.planId],
    grantedAt: now,
    paymentId,
  };

  await writePrivateJson(
    identityPath(purchase.identityId, `entitlements/${purchase.purchaseId}.json`),
    entitlement,
  );

  await savePurchase({ ...purchase, status: "paid", paymentId, updatedAt: now });
  return entitlement;
}

export async function listEntitlements(identityId: string) {
  const prefix = identityPath(identityId, "entitlements/");
  const found = await list({ prefix, limit: 100 });
  const records = await Promise.all(
    found.blobs.map((blob) => readPrivateJson<PortraitEntitlement>(blob.pathname)),
  );
  return records.filter((value): value is PortraitEntitlement => Boolean(value));
}

export async function hasWebhookEvent(eventId: string) {
  const safe = eventId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return Boolean(await readPrivateJson(`webhooks/square/${safe}.json`));
}

export async function recordWebhookEvent(eventId: string, data: unknown) {
  const safe = eventId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return writePrivateJson(
    `webhooks/square/${safe}.json`,
    { eventId, processedAt: new Date().toISOString(), data },
  );
}
