// Run against a local Vite server: node scripts/verify-browser.mjs
// The API and Google credential callback are mocked; no real accounts or data are used.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { EXERCISES } from '../src/data/exercises.js';

const origin = process.env.BROWSER_TEST_URL || 'http://127.0.0.1:5173';
const base = new URL(origin);
assert(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Only a local application URL is supported.');
assert(typeof WebSocket === 'function', 'Use Node 22+ (built-in WebSocket support).');
const outputDirectory = await mkdtemp(path.join(tmpdir(), 'bits-motion-browser-'));
const chromePath = process.env.CHROME_PATH || (process.platform === 'darwin'
  ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome');
const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
  '--user-data-dir=' + path.join(outputDirectory, 'chrome-profile'), 'about:blank',
], { stdio: 'ignore' });
let socket;
const results = [];
const errors = [];
const modelDiagnostics = [];
let holdAccountSessions = null;
let releaseSessions;
let delayedResponse;
const requests = [];
let activeAccount = null;
const failures = new Set();
const fixtureProfile = (name) => ({
  displayName: name, age: '20', height: '175', weight: '70', level: 'Beginner',
  goal: 'Stay fit', time: '20', location: 'Hostel room', equipment: 'None',
  lowImpact: false, leaderboardOptIn: false, leaderboardName: '',
});
const accounts = Object.fromEntries(['A', 'B'].map((key) => [key, {
  user: { email: key.toLowerCase() + '@example.test', name: 'Google ' + key, avatarUrl: '',
    leaderboardOptIn: false, leaderboardName: '' },
  profile: null, plan: null, sessions: [],
}]));
const makePlan = (key, profile) => ({
  id: 'test-plan-' + key, title: profile.displayName + ' private plan', totalMinutes: Number(profile.time),
  focus: 'A mocked plan used only for browser verification.', reasons: ['Beginner pacing', 'No equipment'],
  createdAt: new Date().toISOString(), exercises: [EXERCISES.warmup, EXERCISES.squats, EXERCISES.cooldown],
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
    } else if (action === 'leaderboard') {
      payload = { community: { active_people: 1, workouts: 1, reps: 11 }, leaders: [
        { rank: 1, name: 'Private alias A', workouts: 1, reps: 11, activeDays: 1, isCurrentUser: true },
      ] };
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
      + 'const el = document.querySelector("[name=" + name + "]"); if (!el) throw new Error("Missing field " + name);'
      + 'if (el.type === "checkbox") { if (el.checked !== value) el.click(); continue; }'
      + 'const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;'
      + 'Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);'
      + 'el.dispatchEvent(new Event("input", {bubbles:true})); el.dispatchEvent(new Event("change", {bubbles:true})); } })()');
    await delay(100);
  }
  async function completeProfile(name, { edit = false, optIn = false } = {}) {
    await setFields({ displayName: name, age: '20', height: '175', weight: '70' });
    await click('Continue');
    await setFields({ level: 'Beginner', goal: 'Stay fit' });
    await click('Continue');
    await setFields({ time: '20', location: 'Hostel room', equipment: 'None' });
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
    assert(layout.scrollWidth <= layout.width + 1, label + ' horizontal overflow: ' + JSON.stringify(layout));
    const metrics = await send('Page.getLayoutMetrics');
    const capture = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height: metrics.cssContentSize.height, scale: 1 } });
    const file = path.join(outputDirectory, label + '-' + width + '.png');
    await writeFile(file, Buffer.from(capture.data, 'base64'));
    results.push('Screenshot and no horizontal overflow: ' + label + ' at ' + width + 'px');
  }
  async function record(name, work) {
    await work();
    results.push(name);
    console.log('PASS ' + name);
  }

  await send('Runtime.enable');
  await send('Page.enable');
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
    await ready(() => evaluate('!document.querySelector(".launch-screen") && Boolean(document.querySelector(".welcome-screen-v2"))'), 4000);
    assert.equal(await evaluate('sessionStorage.getItem("bits-motion-launch-seen-v2")'), '1');

    // 5. Restore prefers-reduced-motion: reduce for swift subsequent test execution
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  });

  await record('One Google/Guest choice and public leaderboard navigation', async () => {
    assert.equal(await evaluate('Boolean(document.querySelector(".nav-signin-button"))'), true);
    assert.equal(await evaluate('Boolean(document.querySelector(".auth-choice-expanded"))'), false);
    await click('Set up my fitness journey');
    await ready(() => evaluate('[...document.querySelectorAll("button")].some(el => el.textContent === "Continue with Google")'));
    assert.equal(await evaluate('[...document.querySelectorAll("button")].filter(el => el.textContent.trim() === "Continue as Guest").length'), 1);
    for (const width of [390, 768, 1440]) await screenshot('home', width);
    await click('Leaderboard', '.marketing-nav button');
    await route('leaderboard');
    assert((await body()).includes('Sample leaderboard preview'));
    await reload();
    await ready(() => evaluate('Boolean(document.querySelector(".leaderboard-page"))'));
    await route('leaderboard');
    await evaluate('document.querySelector(' + JSON.stringify('[aria-label="Go back"]') + ').click()');
    await ready(() => evaluate('Boolean(document.querySelector(".welcome-screen-v2"))'));
  });

  await record('Dedicated Features, How It Works, and Terms screens navigation, history and refresh', async () => {
    await click('Features', '.marketing-nav button');
    await route('features');
    assert((await body()).includes('Real AI coaching for real student spaces'));
    await reload();
    await ready(() => evaluate('Boolean(document.querySelector(".features-page"))'));
    await evaluate('document.querySelector(' + JSON.stringify('[aria-label="Go back"]') + ').click()');
    await route('');
    await ready(() => evaluate('Boolean(document.querySelector(".welcome-screen-v2"))'));

    await click('How it works', '.marketing-nav button');
    await route('how-it-works');
    assert((await body()).includes('How BITS in Motion works'));
    await evaluate('history.back()');
    await route('');
    await ready(() => evaluate('Boolean(document.querySelector(".welcome-screen-v2"))'));
    await evaluate('history.forward()');
    await route('how-it-works');
    await evaluate('document.querySelector(' + JSON.stringify('[aria-label="Go to BITS in Motion homepage"]') + ').click()');
    await route('');
    await ready(() => evaluate('Boolean(document.querySelector(".welcome-screen-v2"))'));

    await click('Terms & Conditions', '.marketing-nav button');
    await route('terms');
    assert((await body()).includes('Terms of Service'));
    await reload();
    await ready(() => evaluate('Boolean(document.querySelector(".terms-page"))'));
    await click('Return to Home');
    await route('');
    await ready(() => evaluate('Boolean(document.querySelector(".welcome-screen-v2"))'));

    // Test Privacy Policy screen navigation via footer
    await click('Privacy Policy', '.welcome-footer button');
    await route('privacy');
    assert((await body()).includes('Privacy Policy'));
    assert((await body()).includes('Zero Video Upload'));
    await reload();
    await ready(() => evaluate('Boolean(document.querySelector(".privacy-page"))'));

    // Cross-navigation via trust-subnav pill to Health Disclaimer
    await click('Health Disclaimer', '.trust-subnav-pill');
    await route('health-disclaimer');
    assert((await body()).includes('Health & Safety Disclaimer'));
    assert((await body()).includes('Listen to Your Body'));
    await reload();
    await ready(() => evaluate('Boolean(document.querySelector(".health-page"))'));

    // Cross-navigation via trust-subnav pill to Terms of Service
    await click('Terms of Service', '.trust-subnav-pill');
    await route('terms');
    assert((await body()).includes('Terms of Service'));
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
    assert.equal(await evaluate('Boolean(document.querySelector(".preview-mode-banner"))'), true);
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
    for (const width of [390, 768, 1440]) await screenshot('dashboard', width);
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
    await setFields({ equipment: 'Resistance band' });

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
    assert.equal(accounts.A.profile.equipment, 'Resistance band');

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

  assert.deepEqual(errors, [], 'Unexpected browser JavaScript errors');
  const report = { passed: results, screenshots: outputDirectory,
    scope: 'Mock Google callback and API; isolated browser profile. Real OAuth, Neon and physical camera were not tested.',
    requests: requests.length, javascriptErrors: errors, modelDiagnostics };
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
