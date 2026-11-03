import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Set CAP_DEV=1 when building an APK that talks to the development API over
 * the LAN. It defaults to off, so a release build never picks this up by
 * accident.
 */
const isDevBuild = process.env['CAP_DEV'] === '1';

const config: CapacitorConfig = {
  appId: 'com.offerlal.app',
  appName: 'OfferlalMobile',
  webDir: 'www',

  android: {
    /**
     * Lets the WebView load http content while it is itself served over https.
     *
     * Capacitor serves the bundle from https://localhost on Android. The
     * development API runs as plain http on the LAN, and an https page calling
     * an http URL is mixed content — which the WebView blocks BEFORE Android's
     * cleartext rules are consulted, so the debug network-security config alone
     * is not enough. The request fails with no useful error; it simply never
     * happens.
     *
     * Off unless CAP_DEV=1, because in production the API is https and this
     * would only weaken the app.
     */
    allowMixedContent: isDevBuild,
  },
};

export default config;
