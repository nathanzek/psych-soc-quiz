# CSE 594 A3 — MMLU Human-AI Study App

Two MTurk study interfaces (baseline + AI-assisted) with a Node.js backend.

---

## Files

```
study-app/
├── server.js              ← Express backend
├── package.json
├── data/
│   └── responses.json     ← Auto-created; stores all participant data
└── public/
    ├── trials.json        ← 200 MMLU trials (auto-generated from CSV)
    ├── style.css          ← Shared styles
    ├── utils.js           ← Shared JS
    ├── baseline.html      ← Condition 1: No AI
    ├── ai.html            ← Condition 2: AI-Assisted (Gemini)
    └── admin.html         ← Admin dashboard + CSV download
```

---

## Quick Start (Local Testing)

```bash
cd study-app
npm install
node server.js
```

Then open:
- Baseline:  http://localhost:3000/baseline.html
- AI:        http://localhost:3000/ai.html
- Admin:     http://localhost:3000/admin

---

## Deploy to Render (Free — Recommended)

1. Push this folder to a GitHub repo
2. Go to https://render.com → New → Web Service
3. Connect your repo
4. Set:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Environment**: Node
5. Deploy — Render gives you a public URL like `https://your-app.onrender.com`

**Important**: Render's free tier has ephemeral storage. Add a **Persistent Disk**
(under your service → Disks → Add Disk, mount at `/data`) and change `DATA_FILE`
in server.js to `/data/responses.json` so data survives restarts.

---

## Deploy to Railway (Alternative)

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

---

## MTurk Setup

### Baseline condition
1. Go to MTurk Requester Sandbox
2. Create a new HIT → Survey Link
3. URL: `https://your-app.onrender.com/baseline.html`
4. Set expiry: 100 days, assignments: 20+
5. Workers enter the completion code shown at the end

### AI-Assisted condition
Same steps, URL: `https://your-app.onrender.com/ai.html`

---

## What is Recorded Per Trial

| Field | Description |
|-------|-------------|
| `timestamp` | ISO datetime |
| `workerId` | Auto-generated unique ID shown to participant |
| `condition` | `baseline` or `ai` |
| `trialId` | Position in their session (0–9) |
| `questionId` | Original question ID from MMLU dataset |
| `subject` | `sociology` or `professional_psychology` |
| `humanAnswer` | Letter chosen by participant |
| `groundTruth` | Correct answer |
| `isCorrect` | 1 or 0 |
| `confidenceRating` | 1–5 |
| `timeSpentMs` | Milliseconds on this question |
| `aiShown` | Whether participant revealed AI answer (AI condition only) |
| `aiAnswer` | Gemini's answer letter (if revealed) |
| `aiWasHelpful` | `yes` / `neutral` / `no` (if revealed) |
| `sessionTotalTimeMs` | Total session time |

---

## Admin Dashboard

Visit `/admin` to see:
- Live response count, session counts, accuracy per condition
- Visual accuracy bar comparison
- Scrollable table of last 50 responses (auto-refreshes every 15s)
- Download all data as CSV

---

## Study Design Notes

- Each participant gets **10 randomly sampled trials** (seeded by their Worker ID
  so the same worker always gets the same questions — reproducible)
- Baseline and AI conditions use different seeds, so a worker doing both sees
  different questions (avoids learning effect)
- AI condition: worker must select their answer + confidence **before** the AI
  panel unlocks — prevents anchoring on AI first
- If worker reveals AI answer, they must rate helpfulness before proceeding
- Measures: accuracy, confidence, time-per-question, AI reveal rate, AI helpfulness

---

## Data Analysis (A3-2)

Download CSV from `/api/admin/csv` and load into Python:

```python
import pandas as pd
df = pd.read_csv('study_responses.csv')

# Accuracy by condition
df.groupby('condition')['isCorrect'].mean()

# Confidence by condition
df.groupby('condition')['confidenceRating'].mean()

# Time by condition
df.groupby('condition')['timeSpentMs'].median()

# AI helpfulness distribution
df[df['condition']=='ai']['aiWasHelpful'].value_counts()

# Statistical test (McNemar or chi-squared for accuracy)
from scipy import stats
base = df[df['condition']=='baseline']['isCorrect']
ai   = df[df['condition']=='ai']['isCorrect']
stats.ttest_ind(base, ai)
```
