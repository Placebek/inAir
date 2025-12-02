import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function MapView({ map, drones }) {
  if (!map) return <div className="text-gray-600">Loading map...</div>;

  const mapUrl = `data:image/png;base64,${map.data}`;
  const bounds = [
    [0, 0],
    [map.height * map.resolution, map.width * map.resolution],
  ];

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <MapContainer
        center={[map.height * map.resolution / 2, map.width * map.resolution / 2]}
        zoom={13}
        style={{ height: '500px', width: '100%' }}
        crs={L.CRS.Simple}
        bounds={bounds}
      >
        <TileLayer url={mapUrl} bounds={bounds} />
        {drones.map((drone) => (
          <Marker key={drone.id} position={[drone.position_y, drone.position_x]}>
            <Popup>Drone {drone.id}: {drone.status}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default MapView;