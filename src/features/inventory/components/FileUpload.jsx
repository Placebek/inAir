import { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, Upload, Camera, ScanLine, CheckCircle, Warehouse, Package, Check } from 'lucide-react';

export default function PhotoAnalyzer({ onClose }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [step, setStep] = useState('upload'); // upload | scanning | confirm | warehouse | product | success
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [analysisResult, setAnalysisResult] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    if (step === 'warehouse') fetchWarehouses();
  }, [step]);

  const fetchWarehouses = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/warehouses/`);
      setWarehouses(res.data);
      if (res.data.length === 1) setSelectedWarehouse(res.data[0]);
    } catch (err) {
      setError('Ошибка загрузки складов');
    }
  };

  const fetchProducts = async (warehouseId) => {
    try {
      const res = await axios.get(`http://localhost:8000/products/`, {
        params: { warehouse_id: warehouseId, limit: 500 }
      });
      setProducts(res.data);
    } catch (err) {
      setError('Ошибка загрузки товаров');
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.type.startsWith('image/')) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setError(null);
    } else {
      setError('Выберите изображение');
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setStep('scanning');

    const formData = new FormData();
    formData.append('file', file);

    try {
        await new Promise(resolve => setTimeout(resolve, 2500 + Math.random() * 2000))
      const res = await axios.post(
        `http://localhost:8000/analyz/analyz`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setAnalysisResult(res.data);
      setStep('confirm');
    } catch (err) {
      setError('Ошибка анализа: ' + (err.response?.data?.detail || err.message));
      setStep('upload');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmAndNext = () => setStep('warehouse');

  const selectWarehouse = (wh) => {
    setSelectedWarehouse(wh);
    fetchProducts(wh.id);
    setStep('product');
  };

  const finalize = async () => {
    if (!selectedProduct || !analysisResult?.count) return;

    setIsLoading(true);
    setError(null);

    try {
      await axios.patch(
        `http://localhost:8000/products/${selectedProduct.id}`,
        {
          total_quantity: analysisResult.count  // или другое поле, если нужно
        }
      );

      setStep('success');
    } catch (err) {
      setError('Не удалось обновить количество: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setStep('upload');
    setAnalysisResult(null);
    setSelectedWarehouse(null);
    setSelectedProduct(null);
    setProducts([]);
    setError(null);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* === Загрузка фото === */}
      {step === 'upload' && (
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800">Сканирование полки</h2>
            <p className="text-gray-600">Загрузите фото — ИИ посчитает товары</p>
          </div>

          <label className="block cursor-pointer">
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-4 hover:border-blue-500 transition bg-gray-50">
              {preview ? (
                <div className="space-y-4">
                  <div className="mx-auto w-full max-w-md h-96 bg-gray-200 border-2 border-gray-300 rounded-xl overflow-hidden">
                    <img src={preview} alt="Превью" className="w-full h-full object-contain" />
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); reset(); }} className="text-red-600 text-sm">
                    Изменить фото
                  </button>
                </div>
              ) : (
                <div className="text-center py-12 space-y-4">
                  <Camera className="mx-auto text-gray-400" size={64} />
                  <p className="text-xl font-medium text-gray-700">Нажмите или перетащите фото</p>
                  <p className="text-sm text-gray-500">JPG, PNG, WEBP</p>
                </div>
              )}
            </div>
          </label>

          {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>}

          <button
            onClick={handleAnalyze}
            disabled={!file}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <ScanLine size={24} />
            Начать сканирование
          </button>
        </div>
      )}

      {/* === Сканер-лоадер === */}
      {step === 'scanning' && (
        <div className="text-center py-24 space-y-8">
          <div className="relative mx-auto w-48 h-48">
            <div className="absolute inset-0 flex items-center justify-center">
              <ScanLine className="text-blue-600" size={80} />
              <div className="absolute inset-0 animate-ping">
                <ScanLine className="text-blue-400 opacity-60" size={80} />
              </div>
            </div>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent animate-scan"></div>
          </div>
          <div>
            <h3 className="text-2xl font-bold animate-pulse">Анализ изображения...</h3>
            <p className="text-gray-600 mt-3">ИИ определяет количество товаров</p>
          </div>
        </div>
      )}

      {/* === Результат анализа === */}
      {step === 'confirm' && analysisResult && (
        <div className="space-y-8">
          <div className="text-center">
            <CheckCircle className="mx-auto text-green-500" size={40} />
            <h3 className="text-2xl font-bold">Найдено товаров</h3>
            <p className="text-3xl font-extrabold text-blue-600 mt-4">{analysisResult.count}</p>
          </div>

          <div className="bg-gray-100 rounded-xl p-2">
            <div className="w-full h-96 bg-black/5 rounded-lg overflow-hidden">
              <img
                src={`http://localhost:8000${analysisResult.image_url}`}
                alt="Результат"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={reset} className="flex-1 py-3 border border-gray-300 rounded-xl hover:bg-gray-50">
              Новое фото
            </button>
            <button onClick={confirmAndNext} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl">
              Продолжить
            </button>
          </div>
        </div>
      )}

      {/* === Выбор склада === */}
      {step === 'warehouse' && (
        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-center flex items-center justify-center gap-3">
            <Warehouse className="text-blue-600" />
            Выберите склад
          </h3>
          <div className="space-y-3">
            {warehouses.map(wh => (
              <button
                key={wh.id}
                onClick={() => selectWarehouse(wh)}
                className="w-full p-5 text-left rounded-xl border-2 hover:border-blue-400 transition bg-white"
              >
                <div className="font-semibold">{wh.name}</div>
                <div className="text-sm text-gray-600">{wh.address}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* === Выбор товара === */}
      {step === 'product' && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold">Найдено: {analysisResult.count} шт.</h3>
            <p className="text-gray-600">Выберите товар с фото</p>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-3 border rounded-xl p-4 bg-gray-50">
            {products.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                className={`w-full p-4 rounded-lg text-left transition-all ${
                  selectedProduct?.id === p.id
                    ? 'bg-green-100 border-2 border-green-500'
                    : 'bg-white border border-gray-200 hover:border-gray-400'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-gray-600">
                      SKU: {p.sku || p.product_number} • Сейчас: {p.total_quantity} шт.
                    </div>
                  </div>
                  {selectedProduct?.id === p.id && <Check className="text-green-600" size={24} />}
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={finalize}
            disabled={!selectedProduct || isLoading}
            className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <Check size={24} />}
            Обновить количество ({analysisResult.count} шт.)
          </button>
        </div>
      )}

      {/* === Успех === */}
      {step === 'success' && (
        <div className="text-center py-20 space-y-8">
          <CheckCircle className="mx-auto text-green-500" size={100} />
          <h3 className="text-3xl font-bold">Готово!</h3>
          <p className="text-xl text-gray-700">
            Количество товара <strong>{selectedProduct?.name}</strong> обновлено на <strong>{analysisResult.count}</strong> шт.
          </p>
          <button
            onClick={onClose || reset}
            className="px-8 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700"
          >
            Закрыть
          </button>
        </div>
      )}
    </div>
  );
}