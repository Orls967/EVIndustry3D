import { spawn } from "node:child_process";
const BASE = process.argv[2] ?? "https://orls967.github.io/EVIndustry3D/";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9333;
const proc = spawn(CHROME, ["--headless=new", "--no-sandbox", "--disable-gpu-sandbox", "--use-angle=metal", "--enable-gpu-rasterization",
  "--disable-renderer-backgrounding", "--disable-background-timer-throttling", `--remote-debugging-port=${port}`,
  `--user-data-dir=${(await import("node:os")).tmpdir()}/ev-perf-chrome-${Date.now()}`, "about:blank"], { stdio: "ignore", detached: true });
let targets;
for (let i = 0; i < 60; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); break; } catch { await sleep(250); } }
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pend = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable"); if (process.env.LAT) await send("Network.emulateNetworkConditions", { offline: false, latency: Number(process.env.LAT), downloadThroughput: 5e6, uploadThroughput: 1e6 });
await send("Page.addScriptToEvaluateOnNewDocument", { source: `(() => {
  window.__rf = []; let lastTs = -1;
  const P = WebGL2RenderingContext.prototype;
  for (const n of ["drawElements","drawArrays","drawElementsInstanced","drawArraysInstanced"]) { const o = P[n]; P[n] = function(...a){ const ts = document.timeline.currentTime; if (ts !== lastTs) { lastTs = ts; window.__rf.push(performance.now()); } return o.apply(this,a); }; }
  window.__loaf = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__loaf.push({d: Math.round(e.duration), b: Math.round(e.blockingDuration), s: (e.scripts||[]).slice(0,2).map(x => (x.sourceFunctionName||'') + '@' + (x.sourceURL||'').split('/').pop() + ':' + Math.round(x.duration))}))).observe({type:'long-animation-frame'}); } catch {}
})()` });

await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
const W = (ms) => `new Promise(res => { window.__rf = []; window.__loaf = []; setTimeout(() => { const f = window.__rf, iv = [];
  for (let i=1;i<f.length;i++) iv.push(f[i]-f[i-1]); iv.sort((a,b)=>a-b); const n=iv.length;
  res({ renders: f.length, renderFps: n? +(1000*n/iv.reduce((a,b)=>a+b,0)).toFixed(1):0, p50: n?+iv[Math.floor(n*.5)].toFixed(1):null, p95: n?+iv[Math.floor(n*.95)].toFixed(1):null, max: n?+iv[n-1].toFixed(1):null,
    gaps33: iv.filter(x=>x>33.4).length, gaps50: iv.filter(x=>x>50).length, loafCount: window.__loaf.length, loafWorst: window.__loaf.sort((a,b)=>b.d-a.d).slice(0,3) }); }, ${ms}); })`;
const go = async (hash) => { await send("Page.navigate", { url: BASE + hash }); await sleep(5000); };
const click = (txt) => ev(`(()=>{const b=[...document.querySelectorAll('button,[role=tab]')].find(b=>b.textContent.trim().startsWith(${JSON.stringify(txt)})); b?.click(); return !!b;})()`);
const out = {};
await go("#/simulator/nmc"); await click("Pause orbit"); await click("Simulate"); await sleep(400);
const t0 = Date.now(); await click("Run simulation");
let done = false; for (let i = 0; i < 60 && !done; i++) { await sleep(250); done = await ev(`/Max temperature/.test(document.body.innerText) && !/Running|Cancel/.test([...document.querySelectorAll('button')].map(b=>b.textContent).join(' '))`); }
out.simDoneAfterMs = Date.now() - t0;
out.playClicked = await click("Play"); await sleep(500);
out.probe = await ev(`new Promise(res => { let raf = 0; const t0 = performance.now(); const d0 = window.__rf.length;
  const before = (document.body.innerText.match(/\\d+:\\d+ \\/ \\d+:\\d+/)||[""])[0];
  (function f(t){ raf++; if (t - t0 < 2000) requestAnimationFrame(f); else res({ rafPerSec: raf/2, drawFramesPerSec: (window.__rf.length - d0)/2, before, after: (document.body.innerText.match(/\\d+:\\d+ \\/ \\d+:\\d+/)||[""])[0] }); })(t0); })`);
console.log(JSON.stringify(out));
try { process.kill(-proc.pid, "SIGKILL"); } catch {}
process.exit(0);
