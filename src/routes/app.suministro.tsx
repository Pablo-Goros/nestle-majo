import { createFileRoute } from "@tanstack/react-router";
import {
  PageHeader,
  Card,
  KPI,
  Badge,
  DataTable,
  type DataTableColumn,
} from "@/components/ui-bits";
import { CLEANING_CHANGED_EVENT } from "@/lib/cleaning";
import { DATA_CHANGED_EVENT } from "@/lib/data";
import { INSIGHTS_CHANGED_EVENT } from "@/lib/insights/store";
import { useProduct } from "@/lib/product-context";
import {
  buildSupplyData,
  type SupplyInputAvailability,
  type SupplyRiskStatus,
  type SupplySkuData,
} from "@/lib/supply";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/app/suministro")({ component: Suministro });

function formatUnits(n: number): string {
  return `${n.toLocaleString("es-AR")} u`;
}

function riskTone(status: SupplyRiskStatus): "good" | "warn" | "bad" {
  if (status === "Riesgo alto") return "bad";
  if (status === "Riesgo medio") return "warn";
  return "good";
}

function inputTone(level: SupplyInputAvailability): "good" | "warn" | "bad" {
  if (level === "Bajo") return "bad";
  if (level === "Suficiente") return "warn";
  return "good";
}

const columns: DataTableColumn<SupplySkuData>[] = [
  {
    key: "skuName",
    header: "SKU",
    render: (r) => <span className="font-medium">{r.skuName}</span>,
  },
  { key: "salesChannel", header: "Canal de venta", render: (r) => r.salesChannel },
  {
    key: "consensusForecast",
    header: "Forecast consenso",
    sortable: true,
    sortValue: (r) => r.consensusForecast,
    render: (r) => formatUnits(r.consensusForecast),
  },
  {
    key: "availableStock",
    header: "Stock disponible",
    sortable: true,
    sortValue: (r) => r.availableStock,
    render: (r) => formatUnits(r.availableStock),
  },
  {
    key: "productionCapacity",
    header: "Capacidad de producción",
    sortable: true,
    sortValue: (r) => r.productionCapacity,
    render: (r) => formatUnits(r.productionCapacity),
  },
  {
    key: "inputsAvailability",
    header: "Insumos disponibles",
    render: (r) => <Badge tone={inputTone(r.inputsAvailability)}>{r.inputsAvailability}</Badge>,
  },
  {
    key: "riskStatus",
    header: "Estado",
    render: (r) => <Badge tone={riskTone(r.riskStatus)}>{r.riskStatus}</Badge>,
  },
  { key: "suggestedAction", header: "Acción sugerida", render: (r) => r.suggestedAction },
];

function Suministro() {
  const { product } = useProduct();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const refresh = () => setTick((n) => n + 1);
    window.addEventListener(INSIGHTS_CHANGED_EVENT, refresh);
    window.addEventListener(DATA_CHANGED_EVENT, refresh);
    window.addEventListener(CLEANING_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener(INSIGHTS_CHANGED_EVENT, refresh);
      window.removeEventListener(DATA_CHANGED_EVENT, refresh);
      window.removeEventListener(CLEANING_CHANGED_EVENT, refresh);
    };
  }, []);

  const supply = useMemo(() => {
    void tick;
    return buildSupplyData(product.code);
  }, [product.code, tick]);

  if (!supply) {
    return (
      <div>
        <PageHeader
          title="Suministro"
          subtitle="Sin datos de suministro para el SKU seleccionado"
        />
        <Card>
          <p className="text-sm text-muted-foreground">No hay datos disponibles.</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Suministro"
        subtitle={`Producto: ${product.name} · Planta ${supply.plant}`}
        actions={<Badge tone={riskTone(supply.riskStatus)}>{supply.riskStatus}</Badge>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 mb-6">
        <KPI
          label="Capacidad productiva disponible"
          value={formatUnits(supply.productionCapacity)}
          hint={
            supply.canProduceForecast
              ? "La planta puede cubrir el forecast consenso"
              : "La planta no cubre el forecast consenso"
          }
          tone={supply.canProduceForecast ? "good" : "bad"}
        />
        <KPI
          label="Stock disponible"
          value={formatUnits(supply.availableStock)}
          hint="Stock en centro de distribución"
          tone={supply.availableStock >= supply.consensusForecast * 0.25 ? "good" : "warn"}
        />
        <KPI
          label="Disponibilidad de materias primas"
          value={supply.inputsAvailability}
          hint="Insumos disponibles en planta"
          tone={inputTone(supply.inputsAvailability)}
        />
        <KPI
          label="Lead time de importación"
          value={
            supply.importLeadTimeDays > 0 ? `${supply.importLeadTimeDays} días` : "No requiere"
          }
          hint="Tiempo estimado si se requiere importar"
          tone={supply.importLeadTimeDays > 30 ? "warn" : "good"}
        />
        <KPI
          label="Capacidad de transporte"
          value={`${supply.truckCapacity} camiones`}
          hint={`Requeridos: ${supply.requiredTrucks}`}
          tone={supply.truckCapacity >= supply.requiredTrucks ? "good" : "warn"}
        />
        <KPI
          label="Riesgo de quiebre"
          value={`${supply.stockoutRiskPct}%`}
          hint={supply.riskStatus}
          tone={riskTone(supply.riskStatus)}
        />
      </div>

      <Card title="SKU seleccionado">
        <DataTable
          columns={columns}
          data={[supply]}
          getRowKey={(row) => row.skuCode}
          pageSize={1}
          maxHeight="18rem"
        />
      </Card>
    </div>
  );
}
