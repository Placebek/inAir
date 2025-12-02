import { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { NotFoundException } from '@zxing/library';
import axios from 'axios';
import { Loader2 } from 'lucide-react';

function BarcodeScan({ onClose, onManualFallback }) {
  const [code, setCode] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const readerRef = useRef(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    let stream;

    const startScanner = async () => {
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const selectedDeviceId = devices[0]?.deviceId;

        stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: selectedDeviceId },
        });
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', true);
        await videoRef.current.play();

        reader.decodeFromVideoDevice(selectedDeviceId, videoRef.current, (result, err) => {
          if (result) {
            setCode(result.text);
            stopScanner(); // Останавливаем поток после сканирования
          }
          if (err && !(err instanceof NotFoundException)) {
            console.error(err);
          }
        });
      } catch (err) {
        setError('Ошибка доступа к камере: ' + err.message);
      }
    };

    const stopScanner = () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      reader.reset?.(); // Если всё же есть reset — безопасно вызвать
    };

    startScanner();

    return () => stopScanner();
  }, []);

  const handleSubmit = async () => {
    if (!code) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post(`/api/inventory/scan_barcode`, { code });
      if (response.data.status === 'found') {
        onClose();
      } else if (response.data.status === 'not_found') {
        onManualFallback();
      } else {
        setError('Ошибка обработки штрихкода');
      }
    } catch (err) {
      setError('Ошибка сервера: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 relative">
      <div className="relative">
        <video ref={videoRef} className="w-full rounded-lg" />
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-red-500 opacity-50 animate-scan" />
      </div>

      {code && <p className="text-gray-600">Отсканировано: {code}</p>}
      {error && <p className="text-red-500">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!code || isLoading}
        className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 flex items-center justify-center"
      >
        {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Обработать'}
      </button>
    </div>
  );
}

export default BarcodeScan;
