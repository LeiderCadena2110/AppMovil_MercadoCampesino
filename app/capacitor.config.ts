import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.edu.ucc.mercadocampesino',
  appName: 'Mercado Campesino',
  webDir: 'dist/app/browser',
  server: {
    // Permite llamar a la API por http mientras desarrollas.
    // Quitar cuando la API esté publicada con https.
    androidScheme: 'http',
    cleartext: true,
  },
};

export default config;
