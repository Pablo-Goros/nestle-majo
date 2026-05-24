import * as XLSX from "xlsx";
import { REQUIRED_COLUMNS } from "./types";

export function downloadOrdersTemplate(): void {
  const headers = [...REQUIRED_COLUMNS];
  const sample = [
    {
      fecha_emision: "2025-05-10",
      tipo_canal: "Supermercados",
      nombre_canal: "Coto",
      locacion: "CABA",
      producto_nombre: "Milo 3kg",
      producto_codigo: "MIL3K",
      cantidad: 500,
      fecha_entrega: "2025-05-20",
      estado: "Entregado",
    },
    {
      fecha_emision: "2025-05-12",
      tipo_canal: "E-commerce",
      nombre_canal: "Mercado Libre",
      locacion: "CABA",
      producto_nombre: "Kit Kat 40g",
      producto_codigo: "KK40",
      cantidad: 200,
      fecha_entrega: "2025-05-25",
      estado: "Pendiente",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sample, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pedidos");
  XLSX.writeFile(wb, "plantilla_pedidos_nestle.xlsx");
}
