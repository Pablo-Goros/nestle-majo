import type { MbpFilters, MbpTask } from "./types";

export function filterTasks(tasks: MbpTask[], filters: MbpFilters): MbpTask[] {
  return tasks.filter((t) => {
    if (filters.week !== "all" && t.week !== filters.week) return false;
    if (filters.area !== "all" && t.area !== filters.area) return false;
    if (filters.status === "atrasadas") {
      return t.status === "atrasada";
    }
    if (filters.status !== "all" && t.status !== filters.status) return false;
    return true;
  });
}
