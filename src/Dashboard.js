import { useState, useRef, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveProject, loadProject, getAllProjectNames } from './idb';

const navItems = [
  { key: 'home', label: 'Home' },
  { key: 'upload', label: 'Upload Excel' },
  { key: 'calculations', label: 'Calculations' },
  { key: 'logs', label: 'Logs' },
];

function Dashboard({ username, onLogout }) {
  const [project, setProject] = useState('');
  const [activePage, setActivePage] = useState('home');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [fileName, setFileName] = useState('');
  const [siNoKey, setSiNoKey] = useState('');
  const [rowStatuses, setRowStatuses] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);
  const [logs, setLogs] = useState([]);
  const [savedProjects, setSavedProjects] = useState([]);
  const [showProjectNameModal, setShowProjectNameModal] = useState(false);
  const [pendingFileData, setPendingFileData] = useState(null);
  const [newProjectName, setNewProjectName] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    getAllProjectNames().then(setSavedProjects).catch(() => {});
  }, []);

  const getSiNoValue = (row) => String(row[siNoKey] || '').trim().toUpperCase();

  const stats = [
    { title: 'BB - SP', value: tableData.filter((r) => getSiNoValue(r).startsWith('BB-SP')).length },
    { title: 'BB - EP', value: tableData.filter((r) => getSiNoValue(r).startsWith('BB-EP')).length },
    { title: 'BTCW - EP', value: tableData.filter((r) => getSiNoValue(r).startsWith('BTCW-EP')).length },
    { title: 'BTCF - EP', value: tableData.filter((r) => getSiNoValue(r).startsWith('BTCF-EP')).length },
  ];

  const addLog = useCallback((message, type = 'info') => {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      message,
      type,
      createdAt: new Date().toLocaleString(),
    };
    setLogs((prev) => [entry, ...prev].slice(0, 12));
  }, []);

  const handleProjectChange = async (e) => {
    const nextProject = e.target.value;
    setProject(nextProject);
    setRowStatuses({});
    setSelectedRows([]);
    addLog(nextProject ? `Project switched to ${nextProject}` : 'Project selection cleared', 'info');

    if (nextProject && savedProjects.includes(nextProject)) {
      const saved = await loadProject(nextProject);
      if (saved) {
        setTableData(saved.data.tableData);
        setColumns(saved.data.columns);
        setFileName(saved.data.fileName);
        setSiNoKey(saved.data.siNoKey);
        addLog(`Loaded saved data for ${nextProject}`, 'success');
        return;
      }
    }
    setTableData([]);
    setColumns([]);
    setFileName('');
    setSiNoKey('');
  };

  const hasUploadedData = tableData.length > 0 && columns.length > 0;

  const getCellValue = (row, possibleKeys) => {
    const normalized = possibleKeys.map((key) => key.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const rowKeys = Object.keys(row || {});

    for (const key of rowKeys) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalized.includes(normalizedKey)) {
        return row[key];
      }
    }

    return '';
  };

  const handleRun = useCallback(async (rowsToRun) => {
    if (!rowsToRun.length) return;

    rowsToRun.forEach((index) => {
      setRowStatuses((prev) => ({ ...prev, [index]: 'running' }));
    });

    for (const index of rowsToRun) {
      const row = tableData[index];
      const requestId = `${Date.now()}-${index}`;
      try {
        const res = await fetch('http://localhost:5000/api/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: requestId,
            siNo: getCellValue(row, [siNoKey, 'SI.NO', 'SI NO', 'SI.NO.', 'SINO', 'Si.No']),
            supportingBeam: getCellValue(row, ['SUPPORTING BEAM', 'SUPPORTINGBEAM', 'SUPPORTING BEAM', 'SUPPORTING']),
            incomingBeam: getCellValue(row, ['INCOMING BEAM', 'INCOMINGBEAM', 'INCOMING BEAM', 'INCOMING']),
            verticalShearLoad: getCellValue(row, ['GIVEN VERTICAL SHEAR LOAD (Kip)', 'GIVEN VERTICAL SHEAR LOAD', 'VERTICAL SHEAR LOAD', 'VERTICALSHEARLOAD']),
          }),
        });
        setRowStatuses((prev) => ({ ...prev, [index]: res.ok ? 'pass' : 'fail' }));
        addLog(res.ok ? `Calculation completed for row ${index + 1}` : `Calculation failed for row ${index + 1}`, res.ok ? 'success' : 'error');
      } catch {
        setRowStatuses((prev) => ({ ...prev, [index]: 'fail' }));
        addLog(`Calculation failed for row ${index + 1}`, 'error');
      }
    }
  }, [tableData, siNoKey, addLog]);

  const toggleRowSelection = (index) => {
    setSelectedRows((prev) => (prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index]));
  };

  const toggleSelectAll = () => {
    if (selectedRows.length === tableData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(tableData.map((_, index) => index));
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const workbook = XLSX.read(evt.target.result, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      const headerRowIndex = rawData.findIndex((row) => row.some((cell) => String(cell).trim() !== ''));
      const data = XLSX.utils.sheet_to_json(sheet, { defval: '', range: headerRowIndex });

      if (data.length > 0) {
        const allKeys = Object.keys(data[0]);
        const detectedSiNoKey = allKeys.find((k) => k.trim().toUpperCase().replace(/[\s.]/g, '').includes('SINO')) || allKeys[1];
        setPendingFileData({ tableData: data, columns: allKeys, fileName: file.name, siNoKey: detectedSiNoKey });
        setNewProjectName(file.name.replace(/\.[^.]+$/, ''));
        setShowProjectNameModal(true);
      } else {
        addLog(`Uploaded ${file.name} but no rows were found`, 'warning');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveProject = async () => {
    const name = newProjectName.trim();
    if (!name || !pendingFileData) return;
    await saveProject(name, pendingFileData);
    setSavedProjects((prev) => prev.includes(name) ? prev : [...prev, name]);
    setProject(name);
    setTableData(pendingFileData.tableData);
    setColumns(pendingFileData.columns);
    setFileName(pendingFileData.fileName);
    setSiNoKey(pendingFileData.siNoKey);
    setSelectedRows([]);
    setRowStatuses({});
    addLog(`Saved and loaded project "${name}" with ${pendingFileData.tableData.length} rows`, 'success');
    setShowProjectNameModal(false);
    setPendingFileData(null);
    setNewProjectName('');
  };

  const pageTitle = activePage === 'home' ? 'Home' : activePage === 'calculations' ? 'Calculations' : activePage === 'upload' ? 'Upload Excel' : 'Logs';

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-badge">A</div>
          <div>
            <h2>Automation</h2>
            <p>Operations</p>
          </div>
        </div>
        <nav>
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`nav-link ${activePage === item.key ? 'active' : ''}`}
              onClick={() => setActivePage(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <button className="logout-btn" onClick={() => setShowLogoutModal(true)}>Logout</button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <div>
              <p className="topbar-eyebrow">Operations workspace</p>
              <h1>{pageTitle}</h1>
            </div>
            <select className="project-dropdown" value={project} onChange={handleProjectChange}>
              <option value="">-- Select Project --</option>
              {savedProjects.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="topbar-right">
            {fileName && activePage === 'upload' && <span className="file-name">{fileName}</span>}
            <div className="user-info">Hello, {username}</div>
          </div>
        </header>

        <div className="bottom-section">
          {activePage === 'home' && (
            <div className="page-card">
              <div className="section-heading">
                <h2>Welcome back</h2>
                <span className="section-pill">Active workspace</span>
              </div>
              <p className="page-description">
                Review project status, launch calculations, upload new sheets, and monitor recent activity from one place.
              </p>
              <div className="overview-grid">
                <div className="overview-card">
                  <h3>{project || 'No project selected'}</h3>
                  <p>Selected project</p>
                </div>
                <div className="overview-card">
                  <h3>{hasUploadedData ? `${tableData.length} rows` : 'No data'}</h3>
                  <p>Loaded rows</p>
                </div>
                <div className="overview-card">
                  <h3>{selectedRows.length}</h3>
                  <p>Selected rows</p>
                </div>
              </div>
              <div className="stats-grid">
                {stats.map((stat) => (
                  <div className="stat-card" key={stat.title}>
                    <p>{stat.title}</p>
                    <h3>{stat.value}</h3>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activePage === 'calculations' && (
            <div className="activity-section">
              <div className="section-heading">
                <h2>{project ? `Project Data — ${project}` : 'Project Data'}</h2>
                <span className="section-pill">
                  {project ? 'Live data view' : hasUploadedData ? 'Uploaded file ready' : 'Ready for upload'}
                </span>
              </div>
              {!hasUploadedData ? (
                <p className="no-data">
                  {project ? 'No data loaded. Please upload an Excel file.' : 'Upload an Excel file to view project data here.'}
                </p>
              ) : (
                <>
                  <div className="table-toolbar">
                    <label className="checkbox-row select-all-row">
                      <input
                        type="checkbox"
                        checked={tableData.length > 0 && selectedRows.length === tableData.length}
                        onChange={toggleSelectAll}
                      />
                      <span>Select all</span>
                    </label>
                    <button className="run-btn bulk-run-btn" onClick={() => handleRun(selectedRows)} disabled={!selectedRows.length}>
                      Run selected
                    </button>
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th className="checkbox-col">
                            <input type="checkbox" readOnly checked={false} />
                          </th>
                          {columns.map((col) => <th key={col}>{col}</th>)}
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.map((row, i) => (
                          <tr key={i}>
                            <td className="checkbox-col">
                              <input
                                type="checkbox"
                                checked={selectedRows.includes(i)}
                                onChange={() => toggleRowSelection(i)}
                              />
                            </td>
                            {columns.map((col) => <td key={col}>{row[col]}</td>)}
                            <td>
                              {rowStatuses[i] && rowStatuses[i] !== 'running' && (
                                <span className={`status-badge ${rowStatuses[i]}`}>
                                  {rowStatuses[i] === 'pass' ? 'Pass' : 'Fail'}
                                </span>
                              )}
                              {rowStatuses[i] === 'running' && <span className="status-badge running">Running...</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {activePage === 'upload' && (
            <div className="page-card">
              <div className="section-heading">
                <h2>Upload project data</h2>
                <span className="section-pill">Excel import</span>
              </div>
              <p className="page-description">
                Import a spreadsheet to load project rows into the workspace before running calculations.
              </p>
              <div className="upload-panel">
                <label className="upload-btn">
                  📂 Choose Excel file
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    ref={fileInputRef}
                    onChange={handleUpload}
                    style={{ display: 'none' }}
                  />
                </label>
                {fileName ? <p className="file-name">Last upload: {fileName}</p> : <p className="no-data">No file uploaded yet.</p>}
              </div>
              {hasUploadedData && (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        {columns.map((col) => <th key={col}>{col}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.slice(0, 6).map((row, i) => (
                        <tr key={i}>
                          {columns.map((col) => <td key={`${col}-${i}`}>{row[col]}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activePage === 'logs' && (
            <div className="page-card">
              <div className="section-heading">
                <h2>Activity logs</h2>
                <span className="section-pill">Recent events</span>
              </div>
              {logs.length > 0 ? (
                <ul className="log-list">
                  {logs.map((entry) => (
                    <li key={entry.id} className={`log-item ${entry.type}`}>
                      <div>
                        <strong>{entry.message}</strong>
                        <div className="log-meta">{entry.createdAt}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-data">No activity recorded yet.</p>
              )}
            </div>
          )}
        </div>
      </main>

      {showProjectNameModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>Save as project</h3>
            <p>Enter a name for this project to appear in the dropdown.</p>
            <div className="form-group">
              <label>Project name</label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveProject()}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="modal-btn secondary" onClick={() => { setShowProjectNameModal(false); setPendingFileData(null); }}>Cancel</button>
              <button className="modal-btn primary" onClick={handleSaveProject} disabled={!newProjectName.trim()}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showLogoutModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>Confirm logout</h3>
            <p>Are you sure you want to sign out of your workspace?</p>
            <div className="modal-actions">
              <button className="modal-btn secondary" onClick={() => setShowLogoutModal(false)}>Cancel</button>
              <button className="modal-btn primary" onClick={() => { setShowLogoutModal(false); onLogout(); }}>Logout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
