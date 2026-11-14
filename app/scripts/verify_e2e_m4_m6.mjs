import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const APP_DIR = resolve(import.meta.dirname, "..");
const SCRATCH_DIR =
  "/Users/orl123456/.gemini/antigravity/brain/1527e4df-2e4d-44e1-87bc-c29e94c39b33/scratch/m4_m6_e2e";
mkdirSync(SCRATCH_DIR, { recursive: true });

const CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const AXE_SOURCE = readFileSync(join(APP_DIR, "node_modules/axe-core/axe.min.js"), "utf8");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForUrl(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
    } catch {
      // retry
    }
    await sleep(200);
  }
  throw new Error(`Timeout waiting for ${url}`);
}

class CdpClient {
  constructor(wsUrl, allowedOrigins) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.errors = [];
    this.failedRequests = [];
    this.externalRequests = [];
    this.allowedOrigins = allowedOrigins;
  }

  async connect() {
    await new Promise((resolveOpen, rejectOpen) => {
      this.ws.addEventListener("open", () => resolveOpen());
      this.ws.addEventListener("error", (e) => rejectOpen(e));
    });
    this.ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method === "Runtime.exceptionThrown") {
        this.errors.push(`RuntimeException: ${JSON.stringify(msg.params.exceptionDetails)}`);
      } else if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") {
        this.errors.push(`LogError: ${msg.params.entry.text}`);
      } else if (msg.method === "Network.requestWillBeSent") {
        const url = msg.params.request?.url ?? "";
        if (
          url &&
          !url.startsWith("data:") &&
          !url.startsWith("blob:") &&
          !this.allowedOrigins.some((orig) => url.startsWith(orig))
        ) {
          this.externalRequests.push(url);
        }
      } else if (msg.method === "Network.responseReceived" && msg.params.response?.status >= 400) {
        this.failedRequests.push(`${msg.params.response.status} ${msg.params.response.url}`);
      } else if (msg.method === "Network.loadingFailed") {
        // Ignore cancelled navigations if any, record real failures
        if (!msg.params.canceled) {
          this.failedRequests.push(`FAILED ${msg.params.errorText} (${msg.params.type})`);
        }
      }
    });
    await this.send("Page.enable");
    await this.send("Network.enable");
    await this.send("Runtime.enable");
    await this.send("Log.enable");
    await this.send("DOM.enable");
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  async setViewport(width, height) {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: width < 768,
    });
  }

  async screenshotPng(name) {
    const { data } = await this.send("Page.captureScreenshot", { format: "png" });
    const outPath = join(SCRATCH_DIR, name);
    const { writeFileSync } = await import("node:fs");
    writeFileSync(outPath, Buffer.from(data, "base64"));
    return outPath;
  }

  async goto(url) {
    await this.send("Page.navigate", { url });
    await sleep(700);
  }

  async waitForText(text, timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const has = await this.eval(`document.body.innerText.includes(${JSON.stringify(text)})`);
      if (has) return true;
      await sleep(150);
    }
    throw new Error(`Timeout waiting for text: ${text}`);
  }

  async clickButtonByText(text) {
    const ok = await this.eval(`(() => {
      const needle = ${JSON.stringify(text)};
      const els = [...document.querySelectorAll('button, a')];
      const match = els.find(el => !el.disabled && el.innerText.trim().includes(needle));
      if (!match) return false;
      match.click();
      return true;
    })()`);
    if (!ok) throw new Error(`Button/link not found or disabled: ${text}`);
  }

  async runAxe(routeName) {
    await this.eval(`(() => {
      if (!window.axe) {
        ${AXE_SOURCE}
      }
    })()`);
    const result = await this.eval(`window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }
    }).then(r => ({
      route: ${JSON.stringify(routeName)},
      violations: r.violations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.length,
        targets: v.nodes.slice(0, 3).map(n => n.target.join(' '))
      })),
      passes: r.passes.length
    }))`);
    return result;
  }

  close() {
    try {
      this.ws.close();
    } catch {
      // ignore
    }
  }
}

function startStaticSubpathServer(distDir, prefix, port) {
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".wasm": "application/wasm",
    ".png": "image/png",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
  };
  const server = createServer((req, res) => {
    const urlPath = (req.url ?? "/").split("?")[0];
    if (!urlPath.startsWith(prefix)) {
      res.writeHead(404);
      res.end("Outside subpath prefix");
      return;
    }
    let rel = urlPath.slice(prefix.length);
    if (!rel || rel === "/") rel = "index.html";
    const full = join(distDir, rel);
    if (!full.startsWith(distDir) || !existsSync(full) || statSync(full).isDirectory()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const type = mime[extname(full)] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(readFileSync(full));
  });
  return new Promise((resolveStart) => {
    server.listen(port, "127.0.0.1", () => resolveStart(server));
  });
}

async function launchChrome(cdpPort, extraFlags = []) {
  const userDataDir = `/tmp/chrome_ev_e2e_${cdpPort}`;
  const proc = spawn(
    CHROME_BIN,
    [
      "--headless=new",
      "--disable-gpu-sandbox",
      "--no-sandbox",
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${userDataDir}`,
      ...extraFlags,
      "about:blank",
    ],
    { stdio: "ignore", detached: true }
  );
  await waitForUrl(`http://127.0.0.1:${cdpPort}/json/version`, 15000);
  const targets = await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json();
  const pageTarget = targets.find((t) => t.type === "page") ?? targets[0];
  return { proc, wsUrl: pageTarget.webSocketDebuggerUrl };
}

function killGroup(proc) {
  if (!proc?.pid) return;
  try {
    process.kill(-proc.pid, "SIGKILL");
  } catch {
    try {
      proc.kill("SIGKILL");
    } catch {
      // ignore
    }
  }
}

async function runMainSuite() {
  const report = {
    landing: {},
    journeyA: {},
    journeyB: {},
    journeyC: {},
    methodology: {},
    responsive: {},
    axe: [],
    keyboard: {},
    reducedMotion: {},
    webglFallback: {},
    subpathOffline: {},
  };

  // Start Vite preview for / (assumes npm run build was run with default /)
  const viteProc = spawn(
    process.execPath,
    [join(APP_DIR, "node_modules/vite/bin/vite.js"), "preview", "--port", "4173", "--strictPort", "--host", "127.0.0.1"],
    { cwd: APP_DIR, stdio: "ignore", detached: true }
  );
  let chromeProc = null;
  let cdp = null;

  try {
    await waitForUrl("http://127.0.0.1:4173/", 15000);
    const launched = await launchChrome(9230, [
      "--use-gl=angle",
      "--use-angle=metal",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
    ]);
    chromeProc = launched.proc;
    cdp = new CdpClient(launched.wsUrl, ["http://127.0.0.1:4173", "http://127.0.0.1:4174"]);
    await cdp.connect();

    // 1) Landing desktop idle live 3D preview & pause toggle
    await cdp.setViewport(1440, 900);
    await cdp.goto("http://127.0.0.1:4173/#/");
    await cdp.waitForText("See inside the pack");
    await sleep(1600); // wait idle callback -> live hero upgrade
    report.landing.desktopHasCanvas = await cdp.eval(`Boolean(document.querySelector('canvas'))`);
    const hasPauseBtn = await cdp.eval(`document.body.innerText.includes('Pause rotation')`);
    if (hasPauseBtn) {
      await cdp.clickButtonByText("Pause rotation");
      await sleep(200);
    }
    report.landing.pausedOk = await cdp.eval(`document.body.innerText.includes('Resume rotation')`);
    await cdp.screenshotPng("m4_landing_desktop.png");

    // 2) Landing reduced-motion never loads live 3D canvas
    await cdp.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    await cdp.goto("http://127.0.0.1:4173/#/simulator"); // reset hash before reload on /
    await cdp.goto("http://127.0.0.1:4173/#/");
    await sleep(1600);
    report.reducedMotion.landingNoCanvas = !(await cdp.eval(`Boolean(document.querySelector('canvas'))`));
    await cdp.send("Emulation.setEmulatedMedia", { features: [] });

    // 3) Landing mobile (390x844) never loads WebGL canvas
    await cdp.setViewport(390, 844);
    await cdp.goto("http://127.0.0.1:4173/#/");
    await sleep(1600);
    report.landing.mobileNoCanvas = !(await cdp.eval(`Boolean(document.querySelector('canvas'))`));
    report.responsive.landing390NoOverflow = await cdp.eval(
      `document.documentElement.scrollWidth <= window.innerWidth`
    );

    // 4) Journey A: Workspace LFP thermal run in Worker/Wasm + heatmap + playback + table
    await cdp.setViewport(1440, 900);
    await cdp.goto("http://127.0.0.1:4173/#/simulator/lfp");
    await cdp.waitForText("LFP Blade");
    await sleep(800);

    await cdp.clickButtonByText("Simulate");
    await sleep(200);
    // Select fast_charging preset
    await cdp.eval(`(() => {
      const sel = document.getElementById('preset-select');
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
      setter.call(sel, 'fast_charging');
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await sleep(200);
    await cdp.clickButtonByText("Run simulation");
    await cdp.waitForText("VERIFIED_NUMERICALLY", 15000);
    await sleep(400);

    report.journeyA = await cdp.eval(`(() => {
      const txt = document.body.innerText;
      const legend = document.querySelector('[aria-label*="Thermal heatmap scale"]');
      const svgChart = document.querySelector('svg[aria-label*="Temperature vs time chart"]');
      return {
        verifiedNumerically: txt.includes("VERIFIED_NUMERICALLY"),
        hasLegend: Boolean(legend),
        legendLabel: legend?.getAttribute("aria-label") ?? null,
        hasThermalChart: Boolean(svgChart),
        hasHottestZone: txt.includes("Hottest zone"),
      };
    })()`);
    await cdp.screenshotPng("m4_lfp_thermal_desktop.png");

    // Toggle View as table
    await cdp.clickButtonByText("View as table");
    await sleep(150);
    report.journeyA.chartTableVisible = await cdp.eval(`Boolean(document.querySelector('.workspace-panel--right table.data-table'))`);
    await cdp.clickButtonByText("View chart");

    // Test H key toggles heatmap legend
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "h", code: "KeyH" });
    await sleep(150);
    const legendHiddenAfterH = await cdp.eval(`!document.querySelector('[aria-label*="Thermal heatmap scale"]')`);
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "h", code: "KeyH" });
    await sleep(150);
    const legendRestoredAfterH = await cdp.eval(`Boolean(document.querySelector('[aria-label*="Thermal heatmap scale"]'))`);
    report.keyboard.hShortcutTogglesHeatmap = legendHiddenAfterH && legendRestoredAfterH;

    // 5) Journey C: Forecast LFP 8-yr Schimpe SoH + Decide ROI IDR
    await cdp.clickButtonByText("Forecast");
    await sleep(200);
    await cdp.clickButtonByText("Compute SoH projection");
    await cdp.waitForText("End-of-horizon projected SoH", 10000);
    await sleep(300);
    report.journeyC.forecastLfpOk = await cdp.eval(`(() => {
      const txt = document.body.innerText;
      return txt.includes("End-of-horizon projected SoH") && Boolean(document.querySelector('svg[aria-label*="Illustrative SoH curve"]'));
    })()`);
    await cdp.screenshotPng("m5_forecast_desktop.png");

    await cdp.clickButtonByText("Decide");
    await sleep(200);
    const insufficientFirst = await cdp.eval(
      `document.body.innerText.includes("Enter inspection, module replacement, and pack replacement costs above")`
    );
    // Fill Inspection cost, Module cost each, Full pack replacement cost (React controlled inputs)
    await cdp.eval(`(() => {
      const setReactInput = (placeholderMatch, val) => {
        const inputs = [...document.querySelectorAll('input[placeholder="Required"]')];
        const el = inputs[placeholderMatch];
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(el, String(val));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setReactInput(0, 5000000);
      setReactInput(1, 25000000);
      setReactInput(2, 140000000);
    })()`);
    await sleep(300);
    report.journeyC.decideInsufficientFirst = insufficientFirst;
    report.journeyC.decideRoiComputed = await cdp.eval(`(() => {
      const txt = document.body.innerText;
      return txt.includes("Replacement is the lower-risk estimate") || txt.includes("Repair estimate is lower");
    })()`);
    await cdp.screenshotPng("m5_decide_desktop.png");

    // Architecture switch modal + Keyboard Escape check
    const selectArch = async (archVal) => {
      await cdp.eval(`(() => {
        const sel = document.getElementById('workspace-arch-switch');
        const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
        setter.call(sel, ${JSON.stringify(archVal)});
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      })()`);
    };
    await selectArch("NMC_4680");
    await sleep(200);
    const modalOpened = await cdp.eval(`Boolean(document.querySelector('[role="dialog"]'))`);
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
    await sleep(200);
    const modalClosedEsc = await cdp.eval(`!document.querySelector('[role="dialog"]')`);
    report.keyboard.escapeClosesConfirmModal = modalOpened && modalClosedEsc;

    // Actually confirm switch to NMC 4680 -> check Option B validation blocks empty NMC SoH
    await selectArch("NMC_4680");
    await sleep(200);
    await cdp.eval(`document.querySelector('[role="dialog"] button.btn-primary').click()`);
    await sleep(500);
    await cdp.clickButtonByText("Forecast");
    await sleep(200);
    report.journeyC.nmcOptionBRequired = await cdp.eval(`(() => {
      const btn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('Compute SoH projection'));
      return Boolean(btn?.disabled) && document.body.innerText.includes('G2-3 Option B');
    })()`);

    // 6) Tablet (768x1024) and Mobile (390x844) Workspace screenshots + overflow checks
    await cdp.setViewport(768, 1024);
    await cdp.goto("http://127.0.0.1:4173/#/simulator/lfp");
    await sleep(800);
    report.responsive.workspace768NoOverflow = await cdp.eval(
      `document.documentElement.scrollWidth <= window.innerWidth`
    );
    await cdp.screenshotPng("m6_workspace_tablet_768.png");

    await cdp.setViewport(390, 844);
    await cdp.goto("http://127.0.0.1:4173/#/simulator/lfp");
    await sleep(800);
    report.responsive.workspace390NoOverflow = await cdp.eval(
      `document.documentElement.scrollWidth <= window.innerWidth`
    );
    await cdp.screenshotPng("m6_workspace_mobile_390.png");

    // 7) Journey B: Compare page (1440x900) dual Wasm thermal + shared legend + 390px switcher
    await cdp.setViewport(1440, 900);
    await cdp.goto("http://127.0.0.1:4173/#/compare");
    await cdp.waitForText("Compare LFP Blade and NMC 4680");
    await sleep(800);
    await cdp.clickButtonByText("Run comparison");
    await cdp.waitForText("Max temperature", 20000);
    await sleep(800);
    report.journeyB = await cdp.eval(`(() => {
      const legends = [...document.querySelectorAll('[aria-label*="Thermal heatmap scale"]')];
      const txt = document.body.innerText;
      return {
        bothLegendsPresent: legends.length === 2,
        sharedScaleLabels: legends.map(l => l.getAttribute('aria-label')),
        hasCameraLinkBtn: txt.includes("Cameras linked"),
        hasDeltaMetrics: !txt.includes("Run comparison to compute"),
      };
    })()`);
    await cdp.screenshotPng("m5_compare_desktop.png");

    await cdp.setViewport(390, 844);
    await sleep(300);
    report.responsive.compare390NoOverflow = await cdp.eval(
      `document.documentElement.scrollWidth <= window.innerWidth`
    );
    await cdp.screenshotPng("m6_compare_mobile_390.png");

    // 8) Methodology page
    await cdp.setViewport(1440, 900);
    await cdp.goto("http://127.0.0.1:4173/#/methodology");
    await cdp.waitForText("Methodology & Sources");
    await sleep(400);
    report.methodology = await cdp.eval(`(() => {
      const txt = document.body.innerText;
      return {
        hasGoverningEq: txt.includes("Thermal, SoH & ROI model equations"),
        hasRegister: txt.includes("Parameter register"),
        hasV1V6: txt.includes("V1–V6 Numerical checks"),
        hasLicences: txt.includes("Third-party software, font & icon licences") && txt.includes("Three.js"),
      };
    })()`);
    await cdp.screenshotPng("m5_methodology.png");

    // 9) Axe-core accessibility audit on all 6 routes (desktop) + mobile workspace
    const axeRoutes = [
      { name: "landing_1440", url: "http://127.0.0.1:4173/#/", w: 1440, h: 900 },
      { name: "select_1440", url: "http://127.0.0.1:4173/#/simulator", w: 1440, h: 900 },
      { name: "workspace_lfp_1440", url: "http://127.0.0.1:4173/#/simulator/lfp", w: 1440, h: 900 },
      { name: "workspace_nmc_1440", url: "http://127.0.0.1:4173/#/simulator/nmc", w: 1440, h: 900 },
      { name: "compare_1440", url: "http://127.0.0.1:4173/#/compare", w: 1440, h: 900 },
      { name: "methodology_1440", url: "http://127.0.0.1:4173/#/methodology", w: 1440, h: 900 },
      { name: "workspace_lfp_390", url: "http://127.0.0.1:4173/#/simulator/lfp", w: 390, h: 844 },
    ];
    for (const r of axeRoutes) {
      await cdp.setViewport(r.w, r.h);
      await cdp.goto(r.url);
      await sleep(700);
      report.axe.push(await cdp.runAxe(r.name));
    }

    report.consoleErrors = [...cdp.errors];
    report.failedRequests = [...cdp.failedRequests];
    report.externalRequests = [...cdp.externalRequests];
  } finally {
    cdp?.close();
    killGroup(chromeProc);
    killGroup(viteProc);
  }

  // 10) WebGL-disabled fallback test (separate Chrome with --disable-webgl)
  const viteProc2 = spawn(
    process.execPath,
    [join(APP_DIR, "node_modules/vite/bin/vite.js"), "preview", "--port", "4173", "--strictPort", "--host", "127.0.0.1"],
    { cwd: APP_DIR, stdio: "ignore", detached: true }
  );
  let noGlProc = null;
  let noGlCdp = null;
  try {
    await waitForUrl("http://127.0.0.1:4173/", 15000);
    const noGl = await launchChrome(9231, ["--disable-webgl", "--disable-3d-apis"]);
    noGlProc = noGl.proc;
    noGlCdp = new CdpClient(noGl.wsUrl, ["http://127.0.0.1:4173"]);
    await noGlCdp.connect();
    await noGlCdp.setViewport(1440, 900);
    await noGlCdp.goto("http://127.0.0.1:4173/#/simulator/lfp");
    await noGlCdp.waitForText("WebGL is unavailable", 10000);
    await sleep(300);
    report.webglFallback = {
      fallbackBannerRendered: await noGlCdp.eval(`document.body.innerText.includes("WebGL is unavailable")`),
      staticPosterRendered: await noGlCdp.eval(`Boolean(document.querySelector('svg[aria-label*="Generic LFP Blade Pack"]'))`),
      errors: [...noGlCdp.errors],
    };
    await noGlCdp.screenshotPng("m6_webgl_fallback.png");
  } finally {
    noGlCdp?.close();
    killGroup(noGlProc);
    killGroup(viteProc2);
  }

  console.log(JSON.stringify(report, null, 2));
}

async function runSubpathCheck() {
  const distDir = join(APP_DIR, "dist");
  const SUBPATH = process.env.E2E_SUBPATH ?? "/ev-twin-preview/";
  const server = await startStaticSubpathServer(distDir, SUBPATH, 4174);
  let subProc = null;
  let subCdp = null;
  try {
    const launched = await launchChrome(9232, [
      "--use-gl=angle",
      "--use-angle=metal",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
    ]);
    subProc = launched.proc;
    subCdp = new CdpClient(launched.wsUrl, ["http://127.0.0.1:4174"]);
    await subCdp.connect();
    await subCdp.setViewport(1440, 900);
    await subCdp.goto(`http://127.0.0.1:4174${SUBPATH}#/simulator/lfp`);
    await subCdp.waitForText("LFP Blade", 10000);
    await sleep(600);
    await subCdp.clickButtonByText("Simulate");
    await sleep(150);
    await subCdp.clickButtonByText("Run simulation");
    await subCdp.waitForText("VERIFIED_NUMERICALLY", 15000);
    const out = {
      subpathSimulationOk: await subCdp.eval(`document.body.innerText.includes("VERIFIED_NUMERICALLY")`),
      consoleErrors: [...subCdp.errors],
      failedRequests: [...subCdp.failedRequests],
      externalRequests: [...subCdp.externalRequests],
    };
    console.log("SUBPATH_CHECK=" + JSON.stringify(out, null, 2));
  } finally {
    subCdp?.close();
    killGroup(subProc);
    server.close();
  }
}

const mode = process.argv[2] ?? "main";
if (mode === "subpath") {
  await runSubpathCheck();
} else {
  await runMainSuite();
}
process.exit(0);
