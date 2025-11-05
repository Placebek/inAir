import { useSocket } from '../context/SocketContext';
import AlertSystem from '../components/AlertSystem';

function Alerts() {
  const { alerts } = useSocket();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Alerts</h1>
      <AlertSystem alerts={alerts} />
    </div>
  );
}

export default Alerts;