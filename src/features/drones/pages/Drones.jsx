// src/pages/Drones.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DroneCard from '../components/DroneStatus';

export default function Drones() {
  const [drones, setDrones] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDrones = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const res = await axios.get('http://localhost:8000/drone/list', {
          headers: { Authorization: `Bearer ${token}` }
        });

        setDrones(res.data || []);
      } catch (err) {
        console.error(err);
        if (err.response?.status === 401) {
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDrones();
  }, [navigate]);

  if (loading) return <div className="text-center py-20 text-2xl">Загрузка дронов...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">Активные дроны</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {drones.map(drone => (
            <div
              key={drone.id}
              onClick={() => navigate(`/drone/${drone.id}`)}
              className="cursor-pointer transform hover:scale-105 transition-all duration-200"
            >
              <DroneCard drone={drone} />
            </div>
          ))}
        </div>

        {drones.length === 0 && (
          <div className="text-center py-32 text-gray-500 text-xl">
            Нет активных дронов
          </div>
        )}
      </div>
    </div>
  );
}