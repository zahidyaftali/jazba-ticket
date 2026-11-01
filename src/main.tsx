import {StrictMode, Suspense, lazy} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AdminPortal from './components/AdminPortal.tsx';
import './index.css';

// The organiser portal loads on its own, so visitors never download it.
const OrganizerPortal = lazy(() => import('./components/organizer/OrganizerPortal.tsx'));

const path = window.location.pathname;
const isAdminRoute = path.startsWith('/admin');
// /organizer… is the portal; /organizers… stays the public organiser pages.
const isOrganizerRoute = /^\/organizer(\/|$)/.test(path);

const portalLoading = (
  <div style={{ minHeight: '100vh', background: '#000' }} />
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdminRoute ? (
      <AdminPortal />
    ) : isOrganizerRoute ? (
      <Suspense fallback={portalLoading}>
        <OrganizerPortal />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
