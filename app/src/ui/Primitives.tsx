import React, { useEffect } from "react";
import { AlertTriangle, Info, XOctagon } from "lucide-react";

export function InlineBanner({
  tone,
  children,
}: {
  tone: "info" | "warning" | "danger";
  children: React.ReactNode;
}): React.ReactElement {
  const Icon = tone === "danger" ? XOctagon : tone === "warning" ? AlertTriangle : Info;
  const color =
    tone === "danger"
      ? "var(--color-status-danger)"
      : tone === "warning"
      ? "var(--color-status-warning)"
      : "var(--color-status-info)";
  return (
    <div className={`inline-banner inline-banner--${tone}`} role={tone === "danger" ? "alert" : "status"}>
      <Icon size={16} strokeWidth={1.5} color={color} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export interface SliderFieldProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (next: number) => void;
  error?: string;
  warning?: string;
}

export function SliderField({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  error,
  warning,
}: SliderFieldProps): React.ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)" }}>
        <label htmlFor={`${id}-num`} style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)" }}>
          {label}
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <input
            id={`${id}-num`}
            type="number"
            className={`field-input mono-num ${error ? "field-input--error" : ""}`}
            style={{ width: "86px", textAlign: "right", minHeight: "30px", padding: "2px 8px" }}
            value={Number.isFinite(value) ? value : ""}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              if (!Number.isNaN(parsed)) {
                onChange(parsed);
              }
            }}
          />
          <span className="mono-num" style={{ fontSize: "12px", color: "var(--color-text-muted)", minWidth: "36px" }}>
            {unit}
          </span>
        </div>
      </div>
      <input
        id={`${id}-range`}
        aria-label={`${label} slider`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(Math.max(value, min), max)}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "var(--color-accent-primary)" }}
      />
      <div
        className="mono-num"
        style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--color-text-muted)" }}
      >
        <span>
          {min} {unit}
        </span>
        <span>
          {max} {unit}
        </span>
      </div>
      {error && (
        <div style={{ fontSize: "12px", color: "var(--color-status-danger)" }} role="alert">
          {error}
        </div>
      )}
      {!error && warning && (
        <div style={{ fontSize: "12px", color: "var(--color-status-warning)" }}>▲ {warning}</div>
      )}
    </div>
  );
}

export function Disclosure({
  summary,
  children,
}: {
  summary: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <details
      className="panel-card"
      style={{ padding: "var(--space-2) var(--space-3)", background: "var(--color-surface-2)" }}
    >
      <summary style={{ cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "var(--color-text-primary)" }}>
        {summary}
      </summary>
      <div style={{ marginTop: "var(--space-2)", fontSize: "13px", color: "var(--color-text-secondary)" }}>
        {children}
      </div>
    </details>
  );
}

export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}): React.ReactElement | null {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
        <h2 id="confirm-modal-title" style={{ margin: "0 0 var(--space-2)", fontSize: "20px", lineHeight: "28px" }}>
          {title}
        </h2>
        <p style={{ margin: "0 0 var(--space-6)", fontSize: "14px", color: "var(--color-text-secondary)" }}>{body}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)" }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SegmentedControl({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (next: string) => void;
}): React.ReactElement {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      style={{
        display: "inline-flex",
        border: "1px solid var(--color-border-control)",
        borderRadius: "var(--radius-sm)",
        overflow: "hidden",
        background: "var(--color-surface-2)",
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            style={{
              padding: "6px 12px",
              minHeight: "36px",
              border: 0,
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: active ? 600 : 500,
              background: active ? "var(--color-accent-primary)" : "transparent",
              color: active ? "#08121a" : "var(--color-text-secondary)",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

