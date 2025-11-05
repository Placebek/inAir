function DroneStatus({ drones }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2">ID</th>
            <th className="p-2">Position (X, Y)</th>
            <th className="p-2">Status</th>
            <th className="p-2">Last Update</th>
          </tr>
        </thead>
        <tbody>
          {drones.map((drone) => (
            <tr key={drone.id} className="border-b hover:bg-gray-100">
              <td className="p-2">{drone.id}</td>
              <td className="p-2">({drone.position_x}, {drone.position_y})</td>
              <td className="p-2">{drone.status}</td>
              <td className="p-2">{new Date(drone.last_update).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DroneStatus;