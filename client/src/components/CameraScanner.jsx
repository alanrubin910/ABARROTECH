import { useEffect, useRef, useState } from 'react';
import { RefreshCw, ZapOff, CheckCircle2, Loader } from 'lucide-react';

export default function CameraScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const zxingReaderRef = useRef(null);
  const scannedRef = useRef(false);

  const [cameras, setCameras] = useState([]);
  const [cameraIndex, setCameraIndex] = useState(-1);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [foundCode, setFoundCode] = useState('');

  useEffect(() => {
    initCameras();
    return () => stopAll();
  }, []);

  useEffect(() => {
    if (cameraIndex >= 0 && cameras.length > 0) {
      startCamera(cameras[cameraIndex]);
    }
  }, [cameraIndex]);

  async function initCameras() {
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      tempStream.getTracks().forEach(t => t.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');

      if (videoDevices.length === 0) {
        setError('No se encontró ninguna cámara.');
        setLoading(false);
        return;
      }

      const backIdx = videoDevices.findIndex(d =>
        /back|rear|trasera|environment|posterior/i.test(d.label)
      );
      setCameras(videoDevices);
      setCameraIndex(backIdx >= 0 ? backIdx : videoDevices.length - 1);
      setLoading(false);
    } catch {
      setError('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
      setLoading(false);
    }
  }

  async function startCamera(device) {
    stopAll();
    scannedRef.current = false;
    setFoundCode('');
    setError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: device.deviceId },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        }
      });
      streamRef.current = stream;

      const video = videoRef.current;
      video.srcObject = stream;
      video.setAttribute('playsinline', '');
      await video.play();

      setScanning(true);
      startDecoding(video, stream);
    } catch (err) {
      setError('No se pudo iniciar la cámara. ' + (err?.message || ''));
    }
  }

  function startDecoding(video, stream) {
    if ('BarcodeDetector' in window) {
      // API nativa del navegador — más rápida y precisa en Android Chrome
      BarcodeDetector.getSupportedFormats()
        .then(allFormats => {
          const wanted = ['ean_13', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'itf', 'ean_8'];
          const formats = wanted.filter(f => allFormats.includes(f));
          const detector = new BarcodeDetector({ formats: formats.length > 0 ? formats : allFormats });

          const detect = async () => {
            if (scannedRef.current || !videoRef.current) return;
            try {
              if (video.readyState >= 2) {
                const barcodes = await detector.detect(video);
                if (barcodes.length > 0 && !scannedRef.current) {
                  handleFound(barcodes[0].rawValue);
                  return;
                }
              }
            } catch {}
            rafRef.current = requestAnimationFrame(detect);
          };
          rafRef.current = requestAnimationFrame(detect);
        })
        .catch(() => startZxingFallback(video, stream));
    } else {
      startZxingFallback(video, stream);
    }
  }

  function startZxingFallback(video, stream) {
    import('@zxing/browser').then(({ BrowserMultiFormatReader }) => {
      if (scannedRef.current) return;
      const reader = new BrowserMultiFormatReader();
      zxingReaderRef.current = reader;
      reader.decodeFromStream(stream, video, (result) => {
        if (result && !scannedRef.current) {
          handleFound(result.getText());
        }
      });
    }).catch(() => setError('No se pudo iniciar el escáner.'));
  }

  function handleFound(code) {
    scannedRef.current = true;
    setFoundCode(code);
    stopAll();
    // Pequeña pausa para mostrar el feedback visual antes de cerrar
    setTimeout(() => onScan(code), 700);
  }

  function stopAll() {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (zxingReaderRef.current) {
      try { BrowserMultiFormatReader?.releaseAllStreams?.(); } catch {}
      zxingReaderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }

  return (
    <div className="space-y-3">
      {/* Viewfinder */}
      <div className="relative bg-black rounded-2xl overflow-hidden" style={{ height: '260px' }}>
        <video
          ref={videoRef}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          autoPlay muted playsInline
        />

        {/* Cargando */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70">
            <Loader size={28} className="text-brand-400 animate-spin" />
            <span className="text-white text-sm font-medium">Iniciando cámara...</span>
          </div>
        )}

        {/* Escaneando — marco de mira */}
        {scanning && !foundCode && (
          <>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative" style={{ width: '82%', height: '38%' }}>
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-brand-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-brand-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-brand-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-brand-400 rounded-br-lg" />
                <div className="absolute inset-x-0 h-0.5 bg-brand-400 opacity-80 animate-scan-line top-1/2" />
              </div>
            </div>
            <div className="absolute top-3 left-0 right-0 flex justify-center">
              <span className="bg-black/60 text-white text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm">
                Apunta al código de barras
              </span>
            </div>
          </>
        )}

        {/* ¡Código encontrado! */}
        {foundCode && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
            <CheckCircle2 size={52} className="text-green-400" />
            <span className="text-white font-bold text-lg">¡Detectado!</span>
            <span className="text-green-300 font-mono text-sm bg-black/40 px-3 py-1 rounded-lg">{foundCode}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <ZapOff size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-2">
        {cameras.length > 1 && !foundCode && (
          <button onClick={() => setCameraIndex(i => (i + 1) % cameras.length)}
            className="btn-secondary flex items-center gap-2 flex-1 justify-center text-sm">
            <RefreshCw size={15} /> Cambiar cámara
          </button>
        )}
        {!foundCode && (
          <button onClick={() => { stopAll(); onClose(); }} className="btn-secondary flex-1 text-sm">
            Cancelar
          </button>
        )}
      </div>

      <p className="text-center text-xs text-slate-400">EAN-13 · UPC-A · Code128 · QR</p>
    </div>
  );
}
