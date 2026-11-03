/**
 * Development environment.
 *
 * Unlike the web storefront, this cannot use a relative "/api". The storefront
 * is served by a dev server that proxies /api to the API process; a Capacitor
 * WebView serves the bundle from the device itself, so a relative path resolves
 * against the device and never leaves it. The URL has to be absolute.
 *
 * And it has to be the LAN address rather than localhost: on a phone,
 * "localhost" is the phone. 10.0.2.2 would work for the Android emulator only,
 * which is not what this project tests on - the APK is installed on a real
 * device. The API must therefore be listening on the LAN, not just loopback.
 *
 * Change this to your machine's address when it moves; there is no discovery.
 */
export const environment = {
  production: false,
  apiBaseUrl: 'http://192.168.1.2:5210/api',
};
