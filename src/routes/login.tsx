import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { DEMO_USERS } from "@/lib/mock-data";
import { FormField, FormInput } from "@/components/ui-bits";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = login(u, p);
    if (!r.ok) setErr(r.error ?? "Error");
    else nav({ to: "/app" });
  };

  const quick = (un: string, pw: string) => { setU(un); setP(pw); setErr(""); };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-md bg-nestle-red grid place-items-center text-white font-bold text-lg">N</div>
          <div>
            <div className="font-semibold text-white">Nestlé</div>
            <div className="text-xs text-sidebar-foreground/70">Demand Planning Platform</div>
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-semibold text-white leading-tight">Planificación de demanda<br/>colaborativa y consensuada.</h1>
          <p className="mt-4 text-sidebar-foreground/80 max-w-md">Forecast estadístico, insights de áreas, control tower y consenso S&OP en una sola plataforma.</p>
          <div className="grid grid-cols-3 gap-3 mt-8 max-w-md">
            {[["DPA Lag-3","92.4%"],["MAPE","8.6%"],["FVA","+4.1%"]].map(([k,v])=>(
              <div key={k} className="rounded-md bg-sidebar-accent p-3">
                <div className="text-[11px] text-sidebar-foreground/70 uppercase">{k}</div>
                <div className="text-white font-semibold mt-1">{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-sidebar-foreground/60">© 2025 Nestlé Argentina · Supply Chain</div>
      </div>

      <div className="flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-semibold">Iniciar sesión</h2>
          <p className="text-sm text-muted-foreground mt-1">Accedé con tus credenciales corporativas</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <FormField label="Usuario" required>
              <FormInput value={u} onChange={(e) => setU(e.target.value)} placeholder="jgarcia" autoComplete="username" />
            </FormField>
            <FormField label="Contraseña" required>
              <FormInput type="password" value={p} onChange={(e) => setP(e.target.value)} placeholder="••••••" error={!!err} autoComplete="current-password" />
            </FormField>
            {err && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-md" role="alert">
                {err}
              </div>
            )}
            <button type="submit" className="w-full h-10 rounded-md bg-nestle-red text-white font-medium text-sm hover:opacity-90 transition-opacity">
              Ingresar
            </button>
          </form>

          <div className="mt-8">
            <div className="text-xs text-muted-foreground uppercase mb-2">Usuarios demo</div>
            <div className="space-y-1.5">
              {DEMO_USERS.map(d => (
                <button key={d.username} onClick={() => quick(d.username, d.password)} className="w-full flex items-center justify-between text-left px-3 py-2 rounded-md border hover:bg-accent text-sm">
                  <div>
                    <div className="font-medium">{d.name} <span className="text-xs text-muted-foreground">· {d.roleLabel}</span></div>
                    <div className="text-xs text-muted-foreground font-mono">{d.username} / {d.password}</div>
                  </div>
                  <span className="text-xs text-nestle-red">Usar →</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
