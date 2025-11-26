// src/pages/DroneDetail.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale/ru';

export default function DroneDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [drone, setDrone] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDrone = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:8000/drone/${id}`, {
          headers: { Authorization: `Bearer ${token}` } 
        });
        setDrone(res.data);
      } catch (err) {
        console.error(err);
        navigate('/drones');
      } finally {
        setLoading(false);
      }
    };

    fetchDrone();
  }, [id, navigate]);

  if (loading) return <div className="text-center py-20">Загрузка дрона...</div>;
  if (!drone) return <div className="text-center py-20 text-red-500">Дрон не найден</div>;

  const t = drone.telemetry;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 text-blue-600 hover:underline flex items-center gap-2"
        >
          ← Назад к списку
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-800">{drone.name}</h1>
              <p className="text-gray-600 mt-2">Модель: {drone.model}</p>
            </div>
            <span className={`px-6 py-3 rounded-full text-white text-lg font-bold ${
              drone.status === 'flying' ? 'bg-green-500' :
              drone.status === 'scanning' ? 'bg-yellow-500' :
              drone.status === 'idle' ? 'bg-blue-500' :
              drone.status === 'offline' ? 'bg-gray-500' : 'bg-red-500'
            }`}>
              {drone.status === 'flying' ? 'В полёте' :
               drone.status === 'scanning' ? 'Сканирует' :
               drone.status === 'idle' ? 'Готов' :
               drone.status === 'offline' ? 'Оффлайн' : 'Ошибка'}
            </span>
          </div>

          {/* Телеметрия */}
          {t && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-xl">
                <h3 className="text-xl font-bold mb-4">Позиция и батарея</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Батарея:</span>
                    <span className="text-2xl font-bold text-green-600">{t.battery.toFixed(1)}%</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div>X: {t.position[0].toFixed(2)} м</div>
                    <div>Y: {t.position[1].toFixed(2)} м</div>
                    <div>Z: {t.position[2].toFixed(2)} м</div>
                    <div>Курс: {t.heading?.toFixed(0) || 0}°</div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-100 p-6 rounded-xl">
                <h3 className="text-xl font-bold mb-4">Текущая сессия</h3>
                {drone.current_session ? (
                  <div className="space-y-2">
                    <div>Статус: <strong>{drone.current_session.status}</strong></div>
                    <div>Начало: {format(new Date(drone.current_session.started_at), 'Pp', { locale: ru })}</div>
                    <div className="text-3xl font-bold text-purple-700">
                      {drone.current_session.total_scanned} товаров
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">Нет активной сессии</p>
                )}
              </div>
            </div>
          )}

          {/* Мини-карта (можно вставить Leaflet/OpenLayers позже */}
          <div className="bg-gray-200 border-2 border-dashed rounded-xl w-full h-96 flex items-center justify-center text-gray-500">
            Карта полёта (скоро здесь будет Leaflet с траекторией)
          </div>
        </div>
      </div>
    </div>
  );
}