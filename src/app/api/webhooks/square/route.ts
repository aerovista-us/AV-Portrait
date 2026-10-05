import { NextResponse } from "next/server";
import {
  getPurchaseByOrder,
  grantPurchaseEntitlement,
  hasWebhookEvent,
  recordWebhookEvent,
} from "@/lib/entitlements";
import { verifySquareWebhookSignature } from "@/lib/square-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const notificationUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL || "";
  const signature = request.headers.get("x-square-hmacsha256-signature");

  if (!verifySquareWebhookSignature(rawBody, signature, notificationUrl)) {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as any;
  const eventId = String(event?.event_id || "").trim();
  if (!eventId) return NextResponse.json({ error: "MISSING_EVENT_ID" }, { status: 400 });

  if (await hasWebhookEvent(eventId)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  if (event?.type !== "payment.updated") {
    await recordWebhookEvent(eventId, { ignored: true, type: event?.type || null });
    return NextResponse.json({ ok: true, ignored: true });
  }

  const payment = event?.data?.object?.payment;
  if (!payment?.id || !payment?.order_id) {
    await recordWebhookEvent(eventId, { ignored: true, reason: "missing_payment_or_order" });
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (payment.status !== "COMPLETED") {
    await recordWebhookEvent(eventId, {
      ignored: true,
      paymentId: payment.id,
      status: payment.status || null,
    });
    return NextResponse.json({ ok: true, ignored: true, status: payment.status || null });
  }

  const purchase = await getPurchaseByOrder(payment.order_id);
  if (!purchase) {
    await recordWebhookEvent(eventId, { unknownOrder: payment.order_id, paymentId: payment.id });
    return NextResponse.json({ ok: true, unknown: true });
  }

  const paidAmount = Number(payment?.amount_money?.amount ?? -1);
  const currency = String(payment?.amount_money?.currency || "");
  if (paidAmount !== purchase.amount || currency !== purchase.currency) {
    return NextResponse.json({ error: "PAYMENT_MISMATCH" }, { status: 409 });
  }

  const entitlement = await grantPurchaseEntitlement(purchase, payment.id);
  await recordWebhookEvent(eventId, {
    purchaseId: purchase.purchaseId,
    entitlementId: entitlement.entitlementId,
    paymentId: payment.id,
  });

  return NextResponse.json({ ok: true, applied: true, entitlement });
}
