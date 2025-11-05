import { useAuth } from '../context/AuthContext';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Home, Map, Package, Bell, Video, Drone } from 'lucide-react';

function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // if (!user) {
  //   navigate('/login');
  //   return null;
  // }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 text-gray-800">
      {/* Sidebar */}
      <aside className="w-64 bg-white/80 backdrop-blur-lg shadow-xl border-r border-gray-200 flex flex-col justify-between">
        <div>
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-blue-600 tracking-tight">Warehouse AI</h1>
            <p className="text-sm text-gray-500">Smart Inventory</p>
          </div>

          <nav className="mt-4 flex flex-col space-y-1 px-3">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-blue-100 text-gray-700'
                }`
              }
            >
              <Home size={20} /> Home
            </NavLink>

            <NavLink
              to="/inventory"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-blue-100 text-gray-700'
                }`
              }
            >
              <Package size={20} /> Inventory
            </NavLink>

            <NavLink
              to="/map"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-blue-100 text-gray-700'
                }`
              }
            >
              <Map size={20} /> Map
            </NavLink>

            <NavLink
              to="/drones"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-blue-100 text-gray-700'
                }`
              }
            >
              <Drone size={20} /> Drones
            </NavLink>

            <NavLink
              to="/video"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-blue-100 text-gray-700'
                }`
              }
            >
              <Video size={20} /> Video
            </NavLink>

            <NavLink
              to="/alerts"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-blue-100 text-gray-700'
                }`
              }
            >
              <Bell size={20} /> Alerts
            </NavLink>
          </nav>
        </div>

        {/* Logout section */}
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
          >
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
