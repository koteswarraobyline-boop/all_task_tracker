/**
 * Build the client share URL for the current environment.
 * In Vite DEV this always uses window.location.origin so local testing works
 * even if the API returns a production CLIENT_APP_URL.
 */
export function resolveClientShareUrl(recordOrToken) {
  const token =
    typeof recordOrToken === 'string'
      ? recordOrToken
      : recordOrToken?.token;
  if (!token) {
    return typeof recordOrToken === 'object' ? recordOrToken?.shareUrl || '' : '';
  }
  if (import.meta.env.DEV && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/client/${token}`;
  }
  if (typeof recordOrToken === 'object' && recordOrToken?.shareUrl) {
    return recordOrToken.shareUrl;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/client/${token}`;
  }
  return `/client/${token}`;
}
