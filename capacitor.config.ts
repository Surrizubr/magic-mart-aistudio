import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.magicmart.app',
  appName: 'MagicMart',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '690873912766-otrpkgjojfearsa2smfj3hdjb7f8oe0k.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
