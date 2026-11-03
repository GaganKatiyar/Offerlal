/**
 * Production environment.
 *
 * Points at the deployed API over HTTPS. Android blocks cleartext HTTP by
 * default, so a plain http:// host here would fail on device with an opaque
 * network error rather than anything that names the cause.
 */
export const environment = {
  production: true,
  apiBaseUrl: 'https://api.offerlal.com/api',
};
