import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useProduct } from "@/lib/product-context";
import { PRODUCTS } from "@/lib/mock-data";
import {
  LayoutDashboard, Crown, Database, Sparkles, LineChart, Lightbulb,
  Handshake, ShieldAlert, DollarSign, CalendarDays, Bot, Users, Lock,
  LogOut, Brush, Bell,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { evaluateAlerts, filterAlerts } from "@/lib/alerts";
import { Badge } from "@/components/ui-bits";

const NAV = [
  { key: "dashboard", to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { key: "direccion", to: "/app/direccion", label: "Dirección", icon: Crown },
  { key: "datos", to: "/app/datos", label: "Datos", icon: Database },
  { key: "limpieza", to: "/app/limpieza", label: "Limpieza", icon: Brush },
  { key: "forecast", to: "/app/forecast", label: "Forecast", icon: LineChart },
  { key: "insights", to: "/app/insights", label: "Insights", icon: Lightbulb },
  { key: "consenso", to: "/app/consenso", label: "Consenso", icon: Handshake },
  { key: "control-tower", to: "/app/control-tower", label: "Alertas", icon: ShieldAlert },
  { key: "finanzas", to: "/app/finanzas", label: "Finanzas", icon: DollarSign },
  { key: "mbp", to: "/app/mbp", label: "MBP", icon: CalendarDays },
  { key: "ai", to: "/app/ai", label: "AI Assistant", icon: Bot },
  { key: "usuarios", to: "/app/usuarios", label: "Usuarios", icon: Users },
];

export default function AppLayout() {
  const { user, logout, canView } = useAuth();
  const { productCode, setProductCode } = useProduct();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const activeAlertCount = useMemo(() => {
    const { alerts } = evaluateAlerts();
    return filterAlerts(alerts, { skuCode: productCode }).length;
  }, [productCode]);

  useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="w-60 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-md bg-nestle-red grid place-items-center text-white font-bold shadow-sm">
              N
            </div>
            <div>
              <div className="font-semibold text-white text-sm leading-tight">Nestlé</div>
              <div className="text-[11px] text-sidebar-foreground/70 leading-tight">
                Demand Planning
              </div>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {NAV.map((item) => {
            const allowed = canView(item.key);
            const active = item.exact ? path === item.to : path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                to={item.to}
                className={`nav-item ${active ? "nav-item-active" : "nav-item-inactive"} ${
                  !allowed ? "opacity-50 pointer-events-none" : ""
                }`}
                onClick={(e) => {
                  if (!allowed) e.preventDefault();
                }}
              >
                <Icon className="size-4 shrink-0 opacity-90" strokeWidth={active ? 2.25 : 2} />
                <span className="flex-1 truncate">{item.label}</span>
                {item.key === "control-tower" && activeAlertCount > 0 && (
                  <span
                    className={`min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-semibold grid place-items-center ${
                      active ? "bg-white text-nestle-red" : "bg-nestle-red text-white"
                    }`}
                  >
                    {activeAlertCount > 99 ? "99+" : activeAlertCount}
                  </span>
                )}
                {!allowed && <Lock className="size-3 opacity-60 shrink-0" />}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border text-[11px] text-sidebar-foreground/60">
          v1.0 · Nestlé Argentina
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-card/95 backdrop-blur-sm flex items-center px-4 gap-3 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:inline">
              SKU
            </span>
            <select
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              className="topbar-select"
              aria-label="Seleccionar producto"
            >
              {PRODUCTS.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <Link
            to="/app/control-tower"
            className="flex items-center gap-2 h-9 px-3 rounded-md border hover:bg-muted/60 transition-colors ml-2"
          >
            <Bell className="size-4 text-muted-foreground" />
            <span className="text-sm hidden sm:inline">Alertas</span>
            {activeAlertCount > 0 ? (
              <Badge tone="bad">{activeAlertCount}</Badge>
            ) : (
              <Badge tone="good">0</Badge>
            )}
          </Link>

          <div className="ml-auto flex items-center gap-3 pl-2 border-l border-border">
            <div className="text-right hidden md:block min-w-0">
              <div className="text-sm font-medium leading-tight truncate">{user.name}</div>
              <div className="text-xs text-muted-foreground leading-tight">{user.roleLabel}</div>
            </div>
            <div
              className="size-9 rounded-full bg-nestle-blue text-white grid place-items-center text-sm font-semibold ring-2 ring-background shadow-sm shrink-0"
              title={user.name}
            >
              {user.name
                .split(" ")
                .map((s) => s[0])
                .slice(0, 2)
                .join("")}
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate({ to: "/login" });
              }}
              className="size-9 rounded-md hover:bg-muted grid place-items-center text-muted-foreground transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
