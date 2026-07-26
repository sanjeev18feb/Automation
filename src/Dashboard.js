import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';

const projects = ['Project 1', 'Project 2', 'Project 3'];

function Dashboard({ username, onLogout }) {
  const [project, setProject] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [fileName, setFileName] = useState('');
  const [siNoKey, setSiNoKey] = useState('');
  const [rowStatuses, setRowStatuses] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);
  const fileInputRef = useRef();

  const getSiNoValue = (row) => String(row[siNoKey] || '').trim().toUpperCase();

  const stats = [
    { title: 'BB - SP',   value: tableData.filter(r => getSiNoValue(r).startsWith('BB-SP')).length },
    { title: 'BB - EP',   value: tableData.filter(r => getSiNoValue(r).startsWith('BB-EP')).length },
    { title: 'BTCW - EP', value: tableData.filter(r => getSiNoValue(r).startsWith('BTCW-EP')).length },
    { title: 'BTCF - EP', value: tableData.filter(r => getSiNoValue(r).startsWith('BTCF-EP')).length },
  ];

  const handleProjectChange = (e) => {
    setProject(e.target.value);
    setTableData([]);
    setColumns([]);
    setFileName('');
    setSiNoKey('');
    setRowStatuses({});
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
      } catch {
        setRowStatuses((prev) => ({ ...prev, [index]: 'fail' }));
      }
    }
  }, [project, tableData, siNoKey]);

  const toggleRowSelection = (index) => {
    setSelectedRows((prev) => prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index]);
  };

  const toggleSelectAll = () => {
    if (selectedRows.length === tableData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(tableData.map((_, index) => index));
    }
  };

  const handleUpload = async (e) => {
    // Excel uploads are only allowed before a project is selected.
    if (project) return;

    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);

    // Upload to backend so it stores the parsed data
    const formData = new FormData();
    formData.append('file', file);
    try {
      await fetch(`http://localhost:5000/api/upload?project=${encodeURIComponent(project)}`, {
        method: 'POST',
        body: formData,
      });
    } catch (err) {
      console.warn('Backend upload failed:', err.message);
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const workbook = XLSX.read(evt.target.result, { type: 'binary' });
      const sheetName =
        workbook.SheetNames.find(
          (s) => s.toLowerCase().replace(/\s/g, '') === project.toLowerCase().replace(/\s/g, '')
        ) || workbook.SheetNames[0];

      const sheet = workbook.Sheets[sheetName];

      // Find the actual header row by scanning for first non-empty row
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      const headerRowIndex = rawData.findIndex((row) =>
        row.some((cell) => String(cell).trim() !== '')
      );

      const data = XLSX.utils.sheet_to_json(sheet, {
        defval: '',
        range: headerRowIndex,
      });

      if (data.length > 0) {
        const allKeys = Object.keys(data[0]);
        const detectedSiNoKey = allKeys.find(k =>
          k.trim().toUpperCase().replace(/[\s.]/g, '').includes('SINO')
        ) || allKeys[1];

        setSiNoKey(detectedSiNoKey);
        setColumns(allKeys);
        setTableData(data);
      }
    };
    reader.readAsBinaryString(file);
  };

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
          <a href="#" className="active">Dashboard</a>
        </nav>
        <button className="logout-btn" onClick={() => setShowLogoutModal(true)}>Logout</button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <div>
              <p className="topbar-eyebrow">Operations workspace</p>
              <h1>Dashboard</h1>
            </div>
            <select className="project-dropdown" value={project} onChange={handleProjectChange}>
              <option value="">-- Select Project --</option>
              {projects.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="topbar-right">
            <label className={`upload-btn ${project ? 'disabled' : ''}`}>
              📂 Upload Excel
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                ref={fileInputRef}
                onChange={handleUpload}
                disabled={Boolean(project)}
                style={{ display: 'none' }}
              />
            </label>
            {fileName && <span className="file-name">{fileName}</span>}
            <div className="user-info">Hello, {username}</div>
          </div>
        </header>

        <div className="stats-grid">
          {stats.map((stat) => (
            <div className="stat-card" key={stat.title}>
              <p>{stat.title}</p>
              <h3>{stat.value}</h3>
            </div>
          ))}
        </div>

        <div className="bottom-section">
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


        </div>
      </main>

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
