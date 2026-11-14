import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const APP_DIR = resolve(import.meta.dirname, "..");
const STILLS_DIR = join(APP_DIR, "public/stills");
const SCRATCH_DIR = "/Users/orl123456/.gemini/antigravity/brain/1527e4df-2e4d-44e1-87bc-c29e94c39b33/scratch/m3_renders";

mkdirSync(STILLS_DIR, { recursive: true });
mkdirSync(SCRATCH_DIR, { recursive: true });

const CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PREVIEW_PORT = 4173;
const CDP_PORT = 9229;

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
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.errors = [];
    this.failedRequests = [];
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
        this.errors.push(JSON.stringify(msg.params.exceptionDetails));
      } else if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") {
        this.errors.push(msg.params.entry.text);
      } else if (msg.method === "Network.responseReceived" && msg.params.response?.status >= 400) {
        this.failedRequests.push(`${msg.params.response.status} ${msg.params.response.url}`);
      } else if (msg.method === "Network.loadingFailed") {
        this.failedRequests.push(`FAILED ${msg.params.errorText}`);
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
    const res = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
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

  async screenshotPng(outPath, clip) {
    const params = { format: "png" };
    if (clip) params.clip = { ...clip, scale: 1 };
    const { data } = await this.send("Page.captureScreenshot", params);
    writeFileSync(outPath, Buffer.from(data, "base64"));
  }

  close() {
    this.ws.close();
  }
}

async function main() {
  const viteBin = join(APP_DIR, "node_modules/vite/bin/vite.js");
  const preview = spawn(
    process.execPath,
    [viteBin, "preview", "--port", String(PREVIEW_PORT), "--strictPort", "--host", "127.0.0.1"],
    {
      cwd: APP_DIR,
      stdio: "ignore",
      detached: true,
    }
  );

  const userDataDir = `/tmp/chrome-cdp-m3-${Date.now()}`;
  const chrome = spawn(
    CHROME_BIN,
    [
      "--headless=new",
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${userDataDir}`,
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--use-gl=angle",
      "--use-angle=metal",
      "--window-size=1440,900",
      "about:blank",
    ],
    { stdio: "ignore", detached: true }
  );

  let exitCode = 0;
  try {
    await waitForUrl(`http://127.0.0.1:${PREVIEW_PORT}/`);
    const listRes = await waitForUrl(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const targets = await listRes.json();
    const pageTarget = targets.find((t) => t.type === "page") ?? targets[0];
    if (!pageTarget) throw new Error("No CDP page target found");

    const cdp = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.setViewport(1440, 900);

    const results = {};

    // 1. Landing desktop + mobile check
    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${PREVIEW_PORT}/#/` });
    await sleep(900);
    results.landingDesktopOverflowX = await cdp.eval("document.documentElement.scrollWidth > window.innerWidth");
    await cdp.screenshotPng(join(SCRATCH_DIR, "landing_1440.png"));

    await cdp.setViewport(390, 844);
    await sleep(400);
    results.landingMobileOverflowX = await cdp.eval("document.documentElement.scrollWidth > window.innerWidth");
    await cdp.screenshotPng(join(SCRATCH_DIR, "landing_390.png"));

    // Restore desktop 1440x900 for 3D WebGL benchmarks & stills
    await cdp.setViewport(1440, 900);

    const inspectPack = async (hash, prefix) => {
      await cdp.send("Page.navigate", { url: `http://127.0.0.1:${PREVIEW_PORT}/${hash}` });
      for (let i = 0; i < 25; i++) {
        await sleep(300);
        const hasTelemetry = await cdp.eval(
          `Boolean(document.querySelector('canvas') && document.body.innerText.includes('tris'))`
        );
        if (hasTelemetry) break;
      }
      // Reset assembly cleanly so previous route's explode/cross-section state never leaks
      await cdp.eval(`(() => {
        const btns = [...document.querySelectorAll('button')];
        const rst = btns.find(b => b.textContent?.includes('Reset assembly'));
        if (rst) rst.click();
      })()`);
      await sleep(800);

      const telemetryAssembled = await cdp.eval(`(() => {
        const text = document.body.innerText.match(/\\d+ calls · [\\d,]+ tris · [\\d.]+ ms/)?.[0] || null;
        const c = document.querySelector('canvas');
        const r = c ? c.getBoundingClientRect() : null;
        return { text, rect: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null };
      })()`);

      await cdp.screenshotPng(join(STILLS_DIR, `${prefix}-assembled.png`), telemetryAssembled.rect);
      await cdp.screenshotPng(join(SCRATCH_DIR, `${prefix}_workspace_assembled.png`));

      // Drive Explode slider to 75% via React input value setter
      await cdp.eval(`(() => {
        const el = document.getElementById('c1-explode-slider');
        if (!el) return;
        const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        desc.set.call(el, '75');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      })()`);
      await sleep(900);
      await cdp.screenshotPng(join(STILLS_DIR, `${prefix}-exploded.png`), telemetryAssembled.rect);

      // Reset explode & toggle Cross-section ON
      await cdp.eval(`(() => {
        const el = document.getElementById('c1-explode-slider');
        if (el) {
          const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
          desc.set.call(el, '0');
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const btns = [...document.querySelectorAll('button')];
        const cs = btns.find(b => b.textContent?.includes('Cross-section'));
        if (cs) cs.click();
      })()`);
      await sleep(800);
      await cdp.screenshotPng(join(STILLS_DIR, `${prefix}-cutaway.png`), telemetryAssembled.rect);

      const telemetryAfter = await cdp.eval(
        `document.body.innerText.match(/\\d+ calls · [\\d,]+ tris · [\\d.]+ ms/)?.[0] || null`
      );
      return { telemetryAssembled: telemetryAssembled.text, telemetryAfter };
    };

    results.lfp = await inspectPack("#/simulator/lfp", "lfp");
    results.nmc = await inspectPack("#/simulator/nmc", "nmc");
    results.consoleErrors = cdp.errors;
    results.failedRequests = cdp.failedRequests;

    cdp.close();
    console.log(JSON.stringify(results, null, 2));
    if (cdp.errors.length > 0 || cdp.failedRequests.length > 0) {
      exitCode = 1;
    }
  } finally {
    try {
      if (chrome.pid) process.kill(-chrome.pid, "SIGKILL");
    } catch {}
    try {
      if (preview.pid) process.kill(-preview.pid, "SIGKILL");
    } catch {}
  }
  process.exit(exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

