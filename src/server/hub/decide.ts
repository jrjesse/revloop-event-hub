import type { EventTask, Milestone, PolicyCheckItem, WorkspaceUser } from '../../types/index.ts';
import type { HubState } from './project.ts';
import {
  REVIEW_TRANSITIONS,
  REVIEWABLE,
  type Command,
  type CreateOrigin,
  type CreatedEventRecord,
  type EventDraft,
  type HubFact,
} from './types.ts';
import type { Principal } from '../identity.ts';
import type { WorkspaceDirectory } from '../identity.ts';
import type { EventTemplate } from '../../types/index.ts';
import { stagePlanFor, withZoneStatus } from '../../domain/stagePlan.ts';

export type FactDraft = { eventId: string; fact: HubFact };

export type Decision =
  | { kind: 'accepted'; facts: FactDraft[]; eventId: string }
  | { kind: 'denied_recorded'; facts: FactDraft[]; reason: 'forbidden'; message: string }
  | { kind: 'refused'; reason: 'not_found' | 'invalid_transition' | 'invalid_input'; message: string };

const POLICY_ROWS: Omit<PolicyCheckItem, 'id' | 'completed'>[] = [
  { category: 'aprovacoes_gerais', title: 'Aprovação do responsável designado', description: 'O responsável designado avalia a solicitação.', required: true },
  { category: 'acessibilidade', title: 'Acessibilidade do local ou da plataforma', description: 'O formato precisa ser acessível ao público previsto.', required: true },
  { category: 'swag_brindes', title: 'Brindes dentro da política de swag', description: 'Brindes seguem o teto e a lista homologada.', required: false },
  { category: 'avaliacao_fornecedores', title: 'Fornecedores avaliados', description: 'Fornecedores têm documentação mínima em dia.', required: true },
  { category: 'privacidade_lgpd', title: 'Tratamento de dados e LGPD', description: 'Lista de presença e gravação têm base legal.', required: true },
  { category: 'comunicacoes', title: 'Comunicações no tom da marca', description: 'Convite e peças passam pelo tom da Revloop.', required: true },
];

function policies(newId: (prefix: string) => string): PolicyCheckItem[] {
  return POLICY_ROWS.map(row => ({ ...row, id: newId('pol'), completed: false }));
}

function milestones(start: string, owner: string, newId: (prefix: string) => string): Milestone[] {
  return [
    { id: newId('ms'), title: 'Briefing e aprovação', dueDate: start, completed: false, ownerName: owner, phase: 'planejamento' },
    { id: newId('ms'), title: 'Operação do evento', dueDate: start, completed: false, ownerName: owner, phase: 'operacao' },
    { id: newId('ms'), title: 'Retrospectiva', dueDate: start, completed: false, ownerName: owner, phase: 'pos_evento' },
  ];
}

function tasks(owner: WorkspaceUser, start: string, newId: (prefix: string) => string): EventTask[] {
  return [
    {
      id: newId('task'),
      title: 'Confirmar local ou link',
      category: 'logistica',
      assignedTo: owner.name,
      assignedEmail: owner.email,
      completed: false,
      dueDate: start,
      priority: 'alta',
    },
  ];
}

function plusDays(iso: string, days: number): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function ownerOf(email: string | undefined, directory: WorkspaceDirectory): WorkspaceUser | null {
  if (!email) return null;
  return directory.find(email);
}

export function decide(
  state: HubState,
  principal: Principal,
  command: Command,
  ctx: { now: Date; directory: WorkspaceDirectory; templates: readonly EventTemplate[]; newId: (prefix: string) => string }
): Decision {
  if (command.kind === 'review') return review(state, principal, command);
  if (command.kind === 'create_event') return create(state, principal, command, ctx);
  if (command.kind === 'set_task' || command.kind === 'set_policy') return toggle(state, command);
  if (command.kind === 'add_comment') return comment(state, principal, command, ctx);
  if (command.kind === 'set_stage_zone') return stageZone(state, command);
  return link(state, command, ctx);
}

function review(state: HubState, principal: Principal, command: Extract<Command, { kind: 'review' }>): Decision {
  const event = state.events.get(command.eventId);
  if (!event) return { kind: 'refused', reason: 'not_found', message: 'Evento não encontrado.' };
  const actorEmail = principal.user.email.trim().toLowerCase();
  const ownerEmail = event.designatedOwnerEmail.trim().toLowerCase();
  if (actorEmail !== ownerEmail) {
    return {
      kind: 'denied_recorded',
      reason: 'forbidden',
      message: `Apenas ${event.designatedOwnerName} (${event.designatedOwnerEmail}) pode aceitar ou rejeitar esta solicitação.`,
      facts: [
        {
          eventId: event.id,
          fact: {
            kind: 'review_denied',
            decision: command.decision.action,
            ownerEmail: event.designatedOwnerEmail,
            currentStatus: event.status,
          },
        },
      ],
    };
  }
  if (command.decision.action === 'reject' && !command.decision.reason.trim()) {
    return { kind: 'refused', reason: 'invalid_input', message: 'Rejeição exige um motivo.' };
  }
  const target = REVIEW_TRANSITIONS[command.decision.action];
  if ((command.decision.action === 'accept' || command.decision.action === 'reject') && event.status === target) {
    return { kind: 'accepted', facts: [], eventId: event.id };
  }
  if (!REVIEWABLE.has(event.status)) {
    return {
      kind: 'refused',
      reason: 'invalid_transition',
      message: `Não é possível ${command.decision.action} um evento com status ${event.status}.`,
    };
  }
  return {
    kind: 'accepted',
    eventId: event.id,
    facts: [
      {
        eventId: event.id,
        fact: {
          kind: 'review_recorded',
          decision: command.decision.action,
          from: event.status,
          to: target,
          reason: command.decision.reason,
        },
      },
    ],
  };
}

function create(
  state: HubState,
  principal: Principal,
  command: Extract<Command, { kind: 'create_event' }>,
  ctx: { now: Date; directory: WorkspaceDirectory; templates: readonly EventTemplate[]; newId: (prefix: string) => string }
): Decision {
  const scaffold = scaffoldFor(command.origin, state, ctx.templates);
  if (!scaffold.ok) return { kind: 'refused', reason: 'not_found', message: scaffold.message };
  const draft = command.draft;
  const ownerEmail = draft.designatedOwnerEmail || scaffold.ownerEmail;
  const owner = ownerOf(ownerEmail, ctx.directory);
  if (!owner) return { kind: 'refused', reason: 'invalid_input', message: 'O responsável designado precisa ser um membro do workspace.' };
  const title = draft.title?.trim() || scaffold.title;
  const type = draft.type || scaffold.type;
  const startDate = draft.startDate || scaffold.startDate;
  if (!title || !type || !startDate) {
    return { kind: 'refused', reason: 'invalid_input', message: 'Título, tipo e data de início são obrigatórios.' };
  }
  const id = ctx.newId('evt');
  const now = ctx.now.toISOString();
  const record: CreatedEventRecord = {
    id,
    title,
    type,
    department: draft.department,
    targetAudience: draft.targetAudience || scaffold.targetAudience || 'Público interno Revloop',
    objective: draft.objective || scaffold.objective || 'Executar o evento dentro da governança da Revloop.',
    designatedOwnerName: owner.name,
    designatedOwnerEmail: owner.email,
    requestedByName: principal.user.name,
    requestedByEmail: principal.user.email,
    createdAt: now,
    updatedAt: now,
    startDate,
    endDate: draft.endDate || scaffold.endDate || startDate,
    format: draft.format || scaffold.format || 'presencial',
    location: draft.location || scaffold.location || 'Revloop São Paulo',
    budget: Number(draft.budget ?? scaffold.budget ?? 0),
    spentBudget: 0,
    estimatedAttendees: Number(draft.estimatedAttendees ?? scaffold.estimatedAttendees ?? 40),
    suppliers: draft.suppliers ?? scaffold.suppliers ?? [],
    status: 'solicitado',
    notes: draft.notes || '',
    attraction: draft.attraction?.trim() || undefined,
    venueCapacity: draft.venueCapacity,
    broadcastPlanned: draft.broadcastPlanned,
    slackChannel: draft.slackChannel || scaffold.slackChannel,
    driveFolderUrl: draft.driveFolderUrl || scaffold.driveFolderUrl,
    notionPlaybookUrl: draft.notionPlaybookUrl || scaffold.notionPlaybookUrl,
    milestones: scaffold.milestones.length ? scaffold.milestones : milestones(startDate, owner.name, ctx.newId),
    tasks: scaffold.tasks.length ? scaffold.tasks : tasks(owner, startDate, ctx.newId),
    policyChecklist: scaffold.policyChecklist.length ? scaffold.policyChecklist : policies(ctx.newId),
    comments: [
      {
        id: ctx.newId('c'),
        authorName: principal.user.name,
        authorEmail: principal.user.email,
        authorRole: principal.user.role,
        authorAvatar: principal.user.avatar,
        content: `Solicitação criada por ${principal.user.name}. Aguardando ${owner.name}.`,
        createdAt: now,
      },
    ],
    resources: scaffold.resources,
  };
  return {
    kind: 'accepted',
    eventId: id,
    facts: [{ eventId: id, fact: { kind: 'event_created', record, origin: command.origin } }],
  };
}

interface Scaffold {
  ok: true;
  title?: string;
  type?: EventDraft['type'];
  startDate?: string;
  endDate?: string;
  ownerEmail?: string;
  targetAudience?: string;
  objective?: string;
  format?: EventDraft['format'];
  location?: string;
  budget?: number;
  estimatedAttendees?: number;
  suppliers?: string[];
  slackChannel?: string;
  driveFolderUrl?: string;
  notionPlaybookUrl?: string;
  milestones: CreatedEventRecord['milestones'];
  tasks: CreatedEventRecord['tasks'];
  policyChecklist: CreatedEventRecord['policyChecklist'];
  resources: CreatedEventRecord['resources'];
}

function scaffoldFor(origin: CreateOrigin, state: HubState, templates: readonly EventTemplate[]): Scaffold | { ok: false; message: string } {
  if (origin.kind === 'intake') {
    return { ok: true, milestones: [], tasks: [], policyChecklist: [], resources: [] };
  }
  if (origin.kind === 'template') {
    const template = templates.find(item => item.id === origin.templateId);
    if (!template) return { ok: false, message: 'Modelo não encontrado.' };
    return {
      ok: true,
      title: template.name,
      type: template.type,
      format: template.defaultFormat,
      targetAudience: template.targetAudience || template.description,
      objective: template.description,
      milestones: template.defaultMilestones.map((milestone, index) => ({
        ...milestone,
        id: `ms-${template.id}-${index}`,
        completed: false,
        dueDate: milestone.dueDate,
      })),
      tasks: template.defaultTasks.map((task, index) => ({
        ...task,
        id: `task-${template.id}-${index}`,
        completed: false,
      })),
      policyChecklist: template.defaultPolicyItems.map((item, index) => ({
        ...item,
        id: `pol-${template.id}-${index}`,
        completed: false,
      })),
      resources: template.defaultResourceTemplates.map((resource, index) => ({
        ...resource,
        id: `res-${template.id}-${index}`,
      })),
    };
  }
  const source = state.events.get(origin.sourceEventId);
  if (!source) return { ok: false, message: 'Evento de origem não encontrado.' };
  return {
    ok: true,
    title: `${source.title} (Cópia)`,
    type: source.type,
    startDate: plusDays(source.startDate, 30),
    endDate: plusDays(source.endDate || source.startDate, 30),
    ownerEmail: source.designatedOwnerEmail,
    targetAudience: source.targetAudience,
    objective: source.objective,
    format: source.format,
    location: source.location,
    budget: source.budget,
    estimatedAttendees: source.estimatedAttendees,
    suppliers: source.suppliers,
    slackChannel: source.slackChannel,
    driveFolderUrl: source.driveFolderUrl,
    notionPlaybookUrl: source.notionPlaybookUrl,
    milestones: source.milestones.map(milestone => ({ ...milestone, completed: false })),
    tasks: source.tasks.map(task => ({ ...task, completed: false })),
    policyChecklist: source.policyChecklist.map(item => ({ ...item, completed: false, verifiedBy: undefined, verifiedAt: undefined })),
    resources: source.resources.map(resource => ({ ...resource })),
  };
}

function toggle(state: HubState, command: Extract<Command, { kind: 'set_task' | 'set_policy' }>): Decision {
  const event = state.events.get(command.eventId);
  if (!event) return { kind: 'refused', reason: 'not_found', message: 'Evento não encontrado.' };
  if (command.kind === 'set_task') {
    const task = event.tasks.find(item => item.id === command.taskId);
    if (!task) return { kind: 'refused', reason: 'not_found', message: 'Tarefa não encontrada.' };
    if (task.completed === command.completed) return { kind: 'accepted', facts: [], eventId: event.id };
    return { kind: 'accepted', eventId: event.id, facts: [{ eventId: event.id, fact: { kind: 'task_set', taskId: command.taskId, completed: command.completed } }] };
  }
  const item = event.policyChecklist.find(row => row.id === command.policyId);
  if (!item) return { kind: 'refused', reason: 'not_found', message: 'Item de política não encontrado.' };
  if (item.completed === command.completed) return { kind: 'accepted', facts: [], eventId: event.id };
  return { kind: 'accepted', eventId: event.id, facts: [{ eventId: event.id, fact: { kind: 'policy_set', policyId: command.policyId, completed: command.completed } }] };
}

function comment(
  state: HubState,
  principal: Principal,
  command: Extract<Command, { kind: 'add_comment' }>,
  ctx: { now: Date; newId: (prefix: string) => string }
): Decision {
  const event = state.events.get(command.eventId);
  if (!event) return { kind: 'refused', reason: 'not_found', message: 'Evento não encontrado.' };
  if (!command.content.trim()) return { kind: 'refused', reason: 'invalid_input', message: 'Comentário vazio.' };
  const isOwner = principal.user.email.toLowerCase() === event.designatedOwnerEmail.toLowerCase();
  return {
    kind: 'accepted',
    eventId: event.id,
    facts: [
      {
        eventId: event.id,
        fact: {
          kind: 'comment_added',
          comment: {
            id: ctx.newId('c'),
            authorName: principal.user.name,
            authorEmail: principal.user.email,
            authorRole: principal.user.role,
            authorAvatar: principal.user.avatar,
            content: command.content.trim(),
            createdAt: ctx.now.toISOString(),
            isOwnerNote: isOwner,
          },
        },
      },
    ],
  };
}

function stageZone(state: HubState, command: Extract<Command, { kind: 'set_stage_zone' }>): Decision {
  const event = state.events.get(command.eventId);
  if (!event) return { kind: 'refused', reason: 'not_found', message: 'Evento não encontrado.' };
  const plan = event.stagePlan?.length ? event.stagePlan : stagePlanFor(event);
  const zone = plan.find(item => item.id === command.zoneId);
  if (!zone) return { kind: 'refused', reason: 'not_found', message: 'Área da montagem não encontrada.' };
  if (zone.status === command.status) return { kind: 'accepted', facts: [], eventId: event.id };
  if (!withZoneStatus(plan, command.zoneId, command.status)) {
    return { kind: 'refused', reason: 'not_found', message: 'Área da montagem não encontrada.' };
  }
  return {
    kind: 'accepted',
    eventId: event.id,
    facts: [{ eventId: event.id, fact: { kind: 'stage_zone_set', zoneId: command.zoneId, status: command.status } }],
  };
}

function link(state: HubState, command: Extract<Command, { kind: 'link_resource' }>, ctx: { newId: (prefix: string) => string }): Decision {
  const event = state.events.get(command.eventId);
  if (!event) return { kind: 'refused', reason: 'not_found', message: 'Evento não encontrado.' };
  let url: URL;
  try {
    url = new URL(command.resource.url);
  } catch {
    return { kind: 'refused', reason: 'invalid_input', message: 'O recurso precisa de uma URL https.' };
  }
  if (url.protocol !== 'https:') return { kind: 'refused', reason: 'invalid_input', message: 'O recurso precisa de uma URL https.' };
  if (!command.resource.title.trim()) return { kind: 'refused', reason: 'invalid_input', message: 'O recurso precisa de um título.' };
  return {
    kind: 'accepted',
    eventId: event.id,
    facts: [
      {
        eventId: event.id,
        fact: {
          kind: 'resource_linked',
          resource: {
            id: ctx.newId('res'),
            type: command.resource.type,
            title: command.resource.title.trim(),
            url: command.resource.url,
            description: command.resource.description,
          },
        },
      },
    ],
  };
}
