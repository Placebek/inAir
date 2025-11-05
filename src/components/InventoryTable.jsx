import { useState } from 'react';

function InventoryTable({ inventory }) {
  const [filter, setFilter] = useState('');
  const filteredInventory = inventory.filter((item) =>
    item.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg space-y-4 animate-fadeIn">
      {/* Верхняя панель */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <h2 className="text-2xl font-semibold text-gray-800">Инвентаризация</h2>
        <div className="flex gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Поиск по названию..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
          />
        </div>
      </div>
      {/* Таблица */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700 text-sm uppercase">
              <th className="p-3 text-left">Название</th>
              <th className="p-3 text-left">Количество</th>
              <th className="p-3 text-left">Локация</th>
              <th className="p-3 text-left">Дата обновления</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventory.length > 0 ? (
              filteredInventory.map((item) => (
                <tr
                  key={item.id}
                  className="border-b hover:bg-blue-50 transition-colors text-gray-800"
                >
                  <td className="p-3 font-medium">{item.name}</td>
                  <td className="p-3">{item.count}</td>
                  <td className="p-3">{item.location}</td>
                  <td className="p-3">{new Date(item.timestamp).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-500">
                  Товары не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default InventoryTable;