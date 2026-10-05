export type ServiceAuthMode = 'none' | 'browser-session' | 'service-hmac';

export interface AeroVistaServiceDefinition {
  id: string;
  baseUrl: string;
  auth: ServiceAuthMode;
  healthPath?: string;
}

export interface ServiceCredential {
  secret: string;
  callerId?: string;
}

export interface AdapterErrorBody {
  error?: string;
  code?: string;
  detail?: string;
  correlationId?: string;
  [key: string]: unknown;
}

export class AdapterHttpError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly correlationId: string | null;
  readonly body: unknown;

  constructor(message: string, options: {
    status: number;
    code?: string | null;
    correlationId?: string | null;
    body?: unknown;
  }) {
    super(message);
    this.name = 'AdapterHttpError';
    this.status = options.status;
    this.code = options.code ?? null;
    this.correlationId = options.correlationId ?? null;
    this.body = options.body;
  }
}

export type AvccRole = 'founder' | 'admin' | 'staff' | 'client' | 'guest';

export interface IdentityProfileSummary {
  title: string | null;
  division: string | null;
  team: string | null;
  timezone: string | null;
  locale: string | null;
}

/**
 * Safe, application-facing identity context. This describes who the signed-in
 * principal is so an app can choose an appropriate experience. It is not an
 * authorization grant: action-level decisions still go through identity.can().
 */
export interface IdentityDescriptor {
  /** Canonical AVCC users.id. Use this value for identity.can(). */
  identityId: string;
  /** Stable external/public identity alias (avi_...), when available. */
  externalIdentityId: string | null;
  email: string | null;
  name: string | null;
  status: string;
  principalType: string;
  membershipPlan: string | null;
  avccRole: AvccRole;
  effectiveRoles: string[];
  service: string | null;
  serviceRoles: string[];
  accessVersion: number;
  profile: IdentityProfileSummary;
}

export interface CapabilityRequest {
  identityId: string;
  capability: string;
  resourceType?: string | null;
  resourceId?: string | null;
}

export interface CapabilityResponse {
  ok: boolean;
  allowed: boolean;
}

export type ContentAccessMode = 'experience' | 'protected';

export interface ContentAccessRule {
  /**
   * experience: role/capability based presentation gating.
   * protected: at least one live capability requirement is mandatory.
   */
  mode?: ContentAccessMode;
  /** Optional canonical AVCC-role audience constraint (any listed role matches). */
  roles?: AvccRole[];
  /** Optional app/service-role audience constraint (any listed service role matches). */
  serviceRoles?: string[];
  /** Every capability listed here must be allowed. */
  allCapabilities?: string[];
  /** At least one capability listed here must be allowed. */
  anyCapabilities?: string[];
  /** Optional resource scope applied to every capability check. */
  resourceType?: string | null;
  resourceId?: string | null;
}

export type ContentAccessReason =
  | 'allowed'
  | 'not_authenticated'
  | 'inactive_identity'
  | 'role_mismatch'
  | 'capability_denied'
  | 'invalid_policy';

export interface ContentAccessDecision {
  allowed: boolean;
  authenticated: boolean;
  mode: ContentAccessMode;
  reason: ContentAccessReason;
  identity: IdentityDescriptor | null;
  capabilityResults: Record<string, boolean>;
}

export interface ServerContentAccessRequest {
  sessionToken: string;
  rule: ContentAccessRule;
}

export interface HandoffExchangeResponse {
  ok: boolean;
  sessionToken: string;
  csrfToken: string;
  cookieName: string;
  expiresAt: string;
  /** Optional during rolling upgrades; missing/null means render least privilege and call describe(). */
  identity?: IdentityDescriptor | null;
}

export interface SessionResolveResponse {
  ok: boolean;
  authenticated: boolean;
  identityId: string | null;
}

export interface IdentityDescribeResponse {
  ok: boolean;
  authenticated: boolean;
  identity: IdentityDescriptor | null;
}

export interface SessionRevokeResponse {
  ok: boolean;
  revoked: boolean;
}

export interface BrowserSessionResponse {
  authenticated: boolean;
  [key: string]: unknown;
}

export interface BrowserCapabilityResponse {
  allowed: boolean;
  [key: string]: unknown;
}

export interface BrowserHandoffExchangeResponse {
  ok?: boolean;
  identity?: IdentityDescriptor | null;
  [key: string]: unknown;
}

export interface BrowserAdapterConfig {
  appId: string;
  appOrigin: string;
  accountOrigin?: string;
  accountLoginPath?: string;
  accountRegisterPath?: string;
  callbackPath?: string;
  stateStorageKey?: string;
  localEndpoints?: {
    session?: string;
    handoffExchange?: string;
    capabilityCheck?: string;
    identityMe?: string;
    logout?: string;
  };
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  fetchImpl?: typeof fetch;
  randomUUID?: () => string;
}

export interface BeginLoginOptions {
  next?: string;
  state?: string;
  navigate?: (url: string) => void;
}

export type BeginRegistrationOptions = BeginLoginOptions;

export interface BrowserCallback {
  code: string;
  state: string;
  next: string;
}

export interface CompleteLoginOptions {
  url?: string;
}

export interface ServerAdapterConfig {
  appId: string;
  identityGatewayOrigin?: string;
  identityGatewaySecret: string;
  services?: AeroVistaServiceDefinition[];
  credentials?: Record<string, ServiceCredential>;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

export interface ServiceRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}
