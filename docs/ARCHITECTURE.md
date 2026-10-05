# AV Portrait architecture

AV Portrait is a consent-first professional portrait application. It is not a face-search product or biometric recognition database.

## Request flow
1. AeroVista Identity resolves the account through the Identity Gateway boundary.
2. The studio requires adult status, subject authorization, and image-rights attestations.
3. The portrait route validates uploads and requested direction.
4. The image-provider boundary submits authorized references with identity-preservation instructions.
5. Square Checkout creates server-side payment links from server-owned plan IDs and prices.

## Identity / App Adapter
All account integration is isolated in `src/lib/identity.ts`. The first integration uses the existing Identity Gateway `/v1/me` surface and forwards the caller session. Production fails closed by default.

As the promoted AV App Adapter contract is finalized, replace this boundary rather than spreading adapter calls throughout the UI.

Planned capabilities: `portrait.read`, `portrait.generate`, `portrait.purchase`, `portrait.admin`.

## Image provider
The first adapter uses the OpenAI Images edit endpoint with multiple authorized references. The default model is configurable by `OPENAI_IMAGE_MODEL`. Provider replacement should not change the Studio contract.

## Billing
The browser submits a plan ID only. Price and product names are server-owned. Before paid launch, add verified Square webhooks and persistent entitlements; a redirect must never grant access by itself.

## Data posture
The MVP does not create biometric embeddings or a facial-recognition database. Before history/persistence is enabled, define encrypted storage, retention, deletion/revocation, signed uploads, and audit events.
