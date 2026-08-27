import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AdminPortal from './components/AdminPortal.tsx';
import ComingSoonPage from './components/ComingSoonPage.tsx';
import {shouldShowComingSoon} from './comingSoon.ts';
import './index.css';

const isAdminRoute = window.location.pathname.startsWith('/admin');

// While no tickets are on sale, every public route shows the holding page.
// The admin portal stays reachable so events can be prepared behind it.
const showComingSoon = !isAdminRoute && shouldShowComingSoon();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdminRoute ? <AdminPortal /> : showComingSoon ? <ComingSoonPage /> : <App />}
  </StrictMode>,
);
