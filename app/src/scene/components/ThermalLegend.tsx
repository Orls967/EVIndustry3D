import React from "react";

export interface ThermalLegendProps {
  minC: number;
  maxC: number;
  hottestZoneId: string;
  peakTempC: number;
}

export function ThermalLegend({
  minC,
  maxC,
  hottestZoneId,
  peakTempC,
}: ThermalLegendProps): React.ReactElement {
  return (
    <div
      aria-label={`Thermal heatmap scale from ${minC.toFixed(1)} to ${maxC.toFixed(1)} degrees Celsius`}
      style={{
        position: "absolute",
        bottom: 42,
        right: 10,
        padding: "8px 10px",
        borderRadius: "var(--radius-sm)",
        background: "rgba(18, 22, 27, 0.92)",
        border: "1px solid var(--color-border-subtle)",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        pointerEvents: "none",
        minWidth: "96px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div
          style={{
            width: "12px",
            height: "92px",
            borderRadius: "2px",
            background: "linear-gradient(to top, #3b6fe0 0%, #3fbf7f 33%, #f2d13d 60%, #f28c28 80%, #e5484d 100%)",
            border: "1px solid var(--color-border-subtle)",
          }}
        />
        <div
          className="mono-num"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "92px",
            fontSize: "11px",
            color: "var(--color-text-secondary)",
          }}
        >
          <span>{maxC.toFixed(1)} °C</span>
          <span>{((minC + maxC) / 2).toFixed(1)} °C</span>
          <span>{minC.toFixed(1)} °C</span>
        </div>
      </div>
      <div className="mono-num" style={{ fontSize: "10px", color: "var(--color-status-warning)" }}>
        Hot: {hottestZoneId.replace("pack.", "")} ({peakTempC.toFixed(1)} °C)
      </div>
    </div>
  );
}