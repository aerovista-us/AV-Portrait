const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function canonicalServicePath(input: string | URL): string {
  const url = typeof input === 'string' ? new URL(input, 'https://adapter.invalid') : input;
  return url.pathname;
}

export function canonicalServiceMessage(
  method: string,
  path: string,
  timestamp: string,
  rawBody = '',
): string {
  return `${method.toUpperCase()}\n${canonicalServicePath(path)}\n${timestamp}\n${rawBody}`;
}

export async function createServiceHmacSignature(input: {
  secret: string;
  method: string;
  path: string;
  timestamp: string;
  rawBody?: string;
}): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(input.secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const message = canonicalServiceMessage(
    input.method,
    input.path,
    input.timestamp,
    input.rawBody ?? '',
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return toHex(new Uint8Array(signature));
}
