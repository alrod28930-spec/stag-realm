import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.4cbe4fb34bf84b98ab004515dc896e22',
  appName: 'StagAlgo',
  webDir: 'dist',
  server: {
    url: 'https://4cbe4fb3-4bf8-4b98-ab00-4515dc896e22.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0F172A',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;