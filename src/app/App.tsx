import { lazy, Suspense } from 'react';
import { createBrowserRouter, createHashRouter, RouterProvider, Link } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import CommandCenter from '../pages/CommandCenter';
import { Skeleton } from '../components/ui/Panel';

const LiveMap = lazy(() => import('../pages/LiveMap'));
const Incidents = lazy(() => import('../pages/Incidents'));
const IncidentDetail = lazy(() => import('../pages/IncidentDetail'));
const RouteIntelligence = lazy(() => import('../pages/RouteIntelligence'));
const Fleet = lazy(() => import('../pages/Fleet'));
const Hospitals = lazy(() => import('../pages/Hospitals'));
const Traffic = lazy(() => import('../pages/Traffic'));
const Analytics = lazy(() => import('../pages/Analytics'));
const SettingsPage = lazy(() => import('../pages/Settings'));

function PageLoading() {
  return (
    <div className="space-y-3 p-1" aria-busy aria-label="Loading view">
      <Skeleton className="h-6 w-56" />
      <Skeleton className="h-4 w-80" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 pt-2">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

const s = (el: JSX.Element) => <Suspense fallback={<PageLoading />}>{el}</Suspense>;

function NotFound() {
  return (
    <div className="panel p-10 text-center max-w-lg mx-auto mt-10">
      <h1 className="text-lg font-semibold">Page not found</h1>
      <p className="text-sm text-mute mt-1">This view does not exist in the EPRE demo.</p>
      <Link to="/" className="inline-block mt-4 text-cyan hover:underline">Back to Command Center</Link>
    </div>
  );
}

// VITE_ROUTER=hash builds for static hosts without SPA fallback.
const createRouter = import.meta.env.VITE_ROUTER === 'hash' ? createHashRouter : createBrowserRouter;

const router = createRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <CommandCenter /> },
      { path: 'map', element: s(<LiveMap />) },
      { path: 'incidents', element: s(<Incidents />) },
      { path: 'incidents/:id', element: s(<IncidentDetail />) },
      { path: 'routes', element: s(<RouteIntelligence />) },
      { path: 'fleet', element: s(<Fleet />) },
      { path: 'hospitals', element: s(<Hospitals />) },
      { path: 'traffic', element: s(<Traffic />) },
      { path: 'analytics', element: s(<Analytics />) },
      { path: 'settings', element: s(<SettingsPage />) },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />;
}
