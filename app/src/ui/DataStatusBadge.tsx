import React from "react";
import type { DataStatus } from "../domain/contracts";

export interface DataStatusBadgeProps {
  status: DataStatus | "ASSUMED";
  onClick?: () => void;
  title?: string;
}

const BADGE_META = {
  ILLUSTRATIVE: { symbol: "◇", label: "Illustrative", cls: "status-badge--illustrative" },
  MODELLED: { symbol: "◆", label: "Modelled", cls: "status-badge--modelled" },
  MEASURED: { symbol: "●", label: "Measured", cls: "status-badge--measured" },
  ASSUMED: { symbol: "▲", label: "Assumed", cls: "status-badge--assumed" },
} as const;

export function DataStatusBadge({ status, onClick, title }: DataStatusBadgeProps): React.ReactElement {
  const meta = BADGE_META[status];
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`status-badge ${meta.cls}`}
        title={title ?? `View assumptions for ${meta.label} values`}
        style={{ cursor: "pointer" }}
      >
        <span aria-hidden="true">{meta.symbol}</span>
        <span>{meta.label}</span>
      </button>
    );
  }
  return (
    <span className={`status-badge ${meta.cls}`} title={title}>
      <span aria-hidden="true">{meta.symbol}</span>
      <span>{meta.label}</span>
    </span>
  );
}

