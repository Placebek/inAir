import { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { Loader2 } from 'lucide-react';

function PhotoScan({ onClose }) {
  const webcamRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const capturePhoto = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setPhoto(imageSrc);
  };

  const handleSubmit = async () => {
    if (!photo) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/inventory/scan_photo`, { photo });
      if (response.data.status === 'success') {
        onClose();
      } else {
        setError('Ошибка распознавания фото');
      }
    } catch (err) {
      setError('Ошибка сервера: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        className="w-full rounded-lg"
      />
      <button
        onClick={capturePhoto}
        className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
      >
        Сфотографировать
      </button>
      {photo && <img src={photo} alt="Снимок" className="w-full rounded-lg" />}
      {error && <p className="text-red-500">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={!photo || isLoading}
        className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 flex items-center justify-center"
      >
        {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Отправить на распознавание'}
      </button>
    </div>
  );
}

export default PhotoScan;