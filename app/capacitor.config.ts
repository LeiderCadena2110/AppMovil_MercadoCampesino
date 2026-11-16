import type { CapacitorConfig } from '@capacitor/cli';

/**
 * MINGA_DEV=1 (lo pone `npm run android`) permite llamar a la API local por http
 * desde el emulador (http://10.0.2.2:3000). El APK de producción usa el esquema
 * https de Capacitor y solo habla con la API publicada por https.
 */
const desarrollo = process.env['MINGA_DEV'] === '1';

const config: CapacitorConfig = {
  appId: 'co.edu.ucc.mingaapp',
  appName: 'Minga App',
  webDir: 'dist/app/browser',
  android: {
    allowMixedContent: desarrollo,
  },
};

export default config;
