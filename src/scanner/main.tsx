// Jazba Scan — the door check-in app, served at /scan (see scan.html).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ScannerApp from './ScannerApp';
import '../index.css';
import './scanner.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ScannerApp />
  </StrictMode>,
);

// Lets phones install the scanner as an app.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/scan-sw.js', { scope: '/scan' }).catch((err) => console.warn('Scanner service worker:', err));
  });
}
