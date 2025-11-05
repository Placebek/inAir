function AlertSystem({ alerts }) {
  return (
    <div className="space-y-4">
      {alerts.length > 0 ? (
        alerts.map((alert, index) => (
          <div key={index} className="bg-red-100 border-l-4 border-red-500 p-4 rounded">
            <p className="text-red-700 font-semibold">Low Stock Alert</p>
            <p className="text-red-600">
              {alert.name}: Only {alert.count} left in {alert.location}
            </p>
          </div>
        ))
      ) : (
        <p className="text-gray-600">No alerts</p>
      )}
    </div>
  );
}

export default AlertSystem;