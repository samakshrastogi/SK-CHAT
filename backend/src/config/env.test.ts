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
});