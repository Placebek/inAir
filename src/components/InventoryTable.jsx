// src/components/InventoryTable.jsx
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Search, Package, MapPin, Calendar, Barcode } from 'lucide-react';

function InventoryTable({ inventory = [] }) {
  const [search, setSearch] = useState('');

  // Фильтрация + поиск по всем полям
  const filteredInventory = useMemo(() => {
    if (!search.trim()) return inventory;

    const query = search.toLowerCase();
    return inventory.filter(item =>
      item.name?.toLowerCase().includes(query) ||
      item.sku?.toLowerCase().includes(query) ||
      item.barcode?.includes(query) ||
      item.location?.toLowerCase().includes(query)
    );
  }, [inventory, search]);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return format(new Date(dateString), 'dd MMM yyyy, HH:mm', { locale: ru });
    } catch {
      return '—';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Поиск */}
      <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3 max-w-md">
          <Search size={20} className="text-gray-500" />
          <input
            type="text"
            placeholder="Поиск по названию, SKU, штрихкоду или локации..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Найдено: <strong>{filteredInventory.length}</strong> из <strong>{inventory.length}</strong> товаров
        </p>
      </div>

      {/* Таблица */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
  <tr>
    <th className="px-6 py-4 text-left font-medium">
      <div className="flex items-center gap-2">
        <Package size={16} /> Товар
      </div>
    </th>

    <th className="px-6 py-4 text-left font-medium">
      <div className="flex items-center gap-2">
        <Barcode size={16} /> Штрихкод / SKU
      </div>
    </th>

    <th className="px-6 py-4 text-center font-medium">
      Количество
    </th>

    <th className="px-6 py-4 text-left font-medium">
      <div className="flex items-center gap-2">
        <MapPin size={16} /> Локация
      </div>
    </th>

    <th className="px-6 py-4 text-left font-medium">
      <div className="flex items-center gap-2">
        <Calendar size={16} /> Последнее
      </div>
    </th>
  </tr>
</thead>

          <tbody className="divide-y divide-gray-200">
            {filteredInventory.length > 0 ? (
              filteredInventory.map((item, index) => (
                <tr
                  key={item.barcode || item.sku || index}
                  className="hover:bg-blue-50/50 transition-colors duration-200"
                >
                  {/* Название */}
                  <td className="px-6 py-5">
                    <div className="font-semibold text-gray-900">{item.name || 'Без названия'}</div>
                    {item.category && (
                      <div className="text-xs text-gray-500 mt-1">{item.category}</div>
                    )}
                  </td>

                  {/* Штрихкод + SKU */}
                  <td className="px-6 py-5">
                    <div className="font-mono text-sm text-gray-700">{item.barcode || '—'}</div>
                    {item.sku && (
                      <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                    )}
                  </td>

                  {/* Количество */}
                  <td className="px-6 py-5 text-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                      item.quantity > 10 ? 'bg-green-100 text-green-800' :
                      item.quantity > 3 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {item.quantity || 0}
                    </span>
                  </td>

                  {/* Локация */}
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                      item.location === 'UNKNOWN'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      <MapPin size={12} />
                      {item.location || 'Неизвестно'}
                    </span>
                  </td>

                  {/* Дата */}
                  <td className="px-6 py-5 text-sm text-gray-600">
                    {formatDate(item.last_scanned)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-16 text-center text-gray-500">
                  <div className="text-2xl mb-3">Товары не найдены</div>
                  <p>Попробуйте изменить запрос или добавить новые товары</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Футер */}
      {inventory.length > 20 && (
        <div className="px-6 py-4 bg-gray-50 border-t text-sm text-gray-600">
          Показано {filteredInventory.length} из {inventory.length} позиций
        </div>
      )}
    </div>
  );
}

export default InventoryTable;