import React from "react";

export interface StatusBadgeProps {
  status: number | string | null | undefined;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Reusable StatusBadge component matching visual reference:
 * - PENDING: Red background with white text [ Pending ]
 * - PRINTING: Yellow/amber background with dark text [ Printing ]
 * - DELIVERED: Blue background with white text [ Delivered ]
 * Strictly non-interactive visual badge (no button semantics, no onClick, no hover actions).
 */
export default function StatusBadge({ status, className = "", style = {} }: StatusBadgeProps) {
  const s = Number(status);
  const statusStr = String(status ?? "").trim().toUpperCase();

  let label = "Pending";
  let bg = "#dc2626"; // Crimson red from reference image
  let color = "#ffffff";

  if (s === 2 || statusStr === "PRINTING") {
    label = "Printing";
    bg = "#fbbf24"; // Yellow / amber
    color = "#78350f"; // Dark amber/brown for optimal readability
  } else if (s === 4 || statusStr === "DELIVERED") {
    label = "Delivered";
    bg = "#0284c7"; // Blue
    color = "#ffffff";
  } else if (s === 3 || statusStr === "FINISHED") {
    label = "Finished";
    bg = "#0284c7";
    color = "#ffffff";
  } else {
    // 1 or PENDING or fallback defaults to Pending
    label = "Pending";
    bg = "#dc2626";
    color = "#ffffff";
  }

  const baseStyle: React.CSSProperties = {
    display: "inline-block",
    backgroundColor: bg,
    color: color,
    padding: "3px 10px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: 600,
    lineHeight: "1.25",
    textAlign: "center",
    whiteSpace: "nowrap",
    userSelect: "none",
    letterSpacing: "0.01em",
    cursor: "default",
    pointerEvents: "none", // strictly non-interactive visual badge
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.08)",
    ...style,
  };

  return (
    <span
      className={`status-pill status-pill-${label.toLowerCase()} pill-${label.toLowerCase()} ${className}`.trim()}
      style={baseStyle}
      title={label}
      aria-label={`Status: ${label}`}
    >
      {label}
    </span>
  );
}
