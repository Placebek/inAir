import { useState } from 'react';
import { useAuth } from '../hooks/useAuth'; // хук вынесем отдельно
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '@/shared/components/ui'; // @ = src alias (настроим позже)

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate('/');
    } catch (error) {
      alert('Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold mb-8 text-center">Вход в систему</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            type="text"
            placeholder="Логин"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
          <Input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" className="w-full" size="lg">
            Войти
          </Button>
        </form>
      </div>
    </div>
  );
}

export default Login;