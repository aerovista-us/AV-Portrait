export const PLANS = {
  "portrait-pack": { name: "AV Portrait Pack", amount: 1900 },
  professional: { name: "AV Portrait Professional", amount: 3900 },
  "brand-kit": { name: "AV Portrait Brand Kit", amount: 6900 },
} as const;

export type PlanId = keyof typeof PLANS;

export async function createSquareCheckout(planId: PlanId) {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!token || !locationId) throw new Error("Square checkout is not configured yet.");

  const plan = PLANS[planId];
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
      idempotency_key: crypto.randomUUID(),
      quick_pay: {
        name: plan.name,
        price_money: { amount: plan.amount, currency: "USD" },
        location_id: locationId,
      },
      checkout_options: {
        redirect_url: appUrl + "/studio?checkout=complete&plan=" + planId,
      },
      payment_note: "AV Portrait plan: " + planId,
    }),
  });

  const data = await response.json() as any;
  if (!response.ok) throw new Error(data?.errors?.[0]?.detail ?? "Square could not create a checkout link.");
  const url = data?.payment_link?.url;
  if (!url) throw new Error("Square returned no checkout URL.");
  return { url, id: data.payment_link.id as string };
}
