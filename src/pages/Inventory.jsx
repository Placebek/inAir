// src/pages/Inventory.jsx
import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import InventoryTable from '../components/InventoryTable';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PlusCircle, Keyboard, FileUp, Camera, Barcode, RefreshCw } from 'lucide-react';
import ManualInput from '../components/ManualInput';
import FileUpload from '../components/FileUpload';
import PhotoScan from '../components/PhotoScan';
import BarcodeScan from '../components/BarcodeScan';
import toast, { Toaster } from 'react-hot-toast';

function Inventory() {
  const { socket } = useSocket();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);

  // Загружаем инвентарь с сервера
  const fetchInventory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/inventory', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data = await res.json();
      setInventory(data);
    } catch (err) {
      toast.error('Не удалось загрузить склад');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Первичная загрузка
  useEffect(() => {
    fetchInventory();
  }, []);

  // WebSocket — обновления от дронов и других операторов
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (data.type === 'new_scan' || data.type === 'inventory_update') {
        // Просто перезагружаем — проще и надёжнее
        fetchInventory();
        toast.success(`Новый товар: ${data.product_name || data.item?.name || 'Обновлено!'}`);
      }
    };

    socket.addEventListener('message', handleMessage);
    return () => socket.removeEventListener('message', handleMessage);
  }, [socket]);

  const handleOpenModal = (type) => {
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalType(null);
  };

  // Универсальная отправка товара
  const handleAddItem = async (itemData) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/v1/inventory/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(itemData)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Ошибка сервера');
      }

      await res.json();
      toast.success('Товар добавлен!');
      fetchInventory(); // обновляем таблицу
      handleCloseModal();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const renderModalContent = () => {
    switch (modalType) {
      case 'manual':
        return <ManualInput onSubmit={handleAddItem} onClose={handleCloseModal} />;
      case 'file':
        return <FileUpload onSuccess={handleAddItem} onClose={handleCloseModal} />;
      case 'photo':
        return <PhotoScan onDetected={handleAddItem} onClose={handleCloseModal} />;
      case 'barcode':
        return <BarcodeScan onDetected={handleAddItem} onClose={handleCloseModal} onManualFallback={() => handleOpenModal('manual')} />;
      default:
        return (
          <div className="grid grid-cols-1 gap-5">
            {[
              { type: 'manual', icon: Keyboard, color: 'blue', label: 'Ручной ввод' },
              { type: 'file', icon: FileUp, color: 'green', label: 'Загрузить файл' },
              { type: 'photo', icon: Camera, color: 'purple', label: 'Сфотографировать' },
              { type: 'barcode', icon: Barcode, color: 'orange', label: 'Сканер штрихкода' }
            ].map(({ type, icon: Icon, color, label }) => (
              <button
                key={type}
                onClick={() => handleOpenModal(type)}
                className={`flex items-center gap-4 p-6 border-2 border-gray-200 rounded-2xl hover:border-${color}-500 hover:bg-${color}-50 transition-all group`}
              >
                <div className={`p-3 bg-${color}-100 rounded-xl group-hover:bg-${color}-200 transition`}>
                  <Icon size={28} className={`text-${color}-600`} />
                </div>
                <span className="text-lg font-semibold text-gray-800">{label}</span>
              </button>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">Инвентаризация склада</h1>
            <p className="text-gray-600 mt-2">Всего товаров: {inventory.length}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={fetchInventory}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              Обновить
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition shadow-lg"
            >
              <PlusCircle size={24} />
              Добавить товар
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-xl text-gray-500">Загрузка склада...</div>
        ) : (
          <InventoryTable inventory={inventory} />
        )}
      </div>

      {/* Модалка */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseModal}
          >
            <motion.div
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-8 relative max-h-screen overflow-y-auto"
              initial={{ scale: 0.9, y: 100 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 100 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleCloseModal}
                className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 transition"
              >
                <X size={32} />
              </button>

              <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
                {modalType ? 'Добавление товара' : 'Как добавить?'}
              </h2>

              {renderModalContent()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Inventory;