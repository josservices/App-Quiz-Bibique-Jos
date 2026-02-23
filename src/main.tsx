import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles.css';

registerSW({
  immediate: false,
  onRegisteredSW(swUrl) {
    console.info(`Service Worker enregistré: ${swUrl}`);
  },
  onNeedRefresh() {
    console.info('Mise à jour disponible. Rechargez la page pour appliquer la nouvelle version.');
  },
  onOfflineReady() {
    console.info('Application prête pour un usage hors ligne.');
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
