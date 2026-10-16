import type { ActivityUpdate, AuditLogRecord, EventHealth, EventRecord } from '../../types/index.ts';
import type { LedgerEntry } from './ledger.ts';
import type { HubFact } from './types.ts';
import { stagePlanFor, withZoneStatus } from '../../domain/stagePlan.ts';

export interface HubState {
  head: { seq: number; hash: string };
  events: ReadonlyMap<string, EventRecord>;
  entriesByEvent: ReadonlyMap<string, readonly LedgerEntry[]>;
  commands: ReadonlyMap<string, { seqs: number[]; outcome: 'ok' | 'forbidden'; eventId: string }>;
  templateUsage: ReadonlyMap<string, { count: number; lastUsedAt: string }>;
}

export function emptyState(): HubState {
  return {
    head: { seq: -1, hash: 'genesis' },
    events: new Map(),
    entriesByEvent: new Map(),
    commands: new Map(),
    templateUsage: new Map(),
  };
}

export function policyScore(event: Pick<EventRecord, 'policyChecklist'>): number {
  const items = event.policyChecklist ?? [];
  if (items.length === 0) return 100;
  const done = items.filter(item => item.completed).length;
  return Math.round((done / items.length) * 100);
}

export function healthFor(status: EventRecord['status'], score: number): EventHealth {
  if (status === 'concluido') return 'concluido';
  if (status === 'rejeitado') return 'critico';
  if (score < 50 || status === 'solicitado' || status === 'em_revisao') return 'atencao';
  return 'saudavel';
}

type Presentation = {
  changeType: AuditLogRecord['changeType'];
  fieldName: string;
  fieldKey: string;
  oldValue: string;
  newValue: string;
  summary: string;
  activity: Pick<ActivityUpdate, 'action' | 'details' | 'category'> | null;
};

export const FACT_PRESENTATION: {
  readonly [K in HubFact['kind']]: (fact: Extract<HubFact, { kind: K }>) => Presentation;
} = {
  event_imported: fact => ({
    changeType: 'importacao',
    fieldName: 'Registro importado',
    fieldKey: 'event_import',
    oldValue: '(arquivo anterior)',
    newValue: fact.record.status,
    summary: `Evento importado do arquivo anterior com status ${fact.record.status}.`,
    activity: null,
  }),
  event_created: fact => ({
    changeType: 'criacao',
    fieldName: 'Registro do evento',
    fieldKey: 'status',
    oldValue: '(inexistente)',
    newValue: 'solicitado',
    summary: `Solicitação criada para ${fact.record.designatedOwnerName}.`,
    activity: {
      action: 'Solicitação criada',
      details: `Nova solicitação enviada para ${fact.record.designatedOwnerName}.`,
      category: 'status',
    },
  }),
  review_recorded: fact => ({
    changeType: fact.decision === 'accept' ? 'aprovacao' : fact.decision === 'reject' ? 'rejeicao' : 'revisao',
    fieldName: 'Status da solicitação',
    fieldKey: 'status',
    oldValue: fact.from,
    newValue: fact.to,
    summary: fact.reason ? `${fact.from} → ${fact.to}. ${fact.reason}` : `${fact.from} → ${fact.to}.`,
    activity: {
      action: fact.decision === 'accept' ? 'Solicitação aceita' : fact.decision === 'reject' ? 'Solicitação rejeitada' : 'Ajustes solicitados',
      details: fact.reason || `Status passou de ${fact.from} para ${fact.to}.`,
      category: 'status',
    },
  }),
  review_denied: fact => ({
    changeType: 'negado',
    fieldName: 'Tentativa de revisão',
    fieldKey: 'review',
    oldValue: fact.currentStatus,
    newValue: fact.currentStatus,
    summary: `Tentativa de ${fact.decision} recusada. O responsável é ${fact.ownerEmail}.`,
    activity: null,
  }),
  task_set: fact => ({
    changeType: 'tarefa',
    fieldName: 'Tarefa',
    fieldKey: 'tasks',
    oldValue: fact.completed ? 'pendente' : 'concluída',
    newValue: fact.completed ? 'concluída' : 'pendente',
    summary: `Tarefa ${fact.taskId} marcada como ${fact.completed ? 'concluída' : 'pendente'}.`,
    activity: {
      action: 'Tarefa atualizada',
      details: `Tarefa ${fact.taskId} ${fact.completed ? 'concluída' : 'reaberta'}.`,
      category: 'tarefa',
    },
  }),
  policy_set: fact => ({
    changeType: 'compliance',
    fieldName: 'Checklist de política',
    fieldKey: 'policyChecklist',
    oldValue: fact.completed ? 'pendente' : 'conforme',
    newValue: fact.completed ? 'conforme' : 'pendente',
    summary: `Item ${fact.policyId} ${fact.completed ? 'marcado conforme' : 'reaberto'}.`,
    activity: {
      action: 'Política atualizada',
      details: `Item ${fact.policyId} ${fact.completed ? 'conforme' : 'reaberto'}.`,
      category: 'politica',
    },
  }),
  comment_added: () => ({
    changeType: 'comentario',
    fieldName: 'Comentário',
    fieldKey: 'comments',
    oldValue: '',
    newValue: 'comentário',
    summary: 'Comentário registrado.',
    activity: { action: 'Comentário', details: 'Novo comentário no evento.', category: 'comentario' },
  }),
  resource_linked: fact => ({
    changeType: 'recurso',
    fieldName: 'Recurso',
    fieldKey: 'resources',
    oldValue: '',
    newValue: fact.resource.title,
    summary: `Recurso ${fact.resource.title} vinculado.`,
    activity: { action: 'Recurso vinculado', details: fact.resource.title, category: 'status' },
  }),
  stage_zone_set: fact => ({
    changeType: 'edicao_campo',
    fieldName: 'Montagem de palco',
    fieldKey: 'stagePlan',
    oldValue: fact.zoneId,
    newValue: fact.status,
    summary: `Área ${fact.zoneId} da montagem marcada como ${fact.status}.`,
    activity: {
      action: 'Montagem atualizada',
      details: `${fact.zoneId} passou para ${fact.status}.`,
      category: 'tarefa',
    },
  }),
  legacy_audit: fact => ({
    changeType: fact.body.changeType,
    fieldName: fact.body.fieldName,
    fieldKey: fact.body.fieldKey,
    oldValue: fact.body.oldValue,
    newValue: fact.body.newValue,
    summary: fact.body.summary,
    activity: null,
  }),
};

export function toAuditLogRecord(entry: LedgerEntry): AuditLogRecord {
  const presentation = FACT_PRESENTATION[entry.fact.kind](entry.fact as never);
  const actor = entry.actor;
  const legacy = entry.fact.kind === 'legacy_audit' ? entry.fact.body : null;
  const actorName = actor.kind === 'principal' ? actor.user.name : legacy?.actorName || 'Sistema';
  const actorEmail = actor.kind === 'principal' ? actor.user.email : legacy?.actorEmail || 'sistema@revloop.local';
  const actorRole = actor.kind === 'principal' ? actor.user.role : legacy?.actorRole || 'sistema';
  return {
    id: String(entry.seq),
    eventId: entry.eventId,
    timestamp: entry.at,
    actorName,
    actorEmail,
    actorRole,
    actorAvatar: actor.kind === 'principal' ? actor.user.avatar : undefined,
    identityMode: actor.kind === 'principal' ? actor.issuedBy : 'system',
    fieldName: presentation.fieldName,
    fieldKey: presentation.fieldKey,
    oldValue: presentation.oldValue,
    newValue: presentation.newValue,
    changeType: presentation.changeType,
    changeSummary: presentation.summary,
    entryHash: entry.hash,
    prevHash: entry.prevHash,
    isSystemAudit: actor.kind === 'system',
  };
}

function withDerived(event: Omit<EventRecord, 'policyComplianceScore' | 'health'> & { health?: EventHealth; activities?: EventRecord['activities'] }): EventRecord {
  const policyComplianceScore = policyScore(event);
  return { ...event, activities: event.activities ?? [], policyComplianceScore, health: healthFor(event.status, policyComplianceScore) };
}

function pushEntry(state: HubState, entry: LedgerEntry): Map<string, readonly LedgerEntry[]> {
  const next = new Map(state.entriesByEvent);
  const prior = next.get(entry.eventId) ?? [];
  next.set(entry.eventId, [...prior, entry]);
  return next;
}

function rememberCommand(state: HubState, entry: LedgerEntry, outcome: 'ok' | 'forbidden'): Map<string, { seqs: number[]; outcome: 'ok' | 'forbidden'; eventId: string }> {
  if (!entry.commandId || entry.actor.kind !== 'principal') return new Map(state.commands);
  const key = `${entry.actor.user.email.toLowerCase()}\u0000${entry.commandId}`;
  const next = new Map(state.commands);
  const prior = next.get(key);
  next.set(key, {
    seqs: [...(prior?.seqs ?? []), entry.seq],
    outcome,
    eventId: entry.eventId,
  });
  return next;
}

export function project(state: HubState, entry: LedgerEntry): HubState {
  const events = new Map(state.events);
  const entriesByEvent = pushEntry(state, entry);
  let commands = rememberCommand(state, entry, entry.fact.kind === 'review_denied' ? 'forbidden' : 'ok');
  let templateUsage = state.templateUsage;
  const current = events.get(entry.eventId);
  const presentation = FACT_PRESENTATION[entry.fact.kind](entry.fact as never);

  const touch = (event: Omit<EventRecord, 'policyComplianceScore' | 'health'> & { health?: EventHealth }): EventRecord => {
    const activity = presentation.activity
      ? {
          id: `act-${entry.seq}`,
          timestamp: entry.at,
          actorName: entry.actor.kind === 'principal' ? entry.actor.user.name : 'Sistema',
          actorEmail: entry.actor.kind === 'principal' ? entry.actor.user.email : 'sistema@revloop.local',
          ...presentation.activity,
        }
      : null;
    return withDerived({
      ...event,
      updatedAt: entry.at,
      activities: activity ? [activity, ...(event.activities ?? [])] : event.activities ?? [],
    });
  };

  switch (entry.fact.kind) {
    case 'event_imported': {
      events.set(entry.eventId, withDerived({ ...entry.fact.record, activities: entry.fact.record.activities ?? [] }));
      break;
    }
    case 'event_created': {
      events.set(entry.eventId, touch({ ...entry.fact.record, activities: [], health: 'atencao' }));
      if (entry.fact.origin.kind === 'template') {
        const usage = new Map(templateUsage);
        const prior = usage.get(entry.fact.origin.templateId);
        usage.set(entry.fact.origin.templateId, {
          count: (prior?.count ?? 0) + 1,
          lastUsedAt: entry.at,
        });
        templateUsage = usage;
      }
      break;
    }
    case 'review_recorded': {
      if (!current) break;
      const status = entry.fact.to;
      const milestones = current.milestones.map((milestone, index) =>
        entry.fact.kind === 'review_recorded' && entry.fact.decision === 'accept' && index === 0
          ? { ...milestone, completed: true }
          : milestone
      );
      const note = entry.actor.kind === 'principal'
        ? {
            id: `c-${entry.seq}`,
            authorName: entry.actor.user.name,
            authorEmail: entry.actor.user.email,
            authorRole: entry.actor.user.role,
            authorAvatar: entry.actor.user.avatar,
            content: entry.fact.reason || presentation.summary,
            createdAt: entry.at,
            isOwnerNote: true,
          }
        : null;
      events.set(
        entry.eventId,
        touch({
          ...current,
          status,
          milestones,
          rejectionReason: entry.fact.decision === 'reject' ? entry.fact.reason : undefined,
          comments: note ? [note, ...current.comments] : current.comments,
        })
      );
      break;
    }
    case 'task_set': {
      if (!current) break;
      const fact = entry.fact;
      events.set(
        entry.eventId,
        touch({
          ...current,
          tasks: current.tasks.map(task => (task.id === fact.taskId ? { ...task, completed: fact.completed } : task)),
        })
      );
      break;
    }
    case 'policy_set': {
      if (!current) break;
      const fact = entry.fact;
      const actorName = entry.actor.kind === 'principal' ? entry.actor.user.name : 'Sistema';
      events.set(
        entry.eventId,
        touch({
          ...current,
          policyChecklist: current.policyChecklist.map(item =>
            item.id === fact.policyId
              ? {
                  ...item,
                  completed: fact.completed,
                  verifiedBy: fact.completed ? actorName : undefined,
                  verifiedAt: fact.completed ? entry.at.slice(0, 10) : undefined,
                }
              : item
          ),
        })
      );
      break;
    }
    case 'comment_added': {
      if (!current) break;
      events.set(entry.eventId, touch({ ...current, comments: [entry.fact.comment, ...current.comments] }));
      break;
    }
    case 'resource_linked': {
      if (!current) break;
      events.set(entry.eventId, touch({ ...current, resources: [...current.resources, entry.fact.resource] }));
      break;
    }
    case 'stage_zone_set': {
      if (!current) break;
      const fact = entry.fact;
      const plan = withZoneStatus(current.stagePlan?.length ? current.stagePlan : stagePlanFor(current), fact.zoneId, fact.status);
      if (!plan) break;
      events.set(entry.eventId, touch({ ...current, stagePlan: plan }));
      break;
    }
    case 'review_denied':
    case 'legacy_audit':
      break;
    default: {
      const neverFact: never = entry.fact;
      return neverFact;
    }
  }

  return {
    head: { seq: entry.seq, hash: entry.hash },
    events,
    entriesByEvent,
    commands,
    templateUsage,
  };
}

export function fold(entries: readonly LedgerEntry[]): HubState {
  return entries.reduce(project, emptyState());
}
