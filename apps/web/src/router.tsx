import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { AppShell } from './components/AppShell';
import { GuestOnly, RequireAuth } from './components/guards';
import { ToastProvider } from './components/ui/Toast';
import { DashboardPage } from './pages/DashboardPage';
import { DevicesPage } from './pages/DevicesPage';
import { LoginPage } from './pages/LoginPage';
import { PinPage } from './pages/PinPage';
import { RegisterPage } from './pages/RegisterPage';

/**
 * Routing berbasis kode (tanpa codegen) agar typecheck/build deterministik di CI.
 * Lihat D9 di docs/DECISIONS.md.
 */
const rootRoute = createRootRoute({
  component: () => (
    <ToastProvider>
      <Outlet />
    </ToastProvider>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => (
    <RequireAuth>
      <AppShell>
        <DashboardPage />
      </AppShell>
    </RequireAuth>
  ),
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => (
    <GuestOnly>
      <LoginPage />
    </GuestOnly>
  ),
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/daftar',
  component: () => (
    <GuestOnly>
      <RegisterPage />
    </GuestOnly>
  ),
});

const pinRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pin',
  component: () => (
    <GuestOnly>
      <PinPage />
    </GuestOnly>
  ),
});

const devicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/perangkat',
  component: () => (
    <RequireAuth roles={['owner']}>
      <AppShell>
        <DevicesPage />
      </AppShell>
    </RequireAuth>
  ),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  pinRoute,
  devicesRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
