import React, { useState } from "react";
import type { ArchitectureId } from "../domain/contracts";
import { getPackDefinition } from "../domain/dataLoaders";

export interface PackSchematicPosterProps {
  architecture: ArchitectureId;
  mode?: "assembled" | "exploded" | "cutaway" | "thermal";
  caption?: string;
  forceSvg?: boolean;
}

/**
 * Displays a real M3 Three.js rendered still for assembled/exploded/cutaway posters
 * when available, falling back cleanly to a geometric orthographic SVG schematic
 * driven directly by data/packs/*.json (used for WebGL-disabled fallback & thermal pre-M4).
 */
export function PackSchematicPoster({
  architecture,
  mode = "assembled",
  caption,
  forceSvg = false,
}: PackSchematicPosterProps): React.ReactElement {
  const [stillFailed, setStillFailed] = useState(false);
  const pack = getPackDefinition(architecture);
  const isLfp = architecture === "LFP_BLADE";
  const stillSlug = isLfp ? "lfp" : "nmc";
  const showRenderedStill = !forceSvg && !stillFailed && mode !== "thermal";
  const stillSrc = `${import.meta.env.BASE_URL}stills/${stillSlug}-${mode}.png`;
  const lidOffset = mode === "exploded" ? -18 : 0;
  const plateOffset = mode === "exploded" ? -8 : 0;

  return (
    <figure
      className="panel-card"
      style={{
        margin: 0,
        padding: "var(--space-4)",
        background: "var(--color-bg-base)",
      }}
    >
      {showRenderedStill ? (
        <div
          style={{
            position: "relative",
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
            background: "#0B0D10",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <img
            src={stillSrc}
            alt={`${pack.displayName} ${mode} 3D model still`}
            loading="lazy"
            onError={() => setStillFailed(true)}
            style={{
              display: "block",
              width: "100%",
              aspectRatio: "16 / 10",
              objectFit: "cover",
            }}
          />
          <span
            className="mono-num"
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              padding: "3px 8px",
              borderRadius: "var(--radius-sm)",
              background: "rgba(11, 13, 16, 0.86)",
              border: "1px solid var(--color-border-subtle)",
              fontSize: "11px",
              color: "var(--color-text-secondary)",
            }}
          >
            {pack.displayName} · {mode.toUpperCase()}
          </span>
        </div>
      ) : (
        <svg
        viewBox="0 0 420 220"
        width="100%"
        role="img"
        aria-label={`${pack.displayName} ${mode} schematic`}
        style={{ display: "block", borderRadius: "var(--radius-sm)", background: "#0E1217" }}
      >
        {/* Subtle technical grid */}
        <defs>
          <pattern id={`grid-${architecture}-${mode}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#18202A" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="420" height="220" fill={`url(#grid-${architecture}-${mode})`} />

        {/* Lower tray */}
        <rect x="44" y="168" width="332" height="16" rx="2" fill="#232B35" stroke="#53606F" strokeWidth="1.2" />

        {isLfp ? (
          <>
            {/* 10 blade zones (LFP 120s1p) */}
            {Array.from({ length: 10 }, (_, idx) => {
              const x = 52 + idx * 32;
              const heatPalette = ["#3B6FE0", "#3FBF7F", "#F2D13D", "#F28C28", "#E5484D"];
              const fill =
                mode === "thermal"
                  ? heatPalette[Math.min(4, Math.floor((idx / 9) * 4.5))]
                  : mode === "cutaway" && idx >= 5
                  ? "#1A222B"
                  : "#8E9BAA";
              const opacity = mode === "cutaway" && idx >= 5 ? 0.35 : 0.9;
              return (
                <g key={idx}>
                  <rect
                    x={x}
                    y="102"
                    width="26"
                    height="62"
                    rx="1"
                    fill={fill}
                    fillOpacity={opacity}
                    stroke="#33404F"
                    strokeWidth="1"
                  />
                  <text x={x + 13} y="137" textAnchor="middle" fill="#0B0D10" fontSize="8" fontFamily="JetBrains Mono">
                    Z{idx + 1}
                  </text>
                </g>
              );
            })}
            {/* TIM + Top cold plate */}
            <g transform={`translate(0, ${plateOffset})`}>
              <rect x="48" y="92" width="324" height="6" fill="#52606E" stroke="#7A8999" strokeWidth="0.8" />
              <rect x="44" y="76" width="332" height="14" rx="2" fill="#2B3A48" stroke="#38C7E0" strokeWidth="1.2" />
              <line x1="56" y1="83" x2="364" y2="83" stroke="#2FB8A6" strokeWidth="2" strokeDasharray="8 4" />
            </g>
          </>
        ) : (
          <>
            {/* 12 cylindrical zone banks (NMC 4680 92s9p) */}
            {Array.from({ length: 12 }, (_, idx) => {
              const x = 52 + idx * 26.5;
              const heatPalette = ["#3B6FE0", "#3FBF7F", "#F2D13D", "#F28C28", "#E5484D"];
              const fill =
                mode === "thermal"
                  ? heatPalette[Math.min(4, Math.floor((idx / 11) * 4.5))]
                  : mode === "cutaway" && idx >= 6
                  ? "#1A222B"
                  : "#9AA7B5";
              const opacity = mode === "cutaway" && idx >= 6 ? 0.35 : 0.92;
              return (
                <g key={idx}>
                  <rect x={x} y="98" width="16" height="66" rx="3" fill={fill} fillOpacity={opacity} stroke="#364352" />
                  <ellipse cx={x + 8} cy="98" rx="8" ry="2.5" fill="#465362" />
                  <rect
                    x={x + 17}
                    y={104 + plateOffset * -0.4}
                    width="5"
                    height="56"
                    fill="#2B3A48"
                    stroke="#2FB8A6"
                    strokeWidth="0.9"
                  />
                </g>
              );
            })}
          </>
        )}

        {/* Upper enclosure lid */}
        <g transform={`translate(0, ${lidOffset})`}>
          <path d="M 44 66 L 54 52 L 366 52 L 376 66 Z" fill="#1C232B" stroke="#6E7A88" strokeWidth="1.2" />
          <rect x="64" y="55" width="44" height="8" rx="1" fill="#2A333E" stroke="#38C7E0" strokeWidth="0.8" />
        </g>

        {/* Cutaway divider if active */}
        {mode === "cutaway" && (
          <line x1="210" y1="36" x2="210" y2="192" stroke="#38C7E0" strokeWidth="1.5" strokeDasharray="4 3" />
        )}

        {/* Dimension / Label callout */}
        <text x="16" y="22" fill="#E8EDF2" fontSize="11" fontWeight="600" fontFamily="Inter">
          {pack.displayName}
        </text>
        <text x="16" y="36" fill="#8A96A4" fontSize="9.5" fontFamily="JetBrains Mono">
          {pack.envelopeMm.lengthX} x {pack.envelopeMm.widthZ} x {pack.envelopeMm.heightY} mm (ASSUMED) | {pack.zones.length} ZONES
        </text>
        <text x="404" y="206" textAnchor="end" fill="#8A96A4" fontSize="9" fontFamily="JetBrains Mono">
          {isLfp ? "TOP COLD PLATE (14 CH)" : "SIDE RIBBONS (12 CH)"}
        </text>
      </svg>
      )}
      {caption && (
        <figcaption style={{ marginTop: "var(--space-2)", fontSize: "12px", color: "var(--color-text-muted)" }}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

