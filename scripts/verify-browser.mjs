// Run against a local Vite server: node scripts/verify-browser.mjs
// The API and Google credential callback are mocked; no real accounts or data are used.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { EXERCISES } from '../src/data/exercises.js';
import { generateWorkoutPlan } from '../src/utils/workoutRecommendation.js';
import { calculateWorkoutDuration } from '../shared/recommendation.js';

const origin = process.env.BROWSER_TEST_URL || 'http://127.0.0.1:5173';
const base = new URL(origin);
assert(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Only a local application URL is supported.');
assert(typeof WebSocket === 'function', 'Use Node 22+ (built-in WebSocket support).');
const outputDirectory = await mkdtemp(path.join(tmpdir(), 'bits-motion-browser-'));
const chromePath = process.env.CHROME_PATH || (process.platform === 'darwin'
  ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome');
const chrome = spawn(chromePath, [
  '--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
  '--user-data-dir=' + path.join(outputDirectory, 'chrome-profile'), 'about:blank',
], { stdio: 'ignore' });
let socket;
const results = [];
const errors = [];
const modelDiagnostics = [];
const networkFailures = [];
const httpErrors = [];
const networkUrls = new Map();
const reviewedLayouts = new Set();
let emptyLeaderboard = false;
let holdAccountSessions = null;
let releaseSessions;
let delayedResponse;
const requests = [];
let activeAccount = null;
const failures = new Set();
const fixtureProfile = (name) => ({
  displayName: name, age: '20', height: '175', weight: '70', level: 'Beginner',
  goal: 'Stay fit', time: '20', location: 'Hostel', equipment: 'None',
  lowImpact: false, leaderboardOptIn: false, leaderboardName: '',
});
const accounts = Object.fromEntries(['A', 'B'].map((key) => [key, {
  user: { email: key.toLowerCase() + '@example.test', name: 'Google ' + key, avatarUrl: '',
    leaderboardOptIn: false, leaderboardName: '' },
  profile: null, plan: null, sessions: [],
}]));
const makePlan = (key, profile) => ({
  ...generateWorkoutPlan(profile),
  id: 'test-plan-' + key, title: profile.displayName + ' private plan',
  createdAt: new Date().toISOString(),
});
const fixtureSession = (key, reps) => ({
  id: 'test-session-' + key, clientSessionId: 'test-client-' + key,
  exerciseId: 'squats', exerciseName: key + ' private history', completedAt: new Date().toISOString(),
  startedAt: new Date(Date.now() - 60000).toISOString(), durationSeconds: 60, reps, calories: 5, source: 'real',
});
const googleMock = function () {
  let callback;
  window.__smokeAccount = 'A';
  window.google = { accounts: { id: {
    initialize(options) { callback = options.callback; },
    renderButton(container) {
      const button = document.createElement('button');
      button.textContent = 'Continue with Google';
      button.className = 'google-placeholder';
      button.onclick = () => callback({ credential: window.__smokeAccount });
      container.replaceChildren(button);
    },
    disableAutoSelect() {},
  } } };
};

async function ready(test, timeout = 15000) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeout) {
    try { if (await test()) return; } catch (error) { last = error; }
    await delay(80);
  }
  throw new Error('Timed out waiting for browser state.' + (last ? ' ' + last.message : ''));
}

try {
  await fetch(origin);
  let port;
  await ready(async () => {
    const content = await readFile(path.join(outputDirectory, 'chrome-profile', 'DevToolsActivePort'), 'utf8');
    port = Number(content.split('\n')[0]);
    return port;
  });
  const pages = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
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

  async function answerApi(event) {
    const url = new URL(event.request.url);
    // Every app API request is intercepted before it can reach the real backend.
    const action = url.searchParams.get('action');
    const method = event.request.method;
    const data = JSON.parse(event.request.postData || '{}');
    requests.push({ action, method, account: activeAccount });
    let status = 200;
    let payload;
    const account = accounts[activeAccount];
    if (failures.has(action)) {
      status = 503; payload = { error: 'Temporary browser-test service failure.' };
    } else if (action === 'status') {
      payload = { databaseConfigured: true, googleConfigured: true };
    } else if (action === 'auth-google') {
      assert(accounts[data.credential], 'Only mock Google credentials can be used.');
      activeAccount = data.credential;
      payload = { user: accounts[activeAccount].user, profile: accounts[activeAccount].profile };
    } else if (action === 'logout') {
      activeAccount = null; payload = { ok: true };
    } else if (!account) {
      status = 401; payload = { error: 'Sign in required.' };
    } else if (action === 'me') {
      payload = { user: account.user, profile: account.profile };
    } else if (action === 'profile' && method === 'PUT') {
      account.profile = data;
      Object.assign(account.user, { name: data.displayName, leaderboardOptIn: data.leaderboardOptIn,
        leaderboardName: data.leaderboardName });
      payload = { profile: account.profile, user: account.user };
    } else if (action === 'plan') {
      if (method === 'POST') account.plan = makePlan(activeAccount, account.profile);
      payload = account.plan;
    } else if (action === 'sessions') {
      if (method === 'POST') {
        const session = { ...data, id: 'test-saved-' + account.sessions.length, source: 'real' };
        account.sessions.push(session);
        payload = session;
      } else payload = account.sessions;
    } else if (action === 'sessions-summary') {
      payload = {
        totalSessions: account.sessions.length,
        workouts: account.sessions.length,
        activeDays: new Set(account.sessions.map((s) => (s.completedAt ? s.completedAt.slice(0, 10) : '2026-03-29'))).size,
        totalReps: account.sessions.reduce((sum, s) => sum + (s.reps || 0), 0),
        totalDurationSeconds: account.sessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0),
        totalCalories: account.sessions.reduce((sum, s) => sum + (s.calories || 0), 0),
      };
    } else if (action === 'leaderboard') {
      payload = { community: { active_people: 1, workouts: 1, reps: 11 }, leaders: [
        { rank: 1, name: 'Private alias A', workouts: 1, reps: 11, activeDays: 1, isCurrentUser: true },
      ] };
      if (emptyLeaderboard) payload = { community: {}, leaders: [] };
    } else {
      status = 404; payload = { error: 'Unsupported mock action: ' + action };
    }
    const responseBody = Buffer.from(JSON.stringify(payload)).toString('base64');
    if (action === 'sessions' && method === 'GET' && activeAccount === holdAccountSessions) {
      holdAccountSessions = null;
      delayedResponse = new Promise((resolve) => { releaseSessions = resolve; });
      await delayedResponse;
    }
    await send('Fetch.fulfillRequest', {
      requestId: event.requestId, responseCode: status,
      responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
      body: responseBody,
    });
  }

  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const handler = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) handler?.reject(new Error(message.error.message));
      else handler?.resolve(message.result);
    } else if (message.method === 'Fetch.requestPaused') {
      void answerApi(message.params).catch((error) => errors.push(error.message));
    } else if (message.method === 'Runtime.exceptionThrown') {
      errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    } else if (message.method === 'Network.requestWillBeSent') {
      networkUrls.set(message.params.requestId, message.params.request.url);
    } else if (message.method === 'Network.loadingFailed') {
      networkFailures.push({ url: networkUrls.get(message.params.requestId), error: message.params.errorText, cancelled: Boolean(message.params.canceled) });
    } else if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) {
      httpErrors.push({ url: message.params.response.url, status: message.params.response.status });
    } else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      const text = message.params.args.map((arg) => arg.value || arg.description || '').join(' ');
      // Headless Chrome has no GPU. The existing model loader deliberately falls back to CPU.
      // Keep those exact diagnostics in the report; all other errors still fail the check.
      if (text.includes('emscripten_webgl_create_context() returned error')
        || text.startsWith('INFO: Created TensorFlow Lite XNNPACK delegate for CPU.')) modelDiagnostics.push(text);
      else errors.push(text);
    }
  });

  async function evaluate(expression) {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    return response.result.value;
  }
  const body = () => evaluate('document.body.innerText');
  const route = (screen) => ready(() => evaluate(
    screen === '' || screen === 'welcome'
      ? '(location.hash === "" || location.hash === "#welcome")'
      : 'location.hash === ' + JSON.stringify('#' + screen)
  ));
  async function reload() {
    await evaluate('window.__smokeReloadMarker = true');
    await send('Page.reload', { ignoreCache: true });
    await ready(() => evaluate('window.__smokeReloadMarker !== true && document.readyState === "complete"'));
  }
  async function click(text, selector = 'button') {
    await ready(() => evaluate('[...document.querySelectorAll(' + JSON.stringify(selector)
      + ')].some(el => el.textContent.trim() === ' + JSON.stringify(text)
      + ' && el.getClientRects().length && !el.disabled)'));
    await evaluate('(() => { const button = [...document.querySelectorAll(' + JSON.stringify(selector)
      + ')].find(el => el.textContent.trim() === ' + JSON.stringify(text)
      + ' && el.getClientRects().length); if (!button || button.disabled) throw new Error("Control unavailable: " + '
      + JSON.stringify(text) + '); button.click(); })()');
    await delay(120);
  }
  async function setFields(fields) {
    await evaluate('(() => { const fields = ' + JSON.stringify(fields) + '; for (const [name, value] of Object.entries(fields)) {'
      + 'let el = document.querySelector("[name=" + name + "]"); if (!el) throw new Error("Missing field " + name);'
      + 'if (el.type === "checkbox") { if (el.checked !== value) el.click(); continue; }'
      + 'if (el.type === "radio") { el = document.querySelector("[name=" + name + "][value=" + JSON.stringify(String(value)) + "]"); if (!el) throw new Error("Missing option " + name + "=" + value); el.click(); continue; }'
      + 'const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;'
      + 'Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);'
      + 'el.dispatchEvent(new Event("input", {bubbles:true})); el.dispatchEvent(new Event("change", {bubbles:true})); } })()');
    await delay(100);
  }
  async function completeProfile(name, { edit = false, optIn = false } = {}) {
    await setFields({ displayName: name, age: '20', height: '175', weight: '70' });
    await reviewWidths('profile-about');
    await click('Continue');
    await setFields({ level: 'Beginner', goal: 'Stay fit' });
    await reviewWidths('profile-goal');
    await click('Continue');
    await setFields({ time: '20', location: 'Hostel', equipment: 'None' });
    await reviewWidths('profile-setup', true);
    if (optIn) {
      await setFields({ leaderboardOptIn: true });
      await setFields({ leaderboardName: 'Private alias A' });
    }
    await click(edit ? 'Save & refresh plan' : 'Create my plan');
    await route('plan');
    await ready(() => evaluate('Boolean(document.querySelector(".plan-decision"))'));
  }
  async function openMenuAndClick(text) {
    await evaluate('document.querySelector(".account-menu summary").click()');
    await click(text, '.account-menu button');
  }
  async function login(key) {
    await evaluate('window.__smokeAccount = ' + JSON.stringify(key));
    const googlePresent = await evaluate('[...document.querySelectorAll("button")].some(el => el.textContent === "Continue with Google")');
    if (!googlePresent) {
      const hasSetup = await evaluate('[...document.querySelectorAll("button")].some(el => el.textContent.trim().startsWith("Set up my fitness journey"))');
      if (hasSetup) {
        await click('Set up my fitness journey');
      } else {
        const hasSignIn = await evaluate('Boolean(document.querySelector(".nav-signin-button"))');
        if (hasSignIn) await evaluate('document.querySelector(".nav-signin-button").click()');
      }
    }
    await ready(() => evaluate('[...document.querySelectorAll("button")].some(el => el.textContent === "Continue with Google")'));
    await click('Continue with Google');
    await ready(() => evaluate('["#profile", "#dashboard"].includes(location.hash)'));
  }
  async function logout() {
    await openMenuAndClick('Sign out');
    await ready(() => evaluate('Boolean(document.querySelector(".welcome-screen-v2"))'));
    await ready(() => activeAccount === null);
  }
  async function screenshot(label, width) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 500 });
    await evaluate('window.scrollTo(0, 0)');
    await delay(180);
    const layout = await evaluate('({width: innerWidth, scrollWidth: document.documentElement.scrollWidth})');
    const metrics = await send('Page.getLayoutMetrics');
    const capture = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height: metrics.cssContentSize.height, scale: 1 } });
    const file = path.join(outputDirectory, label + '-' + width + '.png');
    await writeFile(file, Buffer.from(capture.data, 'base64'));
    if (layout.scrollWidth > layout.width + 1) {
      const offenders = await evaluate('[...document.querySelectorAll("main *, header *")].filter(el => { const r = el.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1); }).slice(0, 20).map(el => ({tag: el.tagName, cls: el.className, width: Math.round(el.getBoundingClientRect().width)}))');
      assert.fail(label + ' horizontal overflow: ' + JSON.stringify({ ...layout, offenders }));
    }
    results.push('Screenshot and no horizontal overflow: ' + label + ' at ' + width + 'px');
  }
  async function record(name, work) {
    await work();
    results.push(name);
    console.log('PASS ' + name);
  }

  async function reviewLandscape(label) {
    await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1, mobile: true });
    await evaluate('window.scrollTo(0, 0)');
    await delay(180);
    const layout = await evaluate('({width: innerWidth, scrollWidth: document.documentElement.scrollWidth})');
    const metrics = await send('Page.getLayoutMetrics');
    const capture = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: 844, height: metrics.cssContentSize.height, scale: 1 } });
    const file = path.join(outputDirectory, label + '-844x390-landscape.png');
    await writeFile(file, Buffer.from(capture.data, 'base64'));
    if (layout.scrollWidth > layout.width + 1) {
      assert.fail(label + ' landscape horizontal overflow: ' + JSON.stringify(layout));
    }
    results.push('Screenshot and no horizontal overflow: ' + label + ' at 844x390 landscape');
  }

  async function reviewWidths(label, includeLandscape = false) {
    if (reviewedLayouts.has(label)) return;
    for (const width of [390, 768, 820, 1024, 1440]) await screenshot(label, width);
    if (includeLandscape) {
      await reviewLandscape(label);
      await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
      await delay(100);
    }
    reviewedLayouts.add(label);
  }

  async function syntheticCamera(mode = 'granted') {
    await evaluate(`(() => {
      window.__qaStreams ||= [];
      navigator.mediaDevices.getUserMedia = async () => {
        if (${JSON.stringify(mode)} !== 'granted') throw new DOMException('QA camera state', ${JSON.stringify(mode)});
        const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
        const context = canvas.getContext('2d');
        context.fillStyle = '#31445b'; context.fillRect(0, 0, 640, 480);
        const stream = canvas.captureStream(15);
        window.__qaStreams.push(stream);
        // Keep a synthetic frame arriving, with no human pose or private pixels.
        const timer = setInterval(() => context.fillRect(0, 0, 640, 480), 70);
        for (const track of stream.getTracks()) {
          const stop = track.stop.bind(track);
          track.stop = () => { clearInterval(timer); stop(); };
        }
        return stream;
      };
    })()`);
  }

  const streamsStopped = () => evaluate('(window.__qaStreams || []).every(stream => stream.getTracks().every(track => track.readyState === "ended"))');

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: base.origin + '/api*', requestStage: 'Request' }] });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: '(' + googleMock.toString() + ')()' });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await send('Page.navigate', { url: origin });
  await ready(() => evaluate('Boolean(document.querySelector(".welcome-screen-v2"))'));

  await record('Reduced-motion intro completes without a decorative delay', async () => {
    await ready(() => evaluate('!document.querySelector(".launch-screen") && sessionStorage.getItem("bits-motion-launch-seen-v2") === "1"'));
    assert.equal(await evaluate('Boolean(document.querySelector(".launch-skip") || [...document.querySelectorAll("button")].some(el => el.textContent.trim() === "Skip"))'), false);
  });

  await record('Intro visualization renders without Skip button and automatically transitions to Homepage', async () => {
    // 1. Clear launch session flag and disable reduced-motion emulation
    await evaluate('sessionStorage.removeItem("bits-motion-launch-seen-v2")');
    await send('Emulation.setEmulatedMedia', { features: [] });
    await send('Page.navigate', { url: origin });

    // 2. Verify intro visualization renders immediately
    await ready(() => evaluate('Boolean(document.querySelector(".launch-screen"))'));
    assert.equal(await evaluate('Boolean(document.querySelector(".launch-orbit"))'), true);
    assert.equal(await evaluate('Boolean(document.querySelector(".launch-kicker"))'), true);
    assert.equal(await evaluate('Boolean(document.querySelector(".launch-screen h1"))'), true);
    assert.equal(await evaluate('Boolean(document.querySelector(".launch-pulse"))'), true);

    // 3. Verify Skip button is NOT present in the DOM
    assert.equal(await evaluate('Boolean(document.querySelector(".launch-skip") || [...document.querySelectorAll(".launch-screen button")].some(el => el.textContent.trim() === "Skip"))'), false);
    assert.equal(await evaluate('document.querySelectorAll(".launch-screen button").length'), 0);

    // 4. Verify automatic transition completes into Homepage
    await ready(() => evaluate('!document.querySelector(".launch-screen") && Boolean(document.querySelector(".welcome-screen-v2"))'), 8000);
    assert.equal(await evaluate('sessionStorage.getItem("bits-motion-launch-seen-v2")'), '1');

    // 5. Restore prefers-reduced-motion: reduce for swift subsequent test execution
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  });

  await record('One Google/Guest choice and public leaderboard navigation', async () => {
    assert.equal(await evaluate('Boolean(document.querySelector(".nav-signin-button"))'), true);
    assert.equal(await evaluate('Boolean(document.querySelector(".auth-choice-expanded"))'), false);
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".marketing-copy h1")).outlineStyle'), 'none');
    assert.equal(await evaluate('Boolean(document.querySelector(".visual-launch-coach"))'), true);
    await click('Set up my fitness journey');
    await ready(() => evaluate('[...document.querySelectorAll("button")].some(el => el.textContent === "Continue with Google")'));
    assert.equal(await evaluate('[...document.querySelectorAll("button")].filter(el => el.textContent.trim() === "Continue as Guest").length'), 1);
    await reviewWidths('home', true);
    await click('Leaderboard', '.marketing-nav button');
    await route('leaderboard');
    assert((await body()).includes('Sample leaderboard preview'));
    await reload();
    await ready(() => evaluate('Boolean(document.querySelector(".leaderboard-page"))'));
    await route('leaderboard');
    await evaluate('document.querySelector(' + JSON.stringify('[aria-label="Go back"]') + ').click()');
    await ready(() => evaluate('Boolean(document.querySelector(".welcome-screen-v2"))'));
  });

  await record('Public information and trust routes support deep links, refresh, Back, Forward, and cross-navigation', async () => {
    await click('Features', '.marketing-nav button');
    await route('features');
    assert((await body()).includes('Real AI coaching for real student spaces'));
    assert.equal(await evaluate('document.querySelector(".trust-subnav-pill[aria-current=page]").textContent.trim()'), 'Features');
    await reload();
    await ready(() => evaluate('Boolean(document.querySelector(".features-page"))'));
    await click('How It Works', '.trust-subnav-pill');
    await route('how-it-works');
    assert((await body()).includes('How BITS in Motion works'));
    await evaluate('history.back()');
    await route('features');
    await evaluate('history.forward()');
    await route('how-it-works');

    await send('Page.navigate', { url: origin + '/#terms' });
    await ready(() => evaluate('Boolean(document.querySelector(".terms-page"))'));
    assert((await body()).includes('Terms and Conditions'));
    assert((await body()).includes('Last updated: 22 September 2026'));
    assert((await body()).includes('Governing law: India'));
    assert.equal(await evaluate('document.querySelectorAll(".terms-page .terms-section").length'), 13);
    assert.equal(await evaluate('document.querySelector(' + JSON.stringify('a.trust-inline-link[href="#privacy"]') + ').textContent'), 'Privacy Policy');
    assert.equal(await evaluate('document.querySelector(' + JSON.stringify('a.trust-inline-link[href="#health-disclaimer"]') + ').textContent'), 'Health Disclaimer');
    await reload();
    await ready(() => evaluate('Boolean(document.querySelector(".terms-page"))'));

    await send('Page.navigate', { url: origin + '/#privacy' });
    await ready(() => evaluate('Boolean(document.querySelector(".privacy-page"))'));
    assert((await body()).includes('Privacy Policy'));
    assert((await body()).includes('Camera usage: nothing is recorded or stored'));
    assert((await body()).includes('Governing region: India'));
    assert((await body()).includes('If you use Guest Mode'));
    assert((await body()).includes('If you sign in with Google'));
    assert((await body()).includes('If you join the leaderboard'));
    assert.equal(await evaluate('document.querySelectorAll(".privacy-page .terms-section").length'), 9);
    await reload();
    await ready(() => evaluate('Boolean(document.querySelector(".privacy-page"))'));

    await send('Page.navigate', { url: origin + '/#health-disclaimer' });
    await ready(() => evaluate('Boolean(document.querySelector(".health-page"))'));
    assert((await body()).includes('Health Disclaimer'));
    assert((await body()).includes('Listen to your body'));
    assert((await body()).includes('112'));
    assert((await body()).includes('102'));
    assert((await body()).includes('108'));
    assert.equal(await evaluate('document.querySelectorAll(".health-page .terms-section").length'), 8);
    await reload();
    await ready(() => evaluate('Boolean(document.querySelector(".health-page"))'));

    await click('Terms', '.trust-subnav-pill');
    await route('terms');
    await click('Privacy Policy', '.trust-inline-link');
    await route('privacy');
    await evaluate('history.back()');
    await route('terms');
    await evaluate('history.forward()');
    await route('privacy');
    await click('Health Disclaimer', '.trust-subnav-pill');
    await route('health-disclaimer');
    await click('Return to Home');
    await route('');
    await ready(() => evaluate('Boolean(document.querySelector(".welcome-screen-v2"))'));

    await click('Explore features');
    await route('features');
    await evaluate('history.back()');
    await route('');

    await click('Set up my fitness journey');
    await ready(() => evaluate('document.querySelector(".auth-choice-card").getBoundingClientRect().top < innerHeight'));
  });

  await record('Anonymous Camera Preview: logged-out direct access, zero persistence, and safe exit', async () => {
    // 1. Verify duplicate "Camera-guided movement" button is removed
    assert.equal(await evaluate('Boolean(document.querySelector(".camera-guided-cta") || [...document.querySelectorAll("button")].some(el => el.textContent.trim() === "Camera-guided movement"))'), false);

    // 2. Logged-out visitor clicking 'Live Camera Coach' opens preview directly
    await click('Live Camera Coach');
    await route('preview');

    // 3. No Guest selection is required, no Google sign in, no profile setup
    assert.equal(await evaluate('localStorage.getItem("bits-motion-guest-active-v1")'), null);
    assert.equal(await evaluate('localStorage.getItem("bits-motion-profile-v1")'), null);
    await ready(() => evaluate('Boolean(document.querySelector(".preview-mode-banner"))'));
    assert((await body()).includes('Preview Mode'));
    assert((await body()).includes('This session will not be saved.'));

    // 4. Only camera-supported exercises are exposed
    const exposedExercises = await evaluate(`[...document.querySelectorAll('.preview-exercise-tab')].map(el => el.textContent.trim())`);
    assert.equal(exposedExercises.length, 4);
    assert(exposedExercises.some(text => text.includes('Squats')));
    assert(exposedExercises.some(text => text.includes('Push-ups')));
    assert(exposedExercises.some(text => text.includes('Crunches')));
    assert(exposedExercises.some(text => text.includes('Jumping Jacks')));

    // 5. Test exercise switching in preview
    await evaluate('(() => { [...document.querySelectorAll(".preview-exercise-tab")].find(el => el.textContent.includes("Push-ups")).click(); })()');
    await ready(() => evaluate('document.body.innerText.includes("Elbow angle")'));

    // 6. Switch back to squats
    await evaluate('(() => { [...document.querySelectorAll(".preview-exercise-tab")].find(el => el.textContent.includes("Squats")).click(); })()');
    await ready(() => evaluate('document.body.innerText.includes("Knee angle")'));

    // 7. Test Back navigation from preview returns to Welcome without redirecting to profile
    await evaluate('document.querySelector(' + JSON.stringify('[aria-label="Back to previous screen"]') + ').click()');
    await route('');
    await ready(() => evaluate('Boolean(document.querySelector(".welcome-screen-v2"))'));

    // 8. Re-enter preview via Live Camera Coach hero CTA
    await click('Live Camera Coach');
    await route('preview');

    // 9. Test Home button in preview topbar returns to Welcome
    await evaluate('document.querySelector(' + JSON.stringify('[aria-label="Go to BITS in Motion homepage"]') + ').click()');
    await route('');
    await ready(() => evaluate('Boolean(document.querySelector(".welcome-screen-v2"))'));

    // 10. Direct URL hash navigation to #preview works anonymously
    await evaluate('location.hash = "#preview"');
    await route('preview');
    await ready(() => evaluate('Boolean(document.querySelector(".preview-mode-banner"))'));
    await evaluate('history.back()');
    await route('');
    await ready(() => evaluate('Boolean(document.querySelector(".welcome-screen-v2"))'));

    // 11. Assert absolutely no persistence occurred
    assert.equal(await evaluate('localStorage.getItem("bits-motion-sessions-v1")'), null);
    assert.equal(await evaluate('localStorage.getItem("bits-motion-guest-active-v1")'), null);
    assert.equal(await evaluate('localStorage.getItem("bits-motion-profile-v1")'), null);
    assert.equal(requests.filter(r => r.action === 'sessions' && r.method === 'POST').length, 0);
  });

  let guestPlan;
  await record('Guest onboarding supports browser Back/Forward, Home and draft restoration', async () => {
    const guestPresent = await evaluate('[...document.querySelectorAll("button")].some(el => el.textContent.trim() === "Continue as Guest")');
    if (!guestPresent) {
      await click('Set up my fitness journey');
    }
    await ready(() => evaluate('[...document.querySelectorAll("button")].some(el => el.textContent.trim() === "Continue as Guest")'));
    await click('Continue as Guest');
    await route('profile');
    await setFields({ displayName: 'Draft Guest' });
    await evaluate('history.back()');
    await ready(() => evaluate('location.hash === "" && Boolean(document.querySelector(".welcome-screen-v2"))'));
    assert.equal(await evaluate('localStorage.getItem("bits-motion-guest-active-v1")'), '1');
    await evaluate('history.forward()');
    await route('profile');
    assert.equal(await evaluate('document.querySelector("[name=displayName]").value'), 'Draft Guest');
    await evaluate('document.querySelector(' + JSON.stringify('[aria-label="Go to BITS in Motion homepage"]') + ').click()');
    await ready(() => evaluate('location.hash === "" && Boolean(document.querySelector(".welcome-screen-v2"))'));
    await evaluate('history.back()');
    await route('profile');
    assert.equal(await evaluate('document.querySelector("[name=displayName]").value'), 'Draft Guest');
    await setFields({ displayName: '' });
    await click('Continue');
    assert((await body()).includes('Enter a preferred name'));
    await completeProfile('Guest Example');
    guestPlan = await evaluate('localStorage.getItem("bits-motion-plan-v1")');
    assert(guestPlan);
    assert.equal(await evaluate('JSON.parse(localStorage.getItem("bits-motion-sessions-v1") || "[]").length'), 0);
    await click('Explore dashboard');
    await route('dashboard');
    assert((await body()).includes('Guest Example'));
    assert((await body()).includes('No workouts yet'));
    await reviewWidths('dashboard', true);
  });

  await record('Navigation, browser history, refresh, direct coach access and retained guest plan', async () => {
    await click('Workouts', '.desktop-nav button');
    await route('workouts');
    await click('My Plan', '.desktop-nav button');
    await route('plan');
    await evaluate('history.back()');
    await route('workouts');
    await evaluate('history.forward()');
    await route('plan');
    await reload();
    await ready(() => evaluate('Boolean(document.querySelector(".plan-decision"))'));
    assert.equal(await evaluate('localStorage.getItem("bits-motion-plan-v1")'), guestPlan);
    await click('Coach', '.desktop-nav button');
    await route('coach');
    await ready(() => evaluate('Boolean(document.querySelector(' + JSON.stringify('[aria-label="Back to previous screen"]') + '))'));
    await ready(() => evaluate('document.body.innerText.includes("Ready when you are")'), 30000);
    await evaluate('document.querySelector(' + JSON.stringify('[aria-label="Back to previous screen"]') + ').click()');
    await route('plan');
    assert.equal(await evaluate('JSON.parse(localStorage.getItem("bits-motion-sessions-v1") || "[]").length'), 0);
    await evaluate('document.querySelector(' + JSON.stringify('[aria-label="Go to BITS in Motion homepage"]') + ').click()');
    await ready(() => evaluate('Boolean(document.querySelector(".welcome-screen-v2"))'));
    await click('Live Camera Coach');
    await route('preview');
    await ready(() => evaluate('Boolean(document.querySelector(' + JSON.stringify('[aria-label="Go to BITS in Motion homepage"]') + '))'));
    await evaluate('document.querySelector(' + JSON.stringify('[aria-label="Go to BITS in Motion homepage"]') + ').click()');
    await ready(() => evaluate('Boolean(document.querySelector(".welcome-screen-v2"))'));
    await openMenuAndClick('Sign in or exit guest');
    await ready(() => evaluate('Boolean(document.querySelector(".welcome-screen-v2"))'));
    assert.equal(await evaluate('localStorage.getItem("bits-motion-plan-v1")'), guestPlan);
    assert.equal(await evaluate('localStorage.getItem("bits-motion-guest-active-v1")'), null);
  });

  await record('Account A onboarding and profile alias changes use actual public-user API shape', async () => {
    await login('A');
    await route('profile');
    assert.equal(await evaluate('document.querySelector("[name=displayName]").value'), 'Google A');
    await completeProfile('Account A');
    assert.equal(accounts.A.profile.displayName, 'Account A');
    await click('Explore dashboard');
    await openMenuAndClick('Fitness profile');
    await completeProfile('Preferred A', { edit: true, optIn: true });
    assert.equal(accounts.A.user.name, 'Preferred A');
    assert.equal(accounts.A.user.leaderboardOptIn, true);
    assert.equal(accounts.A.user.leaderboardName, 'Private alias A');
    assert.equal('id' in accounts.A.user, false);
    accounts.A.sessions.push(fixtureSession('A', 11));
    await click('Progress', '.desktop-nav button');
    await ready(() => evaluate('document.body.innerText.includes("A private history")'));
  });

  await record('Editing existing completed profile stays on step 3 without premature save', async () => {
    // 1. Account A is already authenticated with completed profile.
    await openMenuAndClick('Fitness profile');
    await route('profile');
    assert.equal(await evaluate('location.hash'), '#profile');

    // 2. Inspect/modify Step 1.
    assert((await body()).includes('About you'));
    await setFields({ displayName: 'Preferred A' });

    // Track PUT /api?action=profile calls
    const profilePutsBefore = requests.filter((r) => r.action === 'profile' && r.method === 'PUT').length;

    // 3. Continue to Step 2.
    await click('Continue');
    await ready(() => evaluate('document.body.innerText.includes("Your goal")'));
    assert.equal(requests.filter((r) => r.action === 'profile' && r.method === 'PUT').length, profilePutsBefore,
      'No save API call when continuing from Step 1 to Step 2');

    // 4. Continue from Step 2 to Step 3.
    await click('Continue');

    // 5. Assert Step 3 is visible.
    await ready(() => evaluate('document.body.innerText.includes("Your setup")'));

    // Wait a brief delay to ensure no asynchronous premature save occurs
    await delay(250);

    // 6. Assert profile save API has NOT been called.
    assert.equal(requests.filter((r) => r.action === 'profile' && r.method === 'PUT').length, profilePutsBefore,
      'Premature save defect: Profile save API was called upon entering Step 3');

    // 7. Assert navigation has NOT occurred.
    assert.equal(await evaluate('location.hash'), '#profile',
      'Premature navigation defect: App navigated away from #profile upon entering Step 3');

    // 8. Assert Step 3 remains visible.
    assert((await body()).includes('Your setup'));

    // 9. Modify a Step 3 value.
    await setFields({ equipment: 'Backpack' });

    // 10. Assert still no save occurs.
    await delay(120);
    assert.equal(requests.filter((r) => r.action === 'profile' && r.method === 'PUT').length, profilePutsBefore,
      'Profile save API called prematurely upon modifying Step 3 field');
    assert.equal(await evaluate('location.hash'), '#profile');

    // 11. Click the explicit final Save/Update button.
    await click('Save & refresh plan');

    // 12. Assert exactly one profile-save request occurs.
    await ready(() => requests.filter((r) => r.action === 'profile' && r.method === 'PUT').length === profilePutsBefore + 1);

    // 13. Assert updated Step 3 data is persisted.
    assert.equal(accounts.A.profile.equipment, 'Backpack');

    // 14. Assert expected navigation occurs only after successful save.
    await route('plan');
    await ready(() => evaluate('Boolean(document.querySelector(".plan-decision"))'));
  });

  await record('Logout clears A, B starts empty, returning A restores only A history', async () => {
    await logout();
    assert(!(await body()).includes('Preferred A'));
    await login('B');
    await route('profile');
    assert.equal(await evaluate('document.querySelector("[name=displayName]").value'), 'Google B');
    await completeProfile('Account B');
    await click('Explore dashboard');
    assert((await body()).includes('No workouts yet'));
    assert(!(await body()).includes('Preferred A'));
    assert(!(await body()).includes('A private history'));
    accounts.B.sessions.push(fixtureSession('B', 22));
    await click('Progress', '.desktop-nav button');
    await ready(() => evaluate('document.body.innerText.includes("B private history")'));
    assert(!(await body()).includes('A private history'));
    await logout();
    await login('A');
    await route('dashboard');
    assert((await body()).includes('Preferred A'));
    assert((await body()).includes('A private history'));
    assert(!(await body()).includes('B private history'));
    await reload();
    await ready(() => evaluate('Boolean(document.querySelector(".dashboard-page"))'));
    assert((await body()).includes('Preferred A'));
  });

  await record('Authenticated loading errors never substitute guest data; progress/plan retries work', async () => {
    await evaluate('localStorage.setItem("bits-motion-sessions-v1", ' + JSON.stringify(JSON.stringify([fixtureSession('Guest', 99)])) + ')');
    failures.add('sessions');
    failures.add('plan');
    await reload();
    await ready(() => evaluate('document.body.innerText.includes("Your activity could not load.")'));
    assert(!(await body()).includes('Guest private history'));
    assert(!(await body()).includes('A private history'));
    assert((await body()).includes('Your plan needs a retry'));
    const postsBefore = requests.filter((request) => request.action === 'plan' && request.method === 'POST').length;
    failures.delete('plan');
    await click('Retry plan');
    await ready(() => evaluate('document.body.innerText.includes("Preferred A private plan")'));
    assert.equal(requests.filter((request) => request.action === 'plan' && request.method === 'POST').length, postsBefore);
    await click('Progress', '.desktop-nav button');
    await ready(() => evaluate('document.body.innerText.includes("Progress could not be loaded")'));
    assert(!(await body()).includes('Guest private history'));
    failures.delete('sessions');
    await click('Retry');
    await ready(() => evaluate('document.body.innerText.includes("A private history")'));
  });

  await record('Signed-in leaderboard loads live fixtures and shows retry instead of samples on failure', async () => {
    failures.add('leaderboard');
    await openMenuAndClick('Leaderboard');
    await ready(() => evaluate('document.body.innerText.includes("We couldn’t load the leaderboard")'));
    assert(!(await body()).includes('Sample leaderboard preview'));
    failures.delete('leaderboard');
    await click('Retry leaderboard');
    await ready(() => evaluate('document.body.innerText.includes("Private alias A")'));
    assert(!(await body()).includes('Sample leaderboard preview'));
  });

  await record('Guest history stays independent through A/B account switches', async () => {
    await logout();
    const guestPresent = await evaluate('[...document.querySelectorAll("button")].some(el => el.textContent.trim() === "Continue as Guest")');
    if (!guestPresent) {
      await click('Set up my fitness journey');
    }
    await ready(() => evaluate('[...document.querySelectorAll("button")].some(el => el.textContent.trim() === "Continue as Guest")'));
    await click('Continue as Guest');
    await route('dashboard');
    assert((await body()).includes('Guest Example'));
    assert((await body()).includes('Guest private history'));
    assert(!(await body()).includes('A private history'));
    await openMenuAndClick('Sign in or exit guest');
    await login('B');
    await route('dashboard');
    assert((await body()).includes('Account B'));
    assert((await body()).includes('B private history'));
    assert(!(await body()).includes('Guest private history'));
    assert(!(await body()).includes('A private history'));
  });

  await record('A delayed account response cannot overwrite the next account', async () => {
    holdAccountSessions = 'B';
    await click('Progress', '.desktop-nav button');
    await ready(() => typeof releaseSessions === 'function');
    await logout();
    await login('A');
    await route('dashboard');
    releaseSessions();
    await delay(250);
    assert((await body()).includes('Preferred A'));
    assert((await body()).includes('A private history'));
    assert(!(await body()).includes('B private history'));
  });

  await record('Every major screen fits 390, 768, 820, 1024, 1440px and mobile landscape', async () => {
    for (const [screen, selector] of [
      ['features', '.features-page'], ['how-it-works', '.how-it-works-page'],
      ['terms', '.terms-page'], ['privacy', '.privacy-page'], ['health-disclaimer', '.health-page'],
      ['plan', '.plan-page'], ['workouts', '.library-page'], ['progress', '.progress-page'], ['leaderboard', '.leaderboard-page'],
    ]) {
      await evaluate('location.hash = ' + JSON.stringify('#' + screen));
      await ready(() => evaluate('Boolean(document.querySelector(' + JSON.stringify(selector) + '))'));
      await reviewWidths(screen, ['plan', 'progress', 'features', 'how-it-works', 'terms', 'privacy', 'health-disclaimer'].includes(screen));
    }
    await evaluate('location.hash = "#workouts"');
    await ready(() => evaluate('document.querySelectorAll(".library-card").length === 10'));
    // Every movement offers a start action: 4 camera-guided + 6 self-guided.
    assert.equal(await evaluate('document.querySelectorAll(".library-card button").length'), 10);
    assert.equal(await evaluate('[...document.querySelectorAll(".library-card button")].filter((b) => b.textContent.includes("camera coach")).length'), 4);
    assert.equal(await evaluate('[...document.querySelectorAll(".library-card button")].filter((b) => b.textContent.toLowerCase().includes("self-guided")).length'), 6);
    await click('Camera guided');
    assert.equal(await evaluate('document.querySelectorAll(".library-card").length'), 4);
    await click('All movements');
    assert.equal(await evaluate('document.querySelectorAll(".library-card").length'), 10);

    // Verify self-guided screen in landscape and responsive viewports
    await evaluate('location.hash = "#plan"');
    await ready(() => evaluate('Boolean(document.querySelector(".plan-page"))'));
    const foundSelfGuidedButton = await evaluate('(() => { const btn = [...document.querySelectorAll(".exercise-card button")].find(b => b.textContent.toLowerCase().includes("self-guided")); if (btn) { btn.click(); return true; } return false; })()');
    assert(foundSelfGuidedButton, 'Plan page must offer a self-guided start button for at least one non-camera movement');
    await ready(() => evaluate('location.hash === "#self-guided"'));
    await ready(() => evaluate('Boolean(document.querySelector(".self-guided-page"))'));
    await reviewWidths('self-guided', true);
    await evaluate('document.querySelector(".self-guided-page [aria-label=\\"Back\\"]").click()');
    await ready(() => evaluate('Boolean(document.querySelector(".plan-page"))'));
  });

  await record('Preview permissions, running switch, summary focus, restart and zero persistence', async () => {
    const storageBefore = await evaluate('JSON.stringify(localStorage)');
    const writesBefore = requests.filter((r) => ['POST', 'PUT'].includes(r.method)).length;
    await evaluate('location.hash = "#preview"');
    await ready(() => evaluate('document.body.innerText.includes("Ready when you are")'), 30000);
    await reviewWidths('preview');
    await syntheticCamera('NotAllowedError');
    await click('Start Camera');
    await ready(() => evaluate('document.body.innerText.includes("Camera permission needed")'));
    await reviewWidths('preview-denied');
    await syntheticCamera('NotFoundError');
    await click('Try again');
    await ready(() => evaluate('document.body.innerText.includes("No camera was found")'));
    await syntheticCamera();
    await click('Try again');
    await ready(() => evaluate('Boolean(document.querySelector(".live-badge"))'));
    await evaluate('[...document.querySelectorAll(".preview-exercise-tab")].find(el => el.textContent.includes("Push-ups")).click()');
    await ready(streamsStopped);
    await ready(() => evaluate('document.body.innerText.includes("Ready when you are")'));
    assert(await evaluate('document.body.innerText.includes("Floor setup tip")'));
    await click('Start Camera');
    await ready(() => evaluate('Boolean(document.querySelector(".live-badge"))'));
    await click('End session');
    await ready(() => evaluate('Boolean(document.querySelector("dialog[open]"))'));
    assert(await streamsStopped());
    assert(await evaluate('document.querySelector("dialog").contains(document.activeElement)'));
    await reviewWidths('preview-summary');
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    assert(await evaluate('document.querySelector("dialog").contains(document.activeElement)'));
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await ready(() => evaluate('!document.querySelector("dialog")'));
    await click('Start Camera');
    await ready(() => evaluate('Boolean(document.querySelector(".live-badge"))'));
    await evaluate('document.querySelector(".coach-home-button").click()');
    await route('');
    assert(await streamsStopped());
    assert.equal(await evaluate('JSON.stringify(localStorage)'), storageBefore);
    assert.equal(requests.filter((r) => ['POST', 'PUT'].includes(r.method)).length, writesBefore);
  });

  await record('Account session save retries preserve identity, timestamp and independent history', async () => {
    await click('Continue my journey');
    await route('dashboard');
    await click('Coach', '.desktop-nav button');
    await ready(() => evaluate('document.body.innerText.includes("Ready when you are")'), 30000);
    await reviewWidths('coach');
    await syntheticCamera();
    await click('Start Camera');
    await ready(() => evaluate('Boolean(document.querySelector(".live-badge"))'));
    await reviewLandscape('coach');
    assert(await evaluate('Boolean(document.querySelector(".camera-viewport"))'));
    assert(await evaluate('Boolean(document.querySelector(".rep-card"))'));
    assert(await evaluate('Boolean(document.querySelector(".button-danger"))'));
    assert(await evaluate('Boolean(document.querySelector(".coach-audio-toggle"))'));
    const voiceSupported = await evaluate('!document.querySelector(".coach-audio-toggle").disabled');
    if (voiceSupported) {
      await evaluate('document.querySelector(".coach-audio-toggle").click()');
      assert.equal(await evaluate('document.querySelector(".coach-audio-toggle").getAttribute("aria-pressed")'), 'true');
      assert.equal(await evaluate('localStorage.getItem("bits-motion-voice-coach")'), 'true');
      await evaluate('document.querySelector(".coach-audio-toggle").click()');
      assert.equal(await evaluate('document.querySelector(".coach-audio-toggle").getAttribute("aria-pressed")'), 'false');
    }
    const controlsRendered = await evaluate('(() => { const btn = document.querySelector(".button-danger"); const rep = document.querySelector(".rep-card"); const rBtn = btn.getBoundingClientRect(); const rRep = rep.getBoundingClientRect(); return rBtn.width > 0 && rBtn.height > 0 && rRep.width > 0 && rRep.height > 0; })()');
    assert(controlsRendered, 'Coach controls must be visible and fully rendered in mobile landscape');
    failures.add('sessions');
    await click('End session');
    await route('result');
    await ready(() => evaluate('document.body.innerText.includes("Retry account save")'));
    await reviewWidths('result-save-error');
    failures.delete('sessions');
    const before = accounts.A.sessions.length;
    await click('Retry account save');
    await ready(() => evaluate('document.body.innerText.includes("Saved to your account")'));
    assert.equal(accounts.A.sessions.length, before + 1);
    const saved = accounts.A.sessions.at(-1);
    assert(saved.clientSessionId);
    assert(saved.completedAt);
    assert.equal(saved.reps, 0, 'Synthetic video cannot fabricate exercise reps');
    await reviewWidths('result', true);
    await click('View progress');
    await route('progress');
    assert(await streamsStopped());
  });

  await record('Long history is accessible and live leaderboard has an honest empty state', async () => {
    for (let index = 0; index < 10; index++) accounts.A.sessions.push({ ...fixtureSession('Extra ' + index, index), id: 'extra-' + index });
    await reload();
    await ready(() => evaluate('document.querySelectorAll(".history-row").length === 6'));
    await click('Show more sessions');
    assert.equal(await evaluate('document.querySelectorAll(".history-row").length'), accounts.A.sessions.length);
    emptyLeaderboard = true;
    await openMenuAndClick('Leaderboard');
    await ready(() => evaluate('document.body.innerText.includes("This week’s ranking starts here")'));
    await reviewWidths('leaderboard-empty', true);
    await click('All time');
    await ready(() => evaluate('document.body.innerText.includes("The first ranking starts here")'));
    emptyLeaderboard = false;
  });

  await record('Saved setup changes alter the actual Guest plan and survive refresh', async () => {
    await logout();
    await click('Set up my fitness journey');
    await click('Continue as Guest');
    await route('dashboard');
    await openMenuAndClick('Fitness profile');
    await click('Continue');
    await setFields({ level: 'Intermediate', goal: 'Build strength' });
    await click('Continue');
    await setFields({ time: '10', location: 'Home', equipment: 'Backpack' });
    await click('Save & refresh plan');
    await route('plan');
    const short = await evaluate('JSON.parse(localStorage.getItem("bits-motion-plan-v1"))');
    assert(short.exercises.some((item) => item.id === 'rows'));
    await openMenuAndClick('Fitness profile');
    await click('Continue'); await click('Continue');
    await setFields({ time: '45', equipment: 'None', location: 'Hostel', lowImpact: true });
    await click('Save & refresh plan');
    await route('plan');
    const long = await evaluate('JSON.parse(localStorage.getItem("bits-motion-plan-v1"))');
    assert(!long.exercises.some((item) => ['rows', 'lunges', 'jumping-jacks'].includes(item.id)));
    assert.equal(calculateWorkoutDuration(long), 45 * 60);
    assert.notDeepEqual(long.exercises.map((item) => item.duration), short.exercises.map((item) => item.duration));
    await reviewWidths('long-plan');
    await reload();
    await ready(() => evaluate('Boolean(document.querySelector(".plan-decision"))'));
    assert.deepEqual(await evaluate('JSON.parse(localStorage.getItem("bits-motion-plan-v1"))'), long);
  });

  await record('Guest camera result saves once locally and never posts to the account', async () => {
    const posts = requests.filter((r) => r.action === 'sessions' && r.method === 'POST').length;
    const count = await evaluate('JSON.parse(localStorage.getItem("bits-motion-sessions-v1")).length');
    await click('Coach', '.desktop-nav button');
    await ready(() => evaluate('document.body.innerText.includes("Ready when you are")'), 30000);
    await syntheticCamera(); await click('Start Camera');
    await ready(() => evaluate('Boolean(document.querySelector(".live-badge"))'));
    await click('End session'); await route('result');
    await click('Save session');
    await ready(() => evaluate('document.body.innerText.includes("Session saved")'));
    assert.equal(await evaluate('JSON.parse(localStorage.getItem("bits-motion-sessions-v1")).length'), count + 1);
    assert.equal(requests.filter((r) => r.action === 'sessions' && r.method === 'POST').length, posts);
    await click('View progress'); await route('progress');
  });

  await record('Malformed Guest storage recovers without a blank screen or deleting original history', async () => {
    await evaluate('localStorage.setItem("bits-motion-sessions-v1", "{}"); localStorage.setItem("bits-motion-plan-v1", "{\\\"exercises\\\":null}")');
    await reload();
    await ready(() => evaluate('document.body.innerText.includes("Some saved Guest data could not be read")'));
    assert.equal(await evaluate('localStorage.getItem("bits-motion-sessions-v1")'), '{}');
    assert.equal(await evaluate('document.querySelectorAll(".history-row").length'), 0);
  });

  await record('Workout runner: start, skip, mid-round refresh resume, and finish-early integrity', async () => {
    // Fresh, isolated guest identity for a deterministic multi-round plan (20 minutes -> 2 rounds).
    await evaluate('localStorage.clear(); sessionStorage.clear();');
    await reload();
    await ready(() => evaluate('Boolean(document.querySelector(".welcome-screen-v2"))'));
    const guestPresent = await evaluate('[...document.querySelectorAll("button")].some(el => el.textContent.trim() === "Continue as Guest")');
    if (!guestPresent) await click('Set up my fitness journey');
    await ready(() => evaluate('[...document.querySelectorAll("button")].some(el => el.textContent.trim() === "Continue as Guest")'));
    await click('Continue as Guest');
    await route('profile');
    await completeProfile('Runner Guest');

    const runnerPlan = await evaluate('JSON.parse(localStorage.getItem("bits-motion-plan-v1"))');
    assert(runnerPlan.rounds >= 2, 'This test requires a multi-round plan to exercise round-boundary resume');
    const totalSteps = runnerPlan.exercises.filter((e) => !['warmup', 'cooldown'].includes(e.id)).length * runnerPlan.rounds + 2;

    async function currentMovementLabel() {
      return evaluate('(document.querySelector(".coach-topbar .eyebrow") || {}).textContent || ""');
    }
    // Coach is lazy-loaded behind Suspense, so right after a hash change there is a brief
    // fallback render with no ".coach-topbar" yet. Poll for the real label instead of a
    // one-shot read, so this doesn't race the chunk load / mount.
    async function assertMovementLabel(n) {
      await ready(() => evaluate('(() => { const el = document.querySelector(".coach-topbar .eyebrow"); return Boolean(el && el.textContent.includes(' + JSON.stringify('Movement ' + n + ' of ' + totalSteps) + ')); })()'), 30000);
    }
    async function clickButtonContaining(text, selector = 'button') {
      await ready(() => evaluate('[...document.querySelectorAll(' + JSON.stringify(selector) + ')].some(b => b.textContent.includes(' + JSON.stringify(text) + ') && b.getClientRects().length)'));
      await evaluate('(() => { const b = [...document.querySelectorAll(' + JSON.stringify(selector) + ')].find(b => b.textContent.includes(' + JSON.stringify(text) + ') && b.getClientRects().length); if (!b) throw new Error("Control unavailable: " + ' + JSON.stringify(text) + '); b.click(); })()');
    }
    // Ends the movement currently open on Coach or Self-Guided, landing on its Result summary.
    async function endCurrentMovement() {
      const onCoach = await evaluate('location.hash === "#coach"');
      if (onCoach) {
        await ready(() => evaluate('document.body.innerText.includes("Ready when you are")'), 30000);
        await syntheticCamera();
        await click('Start Camera');
        await ready(() => evaluate('Boolean(document.querySelector(".live-badge"))'));
        await click('End session');
      } else {
        await clickButtonContaining('Complete &');
      }
      await route('result');
    }
    // Skip transitions directly to the next movement (or to plan if it was the last); it never stops on Result.
    async function skipCurrentMovement() {
      await clickButtonContaining('Skip this movement');
    }
    async function continueToNextMovement() {
      await clickButtonContaining('Continue Workout');
      await ready(() => evaluate('["#coach", "#self-guided"].includes(location.hash)'));
    }

    // 1. Starting a workout must open the first sequence movement (always the warm-up, self-guided).
    await clickButtonContaining('Start Workout');
    await ready(() => evaluate('location.hash === "#self-guided"'));
    await assertMovementLabel(1);
    const sessionsBaseline = await evaluate('JSON.parse(localStorage.getItem("bits-motion-sessions-v1") || "[]").length');

    // 2. Ending the warm-up normally lands on its own Result (not the full-workout celebration),
    // then Continue Workout advances to movement 2 (first circuit station).
    await endCurrentMovement();
    assert.equal(await evaluate('document.body.innerText.toLowerCase().includes("full workout complete")'), false);
    assert.equal(await evaluate('JSON.parse(localStorage.getItem("bits-motion-sessions-v1") || "[]").length'), sessionsBaseline + 1,
      'A genuinely completed movement must record exactly one session');
    await continueToNextMovement();
    await assertMovementLabel(2);
    const sessionsAfterMovement2 = await evaluate('JSON.parse(localStorage.getItem("bits-motion-sessions-v1") || "[]").length');

    // 3. Skip must advance directly to movement 3 without stopping on Result, and without
    // recording a session, adding reps, or adding calories.
    await skipCurrentMovement();
    await ready(() => evaluate('["#coach", "#self-guided"].includes(location.hash)'));
    await assertMovementLabel(3);
    assert.equal(await evaluate('JSON.parse(localStorage.getItem("bits-motion-sessions-v1") || "[]").length'), sessionsAfterMovement2,
      'Skip must not record a completed session');

    // 4. Mid-workout refresh must restore the exact movement index and identity, not the defaults.
    await reload();
    await ready(() => evaluate('["#coach", "#self-guided"].includes(location.hash)'));
    await assertMovementLabel(3);
    const restoredWorkout = await evaluate('JSON.parse(sessionStorage.getItem("bits-motion-active-workout"))');
    assert.equal(restoredWorkout.currentIndex, 2);

    // 5. Plan screen must offer Resume (not Start) and report the same progress.
    // (The shell nav bar is intentionally hidden on the Coach/Self-Guided screens, so
    // navigate directly rather than clicking a nav link that isn't rendered there.)
    await evaluate('location.hash = "#plan"');
    await route('plan');
    await ready(() => evaluate('Boolean(document.querySelector(".plan-decision"))'));
    assert((await body()).includes('Resume workout (3/' + totalSteps + ')'));

    // 6. Finish early: must preserve already-completed movements, return to plan, clear the
    // active workout, and never fabricate a full-workout celebration for the un-run remainder.
    await clickButtonContaining('Resume workout');
    await ready(() => evaluate('["#coach", "#self-guided"].includes(location.hash)'));
    await endCurrentMovement();
    assert.equal(await evaluate('document.body.innerText.toLowerCase().includes("full workout complete")'), false);
    await clickButtonContaining('Finish workout early');
    await route('plan');
    assert.equal(await evaluate('sessionStorage.getItem("bits-motion-active-workout")'), null);
    assert((await body()).includes('Start Workout'), 'Finishing early must clear the active workout so Plan offers Start, not Resume');

    // 7. Restarting and running the full sequence to completion must show the real celebration
    // exactly once, only after every movement has actually been executed.
    await clickButtonContaining('Start Workout');
    await ready(() => evaluate('location.hash === "#self-guided"'));
    for (let step = 1; step < totalSteps; step += 1) {
      await endCurrentMovement();
      assert.equal(await evaluate('document.body.innerText.toLowerCase().includes("full workout complete")'), false);
      await continueToNextMovement();
    }
    await endCurrentMovement();
    assert(await evaluate('document.body.innerText.toLowerCase().includes("full workout complete")'), 'The final movement must trigger the true full-workout celebration');
    assert.equal(await evaluate('sessionStorage.getItem("bits-motion-active-workout")'), null);
  });

  assert.deepEqual(errors, [], 'Unexpected browser JavaScript errors');
  assert.deepEqual(networkFailures.filter((failure) => !failure.cancelled), [], 'Unexpected failed network requests');
  const report = { passed: results, screenshots: outputDirectory,
    scope: 'Mock Google callback and API; synthetic camera frames with real MediaPipe model. Real OAuth, Neon and physical exercise accuracy were not tested.',
    requests: requests.length, javascriptErrors: errors, modelDiagnostics, networkFailures, httpErrors,
    responsiveWidths: [390, 768, 820, 1024, 1440, '844x390 landscape'], reviewedLayouts: [...reviewedLayouts] };
  await writeFile(path.join(outputDirectory, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(error.stack);
  console.error('Artifacts: ' + outputDirectory);
  if (errors.length) console.error('Browser errors:', errors);
  process.exitCode = 1;
} finally {
  socket?.close();
  chrome.kill('SIGTERM');
}
