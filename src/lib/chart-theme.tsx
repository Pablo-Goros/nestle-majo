import type { TooltipProps } from "recharts";

export const CHART_COLORS = {
  baseline: "#dc2626",
  consensus: "#16a34a",
  actual: "#1f6fbf",
  muted: "#94a3b8",
} as const;

export const CHART_MARGIN = { top: 8, right: 12, left: 0, bottom: 0 };

export const CHART_GRID = { strokeDasharray: "3 3", stroke: "#e5e7eb" };

export const CHART_AXIS = { tick: { fontSize: 12, fill: "#64748b" } };

export const CHART_LEGEND = {
  wrapperStyle: { fontSize: 12, paddingTop: 8 },
  iconType: "circle" as const,
  iconSize: 8,
};

export function chartTooltipFormatter(value: number, name: string): [string, string] {
  const formatted =
    typeof value === "number"
      ? value.toLocaleString("es-AR")
      : String(value);
  return [formatted, name];
}

export function ChartTooltipContent({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-md text-sm min-w-[140px]">
      {label != null && (
        <p className="font-medium text-foreground mb-1.5 border-b pb-1">{String(label)}</p>
      )}
      <ul className="space-y-1">
        {payload.map((entry) => (
          <li key={entry.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-medium tabular-nums">
              {typeof entry.value === "number"
                ? entry.value.toLocaleString("es-AR")
                : entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
