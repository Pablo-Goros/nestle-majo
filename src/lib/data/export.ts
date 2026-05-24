import Papa from "papaparse";
import type { OrderRecord } from "./types";

export function exportOrdersCsv(orders: OrderRecord[], filename: string): void {
  const csv = Papa.unparse(
    orders.map((o) => ({
      fecha_emision: o.fecha_emision,
      tipo_canal: o.tipo_canal,
      nombre_canal: o.nombre_canal,
      locacion: o.locacion,
      producto_nombre: o.producto_nombre,
      producto_codigo: o.producto_codigo,
      cantidad: o.cantidad,
      fecha_entrega: o.fecha_entrega,
      estado: o.estado,
    })),
  );
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
