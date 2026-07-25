const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// In-memory store: { [project]: [rows] }
let excelStore = {};

// POST /api/upload?project=Project1
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const project = req.query.project || 'default';
  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });

  const sheetName =
    workbook.SheetNames.find(
      (s) => s.toLowerCase().replace(/\s/g, '') === project.toLowerCase().replace(/\s/g, '')
    ) || workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];

  // Skip empty leading rows — find first non-empty row as header
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const headerRowIndex = rawRows.findIndex((row) =>
    row.some((cell) => String(cell).trim() !== '')
  );

  const data = XLSX.utils.sheet_to_json(sheet, { defval: '', range: headerRowIndex });
  excelStore[project] = data;

  res.json({ message: 'Uploaded successfully', project, rows: data.length });
});

// POST /api/calculate
app.post('/api/calculate', async (req, res) => {
  const { supportingBeam, incomingBeam, verticalShearLoad, project = 'default' } = req.body;

  if (!supportingBeam || !incomingBeam || verticalShearLoad === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const rows = excelStore[project] || [];

  // Find matching rows using exact Excel column names
  const matchedRows = rows.filter((row) =>
    String(row['SUPPORTING BEAM']).trim().toUpperCase() === supportingBeam.toUpperCase() &&
    String(row['INCOMING BEAM']).trim().toUpperCase() === incomingBeam.toUpperCase()
  );

  if (matchedRows.length === 0) {
    return res.status(404).json({ error: 'No matching row found for given SUPPORTING BEAM and INCOMING BEAM' });
  }

  const matchedRow = matchedRows[0];

  const payload = {
    supportingBeam,
    incomingBeam,
    verticalShearLoad,
    excelData: matchedRow,
  };

  try {
    // Forward to MathCAD — replace with actual MathCAD endpoint
    const MATHCAD_URL = process.env.MATHCAD_URL || 'http://localhost:8080/api/mathcad/calculate';
    const mathcadResponse = await axios.post(MATHCAD_URL, payload);
    return res.json({ result: mathcadResponse.data });
  } catch (err) {
    // Return payload if MathCAD is unreachable (dev/testing)
    return res.status(502).json({
      error: 'MathCAD service unavailable',
      sentPayload: payload,
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
