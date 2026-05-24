import { parse, isValid } from "date-fns";
import { STATUS_TO_INTERNAL, VALID_CHANNELS, VALID_STATUSES } from "./constants";
import type { OrderStatus } from "./types";

function normKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_-]+/g, "_");
}

export function normalizeHeader(header: string): string {
  return normKey(header);
}

export function parseFlexibleDate(raw: string): Date | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const formats = ["yyyy-MM-dd", "dd/MM/yyyy", "dd-MM-yyyy", "yyyy/MM/dd"];
  for (const f of formats) {
    const d = parse(s, f, new Date());
    if (isValid(d)) return d;
  }
  const iso = new Date(s);
  return isValid(iso) ? iso : null;
}

export function formatDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function normalizeStatus(raw: string): OrderStatus | null {
  const key = normKey(raw);
  const mapped = STATUS_TO_INTERNAL[key];
  if (mapped) return mapped as OrderStatus;
  return null;
}

export function normalizeChannel(raw: string): string | null {
  const key = normKey(raw).replace(/_/g, " ");
  const found = VALID_CHANNELS.find(
    (c) => normKey(c) === normKey(raw) || c.toLowerCase() === raw.trim().toLowerCase(),
  );
  if (found) return found;
  const partial = VALID_CHANNELS.find((c) =>
    key.includes(normKey(c).replace(/_/g, " ")),
  );
  return partial ?? null;
}

export function isValidStatusLabel(raw: string): boolean {
  return VALID_STATUSES.some((s) => normKey(s) === normKey(raw));
}

export function parseQuantity(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const s = String(raw ?? "")
    .trim()
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function getIsoWeekKey(d: Date): string {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day + 3);
  const week1 = new Date(date.getFullYear(), 0, 4);
  const week =
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    );
  return `${date.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function monthLabel(d: Date): string {
  const labels = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  return labels[d.getMonth()] ?? "Ene";
}
