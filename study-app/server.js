const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'responses.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize data file
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

function loadResponses() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}
function saveResponses(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Generate a new worker ID
app.get('/api/worker-id', (req, res) => {
  res.json({ workerId: 'W-' + uuidv4().split('-')[0].toUpperCase() });
});

// Submit a single trial response
app.post('/api/response', (req, res) => {
  const {
    workerId, condition, trialId, questionId, subject,
    humanAnswer, groundTruth, isCorrect,
    confidenceRating, timeSpentMs,
    aiShown, aiAnswer, aiWasHelpful
  } = req.body;

  if (!workerId || !condition || !humanAnswer) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const responses = loadResponses();
  const entry = {
    timestamp: new Date().toISOString(),
    workerId, condition, trialId, questionId, subject,
    humanAnswer, groundTruth,
    isCorrect: isCorrect ? 1 : 0,
    confidenceRating: confidenceRating ?? null,
    timeSpentMs: timeSpentMs ?? null,
    aiShown: aiShown ?? null,
    aiAnswer: aiAnswer ?? null,
    aiWasHelpful: aiWasHelpful ?? null
  };
  responses.push(entry);
  saveResponses(responses);
  res.json({ ok: true });
});

// Submit session summary (completion)
app.post('/api/session', (req, res) => {
  const responses = loadResponses();
  // Tag all entries for this worker with session end time
  const { workerId, totalTimeMs } = req.body;
  responses.forEach(r => {
    if (r.workerId === workerId && !r.sessionTotalTimeMs) {
      r.sessionTotalTimeMs = totalTimeMs;
    }
  });
  saveResponses(responses);
  res.json({ ok: true });
});

// Admin: get all data as JSON
app.get('/api/admin/data', (req, res) => {
  const responses = loadResponses();
  res.json(responses);
});

// Admin: download as CSV
app.get('/api/admin/csv', (req, res) => {
  const responses = loadResponses();
  if (responses.length === 0) {
    return res.send('No data yet.');
  }
  const headers = Object.keys(responses[0]);
  const csv = [
    headers.join(','),
    ...responses.map(r =>
      headers.map(h => {
        const v = r[h] ?? '';
        return String(v).includes(',') ? `"${v}"` : v;
      }).join(',')
    )
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="study_responses.csv"');
  res.send(csv);
});

// Admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`Study server running at http://localhost:${PORT}`);
  console.log(`  Baseline:  http://localhost:${PORT}/baseline.html`);
  console.log(`  AI-Assist: http://localhost:${PORT}/ai.html`);
  console.log(`  Admin:     http://localhost:${PORT}/admin`);
});
