# AV Portrait

Consent-first professional portrait generation for AeroVista.

## Product principle

Turn authorized photos into a consistent professional image library while preserving identity, consent, and user control.

## Initial architecture

- Next.js App Router + TypeScript
- AeroVista Identity / App Adapter integration boundary
- Image-provider abstraction (first adapter: OpenAI-compatible image API)
- Square-ready checkout boundary
- Consent + ownership attestation before portrait generation
- Vercel-ready deployment
