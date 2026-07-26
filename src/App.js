import { useState } from 'react';
import './App.css';
import Login from './Login';
import Dashboard from './Dashboard';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login');

  if (user) {
    return <Dashboard username={user} onLogout={() => setUser(null)} />;
  }

  return (
    <Login
      onLogin={setUser}
      view={view}
      onViewChange={setView}
    />
  );
}

export default App;
