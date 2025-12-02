import { createContext, useContext, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/token`, {
        username,
        password,
      });
      const newToken = response.data.access_token;
      setToken(newToken);
      localStorage.setItem('token', newToken);
      setUser(username);
    } catch (error) {
      throw new Error('Login failed');
    }
  };

  const logout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);