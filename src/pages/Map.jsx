import { useSocket } from '../context/SocketContext';
import MapView from '../components/MapView';

function Map() {
  const { map, drones } = useSocket();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Warehouse Map</h1>
      <MapView map={map} drones={drones} />
    </div>
  );
}

export default Map;