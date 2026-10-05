import {
  type CapabilityRequest,
  type ContentAccessDecision,
  type ContentAccessMode,
  type ContentAccessRule,
  type IdentityDescriptor,
} from './types.js';

function cleanList(values: string[] | undefined): string[] {
  return [...new Set((values ?? []).map((value) => String(value || '').trim()).filter(Boolean))];
}

export interface ContentCapabilityCheck {
  (request: CapabilityRequest): Promise<{ allowed: boolean }>;
}

/**
 * Shared content-access evaluator.
 *
 * experience may be role-only, capability-only, or combine both.
 * protected always requires at least one live capability requirement.
 */
export async function evaluateContentAccess({
  identity,
  rule,
  can,
}: {
  identity: IdentityDescriptor | null;
  rule: ContentAccessRule;
  can: ContentCapabilityCheck;
}): Promise<ContentAccessDecision> {
  const rawMode = rule.mode as string | undefined;
  const invalidMode = rawMode !== undefined && rawMode !== 'experience' && rawMode !== 'protected';
  const mode: ContentAccessMode = rawMode === 'experience' ? 'experience' : 'protected';
  const allCapabilities = cleanList(rule.allCapabilities);
  const anyCapabilities = cleanList(rule.anyCapabilities);
  const roles = [...new Set(rule.roles ?? [])];
  const serviceRoles = cleanList(rule.serviceRoles);
  const resourceType = rule.resourceType == null ? null : String(rule.resourceType).trim() || null;
  const resourceId = rule.resourceId == null ? null : String(rule.resourceId).trim() || null;
  const invalidResourceScope = Boolean(resourceType) !== Boolean(resourceId);

  if (invalidMode || invalidResourceScope) {
    return {
      allowed: false,
      authenticated: Boolean(identity),
      mode,
      reason: 'invalid_policy',
      identity,
      capabilityResults: {},
    };
  }

  if (!identity) {
    return {
      allowed: false,
      authenticated: false,
      mode,
      reason: 'not_authenticated',
      identity: null,
      capabilityResults: {},
    };
  }

  if (identity.status !== 'active') {
    return {
      allowed: false,
      authenticated: true,
      mode,
      reason: 'inactive_identity',
      identity,
      capabilityResults: {},
    };
  }

  if (roles.length && !roles.includes(identity.avccRole)) {
    return {
      allowed: false,
      authenticated: true,
      mode,
      reason: 'role_mismatch',
      identity,
      capabilityResults: {},
    };
  }

  if (serviceRoles.length && !serviceRoles.some((role) => identity.serviceRoles.includes(role))) {
    return {
      allowed: false,
      authenticated: true,
      mode,
      reason: 'role_mismatch',
      identity,
      capabilityResults: {},
    };
  }

  if (mode === 'protected' && allCapabilities.length === 0 && anyCapabilities.length === 0) {
    return {
      allowed: false,
      authenticated: true,
      mode,
      reason: 'invalid_policy',
      identity,
      capabilityResults: {},
    };
  }

  const capabilityNames = [...new Set([...allCapabilities, ...anyCapabilities])];
  const capabilityResults: Record<string, boolean> = {};

  await Promise.all(capabilityNames.map(async (capability) => {
    try {
      const result = await can({
        identityId: identity.identityId,
        capability,
        resourceType,
        resourceId,
      });
      capabilityResults[capability] = result.allowed === true;
    } catch {
      capabilityResults[capability] = false;
    }
  }));

  const allAllowed = allCapabilities.every((capability) => capabilityResults[capability] === true);
  const anyAllowed = anyCapabilities.length === 0
    || anyCapabilities.some((capability) => capabilityResults[capability] === true);

  if (!allAllowed || !anyAllowed) {
    return {
      allowed: false,
      authenticated: true,
      mode,
      reason: 'capability_denied',
      identity,
      capabilityResults,
    };
  }

  return {
    allowed: true,
    authenticated: true,
    mode,
    reason: 'allowed',
    identity,
    capabilityResults,
  };
}
