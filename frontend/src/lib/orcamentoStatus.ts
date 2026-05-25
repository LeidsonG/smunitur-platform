/**
 * Fonte única para os status de orçamento.
 *
 * Mantém em um único lugar a ordem, label legível em pt-BR e cor associada
 * a cada status — evita a duplicação que existia entre as páginas
 * dashboard, orcamentos e producao do admin.
 *
 * Se você adicionar um novo status no enum `StatusOrcamento` do Prisma
 * (backend/prisma/schema.prisma), inclua-o aqui também.
 */

export type StatusOrcamento =
  | 'recebido'
  | 'em_analise'
  | 'aguardando_aprovacao'
  | 'em_producao'
  | 'finalizado'
  | 'enviado'
  | 'cancelado';

export interface StatusInfo {
  value: StatusOrcamento;
  label: string;
  cor: string;
}

export const STATUS_LIST: StatusInfo[] = [
  { value: 'recebido',             label: 'Recebido',         cor: '#6B7280' },
  { value: 'em_analise',           label: 'Em Análise',       cor: '#F59E0B' },
  { value: 'aguardando_aprovacao', label: 'Ag. Aprovação',    cor: '#8B5CF6' },
  { value: 'em_producao',          label: 'Em Produção',      cor: '#005ED5' },
  { value: 'finalizado',           label: 'Finalizado',       cor: '#10B981' },
  { value: 'enviado',              label: 'Enviado',          cor: '#FF9400' },
  { value: 'cancelado',            label: 'Cancelado',        cor: '#EF4444' },
];

/** Mapa rápido status → label para renderização em listas. */
export const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_LIST.map(s => [s.value, s.label])
);

/** Mapa rápido status → cor (hex) para badges, headers e gráficos. */
export const STATUS_COLOR: Record<string, string> = Object.fromEntries(
  STATUS_LIST.map(s => [s.value, s.cor])
);

/** Helper tolerante: status desconhecido cai em cinza neutro. */
export function statusInfo(value: string): StatusInfo {
  return (
    STATUS_LIST.find(s => s.value === value) ??
    { value: value as StatusOrcamento, label: value, cor: '#9CA3AF' }
  );
}
