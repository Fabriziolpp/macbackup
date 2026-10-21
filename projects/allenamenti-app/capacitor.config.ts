import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fabriziolp.allenamenti',
  appName: 'Allenamenti',
  server: {
    // Punta alla URL Vercel — app come WebView nativa
    url: 'https://allenamenti-app.vercel.app',
    cleartext: false
  }
};

export default config;
