import { MBP_TASKS } from "@/lib/mock-data";
import type {
  MbpMeeting,
  MbpPersistedState,
  MbpTask,
  MbpWeekDefinition,
  MbpWeekNumber,
} from "./types";

export const MBP_WEEKS: MbpWeekDefinition[] = [
  {
    week: 1,
    title: "Limpieza y baseline",
    summary:
      "Limpieza histórica, revisión de outliers y generación de baseline.",
  },
  {
    week: 2,
    title: "Inputs de áreas",
    summary: "Carga de inputs de Marketing, Ventas y Finanzas.",
  },
  {
    week: 3,
    title: "Consenso",
    summary: "Consenso, revisión de alertas y aprobación de forecast.",
  },
  {
    week: 4,
    title: "Publicación",
    summary: "Publicación, revisión ejecutiva y seguimiento de KPIs.",
  },
];

function dueDateForWeek(week: MbpWeekNumber, cycleMonth: string): string {
  const day = { 1: 7, 2: 14, 3: 21, 4: 28 }[week];
  return `${cycleMonth}-${String(day).padStart(2, "0")}`;
}

function uid(): string {
  return `mbp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function mapOwner(resp: string): MbpTask["owner"] {
  const owners: MbpTask["owner"][] = [
    "Demand Planner",
    "Marketing",
    "Ventas",
    "Finanzas",
    "Dirección",
  ];
  return owners.find((o) => resp.includes(o.split(" ")[0]!)) ?? "Demand Planner";
}

export function seedTasksFromMock(cycleMonth = "2025-06"): MbpTask[] {
  const tasks: MbpTask[] = [];

  for (const block of MBP_TASKS) {
    block.tareas.forEach((t, i) => {
      const owner = mapOwner(t.resp);
      tasks.push({
        id: `seed-${block.semana}-${i}`,
        week: block.semana as MbpWeekNumber,
        title: t.t,
        description: `Tarea del ciclo MBP · ${block.titulo}`,
        owner,
        area: owner,
        dueDate: dueDateForWeek(block.semana as MbpWeekNumber, cycleMonth),
        status: t.done ? "completada" : "pendiente",
        priority: block.semana === 3 ? "alta" : "media",
      });
    });
  }

  return tasks;
}

export function seedMeetings(cycleMonth = "2025-06"): MbpMeeting[] {
  return [
    {
      id: uid(),
      type: "demanda_base",
      title: "Revisión de demanda base",
      date: `${cycleMonth}-03`,
      time: "10:00",
      participants: "Demand Planner, Data",
      objective: "Validar baseline y outliers depurados",
      status: "programada",
    },
    {
      id: uid(),
      type: "comercial",
      title: "Revisión comercial",
      date: `${cycleMonth}-11`,
      time: "14:00",
      participants: "Marketing, Ventas, Demand Planner",
      objective: "Alinear insights comerciales y sell-in",
      status: "programada",
    },
    {
      id: uid(),
      type: "financiera",
      title: "Revisión financiera",
      date: `${cycleMonth}-12`,
      time: "11:00",
      participants: "Finanzas, Demand Planner",
      objective: "Revisar precio, costo y escenarios",
      status: "programada",
    },
    {
      id: uid(),
      type: "consenso",
      title: "Reunión de consenso",
      date: `${cycleMonth}-18`,
      time: "11:00",
      participants: "DP, Marketing, Ventas, Finanzas",
      objective: "Cerrar forecast consenso S&OP",
      status: "programada",
    },
    {
      id: uid(),
      type: "publicacion",
      title: "Publicación del forecast",
      date: `${cycleMonth}-25`,
      time: "09:00",
      participants: "Demand Planner, IT",
      objective: "Publicar versión aprobada a ERP/SAP",
      status: "programada",
    },
    {
      id: uid(),
      type: "ejecutivo",
      title: "Comité ejecutivo",
      date: `${cycleMonth}-27`,
      time: "09:00",
      participants: "Dirección, Demand Planner",
      objective: "Revisión ejecutiva y cierre MBP",
      status: "programada",
    },
  ];
}

export function createDefaultMbpState(cycleMonth = "2025-06"): MbpPersistedState {
  return {
    version: 1,
    cycleMonth,
    tasks: seedTasksFromMock(cycleMonth),
    meetings: seedMeetings(cycleMonth),
    updatedAt: new Date().toISOString(),
  };
}
