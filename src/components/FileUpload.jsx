import { useState } from 'react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';

function FileUpload({ onClose }) {
  const [file, setFile] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && ['.csv', '.xlsx'].some(ext => selectedFile.name.endsWith(ext))) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Поддерживаются только .csv и .xlsx');
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }
    setIsLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/inventory/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (response.data.status === 'success') {
        onClose();
      } else {
        setError('Ошибка обработки файла');
      }
    } catch (err) {
      setError('Ошибка сервера: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <input type="file" onChange={handleFileChange} className="w-full" accept=".csv,.xlsx" />
      {error && <p className="text-red-500">{error}</p>}
      {file && <p className="text-gray-600">Выбран файл: {file.name}</p>}
      {isConfirming && <p className="text-gray-600">Подтвердите загрузку файла?</p>}
      <button
        onClick={handleSubmit}
        disabled={!file || isLoading}
        className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 flex items-center justify-center"
      >
        {isLoading ? <Loader2 className="animate-spin" size={20} /> : isConfirming ? 'Подтвердить' : 'Загрузить'}
      </button>
      {isConfirming && (
        <button onClick={() => setIsConfirming(false)} className="w-full text-gray-500">
          Отмена
        </button>
      )}
    </div>
  );
}

export default FileUpload;