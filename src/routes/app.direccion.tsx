import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, KPI, Card, Badge } from "@/components/ui-bits";
import { PRODUCTS } from "@/lib/mock-data";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

export const Route = createFileRoute("/app/direccion")({ component: Direccion });

const ranking = PRODUCTS.map((p, i) => ({
  name: p.name,
  impacto: 1800 - i * 220 + (i % 2 ? 100 : -60),
  riesgo: ["Alto","Medio","Bajo","Medio","Alto","Bajo"][i],
}));

const escenarios = [
  { name: "Optimista", v: 18.6 },
  { name: "Base", v: 15.2 },
  { name: "Pesimista", v: 12.1 },
];

function Direccion() {
  return (
    <div>
      <PageHeader title="Dirección" subtitle="Vista ejecutiva consolidada · Nestlé Argentina" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPI label="Forecast Total Compañía" value="$1.842 M" hint="Junio 2025" />
        <KPI label="DPA Lag-3" value="92.4%" tone="good" />
        <KPI label="Bias acumulado" value="-1.2%" />
        <KPI label="Nivel de servicio proyectado" value="96.1%" tone="good" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card title="Escenarios macro (M+3)" className="lg:col-span-1">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={escenarios}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="v" radius={[6,6,0,0]}>
                <Cell fill="#16a34a" /><Cell fill="#1f6fbf" /><Cell fill="#dc2626" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="text-xs text-muted-foreground mt-2">Valores en MM ARS · Sensibilidad inflación + FX</div>
        </Card>

        <Card title="Ranking SKUs por impacto financiero" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ranking} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="impacto" fill="#dc2626" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card title="Riesgos">
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between gap-3"><span>Nescafé Gold 200g — Stockout proyectado en Supermercados</span><Badge tone="bad">Alto</Badge></li>
            <li className="flex justify-between gap-3"><span>Milo 3kg — Volatilidad de demanda en mayoristas</span><Badge tone="warn">Medio</Badge></li>
            <li className="flex justify-between gap-3"><span>Maggi Sopa Pollo — SKU crítico sin insight cargado</span><Badge tone="warn">Medio</Badge></li>
          </ul>
        </Card>
        <Card title="Oportunidades">
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between gap-3"><span>Kit Kat 40g — Hot Sale +22% en e-commerce</span><Badge tone="good">+$36M</Badge></li>
            <li className="flex justify-between gap-3"><span>Nesquik 800g — Vuelta a clases en supermercados</span><Badge tone="good">+$24M</Badge></li>
            <li className="flex justify-between gap-3"><span>Nescafé Tradición 500g — Aumento share gold</span><Badge tone="good">+$18M</Badge></li>
          </ul>
        </Card>
      </div>

      <Card title="Productos críticos">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ranking.slice(0,3).map(r => (
            <div key={r.name} className="rounded-md border p-3">
              <div className="font-medium text-sm">{r.name}</div>
              <div className="text-xs text-muted-foreground mt-1">Riesgo: <Badge tone={r.riesgo==="Alto"?"bad":r.riesgo==="Medio"?"warn":"good"}>{r.riesgo}</Badge></div>
              <div className="text-xs text-muted-foreground mt-1">Impacto: ${r.impacto}M</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
