import { Navigate } from '@tanstack/react-router';
import { useEffect, type ReactNode } from 'react';
import { useSessionStore } from '../stores/session';

/** Skeleton halaman saat sesi dimuat (bukan spinner). */
function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <div className="skeleton h-10 w-48" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-28" />
        ))}
      </div>
    </div>
  );
}

/** Bungkus halaman yang butuh login; opsional batasi role. */
export function RequireAuth({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: ('owner' | 'cashier')[];
}) {
  const initialized = useSessionStore((s) => s.initialized);
  const loading = useSessionStore((s) => s.loading);
  const user = useSessionStore((s) => s.user);
  const fetchMe = useSessionStore((s) => s.fetchMe);

  useEffect(() => {
    if (!initialized) void fetchMe();
  }, [initialized, fetchMe]);

  if (!initialized || loading) return <PageSkeleton />;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return <>{children}</>;
}

/** Bungkus halaman publik: yang sudah login dilempar ke dashboard. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const initialized = useSessionStore((s) => s.initialized);
  const loading = useSessionStore((s) => s.loading);
  const user = useSessionStore((s) => s.user);
  const fetchMe = useSessionStore((s) => s.fetchMe);

  useEffect(() => {
    if (!initialized) void fetchMe();
  }, [initialized, fetchMe]);

  if (!initialized || loading) return <PageSkeleton />;
  if (user) return <Navigate to="/" />;
  return <>{children}</>;
}
