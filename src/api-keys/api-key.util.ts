import { createHash, randomBytes } from 'crypto';

export function generateRawApiKey() {
  return `cfk_${randomBytes(24).toString('hex')}`;
}

export function getApiKeyPrefix(rawKey: string) {
  return rawKey.slice(0, 12);
}

export function hashApiKey(rawKey: string, pepper: string) {
  return createHash('sha256').update(`${rawKey}:${pepper}`).digest('hex');
}
