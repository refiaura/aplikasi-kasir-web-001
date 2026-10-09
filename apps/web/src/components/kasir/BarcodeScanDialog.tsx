import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { Dialog, DialogContent } from '../ui/Dialog';

interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
}

function getDetector(): BarcodeDetectorLike | null {
  const Ctor = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    return new Ctor({ formats: ['ean_13', 'ean_8', 'code_128', 'qr_code'] });
  } catch {
    return null;
  }
}

/**
 * Pindai barcode via kamera (BarcodeDetector). Tanpa fallback ZXing —
 * bila tidak didukung, pengguna tetap bisa ketik/cari manual (D35).
 */
export function BarcodeScanDialog({
  open,
  onClose,
  onScan,
}: {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!open) return;
    const detector = getDetector();
    if (!detector) {
      setError('Kamera scan tidak didukung di browser ini. Ketik kode secara manual.');
      return;
    }
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    setError(null);
    setScanning(true);

    const tick = async () => {
      if (stopped || !videoRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        if (codes.length > 0 && codes[0]?.rawValue) {
          onScan(codes[0].rawValue);
          handleClose();
          return;
        }
      } catch {
        // Abaikan frame gagal; coba lagi.
      }
      raf = requestAnimationFrame(tick);
    };

    const handleClose = () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      setScanning(false);
      onClose();
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          raf = requestAnimationFrame(tick);
        }
      } catch {
        setError('Tidak bisa mengakses kamera. Periksa izin kamera.');
        setScanning(false);
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      setScanning(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent title="Pindai barcode">
        {error ? (
          <p className="text-sm text-tinta-muted">{error}</p>
        ) : (
          <div className="space-y-3">
            <video ref={videoRef} className="aspect-[4/3] w-full rounded-[10px] bg-black object-cover" playsInline muted />
            <p className="text-center text-sm text-tinta-muted">
              {scanning ? 'Arahkan kamera ke barcode…' : 'Menyiapkan kamera…'}
            </p>
          </div>
        )}
        <Button variant="secondary" className="mt-4 w-full" onClick={onClose}>
          Tutup
        </Button>
      </DialogContent>
    </Dialog>
  );
}
