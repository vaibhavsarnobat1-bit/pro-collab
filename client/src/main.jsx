import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// The retired sw.js only reclaims clients once it is installed, so clear the
// stale caches from the page too — otherwise an already-cached bundle keeps
// winning on reload and the app never picks up the new build.
async function dropLegacyCaches() {
  if (!('caches' in window)) return;
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
  const registrations = await navigator.serviceWorker?.getRegistrations?.() ?? [];
  await Promise.all(registrations.map((registration) => registration.unregister()));
}

window.addEventListener('load', () => {
  if (!('serviceWorker' in navigator)) return;
  const retired = localStorage.getItem('pc-sw-retired');
  dropLegacyCaches()
    .then(() => {
      // Register once, after the purge, so the cleanup worker is not itself
      // unregistered before it has run.
      if (retired) return null;
      return navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
    })
    .catch(() => {
      /* offline support is gone by design; the app must never depend on it */
    });
  localStorage.setItem('pc-sw-retired', '1');
});
