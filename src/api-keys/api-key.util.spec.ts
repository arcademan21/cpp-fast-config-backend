import { generateRawApiKey, getApiKeyPrefix, hashApiKey } from './api-key.util';

describe('api-key util', () => {
  it('generates key with cfk_ prefix', () => {
    const key = generateRawApiKey();
    expect(key.startsWith('cfk_')).toBe(true);
    expect(key.length).toBeGreaterThan(10);
  });

  it('returns deterministic prefix length of 12', () => {
    const key = 'cfk_1234567890abcdef';
    expect(getApiKeyPrefix(key)).toBe('cfk_12345678');
    expect(getApiKeyPrefix(key)).toHaveLength(12);
  });

  it('hashes with pepper deterministically', () => {
    const h1 = hashApiKey('cfk_test', 'pepper');
    const h2 = hashApiKey('cfk_test', 'pepper');
    const h3 = hashApiKey('cfk_test', 'other');

    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1).toHaveLength(64);
  });
});
