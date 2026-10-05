import {
  type AeroVistaServiceDefinition,
  type CapabilityRequest,
  type CapabilityResponse,
  type ContentAccessDecision,
  type ContentAccessRule,
  type HandoffExchangeResponse,
  type IdentityDescribeResponse,
  type IdentityDescriptor,
  type ServerAdapterConfig,
  type ServiceRequestOptions,
  type SessionResolveResponse,
  type SessionRevokeResponse,
} from './types.js';
import { createServiceHmacSignature } from './hmac.js';
import { evaluateContentAccess } from './content.js';
import { normalizeOrigin, normalizePath, readJsonResponse, serializeBody } from './http.js';

const DEFAULT_IDENTITY_GATEWAY = 'https://identity-api.aerovista.us';

export function createServerAppAdapter(config: ServerAdapterConfig) {
  const fetchImpl = config.fetchImpl ?? fetch;
  const now = config.now ?? (() => new Date());
  const identityGatewayOrigin = normalizeOrigin(config.identityGatewayOrigin ?? DEFAULT_IDENTITY_GATEWAY);
  const serviceMap = new Map<string, AeroVistaServiceDefinition>();

  const identityGatewayService: AeroVistaServiceDefinition = {
    id: 'identity-gateway',
    baseUrl: identityGatewayOrigin,
    auth: 'service-hmac',
    healthPath: '/health',
  };
  serviceMap.set(identityGatewayService.id, identityGatewayService);
  for (const service of config.services ?? []) {
    serviceMap.set(service.id, { ...service, baseUrl: normalizeOrigin(service.baseUrl) });
  }

  function credentialFor(serviceId: string) {
    if (serviceId === 'identity-gateway') {
      return { secret: config.identityGatewaySecret, callerId: config.appId };
    }
    const configured = config.credentials?.[serviceId];
    if (!configured) return null;
    return { secret: configured.secret, callerId: configured.callerId ?? config.appId };
  }

  async function call<T = unknown>(serviceId: string, path: string, options: ServiceRequestOptions = {}): Promise<T> {
    const service = serviceMap.get(serviceId);
    if (!service) throw new Error(`Unknown AeroVista service: ${serviceId}`);

    const method = (options.method ?? (options.body === undefined ? 'GET' : 'POST')).toUpperCase();
    const normalizedPath = normalizePath(path);
    const url = new URL(normalizedPath, `${normalizeOrigin(service.baseUrl)}/`);
    const rawBody = serializeBody(options.body);
    const headers = new Headers(options.headers);
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');
    if (rawBody && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

    if (service.auth === 'browser-session') {
      throw new Error(`Service '${serviceId}' requires browser-session auth and cannot be called by the server adapter.`);
    }

    if (service.auth === 'service-hmac') {
      const credential = credentialFor(serviceId);
      if (!credential) throw new Error(`No service credential configured for '${serviceId}'.`);
      const timestamp = now().toISOString();
      const signature = await createServiceHmacSignature({
        secret: credential.secret,
        method,
        path: url.toString(),
        timestamp,
        rawBody,
      });
      headers.set('X-AV-Service', credential.callerId.toUpperCase());
      headers.set('X-AV-Timestamp', timestamp);
      headers.set('X-AV-Signature', signature);
    }

    const { body: _ignoredBody, ...requestOptions } = options;
    const requestInit: RequestInit = {
      ...requestOptions,
      method,
      headers,
    };
    if (rawBody) requestInit.body = rawBody;

    const response = await fetchImpl(url, requestInit);
    return readJsonResponse<T>(response);
  }

  async function exchangeHandoff(code: string): Promise<HandoffExchangeResponse> {
    return call<HandoffExchangeResponse>('identity-gateway', '/v1/handoff/exchange', {
      method: 'POST',
      body: { code },
    });
  }

  async function resolveSession(sessionToken: string): Promise<SessionResolveResponse> {
    return call<SessionResolveResponse>('identity-gateway', '/v1/session/resolve', {
      method: 'POST',
      body: { sessionToken },
    });
  }

  async function revokeSession(sessionToken: string): Promise<SessionRevokeResponse> {
    return call<SessionRevokeResponse>('identity-gateway', '/v1/session/revoke', {
      method: 'POST',
      body: { sessionToken },
    });
  }

  async function describe(sessionToken: string): Promise<IdentityDescribeResponse> {
    return call<IdentityDescribeResponse>('identity-gateway', '/v1/identity/describe', {
      method: 'POST',
      body: { sessionToken },
    });
  }

  async function can(request: CapabilityRequest): Promise<CapabilityResponse> {
    return call<CapabilityResponse>('identity-gateway', '/v1/authorization/check', {
      method: 'POST',
      body: {
        identityId: request.identityId,
        capability: request.capability,
        resourceType: request.resourceType ?? null,
        resourceId: request.resourceId ?? null,
      },
    });
  }

  async function canViewIdentity(identity: IdentityDescriptor | null, rule: ContentAccessRule): Promise<ContentAccessDecision> {
    return evaluateContentAccess({ identity, rule, can });
  }

  async function canViewContent(sessionToken: string, rule: ContentAccessRule): Promise<ContentAccessDecision> {
    const described = await describe(sessionToken);
    const identity = described.authenticated ? described.identity : null;
    return canViewIdentity(identity, rule);
  }

  async function health<T = unknown>(serviceId = 'identity-gateway'): Promise<T> {
    const service = serviceMap.get(serviceId);
    if (!service) throw new Error(`Unknown AeroVista service: ${serviceId}`);
    return call<T>(serviceId, service.healthPath ?? '/health', { method: 'GET' });
  }

  return {
    appId: config.appId,
    auth: { exchangeHandoff, resolveSession, revokeSession },
    identity: { describe, can },
    content: { canView: canViewContent, canViewIdentity },
    services: { call, health },
  } as const;
}
