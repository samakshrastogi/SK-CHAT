const placeholderPattern = /^(paste_|your_|change_me|example|placeholder)/i;

export const getRequiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value || placeholderPattern.test(value)) throw new Error(`${name} must be configured with a non-placeholder value`);
  return value;
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
  ['MONGODB_URI', 'FRONTEND_URL', 'BACKEND_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'SK_CENTRAL_SSO_SECRET', 'SK_CENTRAL_SERVICE_TOKEN', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].forEach(getRequiredEnv);
};
