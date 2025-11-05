import { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [drones, setDrones] = useState([]);
  const [map, setMap] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_WS_URL);
    setSocket(newSocket);

    newSocket.on('inventory', (data) => {
      setInventory(data.inventory);
      setAlerts(data.alerts || []);
    });

    newSocket.on('drones', (data) => {
      setDrones(data);
    });

    newSocket.on('map', (data) => {
      setMap(data);
    });

    return () => newSocket.close();
  }, []);

  return (
    <SocketContext.Provider value={{ socket, inventory, drones, map, alerts }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);