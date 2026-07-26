import { useEffect, useState } from 'react';
import './App.css';
import Login from './Login';
import Dashboard from './Dashboard';

function App() {
  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('automationUser');
  });
  const [view, setView] = useState('login');

  useEffect(() => {
    if (!window) return;

    const currentPath = window.location.pathname;

    if (user) {
      window.localStorage.setItem('automationUser', user);
      if (currentPath !== '/dashboard') {
        window.history.replaceState({}, '', '/dashboard');
      }
    } else {
      window.localStorage.removeItem('automationUser');
      if (currentPath !== '/') {
        window.history.replaceState({}, '', '/');
      }
    }
  }, [user]);

  const handleLogin = (username) => {
    setUser(username);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (user) {
    return <Dashboard username={user} onLogout={handleLogout} />;
  }

  return (
    <Login
      onLogin={handleLogin}
      view={view}
      onViewChange={setView}
    />
  );
}

export default App;
