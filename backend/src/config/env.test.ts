import { afterEach, describe, expect, it } from 'vitest';
import { isConfiguredEnvValue, validateProductionEnv } from './env.js';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

const setRequiredProductionEnv = () => {
  Object.assign(process.env, {
    NODE_ENV: 'production',
    MONGODB_URI: 'mongodb://database/app',
    MONGODB_DATABASE: 'sk_connect',
    FRONTEND_URL: 'https://connect.example.com',
    BACKEND_URL: 'https://api.example.com',
    JWT_ACCESS_SECRET: 'access-secret',
    JWT_REFRESH_SECRET: 'refresh-secret',
    SK_CENTRAL_SSO_SECRET: 'sso-secret',
    SK_CENTRAL_SERVICE_TOKEN: 'service-token',
    MALWARE_SCAN_REQUIRED: 'false',
  });
};

describe('production environment validation', () => {
  it('treats placeholder values as unconfigured', () => {
    expect(isConfiguredEnvValue('paste_cloudinary_name')).toBe(false);
    expect(isConfiguredEnvValue('real-cloud-name')).toBe(true);
  });

  it('allows Cloudinary to be omitted or left as deployment placeholders', () => {
    setRequiredProductionEnv();
    process.env.CLOUDINARY_CLOUD_NAME = 'paste_cloudinary_name';
    process.env.CLOUDINARY_API_KEY = 'paste_cloudinary_key';
    process.env.CLOUDINARY_API_SECRET = 'paste_cloudinary_secret';

    expect(() => validateProductionEnv()).not.toThrow();
  });

  it('rejects a partially configured Cloudinary integration', () => {
    setRequiredProductionEnv();
    process.env.CLOUDINARY_CLOUD_NAME = 'real-cloud-name';
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;

    expect(() => validateProductionEnv()).toThrow(/must either all be configured or all be omitted/);
  });

  it('requires persistent media credentials when enforcement is enabled', () => {
    setRequiredProductionEnv();
    process.env.REQUIRE_PERSISTENT_MEDIA = 'true';
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
    expect(() => validateProductionEnv()).toThrow(/CLOUDINARY_CLOUD_NAME/);
  });

  it('requires TURN URLs and a secret for enforced Coturn deployments', () => {
    setRequiredProductionEnv();
    process.env.REQUIRE_TURN = 'true';
    process.env.TURN_PROVIDER = 'coturn';
    delete process.env.TURN_URLS;
    delete process.env.TURN_SHARED_SECRET;
    expect(() => validateProductionEnv()).toThrow(/TURN_URLS/);
  });

  it('accepts Cloudflare TURN credentials without Coturn variables', () => {
    setRequiredProductionEnv();
    process.env.REQUIRE_TURN = 'true';
    process.env.TURN_PROVIDER = 'cloudflare';
    process.env.CLOUDFLARE_TURN_TOKEN_ID = 'turn-token-id';
    process.env.CLOUDFLARE_TURN_API_TOKEN = 'turn-api-token';
    delete process.env.TURN_URLS;
    delete process.env.TURN_SHARED_SECRET;
    expect(() => validateProductionEnv()).not.toThrow();
  });

  it('requires both Cloudflare TURN credential fields', () => {
    setRequiredProductionEnv();
    process.env.TURN_PROVIDER = 'cloudflare';
    process.env.CLOUDFLARE_TURN_TOKEN_ID = 'turn-token-id';
    delete process.env.CLOUDFLARE_TURN_API_TOKEN;
    expect(() => validateProductionEnv()).toThrow(/CLOUDFLARE_TURN_API_TOKEN/);
  });

  it('accepts Cloudmersive malware scanning without a generic scanner URL', () => {
    setRequiredProductionEnv();
    process.env.MALWARE_SCAN_REQUIRED = 'true';
    process.env.MALWARE_SCAN_PROVIDER = 'cloudmersive';
    process.env.CLOUDMERSIVE_API_KEY = 'cloudmersive-key';
    delete process.env.MALWARE_SCAN_URL;
    expect(() => validateProductionEnv()).not.toThrow();
  });

  it('requires the Cloudmersive key when malware scanning is enforced', () => {
    setRequiredProductionEnv();
    process.env.MALWARE_SCAN_REQUIRED = 'true';
    process.env.MALWARE_SCAN_PROVIDER = 'cloudmersive';
    delete process.env.CLOUDMERSIVE_API_KEY;
    expect(() => validateProductionEnv()).toThrow(/CLOUDMERSIVE_API_KEY/);
  });

  it('requires Redis when realtime enforcement is enabled', () => {
    setRequiredProductionEnv();
    process.env.REQUIRE_REDIS = 'true';
    delete process.env.REDIS_URL;
    expect(() => validateProductionEnv()).toThrow(/REDIS_URL/);
  });
});
