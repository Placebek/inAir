import { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import InventoryTable from '../components/InventoryTable';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PlusCircle, Keyboard, FileUp, Camera, Barcode } from 'lucide-react'; // Добавлены все иконки
import ManualInput from '../components/ManualInput';
import FileUpload from '../components/FileUpload';
import PhotoScan from '../components/PhotoScan';
import BarcodeScan from '../components/BarcodeScan';

function Inventory() {
  const { inventory } = useSocket();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null); // Тип модалки: 'manual', 'file', 'photo', 'barcode'

  const handleOpenModal = (type) => {
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalType(null);
  };

  const renderModalContent = () => {
    switch (modalType) {
      case 'manual':
        return <ManualInput onClose={handleCloseModal} />;
      case 'file':
        return <FileUpload onClose={handleCloseModal} />;
      case 'photo':
        return <PhotoScan onClose={handleCloseModal} />;
      case 'barcode':
        return <BarcodeScan onClose={handleCloseModal} onManualFallback={() => handleOpenModal('manual')} />;
      default:
        return (
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => handleOpenModal('manual')}
              className="border p-3 rounded-xl hover:bg-blue-50 transition text-left flex items-center gap-2"
            >
              <Keyboard size={20} /> Ручной ввод
            </button>
            <button
              onClick={() => handleOpenModal('file')}
              className="border p-3 rounded-xl hover:bg-blue-50 transition text-left flex items-center gap-2"
            >
              <FileUp size={20} /> Загрузить файл
            </button>
            <button
              onClick={() => handleOpenModal('photo')}
              className="border p-3 rounded-xl hover:bg-blue-50 transition text-left flex items-center gap-2"
            >
              <Camera size={20} /> Сканировать фото
            </button>
            <button
              onClick={() => handleOpenModal('barcode')}
              className="border p-3 rounded-xl hover:bg-blue-50 transition text-left flex items-center gap-2"
            >
              <Barcode size={20} /> Сканировать штрихкод
            </button>
          </div>
        );
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Инвентаризация</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <PlusCircle size={20} /> Добавить
        </button>
      </div>
      <InventoryTable inventory={inventory} />
      {/* Полноэкранная модалка */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white w-full max-w-lg mx-4 rounded-2xl shadow-2xl p-6 relative"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
            >
              {/* Кнопка закрытия */}
              <button
                onClick={handleCloseModal}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
              <h2 className="text-2xl font-semibold mb-6 text-gray-800">
                Добавление товара
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