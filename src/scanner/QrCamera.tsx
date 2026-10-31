import { useEffect, useRef, useState } from 'react';
import { CameraOff, Flashlight, FlashlightOff, Loader2, RotateCcw } from 'lucide-react';

type Decode = (video: HTMLVideoElement) => Promise<string | null>;

/** Barcode types the phone's own reader is asked for (Android Chrome). */
const NATIVE_FORMATS = ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'itf', 'pdf417', 'data_matrix', 'aztec'];

/** The phone's built-in barcode reader where there is one (Android), else
 *  jsQR, which reads QR codes on every phone including iPhones. */
async function makeDecoder(canvas: HTMLCanvasElement): Promise<Decode> {
  const Native = (window as any).BarcodeDetector;
  if (Native) {
    try {
      const supported: string[] = await Native.getSupportedFormats();
      const formats = NATIVE_FORMATS.filter((f) => supported.includes(f));
      if (formats.includes('qr_code')) {
        const detector = new Native({ formats });
        return async (video) => {
          const found: { rawValue?: string }[] = await detector.detect(video);
          return found.find((c) => c.rawValue)?.rawValue || null;
        };
      }
    } catch {
      // fall through to jsQR
    }
  }
  const { default: jsQR } = await import('jsqr');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return async (video) => {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!ctx || !vw || !vh) return null;
    // The square the viewfinder shows, scaled down so each try stays quick.
    const side = Math.min(vw, vh);
    const size = Math.min(720, side);
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(video, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, size, size);
    const img = ctx.getImageData(0, 0, size, size);
    return jsQR(img.data, size, size, { inversionAttempts: 'dontInvert' })?.data || null;
  };
}

type CameraState = 'starting' | 'on' | 'denied' | 'none' | 'error';

/** Live camera that reports every code it reads. While `paused`, the
 *  picture stays on but nothing is read. */
export function QrCamera({ paused, onCode }: { paused: boolean; onCode: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const pausedRef = useRef(paused);
  const onCodeRef = useRef(onCode);
  pausedRef.current = paused;
  onCodeRef.current = onCode;
  const [state, setState] = useState<CameraState>('starting');
  /** null when the camera has no torch. */
  const [torch, setTorch] = useState<boolean | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    let stopCurrent: (() => void) | null = null;

    const start = () => {
      let alive = true;
      let raf = 0;
      let stream: MediaStream | null = null;
      stopCurrent = () => {
        alive = false;
        cancelAnimationFrame(raf);
        stream?.getTracks().forEach((t) => t.stop());
        trackRef.current = null;
      };

      (async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
          setState('error');
          return;
        }
        setState('starting');
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          });
        } catch (err: any) {
          if (!alive) return;
          const name = err?.name || '';
          setState(
            name === 'NotAllowedError' || name === 'SecurityError'
              ? 'denied'
              : name === 'NotFoundError' || name === 'OverconstrainedError'
                ? 'none'
                : 'error',
          );
          return;
        }
        if (!alive) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play().catch(() => {});
        const track = stream.getVideoTracks()[0] || null;
        trackRef.current = track;
        const caps: any = track?.getCapabilities?.() || {};
        setTorch(caps.torch ? false : null);
        setState('on');

        const decode = await makeDecoder(canvas);
        let busy = false;
        let last = 0;
        const tick = (t: number) => {
          if (!alive) return;
          raf = requestAnimationFrame(tick);
          if (busy || pausedRef.current || t - last < 110 || video.readyState < 2) return;
          last = t;
          busy = true;
          decode(video)
            .then((code) => {
              if (code && alive && !pausedRef.current) onCodeRef.current(code);
            })
            .catch(() => {})
            .finally(() => {
              busy = false;
            });
        };
        raf = requestAnimationFrame(tick);
      })();
    };

    const stop = () => {
      stopCurrent?.();
      stopCurrent = null;
    };

    // Phones cut the camera off in the background; start it again on return.
    const onVisibility = () => {
      if (document.hidden) stop();
      else if (!stopCurrent) start();
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, [attempt]);

  const toggleTorch = async () => {
    const track = trackRef.current;
    if (!track || torch === null) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch } as any] });
      setTorch(!torch);
    } catch {
      setTorch(null);
    }
  };

  const problem =
    state === 'denied'
      ? 'Camera access is blocked. Allow the camera for this app in your phone settings, then try again.'
      : state === 'none'
        ? 'No camera was found on this device.'
        : state === 'error'
          ? "The camera couldn't start."
          : '';

  return (
    <div className="relative w-full aspect-square bg-[#111] overflow-hidden">
      <video ref={videoRef} playsInline muted autoPlay className={`absolute inset-0 w-full h-full object-cover transition-opacity ${state === 'on' ? 'opacity-100' : 'opacity-0'} ${paused ? 'opacity-40' : ''}`} />

      {state === 'on' && (
        <div className="absolute inset-[11%] pointer-events-none">
          <span className="absolute left-0 top-0 w-10 h-10 border-l-4 border-t-4 border-[#ffed00]" />
          <span className="absolute right-0 top-0 w-10 h-10 border-r-4 border-t-4 border-[#ffed00]" />
          <span className="absolute left-0 bottom-0 w-10 h-10 border-l-4 border-b-4 border-[#ffed00]" />
          <span className="absolute right-0 bottom-0 w-10 h-10 border-r-4 border-b-4 border-[#ffed00]" />
          {!paused && <span className="scan-line absolute left-3 right-3 h-0.5 bg-[#ffed00]/80" />}
        </div>
      )}

      {state === 'starting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70 text-sm">
          <Loader2 className="w-7 h-7 animate-spin text-[#ffed00]" />
          Starting the camera…
        </div>
      )}

      {problem && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <CameraOff className="w-9 h-9 text-[#ffed00]" />
          <p className="text-sm text-white/80 leading-relaxed">
            {problem} You can still type ticket codes below.
          </p>
          {state !== 'none' && (
            <button
              type="button"
              onClick={() => setAttempt((a) => a + 1)}
              className="flex items-center gap-2 bg-[#ffed00] text-black text-sm font-bold px-5 py-3 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Try again
            </button>
          )}
        </div>
      )}

      {state === 'on' && torch !== null && (
        <button
          type="button"
          onClick={toggleTorch}
          aria-label={torch ? 'Turn the torch off' : 'Turn the torch on'}
          className={`absolute right-3 bottom-3 w-11 h-11 flex items-center justify-center cursor-pointer ${torch ? 'bg-[#ffed00] text-black' : 'bg-black/60 text-white'}`}
        >
          {torch ? <FlashlightOff className="w-5 h-5" /> : <Flashlight className="w-5 h-5" />}
        </button>
      )}
    </div>
  );
}
