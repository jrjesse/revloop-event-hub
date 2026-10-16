import type { EventRecord, StageZone, StageZoneStatus } from '../types/index.ts';

const LAYOUT: Omit<StageZone, 'status'>[] = [
  { id: 'carga', label: 'Carga', detail: 'Doca e entrada de equipamento', x: 6, y: 6, w: 18, h: 14 },
  { id: 'camarim', label: 'Camarim', detail: 'Chegada da atração', x: 76, y: 6, w: 18, h: 14 },
  { id: 'luz', label: 'Luz', detail: 'Ribalta, varas e mesa de luz', x: 28, y: 6, w: 44, h: 12 },
  { id: 'pa-l', label: 'PA esquerda', detail: 'Torre e sub da esquerda', x: 6, y: 24, w: 18, h: 24 },
  { id: 'palco', label: 'Palco', detail: 'Praticável, fundo e asas', x: 28, y: 22, w: 44, h: 28 },
  { id: 'pa-r', label: 'PA direita', detail: 'Torre e sub da direita', x: 76, y: 24, w: 18, h: 24 },
  { id: 'retorno', label: 'Retorno', detail: 'Monitores da atração', x: 28, y: 52, w: 44, h: 10 },
  { id: 'plateia', label: 'Plateia', detail: 'Setores e circulação', x: 16, y: 66, w: 68, h: 16 },
  { id: 'foh', label: 'FOH', detail: 'Frente de casa, som e luz', x: 36, y: 84, w: 28, h: 12 },
];

const BROADCAST: Omit<StageZone, 'status'> = {
  id: 'transmissao',
  label: 'Transmissão',
  detail: 'Mesa de mídia e encoder',
  x: 6,
  y: 84,
  w: 26,
  h: 12,
};

export const STAGE_ZONE_ORDER: StageZoneStatus[] = ['pendente', 'em_montagem', 'pronto', 'bloqueado'];

export function nextStageStatus(status: StageZoneStatus): StageZoneStatus {
  const index = STAGE_ZONE_ORDER.indexOf(status);
  return STAGE_ZONE_ORDER[(index + 1) % STAGE_ZONE_ORDER.length];
}

export function stagePlanFor(event: Pick<EventRecord, 'status' | 'broadcastPlanned' | 'format'>): StageZone[] {
  const done = event.status === 'concluido';
  const live = event.broadcastPlanned === true || event.format !== 'presencial';
  const zones = live ? [...LAYOUT, BROADCAST] : LAYOUT;
  return zones.map(zone => ({ ...zone, status: done ? 'pronto' : 'pendente' }));
}

export function withZoneStatus(plan: readonly StageZone[], zoneId: string, status: StageZoneStatus): StageZone[] | null {
  if (!plan.some(zone => zone.id === zoneId)) return null;
  return plan.map(zone => (zone.id === zoneId ? { ...zone, status } : zone));
}

export function stageReadiness(plan: readonly StageZone[]): { ready: number; total: number } {
  return { ready: plan.filter(zone => zone.status === 'pronto').length, total: plan.length };
}
