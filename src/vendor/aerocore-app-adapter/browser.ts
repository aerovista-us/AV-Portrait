import {
  AdapterHttpError,
  type BeginLoginOptions,
  type BeginRegistrationOptions,
  type BrowserAdapterConfig,
  type BrowserCallback,
  type BrowserCapabilityResponse,
  type BrowserHandoffExchangeResponse,
  type BrowserSessionResponse,
  type CapabilityRequest,
  type ContentAccessDecision,
  type ContentAccessRule,
  type IdentityDescriptor,
  type CompleteLoginOptions,
} from './types';
import { normalizeOrigin, normalizePath, readJsonResponse } from './http';
import { evaluateContentAccess } from './content';

const DEFAULT_ACCOUNT_ORIGIN = 'https://account.aerocoreos.com';
const DEFAULT_STATE_STORAGE_KEY = 'aerocore_handoff_state';

function getDefaultStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  if (typeof sessionStorage === 'undefined') {
    throw new Error('No sessionStorage available; provide config.storage explicitly.');
  }
  return sessionStorage;
}

function getCurrentUrl(): string {
  if (typeof window === 'undefined') {
    throw new Error('No window available; provide a callback URL explicitly.');
  }
  return window.location.href;
}

function defaultNavigate(url: string): void {
  if (typeof window === 'undefined') {
    throw new Error('No window available; provide beginLogin({ navigate }) or beginRegistration({ navigate }).');
  }
  window.location.assign(url);
}

export function createBrowserAppAdapter(config: BrowserAdapterConfig) {
  const fetchImpl = config.fetchImpl ?? fetch;
  const storage = config.storage ?? getDefaultStorage();
  const randomUUID = config.randomUUID ?? (() => crypto.randomUUID());
  const appOrigin = normalizeOrigin(config.appOrigin);
  const accountOrigin = normalizeOrigin(config.accountOrigin ?? DEFAULT_ACCOUNT_ORIGIN);
  const callbackPath = normalizePath(config.callbackPath ?? '/auth/callback');
  const accountLoginPath = normalizePath(config.accountLoginPath ?? '/login');
  const accountRegisterPath = normalizePath(config.accountRegisterPath ?? '/register');
  const stateKey = config.stateStorageKey ?? DEFAULT_STATE_STORAGE_KEY;
  const endpoints = {
    session: config.localEndpoints?.session ?? '/api/auth/session',
    handoffExchange: config.localEndpoints?.handoffExchange ?? '/api/auth/handoff-exchange',
    capabilityCheck: config.localEndpoints?.capabilityCheck ?? '/api/auth/capability-check',
    identityMe: config.localEndpoints?.identityMe ?? '/api/auth/me',
    logout: config.localEndpoints?.logout ?? '/api/auth/logout',
  };

  function buildCallbackUrl(next = '/'): URL {
    const callback = new URL(callbackPath, appOrigin);
    callback.searchParams.set('next', next.startsWith('/') ? next : '/');
    return callback;
  }

  function buildAccountUrl(path: string, next = '/', state = randomUUID()): { url: string; state: string; callbackUrl: string } {
    const callback = buildCallbackUrl(next);
    const target = new URL(path, accountOrigin);
    target.searchParams.set('client_id', config.appId);
    target.searchParams.set('return_to', callback.toString());
    target.searchParams.set('state', state);
    return { url: target.toString(), state, callbackUrl: callback.toString() };
  }

  function buildLoginUrl(next = '/', state = randomUUID()): { url: string; state: string; callbackUrl: string } {
    return buildAccountUrl(accountLoginPath, next, state);
  }

  function buildRegistrationUrl(next = '/', state = randomUUID()): { url: string; state: string; callbackUrl: string } {
    return buildAccountUrl(accountRegisterPath, next, state);
  }

  function beginLogin(options: BeginLoginOptions = {}): { url: string; state: string; callbackUrl: string } {
    const built = buildLoginUrl(options.next ?? '/', options.state ?? randomUUID());
    storage.setItem(stateKey, built.state);
    (options.navigate ?? defaultNavigate)(built.url);
    return built;
  }

  function beginRegistration(options: BeginRegistrationOptions = {}): { url: string; state: string; callbackUrl: string } {
    const built = buildRegistrationUrl(options.next ?? '/', options.state ?? randomUUID());
    storage.setItem(stateKey, built.state);
    (options.navigate ?? defaultNavigate)(built.url);
    return built;
  }

  function parseCallback(url = getCurrentUrl()): BrowserCallback {
    const parsed = new URL(url, appOrigin);
    const code = parsed.searchParams.get('code') || '';
    const state = parsed.searchParams.get('state') || '';
    const nextRaw = parsed.searchParams.get('next') || '/';
    const next = nextRaw.startsWith('/') ? nextRaw : '/';
    if (!code || !state) {
      throw new AdapterHttpError('Missing handoff code or state', {
        status: 400,
        code: 'invalid_handoff_callback',
      });
    }
    return { code, state, next };
  }

  async function exchangeHandoff(code: string): Promise<BrowserHandoffExchangeResponse> {
    const response = await fetchImpl(endpoints.handoffExchange, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ code }),
    });
    return readJsonResponse<BrowserHandoffExchangeResponse>(response);
  }

  async function completeLogin(options: CompleteLoginOptions = {}): Promise<{ next: string; exchange: BrowserHandoffExchangeResponse }> {
    const callback = parseCallback(options.url);
    const expected = storage.getItem(stateKey);
    storage.removeItem(stateKey);
    if (!expected || expected !== callback.state) {
      throw new AdapterHttpError('Sign-in state mismatch or expired state', {
        status: 400,
        code: 'handoff_state_mismatch',
      });
    }
    const exchange = await exchangeHandoff(callback.code);
    return { next: callback.next, exchange };
  }

  async function session(): Promise<BrowserSessionResponse> {
    const response = await fetchImpl(endpoints.session, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    return readJsonResponse<BrowserSessionResponse>(response);
  }

  async function me<T = unknown>(): Promise<T> {
    const response = await fetchImpl(endpoints.identityMe, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    return readJsonResponse<T>(response);
  }

  async function can(request: Omit<CapabilityRequest, 'identityId'>): Promise<BrowserCapabilityResponse> {
    const response = await fetchImpl(endpoints.capabilityCheck, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        capability: request.capability,
        resourceType: request.resourceType ?? null,
        resourceId: request.resourceId ?? null,
      }),
    });
    return readJsonResponse<BrowserCapabilityResponse>(response);
  }

  async function canViewContent(rule: ContentAccessRule): Promise<ContentAccessDecision> {
    let identity: IdentityDescriptor | null = null;
    try {
      const response = await me<Record<string, unknown>>();
      const candidate = (response && typeof response === 'object' && 'identity' in response)
        ? response.identity
        : response;
      if (candidate && typeof candidate === 'object' && 'identityId' in candidate) {
        identity = candidate as unknown as IdentityDescriptor;
      }
    } catch {
      identity = null;
    }

    return evaluateContentAccess({
      identity,
      rule,
      can: async (request) => can({
        capability: request.capability,
        resourceType: request.resourceType ?? null,
        resourceId: request.resourceId ?? null,
      }),
    });
  }

  async function logout(): Promise<void> {
    const response = await fetchImpl(endpoints.logout, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) await readJsonResponse(response);
  }

  return {
    appId: config.appId,
    auth: {
      buildLoginUrl,
      buildRegistrationUrl,
      beginLogin,
      beginRegistration,
      parseCallback,
      exchangeHandoff,
      completeLogin,
      session,
      logout,
    },
    identity: { me, can },
    content: { canView: canViewContent },
  } as const;
}
