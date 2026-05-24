import { CHANNELS } from "@/lib/mock-data";

export const VALID_CHANNELS = CHANNELS.map((c) => c.name);

export const VALID_STATUSES = [
  "Pendiente",
  "Entregado",
  "Postergado",
  "Cancelado",
] as const;

export const STATUS_TO_INTERNAL: Record<string, string> = {
  pendiente: "pendiente",
  entregado: "entregado",
  postergado: "postergado",
  cancelado: "cancelado",
};

export const COLUMN_ALIASES: Record<string, string[]> = {
  fecha_emision: ["fecha_emision", "fecha emision", "fecha_emisión", "emision", "fecha"],
  tipo_canal: ["tipo_canal", "tipo canal", "canal", "canal_tipo"],
  nombre_canal: ["nombre_canal", "nombre canal", "cliente", "cliente_nombre", "nombre_cliente"],
  locacion: ["locacion", "locación", "ubicacion", "ubicación", "location"],
  producto_nombre: ["producto_nombre", "producto", "nombre_producto", "sku_nombre"],
  producto_codigo: ["producto_codigo", "codigo", "código", "sku", "sku_code"],
  cantidad: ["cantidad", "qty", "unidades", "volume"],
  fecha_entrega: ["fecha_entrega", "fecha entrega", "entrega", "delivery_date"],
  estado: ["estado", "status", "estado_pedido"],
};
