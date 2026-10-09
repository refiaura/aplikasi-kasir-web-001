import { useEffect, useState } from 'react';
import { Button } from './ui/Button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Banner "Install aplikasi" saat browser menawarkan PWA (Fase 5). */
export function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!evt || dismissed) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 rounded-[14px] border border-garis bg-surface p-4 shadow-lg" role="dialog" aria-label="Install aplikasi">
      <p className="font-bold">Install aplikasi kasir?</p>
      <p className="mt-1 text-sm text-tinta-muted">
        Biar bisa dibuka dari layar utama dan dipakai offline.
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          onClick={() => {
            void evt.prompt();
            setEvt(null);
          }}
        >
          Install
        </Button>
        <Button variant="secondary" onClick={() => setDismissed(true)}>
          Nanti
        </Button>
      </div>
    </div>
  );
}
