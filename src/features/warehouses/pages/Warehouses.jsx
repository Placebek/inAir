// src/pages/Warehouses.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const token = localStorage.getItem('access_token'); // или откуда у тебя токен
        const response = await axios.get('http://localhost:8000/warehouses', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setWarehouses(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Ошибка загрузки складов:', err);
        setError('Не удалось загрузить склады. Проверьте авторизацию.');
        setLoading(false);
      }
    };

    fetchWarehouses();
  }, []);

  const handleWarehouseClick = (id) => {
    navigate(`/warehouses/${id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl">Загрузка складов...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Склады</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses.map((warehouse) => (
          <div
            key={warehouse.id}
            onClick={() => handleWarehouseClick(warehouse.id)}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow cursor-pointer border border-gray-200"
          >
            <h2 className="text-xl font-semibold text-blue-600 mb-2">
              {warehouse.name}
            </h2>
            <p className="text-gray-700 mb-1">
              <strong>Адрес:</strong> {warehouse.address}
            </p>
            <p className="text-gray-600">
              <strong>Номер склада:</strong> {warehouse.number_warehouse}
            </p>
            <div className="mt-4 text-sm text-gray-500">
              ID: {warehouse.id}
            </div>
          </div>
        ))}
      </div>

      {warehouses.length === 0 && !loading && (
        <div className="text-center text-gray-500 mt-12 text-xl">
          Склады не найдены
        </div>
      )}
    </div>
  );
}

export default Warehouses;