import { useState } from 'react';

const projects = ['Project 1', 'Project 2', 'Project 3'];

function ProjectSelect({ username, onSelect }) {
  const [selected, setSelected] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selected) onSelect(selected);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Welcome, {username}!</h2>
        <p className="login-subtitle">Select a project to continue</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Project</label>
            <select value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">-- Select Project --</option>
              {projects.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="login-btn" disabled={!selected}>
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}

export default ProjectSelect;
