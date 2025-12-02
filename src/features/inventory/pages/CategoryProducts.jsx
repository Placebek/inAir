// src/pages/CategoryProducts.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';

function CategoryProducts() {
  const { id: warehouseId, categoryId } = useParams(); // warehouseId и categoryId из URL
  const { state } = useLocation();
  const navigate = useNavigate();

  const categoryName = state?.categoryName || 'Категория';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Фильтры
  const [search, setSearch] = useState('');
  const [inStock, setInStock] = useState(false);
  const [skip, setSkip] = useState(0);
  const [limit] = useState(50);

  const totalPages = Math.ceil(total / limit);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');

      const params = {
        skip,
        limit,
        category_id: Number(categoryId),
        warehouse_id: Number(warehouseId),
        ...(search && { search }),
        ...(inStock && { in_stock: true }),
      };

      const res = await axios.get('http://localhost:8000/products', {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });

      setProducts(res.data.items || res.data);
      setTotal(res.data.total || res.data.length);
    } catch (err) {
      console.error(err);
      alert('Ошибка загрузки товаров');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line
  }, [skip, search, inStock, categoryId, warehouseId]);

  const handlePageChange = (newSkip) => {
    setSkip(newSkip);
    window.scrollTo(0, 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-2xl">Загрузка товаров...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Заголовок */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2 font-medium"
        >
          ← Назад
        </button>
        <h1 className="text-3xl font-bold text-gray-800">
          Товары: <span className="text-blue-600">{categoryName}</span>
        </h1>
        <p className="text-gray-600 mt-2">
          Склад: #{warehouseId} • Найдено товаров: <strong>{total}</strong>
        </p>
      </div>

      {/* Фильтры */}
      <div className="bg-white rounded-lg shadow p-6 mb-6 flex flex-wrap gap-4 items-center">
        <input
          type="text"
          placeholder="Поиск по названию, SKU, баркоду..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSkip(0);
          }}
          className="px-4 py-2 border rounded-lg flex-1 min-w-64"
        />
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => setInStock(e.target.checked)}
            className="w-5 h-5"
          />
          <span>Только в наличии</span>
        </label>
      </div>

      {/* Таблица */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full table-auto">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU / Баркод
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Название
              </th>
              <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Кол-во
              </th>
              <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Цена
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Локация
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{p.sku}</div>
                  <div className="text-xs text-gray-500">{p.barcode}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 font-medium">{p.name}</div>
                  {p.description && (
                    <div className="text-xs text-gray-500 mt-1">{p.description}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      p.total_quantity > 0
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {p.total_quantity}
                  </span>
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-900">
                  {p.price.toLocaleString('ru-RU')} ₽
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {p.expected_location || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Пустое состояние */}
        {products.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Товары не найдены
          </div>
        )}
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          <button
            onClick={() => handlePageChange(Math.max(0, skip - limit))}
            disabled={skip === 0}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            ← Назад
          </button>
          <span className="px-4 py-2">
            Страница {Math.floor(skip / limit) + 1} из {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(skip + limit)}
            disabled={skip + limit >= total}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Вперед →
          </button>
        </div>
      )}
    </div>
  );
}

export default CategoryProducts;