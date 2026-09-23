// Deterministic Camera Coach browser verification.
// Starts a local Vite server, mocks webcam/speech APIs, and replaces only the
// MediaPipe wrapper module with replayed MediaPipe-style landmark frames.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

assert(typeof WebSocket === 'function', 'Use Node 22+ with built-in WebSocket support.');

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

async function waitFor(test, timeout = 15000) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeout) {
    try {
      if (await test()) return;
    } catch (error) {
      lastError = error;
    }
    await delay(80);
  }
  throw new Error('Timed out waiting for condition.' + (lastError ? ' ' + lastError.message : ''));
}

function poseLandmarkerMockSource({ modelFailure = false } = {}) {
  return `
const modelFailure = ${JSON.stringify(modelFailure)};
const sideIndexes = {
  left: { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27 },
  right: { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28 },
};
function point(x, y, visibility = 0.96, z = 0) { return { x, y, z, visibility, presence: visibility }; }
function blank() { return Array.from({ length: 33 }, () => point(0.5, 0.5, 0.02)); }
function ease(p) { return 0.5 - Math.cos(Math.PI * p) / 2; }
function world(landmarks) { return landmarks.map((p) => ({ x: (p.x - 0.5) * 2, y: (p.y - 0.5) * 2, z: p.z || 0, visibility: p.visibility, presence: p.presence })); }
function set(landmarks, index, x, y, visibility = 0.96) { landmarks[index] = point(x, y, visibility); }
function otherSide(landmarks, side, indexes) {
  const other = side === 'right' ? sideIndexes.left : sideIndexes.right;
  const shift = side === 'right' ? -0.018 : 0.018;
  for (const key of Object.keys(indexes)) {
    const source = landmarks[indexes[key]];
    if (source) set(landmarks, other[key], source.x + shift, source.y + 0.006, 0.38);
  }
}
function crunch(progress) {
  const landmarks = blank(); const indexes = sideIndexes.left; const p = ease(progress);
  const hip = { x: 0.5, y: 0.56 }; const knee = { x: 0.76, y: 0.56 }; const ankle = { x: 0.91, y: 0.57 };
  const shoulder = { x: 0.2 + (0.482 - 0.2) * p, y: 0.56 + (0.35 - 0.56) * p };
  set(landmarks, indexes.shoulder, shoulder.x, shoulder.y); set(landmarks, indexes.hip, hip.x, hip.y);
  set(landmarks, indexes.knee, knee.x, knee.y); set(landmarks, indexes.ankle, ankle.x, ankle.y, 0.08);
  set(landmarks, indexes.elbow, shoulder.x + 0.06, shoulder.y + 0.08, 0.86); set(landmarks, indexes.wrist, shoulder.x + 0.1, shoulder.y + 0.16, 0.82);
  otherSide(landmarks, 'left', indexes); return landmarks;
}
function squat(angle) {
  const landmarks = blank(); const indexes = sideIndexes.left; const radians = angle * Math.PI / 180;
  const knee = { x: 0.48, y: 0.64 }; const hip = { x: 0.48, y: 0.42 };
  const ankle = { x: 0.48 + Math.sin(radians) * 0.24, y: 0.64 - Math.cos(radians) * 0.24 };
  const shoulder = { x: 0.48, y: 0.2 };
  set(landmarks, indexes.shoulder, shoulder.x, shoulder.y); set(landmarks, indexes.hip, hip.x, hip.y);
  set(landmarks, indexes.knee, knee.x, knee.y); set(landmarks, indexes.ankle, ankle.x, ankle.y);
  otherSide(landmarks, 'left', indexes); return landmarks;
}
function pushup(angle) {
  const landmarks = blank(); const indexes = sideIndexes.left;
  const shoulder = { x: 0.28, y: 0.5 }; const elbow = { x: 0.41, y: 0.505 };
  const vectorAngle = Math.PI - angle * Math.PI / 180; const wrist = { x: elbow.x + Math.cos(vectorAngle) * 0.15, y: elbow.y + Math.sin(vectorAngle) * 0.15 };
  set(landmarks, indexes.shoulder, shoulder.x, shoulder.y); set(landmarks, indexes.elbow, elbow.x, elbow.y); set(landmarks, indexes.wrist, wrist.x, wrist.y);
  set(landmarks, indexes.hip, 0.57, 0.52); set(landmarks, indexes.knee, 0.72, 0.53, 0.9); set(landmarks, indexes.ankle, 0.84, 0.54);
  otherSide(landmarks, 'left', indexes); return landmarks;
}
function jumpingJack(progress) {
  const landmarks = blank(); const p = ease(progress); const center = 0.5; const shoulderWidth = 0.22;
  const ankleWidth = 0.11 + (0.5 - 0.11) * p; const wristY = 0.62 + (0.12 - 0.62) * p; const wristSpread = shoulderWidth * (0.48 + (1.25 - 0.48) * p);
  set(landmarks, 11, center - shoulderWidth / 2, 0.28); set(landmarks, 12, center + shoulderWidth / 2, 0.28);
  set(landmarks, 23, center - 0.09, 0.56); set(landmarks, 24, center + 0.09, 0.56);
  set(landmarks, 15, center - wristSpread, wristY); set(landmarks, 16, center + wristSpread, wristY);
  set(landmarks, 27, center - ankleWidth / 2, 0.86); set(landmarks, 28, center + ankleWidth / 2, 0.86);
  return landmarks;
}
function sequence(kind) {
  const frames = []; const fps = 30; const frameMs = 1000 / fps;
  const pose = kind === 'squats' ? (v) => squat(172 + (96 - 172) * v)
    : kind === 'pushups' ? (v) => pushup(170 + (86 - 170) * v)
    : kind === 'jumping-jacks' ? jumpingJack : crunch;
  const segments = [[0, 0, 16], [0, 1, 22], [1, 1, 12], [1, 0, 22], [0, 0, 18]];
  let timestamp = 0;
  for (const [from, to, count] of segments) {
    for (let i = 0; i < count; i += 1) {
      const p = count <= 1 ? 1 : i / (count - 1);
      const value = from + (to - from) * ease(p);
      const landmarks = pose(value);
      frames.push({ timestamp, landmarks, worldLandmarks: world(landmarks), frameBrightness: window.__cameraReplayBrightness ?? 0.35 });
      timestamp += frameMs;
    }
  }
  return frames;
}
function emptyFrame() { return { landmarks: [], worldLandmarks: [], frameBrightness: window.__cameraReplayBrightness ?? 0.35 }; }
window.__cameraReplay = {
  exercise: 'squats',
  frames: sequence('squats'),
  index: 0,
  detections: 0,
  setExercise(exercise) { this.exercise = exercise; this.frames = sequence(exercise); this.index = 0; this.detections = 0; },
  setNoPerson() { this.frames = Array.from({ length: 90 }, emptyFrame); this.index = 0; this.detections = 0; },
};
export async function initializePoseLandmarker() {
  if (modelFailure) throw new Error('QA model failure');
  return {
    detectForVideo() {
      const replay = window.__cameraReplay;
      replay.detections += 1;
      const item = replay.frames[Math.min(replay.index, replay.frames.length - 1)] || emptyFrame();
      replay.index += 1;
      return { landmarks: item.landmarks?.length ? [item.landmarks] : [], worldLandmarks: item.worldLandmarks?.length ? [item.worldLandmarks] : [] };
    },
    close() { window.__cameraReplayClosed = (window.__cameraReplayClosed || 0) + 1; },
  };
}
export function drawPoseOverlay(canvas) { const context = canvas?.getContext?.('2d'); if (context) context.clearRect(0, 0, canvas.width || 1, canvas.height || 1); }
export function clearPoseOverlay(canvas) { const context = canvas?.getContext?.('2d'); if (context) context.clearRect(0, 0, canvas.width || 1, canvas.height || 1); }
`;
}

function bootstrapSource() {
  return `
sessionStorage.setItem('bits-motion-launch-seen-v2', '1');
window.__qaSpeech = { spoken: [], cancelled: 0, reset() { this.spoken = []; this.cancelled = 0; } };
class QAUtterance {
  constructor(text) { this.text = text; this.lang = ''; this.rate = 1; this.pitch = 1; this.volume = 1; this.voice = null; }
}
Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: QAUtterance, configurable: true });
Object.defineProperty(window, 'speechSynthesis', { value: {
  _listeners: {},
  getVoices() { return [{ name: 'Natural India', lang: 'en-IN' }, { name: 'Plain US', lang: 'en-US' }]; },
  addEventListener(event, handler) { this._listeners[event] = handler; },
  removeEventListener(event, handler) { if (this._listeners[event] === handler) delete this._listeners[event]; },
  cancel() { window.__qaSpeech.cancelled += 1; },
  speak(utterance) { window.__qaSpeech.spoken.push({ text: utterance.text, lang: utterance.lang, voice: utterance.voice?.name || null }); },
}, configurable: true });
window.__qaCamera = { mode: 'granted', streams: [], width: 640, height: 480 };
window.__qaSetCameraMode = (mode) => { window.__qaCamera.mode = mode; };
window.__qaSetCameraSize = (width, height) => {
  window.__qaCamera.width = width; window.__qaCamera.height = height;
  for (const item of window.__qaCamera.streams) { item.canvas.width = width; item.canvas.height = height; item.context.fillRect(0, 0, width, height); }
};
window.__qaEndTracks = () => {
  for (const item of window.__qaCamera.streams) {
    for (const track of item.stream.getTracks()) track.dispatchEvent(new Event('ended'));
  }
};
navigator.mediaDevices = navigator.mediaDevices || {};
navigator.mediaDevices.getUserMedia = async () => {
  const mode = window.__qaCamera.mode;
  if (mode !== 'granted') throw new DOMException('QA camera state', mode);
  const canvas = document.createElement('canvas');
  canvas.width = window.__qaCamera.width; canvas.height = window.__qaCamera.height;
  const context = canvas.getContext('2d');
  context.fillStyle = '#576b7f'; context.fillRect(0, 0, canvas.width, canvas.height);
  const stream = canvas.captureStream(30);
  const timer = setInterval(() => {
    const next = Number(canvas.dataset.frame || '0') + 1;
    canvas.dataset.frame = String(next);
    context.fillStyle = next % 2 ? '#586c80' : '#596d81';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }, 33);
  for (const track of stream.getTracks()) {
    const stop = track.stop.bind(track);
    track.stop = () => { clearInterval(timer); stop(); };
  }
  window.__qaCamera.streams.push({ stream, canvas, context });
  return stream;
};
`;
}

async function runBrowserPass({ origin, modelFailure = false }) {
  const outputDirectory = await mkdtemp(path.join('/tmp', 'bits-camera-coach-'));
  const chromePath = process.env.CHROME_PATH || (process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome');
  const chrome = spawn(chromePath, [
    '--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
    '--user-data-dir=' + path.join(outputDirectory, 'chrome-profile'), 'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  let chromeOutput = '';
  chrome.stdout.on('data', (data) => { chromeOutput += data.toString(); });
  chrome.stderr.on('data', (data) => { chromeOutput += data.toString(); });

  let socket;
  const errors = [];
  try {
    let debuggingPort;
    const profileDirectory = path.join(outputDirectory, 'chrome-profile');
    await waitFor(async () => {
      const outputMatch = chromeOutput.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//);
      if (outputMatch) {
        debuggingPort = Number(outputMatch[1]);
        return debuggingPort;
      }
      const content = await readFile(path.join(profileDirectory, 'DevToolsActivePort'), 'utf8');
      debuggingPort = Number(content.split('\\n')[0]);
      return debuggingPort;
    }).catch((error) => {
      throw new Error(error.message + '\nChrome output:\n' + chromeOutput.slice(0, 2000));
    });
    const pages = await (await fetch('http://127.0.0.1:' + debuggingPort + '/json/list')).json();
    socket = new WebSocket(pages.find((page) => page.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    let sequence = 0;
    const pending = new Map();
    function send(method, params = {}) {
      const id = ++sequence;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    }
    socket.addEventListener('message', async (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const { resolve, reject } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
        return;
      }
      if (message.method === 'Fetch.requestPaused') {
        const url = message.params.request.url;
        if (url.includes('/api')) {
          const apiUrl = new URL(url);
          const action = apiUrl.searchParams.get('action');
          const payload = action === 'status'
            ? { databaseConfigured: true, googleConfigured: true }
            : { user: null, profile: null };
          await send('Fetch.fulfillRequest', {
            requestId: message.params.requestId,
            responseCode: 200,
            responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
            body: Buffer.from(JSON.stringify(payload)).toString('base64'),
          });
        } else if (url.includes('/src/vision/poseLandmarker.js')) {
          await send('Fetch.fulfillRequest', {
            requestId: message.params.requestId,
            responseCode: 200,
            responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }],
            body: Buffer.from(poseLandmarkerMockSource({ modelFailure })).toString('base64'),
          });
        } else {
          await send('Fetch.continueRequest', { requestId: message.params.requestId });
        }
      } else if (message.method === 'Runtime.exceptionThrown') {
        errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      } else if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
        errors.push(message.params.entry.text);
      }
    });

    const evaluate = async (expression) => {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    };
    const click = async (text) => {
      await waitFor(() => evaluate(`[...document.querySelectorAll('button')].some((button) => button.textContent.includes(${JSON.stringify(text)}) && !button.disabled)`));
      await evaluate(`(() => {
        const button = [...document.querySelectorAll('button')].find((item) => item.textContent.includes(${JSON.stringify(text)}) && !item.disabled);
        button.click();
      })()`);
    };

    await send('Runtime.enable');
    await send('Log.enable');
    await send('Page.enable');
    await send('Fetch.enable', { patterns: [
      { urlPattern: '*src/vision/poseLandmarker.js*', requestStage: 'Request' },
      { urlPattern: origin + '/api*', requestStage: 'Request' },
    ] });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: bootstrapSource() });
    await send('Page.navigate', { url: origin + '/#preview' });

    if (modelFailure) {
      await waitFor(() => evaluate('document.body.innerText.includes("Model unavailable")'), 20000);
      assert(errors.length === 0 || errors.every((item) => item.includes('QA model failure')), 'Only the intentional model failure may be logged.');
      return { errors, outputDirectory };
    }

    await waitFor(() => evaluate('document.body.innerText.includes("Ready when you are")'), 25000);

    await evaluate('window.localStorage.setItem("bits-motion-voice-coach", "true")');
    await evaluate('window.__qaSetCameraMode("NotAllowedError")');
    await click('Start Camera');
    await waitFor(() => evaluate('document.body.innerText.includes("Camera permission needed")'));
    await evaluate('window.__qaSetCameraMode("NotFoundError")');
    await click('Try again');
    await waitFor(() => evaluate('document.body.innerText.includes("No camera was found")'));
    await evaluate('window.__qaSetCameraMode("granted")');
    await click('Try again');
    await waitFor(() => evaluate('Boolean(document.querySelector(".live-badge"))'));
    await click('End session');
    await waitFor(() => evaluate('Boolean(document.querySelector("dialog[open]"))'));
    await click('Try another movement');
    await waitFor(() => evaluate('document.body.innerText.includes("Ready when you are")'), 25000);
    if (await evaluate('document.querySelector(".coach-audio-toggle")?.getAttribute("aria-pressed") === "false"')) {
      await click('Voice off');
    }

    for (const [label, exercise] of [
      ['Squats', 'squats'],
      ['Crunches', 'crunches'],
      ['Push-ups', 'pushups'],
      ['Jumping Jacks', 'jumping-jacks'],
    ]) {
      await evaluate(`window.__cameraReplay.setExercise(${JSON.stringify(exercise)}); window.__qaSpeech.reset();`);
      if (label !== 'Squats') await click(label);
      await waitFor(() => evaluate('document.body.innerText.includes("Ready when you are")'));
      await click('Start Camera');
      await waitFor(() => evaluate('Boolean(document.querySelector(".live-badge"))'));
      await waitFor(() => evaluate('Number(document.querySelector(".rep-card strong")?.textContent || "0") === 1'), 12000);
      assert.equal(await evaluate('Number(document.querySelector(".rep-card strong")?.textContent || "0")'), 1, label + ' UI rep count');
      assert(await evaluate('window.__qaSpeech.spoken.length > 0'), label + ' should produce voice when enabled');
      assert(await evaluate('(window.__qaSpeech.spoken.length <= 6)'), label + ' voice cues should be throttled');
      await click('End session');
      await waitFor(() => evaluate('Boolean(document.querySelector("dialog[open]"))'));
      assert(await evaluate('(window.__qaCamera.streams || []).every((item) => item.stream.getTracks().every((track) => track.readyState === "ended"))'), label + ' stream cleanup');
      await click('Try another movement');
      await waitFor(() => evaluate('!document.querySelector("dialog[open]")'));
      assert.equal(await evaluate('Number(document.querySelector(".rep-card strong")?.textContent || "0")'), 0, label + ' reset after summary');
    }

    await evaluate('window.__cameraReplay.setExercise("crunches"); window.__qaSpeech.reset();');
    await click('Crunches');
    await click('Start Camera');
    await waitFor(() => evaluate('Boolean(document.querySelector(".live-badge"))'));
    await waitFor(() => evaluate('window.__qaSpeech.spoken.length > 0'));
    await click('Voice on');
    assert(await evaluate('window.__qaSpeech.cancelled > 0'), 'voice toggle off cancels current speech');
    const spokenAfterOff = await evaluate('window.__qaSpeech.spoken.length');
    await delay(500);
    assert.equal(await evaluate('window.__qaSpeech.spoken.length'), spokenAfterOff, 'voice off prevents new speech');
    await evaluate('window.__qaEndTracks()');
    await waitFor(() => evaluate('document.body.innerText.includes("camera stopped unexpectedly")'));
    assert(await evaluate('window.__qaSpeech.cancelled > 0'), 'track end cancels speech');
    await evaluate('window.__qaSetCameraSize(480, 640)');
    await click('Try again');
    await waitFor(() => evaluate('Boolean(document.querySelector(".live-badge"))'));
    const streamCountBeforeResize = await evaluate('window.__qaCamera.streams.length');
    for (const [width, height] of [[1920, 1080], [1280, 720], [640, 480], [390, 844], [844, 390]]) {
      await evaluate(`window.__qaSetCameraSize(${width}, ${height})`);
      await delay(160);
      assert(await evaluate('Boolean(document.querySelector(".live-badge"))'), 'live camera survives resize');
    }
    assert.equal(await evaluate('window.__qaCamera.streams.length'), streamCountBeforeResize, 'resize does not restart camera');
    assert(await evaluate('Boolean(document.querySelector(".camera-viewport"))'), 'camera survives portrait resize');
    await evaluate('document.querySelector(".coach-home-button").click()');
    await waitFor(() => evaluate('location.hash === "" || location.hash === "#"'));
    assert(await evaluate('(window.__qaCamera.streams || []).every((item) => item.stream.getTracks().every((track) => track.readyState === "ended"))'), 'navigation cleanup');

    if (errors.length) throw new Error(errors.join('\\n'));
    return { errors, outputDirectory };
  } finally {
    socket?.close();
    chrome.kill('SIGTERM');
  }
}

const port = await freePort();
const origin = 'http://127.0.0.1:' + port;
const vite = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

try {
  await waitFor(async () => {
    const response = await fetch(origin).catch(() => null);
    return response?.ok;
  }, 30000);
  await runBrowserPass({ origin });
  await runBrowserPass({ origin, modelFailure: true });
  console.log('Camera Coach browser integration: PASS');
} finally {
  vite.kill('SIGTERM');
}
