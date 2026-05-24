import { MOCK_ORDERS } from "@/lib/mock-data";
import type { OrderRecord, OrderStatus } from "./types";

export function ordersFromMock(): OrderRecord[] {
  return MOCK_ORDERS.map((o) => ({
    id: o.id,
    fecha_emision: o.fecha_emision,
    tipo_canal: o.tipo_canal,
    nombre_canal: o.nombre_canal,
    locacion: o.locacion,
    producto_nombre: o.producto_nombre,
    producto_codigo: o.producto_codigo,
    cantidad: o.cantidad,
    fecha_entrega: o.fecha_entrega,
    estado: o.estado as OrderStatus,
  }));
}
