export type InsightArea = "Marketing" | "Ventas" | "Finanzas";

export type ImpactType = "porcentaje" | "unidades";

export type EventType = "estructural" | "coyuntural";

export type ApprovalStatus = "pendiente" | "aprobado" | "rechazado";

export interface CollaborativeInsight {
  id: string;
  area: InsightArea;
  responsable: string;
  sku: string;
  skuCode: string;
  channel: string;
  cliente: string;
  fecha_inicio: string;
  fecha_fin: string;
  impacto_tipo: ImpactType;
  impacto_valor: number;
  justificacion: string;
  evento: string;
  tipo_evento: EventType;
  estado_aprobacion: ApprovalStatus;
  createdAt: string;
  updatedAt: string;
}

export type AuditAction =
  | "creacion"
  | "edicion"
  | "aprobacion"
  | "rechazo"
  | "eliminacion"
  | "publicacion";

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: AuditAction;
  description: string;
  skuCode?: string;
  insightId?: string;
}

export type ForecastVersionStatus = "borrador" | "publicado" | "archivado";

export interface PublishedForecastVersion {
  id: string;
  version: string;
  fecha: string;
  usuario: string;
  sku: string;
  skuCode: string;
  canal: string;
  baseline: number;
  ajustesMarketing: number;
  ajustesVentas: number;
  ajustesFinanzas: number;
  forecastFinal: number;
  modeloUsado: string;
  estado: ForecastVersionStatus;
  publishedAt: string;
  publishedBy: string;
}

export interface ConsensusPublishState {
  skuCode: string;
  published: boolean;
  publishedAt?: string;
  publishedBy?: string;
  version: string;
  status?: ForecastVersionStatus;
  locked?: boolean;
  latestVersionId?: string;
}

export interface PublishForecastInput {
  skuCode: string;
  skuName: string;
  canal: string;
  usuario: string;
  baseline: number;
  ajustesMarketing: number;
  ajustesVentas: number;
  ajustesFinanzas: number;
  forecastFinal: number;
  modeloUsado: string;
  override?: boolean;
}

export interface ConsensusBreakdown {
  baseline: number;
  marketing: number;
  ventas: number;
  finanzas: number;
  final: number;
  diffVsBaseline: number;
  diffPct: number;
  approved: CollaborativeInsight[];
  pending: CollaborativeInsight[];
}

export type InsightFormInput = Omit<
  CollaborativeInsight,
  "id" | "createdAt" | "updatedAt" | "estado_aprobacion"
>;
