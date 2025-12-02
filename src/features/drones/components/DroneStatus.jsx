// src/components/DroneCard.jsx
export default function DroneCard({ drone }) {
  const statusColor = {
    offline: 'bg-gray-500',
    idle: 'bg-blue-500',
    flying: 'bg-green-500',
    scanning: 'bg-yellow-500',
    error: 'bg-red-500'
  };

  const statusText = {
    offline: 'Оффлайн',
    idle: 'Готов',
    flying: 'В полёте',
    scanning: 'Сканирует',
    error: 'Ошибка'
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 border border-gray-100">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-2xl font-bold text-gray-800">{drone.name}</h3>
        <span className={`px-4 py-2 rounded-full text-white text-sm font-medium ${statusColor[drone.status] || 'bg-gray-400'}`}>
          {statusText[drone.status] || 'Неизвестно'}
        </span>
      </div>

      <div className="space-y-3 text-gray-700">
        <div className="flex justify-between">
          <span className="font-medium">Батарея:</span>
          <span className={`font-bold ${drone.battery < 20 ? 'text-red-600' : 'text-green-600'}`}>
            {drone.battery ? Math.round(drone.battery) : 0}%
          </span>
        </div>

        <div className="text-sm">
          <span className="font-medium">Координаты:</span>
          <div className="font-mono text-xs bg-gray-100 p-2 rounded mt-1">
            X: {drone.x?.toFixed(2) || '—'} | Y: {drone.y?.toFixed(2) || '—'} | Z: {drone.z?.toFixed(2) || '—'}
          </div>
        </div>

        {drone.current_scan && (
          <div className="mt-4 p-4 bg-green-50 border-2 border-green-300 rounded-lg animate-pulse">
            <p className="text-sm font-bold text-green-800">Последний штрихкод:</p>
            <p className="font-mono text-green-900 break-all text-lg">{drone.current_scan}</p>
          </div>
        )}

        <div className="text-xs text-gray-400 pt-3 border-t">
          Обновлено: {new Date(drone.last_seen || Date.now()).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}