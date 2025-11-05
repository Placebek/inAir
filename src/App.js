import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Inventory from './pages/Inventory';
import Map from './pages/Map';
import Drones from './pages/Drones';
import Video from './pages/Video';
import Alerts from './pages/Alerts';
import Login from './pages/Login';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/map" element={<Map />} />
              <Route path="/drones" element={<Drones />} />
              <Route path="/video" element={<Video />} />
              <Route path="/alerts" element={<Alerts />} />
            </Route>
          </Routes>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;