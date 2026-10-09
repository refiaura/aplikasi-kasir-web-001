import { Link, useNavigate } from '@tanstack/react-router';
import { LogOut, Menu, Moon, Sun } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { useSessionStore } from '../stores/session';
import { useThemeStore } from '../stores/theme';
import { Button } from './ui/Button';
import { Sheet, SheetContent } from './ui/Sheet';

const NAV_LINK =
  'rounded-[10px] px-3 py-2 text-sm font-semibold text-tinta-muted hover:bg-kertas hover:text-tinta [&.active]:bg-pandan-50 [&.active]:text-tinta';

function navItems(role: 'owner' | 'cashier' | undefined): { to: string; label: string }[] {
  const items = [{ to: '/', label: 'Dashboard' }];
  if (role === 'cashier') {
    items.push({ to: '/kasir', label: 'Kasir' }, { to: '/riwayat', label: 'Riwayat' });
  }
  if (role === 'owner') {
    items.push(
      { to: '/produk', label: 'Produk' },
      { to: '/laporan', label: 'Laporan' },
      { to: '/pelanggan', label: 'Pelanggan' },
      { to: '/riwayat', label: 'Riwayat' },
      { to: '/perangkat', label: 'Perangkat' },
    );
  }
  return items;
}

export function AppShell({ children }: { children: ReactNode }) {
  const user = useSessionStore((s) => s.user);
  const store = useSessionStore((s) => s.store);
  const logout = useSessionStore((s) => s.logout);
  const { theme, toggle } = useThemeStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    void navigate({ to: '/login' });
  };

  const items = navItems(user?.role);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-garis bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {/* Hamburger khusus mobile */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Buka menu navigasi"
              className="flex h-10 w-10 items-center justify-center rounded-[10px] text-tinta-muted hover:bg-kertas md:hidden"
            >
              <Menu size={22} />
            </button>
            <span className="text-lg font-extrabold tracking-tight">{store?.name ?? 'Kasir'}</span>
            {/* Nav desktop */}
            <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
              {items.map((it) => (
                <Link key={it.to} to={it.to} className={NAV_LINK}>
                  {it.label}
                </Link>
              ))}
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
            <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden sm:inline-flex">
              <LogOut size={16} />
              Keluar
            </Button>
          </div>
        </div>
      </header>

      {/* Menu navigasi mobile */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" title={store?.name ?? 'Kasir'}>
          <nav className="flex flex-col gap-1" aria-label="Navigasi utama">
            {items.map((it) => (
              <Link
                key={it.to}
                to={it.to}
                onClick={() => setMenuOpen(false)}
                className="rounded-[12px] px-4 py-3 text-base font-bold text-tinta hover:bg-kertas [&.active]:bg-pandan-50 [&.active]:text-pandan-700"
              >
                {it.label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 border-t border-garis pt-4">
            <p className="px-4 text-sm text-tinta-muted">
              Masuk sebagai <span className="font-bold text-tinta">{user?.name}</span>
            </p>
            <Button variant="ghost" className="mt-2 w-full justify-start" onClick={handleLogout}>
              <LogOut size={16} />
              Keluar
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
