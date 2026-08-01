const placeholderPattern = /^(paste_|your_|change_me|example|placeholder)/i;

export const isConfiguredEnvValue = (value?: string): value is string =>
  Boolean(value?.trim() && !placeholderPattern.test(value.trim()));

export const getRequiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!isConfiguredEnvValue(value)) throw new Error(`${name} must be configured with a non-placeholder value`);
  return value;
};
const validateOptionalGroup = (names: string[]) => {
  const configured = names.filter((name) => isConfiguredEnvValue(process.env[name]));
  if (configured.length > 0 && configured.length < names.length) {
    throw new Error(`${names.join(', ')} must either all be configured or all be omitted`);
  }
};

export const getJwtAccessSecret = () => getRequiredEnv('JWT_ACCESS_SECRET');
export const getJwtRefreshSecret = () => getRequiredEnv('JWT_REFRESH_SECRET');
export const parseAllowedOrigins = (): string[] => {
  const values = [process.env.FRONTEND_URL, ...(process.env.ALLOWED_ORIGINS || '').split(','),
    process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:3000',
    process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:5173'];
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
};
export const validateProductionEnv = () => {
  if (process.env.NODE_ENV !== 'production') return;
  if (process.env.TURN_URLS || process.env.REQUIRE_TURN === 'true') {
    getRequiredEnv('TURN_URLS');
    getRequiredEnv('TURN_SHARED_SECRET');
  }
  if (process.env.MALWARE_SCAN_REQUIRED === 'true') getRequiredEnv('MALWARE_SCAN_URL');
  validateOptionalGroup(['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']);
  if (process.env.REQUIRE_PERSISTENT_MEDIA === 'true') {
    ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].forEach(getRequiredEnv);
  }
  if (process.env.REQUIRE_REDIS === 'true') getRequiredEnv('REDIS_URL');
  ['MONGODB_URI', 'MONGODB_DATABASE', 'FRONTEND_URL', 'BACKEND_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'SK_CENTRAL_SSO_SECRET', 'SK_CENTRAL_SERVICE_TOKEN'].forEach(getRequiredEnv);
};
