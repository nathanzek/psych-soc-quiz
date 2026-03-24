// ── Shared utilities ──────────────────────────────────────
const TRIALS_PER_SESSION = 10;

async function loadTrials() {
  const res = await fetch('/trials.json');
  return res.json();
}

function sampleTrials(allTrials, n, seed) {
  // Deterministic shuffle using worker seed so each worker gets a unique but reproducible set
  const arr = [...allTrials];
  let s = seed;
  const rand = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

function hashCode(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
  return h >>> 0;
}

async function getOrCreateWorkerId() {
  let id = sessionStorage.getItem('workerId');
  if (!id) {
    try {
      const res = await fetch('/api/worker-id');
      const data = await res.json();
      id = data.workerId;
    } catch {
      id = 'W-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    }
    sessionStorage.setItem('workerId', id);
  }
  return id;
}

async function submitResponse(payload) {
  try {
    await fetch('/api/response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.error('Failed to submit response:', e);
  }
}

async function submitSession(workerId, totalTimeMs) {
  try {
    await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workerId, totalTimeMs })
    });
  } catch (e) {
    console.error('Failed to submit session:', e);
  }
}

function formatTime(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s/60)}m ${s%60}s`;
}

function generateCompletionCode(workerId, condition) {
  return `CSE594-${condition.toUpperCase().slice(0,2)}-${workerId.replace('W-','')}`;
}
