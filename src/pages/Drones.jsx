import { useSocket } from '../context/SocketContext';
import DroneStatus from '../components/DroneStatus';

function Drones() {
  const { drones } = useSocket();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Drones</h1>
      <DroneStatus drones={drones} />
    </div>
  );
}

export default Drones;