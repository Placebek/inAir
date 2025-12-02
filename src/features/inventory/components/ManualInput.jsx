import { useState } from 'react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';

function ManualInput({ onClose }) {
  const [name, setName] = useState('');
  const [count, setCount] = useState(1);
  const [location, setLocation] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!isConfirming) {
      setIsConfirming(true); // Показать подтверждающий вопрос
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/inventory/add`, { name, count, location });
      if (response.data.status === 'success') {
        onClose(); // Закрыть после успеха
      } else {
        setError('Ошибка добавления товара');
      }
    } catch (err) {
      setError('Ошибка сервера: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Название товара"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full p-2 border rounded"
      />
      <input
        type="number"
        placeholder="Количество"
        value={count}
        onChange={(e) => setCount(Number(e.target.value))}
        className="w-full p-2 border rounded"
      />
      <input
        type="text"
        placeholder="Локация"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        className="w-full p-2 border rounded"
      />
      {error && <p className="text-red-500">{error}</p>}
      {isConfirming && <p className="text-gray-600">Подтвердите добавление товара?</p>}
      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 flex items-center justify-center"
      >
        {isLoading ? <Loader2 className="animate-spin" size={20} /> : isConfirming ? 'Подтвердить' : 'Добавить'}
      </button>
      {isConfirming && (
        <button onClick={() => setIsConfirming(false)} className="w-full text-gray-500">
          Отмена
        </button>
      )}
    </div>
  );
}

export default ManualInput;