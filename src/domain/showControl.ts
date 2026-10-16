import type { ControlTone, EventRecord, ShowControlBoard, ShowCue } from '../types/index.ts';
import { stagePlanFor, stageReadiness } from './stagePlan.ts';

function unit(id: string): number {
  let hash = 0;
  for (const char of id) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return hash % 100;
}

function money(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

function clock(iso: string, minutes: number): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--:--';
  date.setMinutes(date.getMinutes() + minutes);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function phase(event: EventRecord): 'fechado' | 'aberto' | 'encerrado' {
  if (event.status === 'concluido') return 'encerrado';
  if (event.status === 'aprovado' || event.status === 'em_planejamento') return 'aberto';
  return 'fechado';
}

function cues(event: EventRecord): ShowCue[] {
  const rows: { id: string; label: string; minutes: number }[] = [
    { id: 'montagem', label: 'Montagem', minutes: -360 },
    { id: 'passagem', label: 'Passagem de som', minutes: -150 },
    { id: 'portoes', label: 'Abertura de portões', minutes: -60 },
    { id: 'show', label: 'Show', minutes: 0 },
    { id: 'desmontagem', label: 'Desmontagem', minutes: 150 },
  ];
  const open = phase(event);
  return rows.map((row, index) => ({
    id: row.id,
    label: row.label,
    time: clock(event.startDate, row.minutes),
    state: open === 'encerrado' ? 'feito' : open === 'fechado' ? 'aguardando' : index < 2 ? 'feito' : index === 2 ? 'agora' : 'proximo',
  }));
}

export function boardFor(event: EventRecord): ShowControlBoard {
  const open = phase(event);
  const capacity = event.venueCapacity || event.estimatedAttendees || 100;
  const mix = unit(event.id);
  const soldRatio = open === 'fechado' ? 0 : open === 'encerrado' ? 0.72 + (mix % 20) / 100 : 0.28 + (mix % 45) / 100;
  const sold = Math.min(capacity, Math.round(capacity * soldRatio));
  const held = open === 'fechado' ? 0 : Math.max(0, Math.round(capacity * 0.04));
  const available = Math.max(0, capacity - sold - held);
  const ticket = Math.max(40, Math.round((event.budget || capacity * 80) / Math.max(capacity, 1)));
  const gross = sold * ticket;
  const settled = open === 'encerrado' ? gross : open === 'aberto' ? Math.round(gross * 0.62) : 0;
  const pending = Math.max(0, gross - settled);
  const refunds = open === 'fechado' ? 0 : Math.round(gross * 0.02);
  const audience = Math.max(capacity * 3, Math.round(capacity * (2.4 + (mix % 30) / 10)));
  const consented = Math.round(audience * (open === 'fechado' ? 0.4 : 0.86));
  const live = event.broadcastPlanned === true || event.format !== 'presencial';
  const plan = event.stagePlan?.length ? event.stagePlan : stagePlanFor(event);
  const mounting = stageReadiness(plan);
  const ticketTone: ControlTone = open === 'fechado' ? 'bloqueado' : open === 'encerrado' ? 'encerrado' : available < capacity * 0.1 ? 'andamento' : 'pronto';
  const payTone: ControlTone = open === 'fechado' ? 'bloqueado' : open === 'encerrado' ? 'pronto' : 'andamento';
  const stageTone: ControlTone = mounting.ready === mounting.total ? (open === 'encerrado' ? 'encerrado' : 'pronto') : mounting.ready === 0 ? 'bloqueado' : 'andamento';
  const crmTone: ControlTone = open === 'fechado' ? 'andamento' : 'pronto';
  const airTone: ControlTone = !live ? 'bloqueado' : open === 'encerrado' ? 'encerrado' : open === 'aberto' ? 'andamento' : 'bloqueado';
  const runTone: ControlTone = open === 'fechado' ? 'bloqueado' : open === 'encerrado' ? 'encerrado' : 'andamento';

  return {
    provenance: 'quadro_do_hub',
    attraction: event.attraction?.trim() || event.title,
    desks: [
      {
        id: 'ingressos',
        title: 'Ingressos',
        tone: ticketTone,
        headline: open === 'fechado' ? 'Lotes fechados até o aceite do responsável' : `${sold.toLocaleString('pt-BR')} vendidos de ${capacity.toLocaleString('pt-BR')}`,
        channels: [
          { id: 'casa', label: 'Capacidade da casa', value: capacity.toLocaleString('pt-BR'), detail: 'Lugares deste show' },
          { id: 'vendidos', label: 'Vendidos', value: sold.toLocaleString('pt-BR'), detail: 'Online e bilheteria' },
          { id: 'reservados', label: 'Reservados', value: held.toLocaleString('pt-BR'), detail: 'Cortesias e produção' },
          { id: 'livres', label: 'Livres', value: available.toLocaleString('pt-BR'), detail: 'Ainda à venda' },
        ],
      },
      {
        id: 'pagamentos',
        title: 'Pagamentos',
        tone: payTone,
        headline: open === 'fechado' ? 'Caixa abre com o aceite' : `${money(settled)} liquidado`,
        channels: [
          { id: 'bruto', label: 'Bruto', value: money(gross), detail: `${money(ticket)} o ingresso` },
          { id: 'liquidado', label: 'Liquidado', value: money(settled), detail: 'Já compensado' },
          { id: 'pendente', label: 'A compensar', value: money(pending), detail: 'Cartão e pix em trânsito' },
          { id: 'estorno', label: 'Estornos', value: money(refunds), detail: 'Devoluções do lote' },
        ],
      },
      {
        id: 'palco',
        title: 'Mapa de palco',
        tone: stageTone,
        headline: `${mounting.ready} de ${mounting.total} áreas da montagem prontas`,
        channels: plan.slice(0, 4).map(zone => ({
          id: zone.id,
          label: zone.label,
          value: zone.status === 'pronto' ? 'Pronto' : zone.status === 'em_montagem' ? 'Em montagem' : zone.status === 'bloqueado' ? 'Bloqueado' : 'Pendente',
          detail: zone.detail,
        })),
      },
      {
        id: 'crm',
        title: 'CRM de público',
        tone: crmTone,
        headline: `${consented.toLocaleString('pt-BR')} contatos com consentimento`,
        channels: [
          { id: 'base', label: 'Base da casa', value: audience.toLocaleString('pt-BR'), detail: 'Público endereçável' },
          { id: 'segmento', label: 'Segmento', value: event.targetAudience || 'Público do show', detail: 'Lista deste evento' },
          { id: 'consentimento', label: 'Consentimento', value: `${Math.round((consented / audience) * 100)}%`, detail: 'Base legal para aviso' },
          { id: 'presenca', label: 'Presença prevista', value: (event.estimatedAttendees || sold).toLocaleString('pt-BR'), detail: 'Cabeça no portão' },
        ],
      },
      {
        id: 'transmissao',
        title: 'Transmissão ao vivo',
        tone: airTone,
        headline: !live ? 'Sem sinal previsto' : open === 'aberto' ? 'Encoder em standby' : open === 'encerrado' ? 'Gravação disponível' : 'Sinal bloqueado até o aceite',
        channels: [
          { id: 'encoder', label: 'Encoder', value: live && open === 'aberto' ? 'Standby' : live && open === 'encerrado' ? 'Arquivado' : 'Fora', detail: 'Controle da mesa de transmissão' },
          { id: 'destinos', label: 'Destinos', value: live ? 'Casa, YouTube e redes' : 'Somente casa', detail: 'Saídas de mídia' },
          { id: 'retorno', label: 'Retorno', value: live ? 'Programado' : 'Local', detail: 'Monitor da direção' },
          { id: 'gravacao', label: 'Gravação', value: open === 'encerrado' ? 'Pronta' : 'Agendada', detail: 'Arquivo da noite' },
        ],
      },
      {
        id: 'controle',
        title: 'Controle do evento',
        tone: runTone,
        headline: open === 'encerrado' ? 'Noite encerrada' : open === 'aberto' ? 'Ordem do show em curso' : 'Ordem do show travada no aceite',
        channels: cues(event).map(cue => ({
          id: cue.id,
          label: cue.label,
          value: cue.time,
          detail: cue.state === 'feito' ? 'Cumprido' : cue.state === 'agora' ? 'Agora' : cue.state === 'proximo' ? 'Próximo' : 'Aguardando aceite',
        })),
      },
    ],
    cues: cues(event),
  };
}
