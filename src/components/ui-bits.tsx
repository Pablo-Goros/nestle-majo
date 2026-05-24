import {
  type ReactNode,
  useMemo,
  useState,
  type ThHTMLAttributes,
} from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

/* ─── Layout ─── */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}

export function PageSection({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`space-y-4 ${className}`}>{children}</section>;
}

/* ─── KPI & Cards ─── */

export function KPI({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneCls = {
    default: "text-foreground",
    good: "text-success",
    warn: "text-warning",
    bad: "text-destructive",
  }[tone];
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm transition-shadow duration-200 hover:shadow-md h-full flex flex-col">
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
      <div className={`text-2xl font-semibold mt-2 tabular-nums ${toneCls}`}>{value}</div>
      {hint && (
        <div className="text-xs text-muted-foreground mt-auto pt-2 leading-snug">{hint}</div>
      )}
    </div>
  );
}

export function Card({
  title,
  children,
  actions,
  className = "",
  noPadding = false,
}: {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-card shadow-sm transition-shadow duration-200 hover:shadow-md overflow-hidden ${className}`}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-muted/30 min-h-[48px]">
          {title && <h3 className="font-medium text-sm text-foreground">{title}</h3>}
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className={noPadding ? "" : "p-4"}>{children}</div>
    </div>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "good" | "warn" | "bad" | "info";
}) {
  const t = {
    default: "bg-muted text-muted-foreground",
    good: "bg-success/15 text-success",
    warn: "bg-warning/20 text-yellow-800",
    bad: "bg-destructive/15 text-destructive",
    info: "bg-info/15 text-info",
  }[tone];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${t}`}
    >
      {children}
    </span>
  );
}

export function Semaforo({ estado }: { estado: string }) {
  const map: Record<string, "good" | "warn" | "bad" | "info"> = {
    OK: "good",
    Revisar: "warn",
    Atención: "bad",
    Aprobado: "good",
    Pendiente: "warn",
    "En revisión": "info",
    "Bajo target": "warn",
    Crítico: "bad",
  };
  const t = map[estado];
  return <Badge tone={t ?? "default"}>{estado}</Badge>;
}

export function LockedNotice({ feature }: { feature: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground flex items-center gap-3">
      <span className="size-8 rounded-md grid place-items-center bg-background border text-base shrink-0">
        🔒
      </span>
      <span>
        Tu rol no tiene permisos para editar <strong className="text-foreground">{feature}</strong>.
        Vista de solo lectura.
      </span>
    </div>
  );
}

/* ─── Tabs & toggles ─── */

export function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 border-b border-border mb-4">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            active === t.id
              ? "border-nestle-red text-nestle-red"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-md border bg-muted/50 p-0.5 gap-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            value === o.value
              ? "bg-nestle-red text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/80"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ─── Forms ─── */

const inputBase =
  "w-full h-9 px-3 rounded-md border border-input bg-background text-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-nestle-red/25 focus:border-nestle-red";

export function FormField({
  label,
  error,
  required,
  children,
  className = "",
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </span>
      {children}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1" role="alert">
          {error}
        </p>
      )}
    </label>
  );
}

export function FormInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean },
) {
  const { error, className = "", ...rest } = props;
  return (
    <input
      className={`${inputBase} ${error ? "border-destructive focus:ring-destructive/25 focus:border-destructive" : ""} ${className}`}
      {...rest}
    />
  );
}

export function FormSelect(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean },
) {
  const { error, className = "", children, ...rest } = props;
  return (
    <select
      className={`${inputBase} ${error ? "border-destructive focus:ring-destructive/25" : ""} ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}

export function FormTextarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean },
) {
  const { error, className = "", ...rest } = props;
  return (
    <textarea
      className={`w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-nestle-red/25 focus:border-nestle-red ${error ? "border-destructive" : ""} ${className}`}
      {...rest}
    />
  );
}

/* ─── Tables ─── */

export function TableShell({
  children,
  maxHeight = "28rem",
  className = "",
}: {
  children: ReactNode;
  maxHeight?: string;
  className?: string;
}) {
  return (
    <div
      className={`overflow-auto rounded-md border -mx-1 ${className}`}
      style={{ maxHeight }}
    >
      <table className="app-table w-full text-sm">{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="app-table-head">{children}</thead>;
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="app-table-body">{children}</tbody>;
}

export function TableRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <tr className={`app-table-row ${className}`}>{children}</tr>;
}

export function Th({
  children,
  className = "",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={`app-table-th ${className}`} {...props}>
      {children}
    </th>
  );
}

export function Td({
  children,
  className = "",
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`app-table-td ${className}`} {...props}>
      {children}
    </td>
  );
}

type SortDir = "asc" | "desc";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  className?: string;
  render: (row: T) => ReactNode;
};

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  pageSize = 10,
  emptyMessage = "Sin datos para mostrar",
  maxHeight = "28rem",
}: {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T, index: number) => string;
  pageSize?: number;
  emptyMessage?: string;
  maxHeight?: string;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortable) return data;
    const getVal = col.sortValue ?? ((row: T) => {
      const cell = col.render(row);
      return typeof cell === "string" || typeof cell === "number" ? cell : "";
    });
    return [...data].sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      if (typeof va === "number" && typeof vb === "number") {
        return sortDir === "asc" ? va - vb : vb - va;
      }
      return sortDir === "asc"
        ? String(va).localeCompare(String(vb), "es")
        : String(vb).localeCompare(String(va), "es");
    });
  }, [data, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageData = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">{emptyMessage}</p>
    );
  }

  return (
    <div className="space-y-3">
      <TableShell maxHeight={maxHeight}>
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <Th key={col.key} className={col.className}>
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    {col.header}
                    {sortKey === col.key ? (
                      sortDir === "asc" ? (
                        <ChevronUp className="size-3.5" />
                      ) : (
                        <ChevronDown className="size-3.5" />
                      )
                    ) : (
                      <ChevronsUpDown className="size-3.5 opacity-40" />
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </Th>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pageData.map((row, i) => (
            <TableRow key={getRowKey(row, safePage * pageSize + i)}>
              {columns.map((col) => (
                <Td key={col.key} className={col.className}>
                  {col.render(row)}
                </Td>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </TableShell>
      {sorted.length > pageSize && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, sorted.length)} de{" "}
            {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage((p) => p - 1)}
              className="h-7 px-2.5 rounded border hover:bg-muted disabled:opacity-40 transition-colors"
            >
              Anterior
            </button>
            <span className="px-2 tabular-nums">
              {safePage + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="h-7 px-2.5 rounded border hover:bg-muted disabled:opacity-40 transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Chart wrapper ─── */

export function ChartContainer({
  children,
  height = 260,
  className = "",
}: {
  children: ReactNode;
  height?: number;
  className?: string;
}) {
  return (
    <div className={`w-full min-h-[200px] ${className}`} style={{ height }}>
      {children}
    </div>
  );
}
