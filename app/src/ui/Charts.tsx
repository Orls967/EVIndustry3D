import React, { useState } from "react";
import type { SohForecast, ThermalResult } from "../domain/contracts";

function buildPolyline(points: Array<{ x: number; y: number }>): string {
  return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

export function ThermalTimeSeriesChart({ result }: { result: ThermalResult }): React.ReactElement {
  const [tableView, setTableView] = useState(false);

  const nZones = Math.max(1, result.zoneIds.length);
  const nSamples = result.nSamples;

  const rows = Array.from({ length: nSamples }, (_, s) => {
    let maxZ = -Infinity;
    let sumZ = 0;
    for (let z = 0; z < nZones; z++) {
      const tz = result.zoneTemperaturesC[z * nSamples + s] ?? 0;
      if (tz > maxZ) maxZ = tz;
      sumZ += tz;
    }
    const outlet = result.coolantTemperaturesC[(nZones - 1) * nSamples + s] ?? 0;
    return {
      timeMin: (result.timeSeconds[s] ?? 0) / 60,
      peakC: maxZ,
      avgC: sumZ / nZones,
      outletC: outlet,
      socPct: result.socPercent[s] ?? 0,
    };
  });

  const w = 340;
  const h = 180;
  const padL = 36;
  const padR = 10;
  const padT = 12;
  const padB = 26;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const maxTime = Math.max(rows[rows.length - 1]?.timeMin ?? 1, 0.1);
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const r of rows) {
    yMin = Math.min(yMin, r.peakC, r.avgC, r.outletC);
    yMax = Math.max(yMax, r.peakC, r.avgC, r.outletC);
  }
  const yPad = Math.max((yMax - yMin) * 0.12, 1.5);
  yMin = Math.floor(yMin - yPad);
  yMax = Math.ceil(yMax + yPad);
  const ySpan = Math.max(yMax - yMin, 1);

  const mapX = (t: number) => padL + (t / maxTime) * plotW;
  const mapY = (v: number) => padT + plotH - ((v - yMin) / ySpan) * plotH;

  const peakLine = buildPolyline(rows.map((r) => ({ x: mapX(r.timeMin), y: mapY(r.peakC) })));
  const avgLine = buildPolyline(rows.map((r) => ({ x: mapX(r.timeMin), y: mapY(r.avgC) })));
  const coolLine = buildPolyline(rows.map((r) => ({ x: mapX(r.timeMin), y: mapY(r.outletC) })));

  // Downsample table rows if very large
  const step = rows.length > 24 ? Math.ceil(rows.length / 16) : 1;
  const tableRows = rows.filter((_, i) => i % step === 0 || i === rows.length - 1);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <div className="caption-label">TEMPERATURE VS TIME</div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          aria-pressed={tableView}
          onClick={() => setTableView((v) => !v)}
          style={{ fontSize: "11px", minHeight: "26px" }}
        >
          {tableView ? "View chart" : "View as table"}
        </button>
      </div>

      {tableView ? (
        <div style={{ maxHeight: "210px", overflowY: "auto", border: "1px solid var(--color-border-subtle)", borderRadius: "var(--radius-sm)" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Time (min)</th>
                <th>Peak (°C)</th>
                <th>Avg (°C)</th>
                <th>Outlet (°C)</th>
                <th>SOC (%)</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => (
                <tr key={r.timeMin}>
                  <td className="mono-num">{r.timeMin.toFixed(1)}</td>
                  <td className="mono-num">{r.peakC.toFixed(1)}</td>
                  <td className="mono-num">{r.avgC.toFixed(1)}</td>
                  <td className="mono-num">{r.outletC.toFixed(1)}</td>
                  <td className="mono-num">{r.socPct.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="panel-card" style={{ padding: "8px", background: "var(--color-bg-base)" }}>
          <svg
            viewBox={`0 0 ${w} ${h}`}
            width="100%"
            role="img"
            aria-label={`Temperature vs time chart peaking at ${result.summary.maxTemperatureC.toFixed(1)} °C`}
            style={{ display: "block" }}
          >
            {[0, 0.5, 1].map((frac) => {
              const y = padT + plotH * (1 - frac);
              const val = yMin + ySpan * frac;
              return (
                <g key={frac}>
                  <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="#1F2731" strokeWidth="1" />
                  <text x={padL - 4} y={y + 3} textAnchor="end" fill="#8A96A4" fontSize="9" fontFamily="JetBrains Mono">
                    {val.toFixed(0)}
                  </text>
                </g>
              );
            })}
            <text x={padL} y={h - 6} fill="#8A96A4" fontSize="9" fontFamily="JetBrains Mono">
              0 min
            </text>
            <text x={w - padR} y={h - 6} textAnchor="end" fill="#8A96A4" fontSize="9" fontFamily="JetBrains Mono">
              {maxTime.toFixed(1)} min
            </text>
            <polyline fill="none" stroke="#2FB8A6" strokeWidth="1.5" strokeDasharray="3 2" points={coolLine} />
            <polyline fill="none" stroke="#38C7E0" strokeWidth="1.8" points={avgLine} />
            <polyline fill="none" stroke="#F28C28" strokeWidth="2" points={peakLine} />
          </svg>
          <div style={{ display: "flex", gap: "12px", fontSize: "11px", color: "var(--color-text-secondary)", marginTop: "4px", flexWrap: "wrap" }}>
            <span style={{ color: "#F28C28" }}>● Peak zone</span>
            <span style={{ color: "#38C7E0" }}>● Pack average</span>
            <span style={{ color: "#2FB8A6" }}>┈ Coolant outlet</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function SohForecastChart({
  forecast,
  thresholdPercent,
}: {
  forecast: SohForecast;
  thresholdPercent: number;
}): React.ReactElement {
  const [tableView, setTableView] = useState(false);

  const w = 340;
  const h = 180;
  const padL = 38;
  const padR = 12;
  const padT = 12;
  const padB = 26;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const pts = forecast.points;
  const maxYear = Math.max(pts[pts.length - 1]?.year ?? 1, 1);
  const yMin = 50;
  const yMax = 100;
  const mapX = (yr: number) => padL + (yr / maxYear) * plotW;
  const mapY = (v: number) => padT + plotH - ((Math.min(Math.max(v, yMin), yMax) - yMin) / (yMax - yMin)) * plotH;

  const nominalPts = pts.map((p) => ({ x: mapX(p.year), y: mapY(p.sohPercent) }));
  const bandTop = pts.map((p) => ({
    x: mapX(p.year),
    y: mapY(p.lowerSensitivityCMinus5Percent ?? p.sohPercent),
  }));
  const bandBot = [...pts].reverse().map((p) => ({
    x: mapX(p.year),
    y: mapY(p.upperSensitivityCPlus5Percent ?? p.sohPercent),
  }));
  const bandPoly = buildPolyline([...bandTop, ...bandBot]);
  const threshY = mapY(thresholdPercent);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <div className="caption-label">SOH PROJECTION (ILLUSTRATIVE)</div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          aria-pressed={tableView}
          onClick={() => setTableView((v) => !v)}
          style={{ fontSize: "11px", minHeight: "26px" }}
        >
          {tableView ? "View chart" : "View as table"}
        </button>
      </div>

      {tableView ? (
        <div style={{ overflowX: "auto", border: "1px solid var(--color-border-subtle)", borderRadius: "var(--radius-sm)" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>SoH (%)</th>
                <th>−5 °C (%)</th>
                <th>+5 °C (%)</th>
              </tr>
            </thead>
            <tbody>
              {pts.map((p) => (
                <tr key={p.year}>
                  <td className="mono-num">{p.year}</td>
                  <td className="mono-num">{p.sohPercent.toFixed(1)}</td>
                  <td className="mono-num">{(p.lowerSensitivityCMinus5Percent ?? p.sohPercent).toFixed(1)}</td>
                  <td className="mono-num">{(p.upperSensitivityCPlus5Percent ?? p.sohPercent).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="panel-card" style={{ padding: "8px", background: "var(--color-bg-base)" }}>
          <svg
            viewBox={`0 0 ${w} ${h}`}
            width="100%"
            role="img"
            aria-label={`Illustrative SoH curve from Year 0 to Year ${maxYear}`}
            style={{ display: "block" }}
          >
            {[50, 75, 100].map((v) => {
              const y = mapY(v);
              return (
                <g key={v}>
                  <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="#1F2731" strokeWidth="1" />
                  <text x={padL - 4} y={y + 3} textAnchor="end" fill="#8A96A4" fontSize="9" fontFamily="JetBrains Mono">
                    {v}%
                  </text>
                </g>
              );
            })}
            <polygon points={bandPoly} fill="#38C7E0" fillOpacity="0.16" />
            <line
              x1={padL}
              y1={threshY}
              x2={w - padR}
              y2={threshY}
              stroke="#E5484D"
              strokeWidth="1.2"
              strokeDasharray="4 3"
            />
            <polyline fill="none" stroke="#38C7E0" strokeWidth="2.2" points={buildPolyline(nominalPts)} />
            <text x={padL} y={h - 6} fill="#8A96A4" fontSize="9" fontFamily="JetBrains Mono">
              Yr 0
            </text>
            <text x={w - padR} y={h - 6} textAnchor="end" fill="#8A96A4" fontSize="9" fontFamily="JetBrains Mono">
              Yr {maxYear}
            </text>
          </svg>
          <div style={{ display: "flex", gap: "12px", fontSize: "11px", color: "var(--color-text-secondary)", marginTop: "4px", flexWrap: "wrap" }}>
            <span style={{ color: "#38C7E0" }}>● Nominal SoH</span>
            <span style={{ color: "#8ECAE6" }}>■ ±5 °C temp sensitivity</span>
            <span style={{ color: "#E5484D" }}>┈ {thresholdPercent.toFixed(0)}% threshold</span>
          </div>
        </div>
      )}
    </div>
  );
}

