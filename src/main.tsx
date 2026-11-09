import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { useSettingsStore } from './store/settingsStore';
import { applyAppearance } from './lib/appearance';

applyAppearance(useSettingsStore.getState().settings);

// Refresh an already enabled push worker when returning to the app.
if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistration('/').then((registration) => {
    if (registration?.active?.scriptURL === new URL('/push-sw.js', window.location.origin).href) {
      return registration.update();
    }
  }).catch(() => { /* Keep using the installed worker while offline. */ });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
