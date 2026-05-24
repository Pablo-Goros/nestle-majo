import type { MbpTask, MbpTaskStatus } from "./types";

export function isOverdue(task: MbpTask, today = new Date()): boolean {
  if (task.status === "completada") return false;
  const due = new Date(task.dueDate);
  due.setHours(23, 59, 59, 999);
  return due < today;
}

export function resolveTaskStatus(task: MbpTask): MbpTaskStatus {
  if (task.status === "completada") return "completada";
  if (isOverdue(task)) return "atrasada";
  return task.status;
}

export function withResolvedStatuses(tasks: MbpTask[]): MbpTask[] {
  return tasks.map((t) => ({ ...t, status: resolveTaskStatus(t) }));
}

export function statusTone(
  status: MbpTaskStatus,
): "default" | "good" | "warn" | "bad" | "info" {
  if (status === "completada") return "good";
  if (status === "atrasada") return "bad";
  if (status === "en_progreso") return "info";
  return "warn";
}

export function statusLabel(status: MbpTaskStatus): string {
  const labels: Record<MbpTaskStatus, string> = {
    pendiente: "Pendiente",
    en_progreso: "En progreso",
    completada: "Completada",
    atrasada: "Atrasada",
  };
  return labels[status];
}

export function priorityTone(
  priority: MbpTask["priority"],
): "default" | "good" | "warn" | "bad" | "info" {
  if (priority === "alta") return "bad";
  if (priority === "media") return "warn";
  return "default";
}
