// src/pages/WarehouseDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function WarehouseDetail() {
  const { id } = useParams(); // id склада
  const navigate = useNavigate();

  const [warehouse, setWarehouse] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('access_token');

        // Данные склада
        const warehouseRes = await axios.get(`http://localhost:8000/warehouses/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Топ категорий (у тебя сейчас /product-categories)
        const categoriesRes = await axios.get(`http://localhost:8000/product-categories`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setWarehouse(warehouseRes.data);
        setCategories(categoriesRes.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Не удалось загрузить данные склада');
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Переход на страницу товаров по категории
  const handleCategoryClick = (categoryId, categoryName) => {
    // Можно передать и имя — чтобы на странице отобразить заголовок
    navigate(`/warehouse/${id}/category/${categoryId}`, {
      state: { categoryName } // опционально, если хочешь красиво
    });
    // Или просто: navigate(`/warehouse/${id}/products?category=${categoryId}`);
  };

  const categoryColors = {
    1: 'bg-purple-100 text-purple-800 border-purple-300',
    2: 'bg-blue-100 text-blue-800 border-blue-300',
    3: 'bg-green-100 text-green-800 border-green-300',
    4: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    5: 'bg-pink-100 text-pink-800 border-pink-300',
    6: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  };

  if (loading) return <div className="flex justify-center items-center h-screen text-2xl">Загрузка...</div>;
  if (error) return <div className="text-center text-red-500 text-xl mt-10">{error}</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Заголовок + назад */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2 font-medium"
          >
            ← Назад к списку
          </button>
          <h1 className="text-4xl font-bold text-gray-800">
            {warehouse?.name || `Склад #${id}`}
          </h1>
          <p className="text-xl text-gray-600 mt-2">{warehouse?.address || 'Адрес не указан'}</p>
        </div>
      </div>

      {/* Топ категорий — теперь кликабельные! */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Топ категорий по количеству товаров</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat, index) => (
            <div
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id, cat.category_name)}
              className={`
                p-6 rounded-xl border-2 ${categoryColors[cat.id] || 'bg-gray-100'}
                transform transition-all hover:scale-105 cursor-pointer
                shadow-md hover:shadow-xl
              `}
            >
              <div className="flex items-start justify-between">
                <div className="text-4xl font-bold text-gray-700">#{index + 1}</div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{cat.total_items || 0}</div>
                  <div className="text-sm text-gray-600">товаров</div>
                </div>
              </div>
              <h3 className="text-xl font-semibold mt-4">{cat.category_name}</h3>
              <p className="text-sm text-gray-500 mt-2">Нажми, чтобы посмотреть товары →</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-500">
        <p className="text-lg">Скоро: живые дроны, карта полётов, отчёты по сканированию...</p>
      </div>
    </div>
  );
}

export default WarehouseDetail;