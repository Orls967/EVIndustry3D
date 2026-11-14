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
await send("Page.enable"); await send("Runtime.enable");
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
await go(""); out.landingAutoRotate = await ev(W(4000));
await go("#/simulator/lfp"); out.lfpAutoOrbit = await ev(W(4000));
await go("#/simulator/nmc"); out.nmcAutoOrbit = await ev(W(4000));
const r = await ev(`(()=>{const c=document.querySelector('canvas').getBoundingClientRect();return {x:c.x+c.width/2,y:c.y+c.height/2}})()`);
const ph = ev(W(3000));
for (let i=0;i<150;i++){ await send("Input.dispatchMouseEvent",{type:"mouseMoved",x:r.x+Math.sin(i/8)*140,y:r.y+Math.cos(i/11)*50,button:"none",buttons:0}); await sleep(20); }
out.nmcHover = await ph;
await click("Pause orbit"); await sleep(500);
const pd = ev(W(3000)); await send("Input.dispatchMouseEvent",{type:"mousePressed",x:r.x,y:r.y,button:"left",clickCount:1});
for (let i=0;i<80;i++){ await send("Input.dispatchMouseEvent",{type:"mouseMoved",x:r.x+Math.sin(i/10)*200,y:r.y+Math.cos(i/14)*60,button:"left",buttons:1}); await sleep(16);} 
await send("Input.dispatchMouseEvent",{type:"mouseReleased",x:r.x,y:r.y,button:"left",clickCount:1});
out.nmcDrag = await pd;
const pe = ev(W(3200)); await click("Step stages"); out.nmcExplodePlay = await pe;
await go("#/simulator/nmc"); await click("Pause orbit"); await click("Simulate"); await sleep(400); await click("Run simulation"); await sleep(2500);
const pp = ev(W(4000)); await click("Play"); out.nmcHeatmapPlayback = await pp;
await go("#/compare"); out.compare = await ev(W(4000));
const cr = await ev(`(()=>{const c=document.querySelectorAll('canvas')[1] ?? document.querySelector('canvas'); const b=c.getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2}})()`);
const pcd = ev(W(3000)); await send("Input.dispatchMouseEvent",{type:"mousePressed",x:cr.x,y:cr.y,button:"left",clickCount:1});
for (let i=0;i<80;i++){ await send("Input.dispatchMouseEvent",{type:"mouseMoved",x:cr.x+Math.sin(i/10)*160,y:cr.y+Math.cos(i/14)*50,button:"left",buttons:1}); await sleep(16); }
await send("Input.dispatchMouseEvent",{type:"mouseReleased",x:cr.x,y:cr.y,button:"left",clickCount:1});
out.compareDrag = await pcd;
console.log(JSON.stringify(out, null, 1));
try { process.kill(-proc.pid, "SIGKILL"); } catch {}
process.exit(0);
