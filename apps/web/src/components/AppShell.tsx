import { Link, useNavigate } from '@tanstack/react-router';
import { LogOut, Moon, Sun } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { useSessionStore } from '../stores/session';
import { useThemeStore } from '../stores/theme';
import { Button } from './ui/Button';

export function AppShell({ children }: { children: ReactNode }) {
  const user = useSessionStore((s) => s.user);
  const store = useSessionStore((s) => s.store);
  const logout = useSessionStore((s) => s.logout);
  const { theme, toggle } = useThemeStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    void navigate({ to: '/login' });
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-garis bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <span className="text-lg font-extrabold tracking-tight">{store?.name ?? 'Kasir'}</span>
            <nav className="flex items-center gap-1" aria-label="Navigasi utama">
              <Link
                to="/"
                className="rounded-[10px] px-3 py-2 text-sm font-semibold text-tinta-muted hover:bg-kertas hover:text-tinta [&.active]:bg-pandan-50 [&.active]:text-tinta"
              >
                Dashboard
              </Link>
              {user?.role === 'owner' ? (
                <Link
                  to="/perangkat"
                  className="rounded-[10px] px-3 py-2 text-sm font-semibold text-tinta-muted hover:bg-kertas hover:text-tinta [&.active]:bg-pandan-50 [&.active]:text-tinta"
                >
                  Perangkat
                </Link>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              aria-label={theme === 'light' ? 'Aktifkan mode gelap' : 'Aktifkan mode terang'}
              className="flex h-10 w-10 items-center justify-center rounded-[10px] text-tinta-muted hover:bg-kertas"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <span className="hidden items-center gap-2 sm:flex">
              <span className="text-sm font-semibold">{user?.name}</span>
              <span
                className={cn(
                  'rounded-[999px] px-2.5 py-1 text-xs font-bold',
                  user?.role === 'owner' ? 'bg-pandan-50 text-pandan-600' : 'bg-kunyit-50 text-tinta',
                )}
              >
                {user?.role === 'owner' ? 'Pemilik' : 'Kasir'}
              </span>
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut size={16} />
              Keluar
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
