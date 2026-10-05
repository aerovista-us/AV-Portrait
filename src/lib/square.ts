import "server-only";
import { savePurchase } from "./entitlements";

export const PLANS = {
  "portrait-pack": { name: "AV Portrait Pack", amount: 1900 },
  professional: { name: "AV Portrait Professional", amount: 3900 },
  "brand-kit": { name: "AV Portrait Brand Kit", amount: 6900 },
} as const;

export type PlanId = keyof typeof PLANS;

export async function createSquareCheckout(planId: PlanId, identityId: string) {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!token || !locationId) throw new Error("Square checkout is not configured yet.");

  const plan = PLANS[planId];
  const purchaseId = crypto.randomUUID();
  const sandbox = process.env.SQUARE_ENV !== "production";
  const base = sandbox ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const response = await fetch(base + "/v2/online-checkout/payment-links", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
      "Square-Version": process.env.SQUARE_API_VERSION ?? "2026-09-16",
    },
    body: JSON.stringify({
      idempotency_key: purchaseId,
      quick_pay: {
        name: plan.name,
        price_money: { amount: plan.amount, currency: "USD" },
        location_id: locationId,
      },
      checkout_options: {
        redirect_url: appUrl + "/studio?checkout=complete&purchase=" + purchaseId,
      },
      payment_note: "AV Portrait purchase " + purchaseId + " / " + planId,
    }),
  });

  const data = await response.json() as any;
  if (!response.ok) throw new Error(data?.errors?.[0]?.detail ?? "Square could not create a checkout link.");
  const paymentLink = data?.payment_link;
  if (!paymentLink?.url || !paymentLink?.id || !paymentLink?.order_id) {
    throw new Error("Square returned an incomplete checkout link.");
  }

  const now = new Date().toISOString();
  await savePurchase({
    version: 1,
    purchaseId,
    identityId,
    planId,
    amount: plan.amount,
    currency: "USD",
    status: "pending",
    paymentLinkId: paymentLink.id,
    orderId: paymentLink.order_id,
    createdAt: now,
    updatedAt: now,
  });

  return { url: paymentLink.url as string, id: paymentLink.id as string, purchaseId };
}
