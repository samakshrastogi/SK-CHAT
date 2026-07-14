const centralApiUrl = (import.meta.env.VITE_SK_CENTRAL_AUTH_URL || 'https://www.sk-hub.in/api').replace(/\/$/, '');
export const CENTRAL_LOGIN_URL = import.meta.env.VITE_SK_CENTRAL_LOGIN_URL || 'https://www.sk-hub.in/login';
export const CENTRAL_PROFILE_URL = import.meta.env.VITE_SK_CENTRAL_PROFILE_URL || 'https://www.sk-hub.in/profile';

export const redirectToCentralLogin = () => {
  window.location.assign(`${CENTRAL_LOGIN_URL}?returnTo=${encodeURIComponent(window.location.href)}`);
};

export const requestCentralAppToken = async () => {
  const response = await fetch(`${centralApiUrl}/auth/app-token?appId=sk-chat`, { credentials: 'include', headers: { Accept: 'application/json' } });
  if (!response.ok) throw Object.assign(new Error('SK Central login required'), { status: response.status });
  const body = await response.json() as { data?: { token?: string } };
  if (!body.data?.token) throw new Error('SK Central did not return an application token');
  return body.data.token;
};

export const logoutFromCentral = async () => {
  await fetch(`${centralApiUrl}/auth/global-logout`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } }).catch(() => undefined);
};
