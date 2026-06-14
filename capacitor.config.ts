import type { CapacitorConfig } from '@capacitor/cli'

// Configuration Capacitor : enveloppe l'app web (dossier `dist`) dans une
// application native Android / iOS. `appId` = identifiant unique (XOFIX).
const config: CapacitorConfig = {
  appId: 'com.xofix.flex',
  appName: 'FLEX',
  webDir: 'dist',
  backgroundColor: '#050505',
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'always',
  },
}

export default config
