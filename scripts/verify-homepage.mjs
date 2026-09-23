// Read-only homepage QA. Fresh browser; account endpoints/Google are fixture-backed.
// HOME_TEST_URL may point to the existing production site for deployed-asset smoke QA.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { generateWorkoutPlan } from "../src/utils/workoutRecommendation.js";

const origin = process.env.HOME_TEST_URL || "http://127.0.0.1:5173";
assert(
  ["127.0.0.1", "localhost", "bits-in-motion-feature.vercel.app"].includes(
    new URL(origin).hostname,
  ),
);
const directory = await mkdtemp(path.join(tmpdir(), "bits-homepage-"));
console.log("Artifacts:", directory);
const chrome = spawn(
  process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  [
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-address=127.0.0.1",
    "--remote-debugging-port=0",
    "--user-data-dir=" + path.join(directory, "chrome"),
    "about:blank",
  ],
  { stdio: "ignore" },
);
let socket;
const errors = [],
  networkFailures = [],
  checks = [];
const sizes = [
  [390, 844],
  [430, 932],
  [844, 390],
  [768, 1024],
  [820, 1180],
  [1024, 768],
  [1440, 900],
];
const profile = {
  displayName: "Nehal",
  age: "20",
  height: "175",
  weight: "70",
  level: "Beginner",
  goal: "Stay fit",
  time: "20",
  location: "Hostel",
  equipment: "None",
  lowImpact: false,
  leaderboardOptIn: false,
  leaderboardName: "",
};
async function until(check, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      if (await check()) return;
    } catch {}
    await delay(80);
  }
  throw new Error("Browser state timed out");
}
try {
  let port;
  await until(async () => {
    port = Number(
      (
        await readFile(
          path.join(directory, "chrome", "DevToolsActivePort"),
          "utf8",
        )
      ).split("\n")[0],
    );
    return port;
  });
  const pages = await (
    await fetch(`http://127.0.0.1:${port}/json/list`)
  ).json();
  socket = new WebSocket(
    pages.find((p) => p.type === "page").webSocketDebuggerUrl,
  );
  await new Promise((resolve) =>
    socket.addEventListener("open", resolve, { once: true }),
  );
  let sequence = 0;
  const pending = new Map();
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails)
      throw new Error(
        result.exceptionDetails.exception?.description ||
          result.exceptionDetails.text,
      );
    return result.result.value;
  };
  const urls = new Map();
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data),
      p = message.params;
    if (message.id) {
      const handler = pending.get(message.id);
      pending.delete(message.id);
      message.error
        ? handler?.reject(new Error(message.error.message))
        : handler?.resolve(message.result);
    } else if (message.method === "Runtime.exceptionThrown")
      errors.push(
        p.exceptionDetails.exception?.description || p.exceptionDetails.text,
      );
    else if (
      message.method === "Runtime.consoleAPICalled" &&
      p.type === "error"
    )
      errors.push(p.args.map((a) => a.value || a.description).join(" "));
    else if (message.method === "Network.requestWillBeSent")
      urls.set(p.requestId, p.request.url);
    else if (message.method === "Network.loadingFailed" && !p.canceled)
      networkFailures.push({ url: urls.get(p.requestId), error: p.errorText });
    else if (
      message.method === "Network.responseReceived" &&
      p.response.status >= 400 &&
      !p.response.url.includes("/api")
    )
      networkFailures.push({ url: p.response.url, status: p.response.status });
    else if (message.method === "Fetch.requestPaused") {
      const action = new URL(p.request.url).searchParams.get("action");
      const payload =
        action === "status"
          ? { databaseConfigured: true, googleConfigured: true }
          : action === "leaderboard"
            ? { community: {}, leaders: [] }
            : { error: "Sign in required." };
      send("Fetch.fulfillRequest", {
        requestId: p.requestId,
        responseCode: ["status", "leaderboard"].includes(action) ? 200 : 401,
        responseHeaders: [{ name: "Content-Type", value: "application/json" }],
        body: Buffer.from(JSON.stringify(payload)).toString("base64"),
      }).catch((error) => errors.push(error.message));
    }
  });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Fetch.enable", {
    patterns: [{ urlPattern: new URL("/api*", origin).href }],
  });
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `sessionStorage.setItem('bits-motion-launch-seen-v2','1');window.google={accounts:{id:{initialize(){},renderButton(container){const b=document.createElement('button');b.textContent='Continue with Google';b.className='google-placeholder';container.replaceChildren(b)},disableAutoSelect(){}}}};`,
  });
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await send("Page.navigate", { url: origin });
  const homeReady = () =>
    until(() =>
      evaluate(
        '!!document.querySelector(".home-page") && document.readyState === "complete"',
      ),
    );
  await homeReady();
  const click = async (selector) => {
    assert(
      await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`),
      selector,
    );
    await evaluate(
      `document.querySelector(${JSON.stringify(selector)}).click()`,
    );
    await delay(100);
  };
  const resetHome = async () => {
    await evaluate('location.hash=""');
    await homeReady();
    await evaluate("scrollTo(0,0)");
  };
  const shot = async (label, width, height) => {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 500 || height < 500,
    });
    await evaluate("document.fonts.ready");
    await evaluate("scrollTo(0,0)");
    await delay(180);
    assert(
      await evaluate('document.querySelector(".home-privacy p").getBoundingClientRect().width >= 240'),
      'Privacy copy retains a readable line length, not a squeezed flex column',
    );
    const layout = await evaluate(
      `(() => {const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};const stage=rect(document.querySelector('.home-coach-stage'));const bad=[...document.querySelectorAll('.home-page button,.home-page h1,.home-page h2,.home-page h3,.home-page p')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').filter(e=>{const r=rect(e);return r.right>innerWidth+1||r.left<0||e.scrollWidth>e.clientWidth+2}).map(e=>e.className+':'+e.textContent.slice(0,50));return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,bad,stage,outline:getComputedStyle(document.querySelector('.home-copy h1')).outlineStyle,primary:rect(document.querySelector('.home-actions button')),secondary:rect(document.querySelector('.home-actions button+button'))}})()`,
    );
    assert(
      layout.scrollWidth <= width + 1,
      label + " overflow " + JSON.stringify(layout),
    );
    assert.deepEqual(layout.bad, [], label + " clipped content");
    assert.equal(
      layout.outline,
      "none",
      "No programmatic heading focus artifact",
    );
    assert.equal(
      layout.primary.height,
      layout.secondary.height,
      "Consistent main action heights",
    );
    const metrics = await send("Page.getLayoutMetrics");
    for (const full of [false, true]) {
      const result = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
        clip: {
          x: 0,
          y: 0,
          width,
          height: full ? metrics.cssContentSize.height : height,
          scale: 1,
        },
      });
      await writeFile(
        path.join(
          directory,
          `${label}-${width}x${height}${full ? "-full" : ""}.png`,
        ),
        Buffer.from(result.data, "base64"),
      );
    }
    checks.push(
      `${label} ${width}x${height}: no overflow/clipping; equal CTA height`,
    );
  };
  for (const [w, h] of sizes) await shot("anonymous", w, h);
  await click(".home-actions button");
  assert.equal(
    await evaluate("document.activeElement.id"),
    "home-auth-chooser",
    "Chooser takes keyboard focus",
  );
  for (const [w, h] of sizes) await shot("setup", w, h);
  await click('[aria-label="Close sign-in options"]');
  assert.equal(
    await evaluate(
      'document.activeElement.classList.contains("home-button-primary")',
    ),
    true,
    "Chooser returns keyboard focus",
  );
  checks.push("Setup open/close restores keyboard focus");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await click(".home-menu-toggle");
  assert.equal(
    await evaluate(
      'document.querySelector(".home-menu-toggle").getAttribute("aria-expanded")',
    ),
    "true",
  );
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Escape",
    code: "Escape",
  });
  assert.equal(
    await evaluate(
      'document.activeElement.classList.contains("home-menu-toggle") && document.querySelector(".home-menu-toggle").getAttribute("aria-expanded")==="false"',
    ),
    true,
  );
  await click(".home-menu-toggle");
  await click(".home-navigation button");
  await until(() => evaluate('location.hash==="#features"'));
  await evaluate("history.back()");
  await homeReady();
  checks.push(
    "Mobile navigation opens, Escape restores focus, Features and browser Back work",
  );
  await evaluate(`[...document.querySelectorAll('.home-footer button')].find(e=>e.textContent.includes('isolated judge demo')).click()`);
  await until(() => evaluate('location.hash==="#dashboard"'));
  await click('.account-menu summary');
  await click('.account-signout');
  await homeReady();
  checks.push('Judge Demo opens and exits without becoming a Guest account');
  await click(".home-actions button");
  await click(".home-auth-options .home-button");
  await until(() => evaluate('location.hash==="#profile"'));
  checks.push("Guest setup route works");
  await evaluate(
    `localStorage.setItem('bits-motion-profile-v1',${JSON.stringify(JSON.stringify(profile))});localStorage.setItem('bits-motion-plan-v1',${JSON.stringify(JSON.stringify(generateWorkoutPlan(profile)))});localStorage.setItem('bits-motion-guest-active-v1','1');location.hash='';`,
  );
  await send("Page.reload", { ignoreCache: true });
  await homeReady();
  await until(() => evaluate('!!document.querySelector(".home-continuation")'));
  for (const [w, h] of sizes) await shot("returning", w, h);
  await click(".home-continuation button");
  await until(() => evaluate('location.hash==="#dashboard"'));
  checks.push("Returning Guest continuation opens dashboard");
  await resetHome();
  for (const [selector, hash] of [
    [".visual-launch-coach", "#preview"],
    [".home-discovery button", "#features"],
    [".home-discovery button+button", "#how-it-works"],
    [".home-privacy button", "#privacy"],
  ]) {
    await click(selector);
    await until(() => evaluate(`location.hash===${JSON.stringify(hash)}`));
    await resetHome();
    checks.push(selector + " route works");
  }
  for (const [text, hash] of [
    ["Terms & Conditions", "#terms"],
    ["Health Disclaimer", "#health-disclaimer"],
    ["Campus Leaderboard", "#leaderboard"],
  ]) {
    await evaluate(
      `[...document.querySelectorAll('.home-footer button')].find(e=>e.textContent===${JSON.stringify(text)}).click()`,
    );
    await until(() => evaluate(`location.hash===${JSON.stringify(hash)}`));
    await resetHome();
    checks.push(text + " route works");
  }
  await evaluate('document.querySelector(".home-coach").scrollIntoView()');
  const staticPhase = await evaluate(
    'document.querySelector(".home-coach-stage").dataset.phase',
  );
  await delay(1600);
  assert.equal(
    await evaluate('document.querySelector(".home-coach-stage").dataset.phase'),
    staticPhase,
  );
  assert.equal(
    await evaluate(
      `!!document.querySelector('[aria-label="Pause demonstration"]')`,
    ),
    false,
  );
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
  });
  await until(() =>
    evaluate(`!!document.querySelector('[aria-label="Pause demonstration"]')`),
  );
  const phases = new Set();
  const capturedPhases = new Set();
  let previousPhase, stableFrames = 0;
  let largestRep = 0;
  for (let i = 0; i < 58; i++) {
    const frame = await evaluate(
      '({phase:document.querySelector(".home-coach-stage").dataset.phase,rep:Number(document.querySelector(".home-demo-reps strong").textContent)})',
    );
    assert(frame.rep >= largestRep, "Demo reps never roll backwards");
    largestRep = frame.rep;
    phases.add(frame.phase);
    stableFrames = previousPhase === frame.phase ? stableFrames + 1 : 0;
    previousPhase = frame.phase;
    if (stableFrames >= 4 && !capturedPhases.has(frame.phase)) {
      const clip = await evaluate('(() => { const r=document.querySelector(".home-coach").getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}; })()');
      const capture = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip });
      if (await evaluate('document.querySelector(".home-coach-stage").dataset.phase') === frame.phase) {
        capturedPhases.add(frame.phase);
        await writeFile(path.join(directory, `motion-${frame.phase.toLowerCase().replaceAll(' ', '-')}.png`), Buffer.from(capture.data, 'base64'));
      }
    }
    await delay(120);
  }
  assert.equal(phases.size, 5);
  assert(largestRep >= 1);
  await click('[aria-label="Pause demonstration"]');
  const frozen = await evaluate(
    'document.querySelector(".home-coach-stage").dataset.phase',
  );
  await delay(1800);
  assert.equal(
    await evaluate('document.querySelector(".home-coach-stage").dataset.phase'),
    frozen,
  );
  checks.push(
    "All five movement phases, monotonically increasing reps, pause and reduced motion",
  );
  await evaluate(`localStorage.setItem('bits-motion-profile-v1',${JSON.stringify(JSON.stringify({ ...profile, displayName: 'Nehal A-Very-Long-Student-Name-Without-Spaces' }))})`);
  await send('Page.reload', { ignoreCache: true });
  await homeReady();
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  for (const [w, h] of [[390, 844], [768, 1024], [1024, 768]]) await shot('long-name', w, h);
  assert.equal([...urls.values()].some(url => /fonts\.(googleapis|gstatic)\.com/.test(url)), false, 'No third-party font request');
  checks.push('Existing typefaces are delivered first-party');
  assert.deepEqual(errors, [], "No console/runtime errors");
  assert.deepEqual(networkFailures, [], "No failed requests");
  const report = {
    origin,
    checks,
    errors,
    networkFailures,
    screenshotPairs: sizes.length * 3 + 3,
    directory,
  };
  await writeFile(
    path.join(directory, "report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  socket?.close();
  chrome.kill("SIGTERM");
}
