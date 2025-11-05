import { useSocket } from '../context/SocketContext';
import StatsCard from '../components/StatsCard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ExportButton from '../components/ExportButton';
import { AlertTriangle } from 'lucide-react';

function Home() {
  const { inventory, drones, alerts } = useSocket();

  const totalItems = inventory.reduce((sum, item) => sum + item.count, 0);
  const activeDrones = drones.filter((drone) => drone.status === 'active').length;
  const recentAlerts = alerts.slice(0, 3);

  const chartData = inventory.map((item) => ({
    name: item.name,
    count: item.count,
  }));

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Заголовок */}
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Панель управления</h1>
        <ExportButton />
      </header>

      {/* Статистика */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatsCard title="Всего товаров" value={totalItems} color="bg-blue-500" />
        <StatsCard title="Активных дронов" value={activeDrones} color="bg-green-500" />
        <StatsCard title="Тревог" value={alerts.length} color="bg-red-500" />
      </section>

      {/* График инвентаря */}
      <section className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Динамика запасов</h2>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fill: '#6b7280' }} />
              <YAxis tick={{ fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'white', borderRadius: '10px', border: '1px solid #e5e7eb' }}
                labelStyle={{ color: '#374151' }}
              />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Последние тревоги */}
      <section className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="text-red-500" size={22} />
          <h2 className="text-xl font-semibold text-gray-800">Последние тревоги</h2>
        </div>
        {recentAlerts.length > 0 ? (
          <ul className="space-y-2">
            {recentAlerts.map((alert, index) => (
              <li
                key={index}
                className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-100 flex justify-between items-center"
              >
                <span>{alert.name}</span>
                <span className="font-semibold">
                  Осталось {alert.count} шт. — {alert.location}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">Нет недавних тревог</p>
        )}
      </section>
    </div>
  );
}

export default Home;
