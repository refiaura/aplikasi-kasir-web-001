import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { AppShell } from './components/AppShell';
import { GuestOnly, RequireAuth } from './components/guards';
import { InstallPrompt } from './components/InstallPrompt';
import { ToastProvider } from './components/ui/Toast';
import { DashboardPage } from './pages/DashboardPage';
import { KasirPage } from './pages/KasirPage';
import { ProductsPage } from './pages/ProductsPage';
import { DevicesPage } from './pages/DevicesPage';
import { ReportsPage } from './pages/ReportsPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { SalesHistoryPage } from './pages/SalesHistoryPage';
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
      <InstallPrompt />
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

const productsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/produk',
  component: () => (
    <RequireAuth roles={['owner']}>
      <AppShell>
        <ProductsPage />
      </AppShell>
    </RequireAuth>
  ),
});

const kasirRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/kasir',
  component: () => (
    <RequireAuth roles={['cashier']}>
      <AppShell>
        <KasirPage />
      </AppShell>
    </RequireAuth>
  ),
});

const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/laporan',
  component: () => (
    <RequireAuth roles={['owner']}>
      <AppShell>
        <ReportsPage />
      </AppShell>
    </RequireAuth>
  ),
});

const customersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pelanggan',
  component: () => (
    <RequireAuth>
      <AppShell>
        <CustomersPage />
      </AppShell>
    </RequireAuth>
  ),
});

const customerDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pelanggan/$id',
  component: () => (
    <RequireAuth>
      <AppShell>
        <CustomerDetailPage />
      </AppShell>
    </RequireAuth>
  ),
});

const salesHistoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/riwayat',
  component: () => (
    <RequireAuth>
      <AppShell>
        <SalesHistoryPage />
      </AppShell>
    </RequireAuth>
  ),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  pinRoute,
  productsRoute,
  kasirRoute,
  devicesRoute,
  reportsRoute,
  customersRoute,
  customerDetailRoute,
  salesHistoryRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
