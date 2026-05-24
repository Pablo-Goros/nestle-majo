import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Badge, LockedNotice } from "@/components/ui-bits";
import { DEMO_USERS, ROLE_ACCESS } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/app/usuarios")({ component: Usuarios });

const SECCIONES = ["dashboard","direccion","datos","limpieza","forecast","insights","consenso","control-tower","finanzas","mbp","ai","usuarios"];

function Usuarios() {
  const { canEdit } = useAuth();
  const editable = canEdit("usuarios");

  return (
    <div>
      <PageHeader title="Usuarios & roles" subtitle="Administración y permisos por sección" />
      {!editable && <div className="mb-4"><LockedNotice feature="usuarios" /></div>}

      <Card title="Usuarios" className="mb-6">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground border-b">
            <tr>{["Usuario","Nombre","Rol","Estado","Acciones"].map(h=><th key={h} className="py-2 px-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {DEMO_USERS.map(u=>(
              <tr key={u.username} className="border-b last:border-0">
                <td className="py-2 px-2 font-mono">{u.username}</td>
                <td className="py-2 px-2 font-medium">{u.name}</td>
                <td className="py-2 px-2"><Badge tone="info">{u.roleLabel}</Badge></td>
                <td className="py-2 px-2"><Badge tone="good">Activo</Badge></td>
                <td className="py-2 px-2">
                  <button disabled={!editable} className="text-xs text-nestle-red font-medium disabled:opacity-50">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Matriz de permisos">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b">
              <tr>
                <th className="py-2 px-2 text-left font-medium">Rol \ Sección</th>
                {SECCIONES.map(s=><th key={s} className="py-2 px-2 font-medium text-center">{s}</th>)}
              </tr>
            </thead>
            <tbody>
              {Object.entries(ROLE_ACCESS).map(([role, acc]) => (
                <tr key={role} className="border-b last:border-0">
                  <td className="py-2 px-2 font-medium capitalize">{role.replace("_"," ")}</td>
                  {SECCIONES.map(s => {
                    const view = acc.canView.includes(s);
                    const edit = acc.canEdit.includes(s);
                    return (
                      <td key={s} className="py-2 px-2 text-center">
                        {edit ? <Badge tone="good">Editar</Badge> : view ? <Badge tone="info">Ver</Badge> : <Lock className="size-3 mx-auto text-muted-foreground"/>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
