/**
 * Development environment.
 *
 * apiBaseUrl is a same-origin relative path so the dev server proxies /api to
 * the ASP.NET Core process (see proxy.conf.json). Going through the proxy
 * rather than an absolute http://localhost:5210 means no CORS preflight in
 * development, and the app works unchanged when tested from a phone on the LAN
 * — the phone resolves /api against whatever host served the page.
 */
export const environment = {
  production: false,
  apiBaseUrl: '/api',
};
