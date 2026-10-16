import { Router, type Request, type Response } from 'express';
import type { Identity } from './identity.ts';
import type { Hub } from './hub/index.ts';
import type { Sources } from './sources.ts';
import { SOURCE_KINDS, type SourceKind } from './sources.ts';
import { asCommandId, type Command, type CommandId, type CreateOrigin, type EventDraft, type ReviewDecision } from './hub/types.ts';
import type { DispatchOutcome } from './hub/index.ts';

function commandIdOf(req: Request): CommandId {
  const header = req.header('Idempotency-Key');
  const value = header && header.trim() ? header.trim() : `srv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return asCommandId(value);
}

function send(res: Response, outcome: DispatchOutcome): void {
  res.status(outcome.status).json({
    success: outcome.ok,
    event: outcome.event,
    conflicts: outcome.conflicts ? [...outcome.conflicts.external, ...outcome.conflicts.internal.map(item => ({
      conflictingEventTitle: item.title,
      organizer: 'Hub',
      start: '',
      end: '',
      severity: 'medio' as const,
      description: `Conflito com o evento ${item.title} neste hub.`,
      provenance: 'hub_event' as const,
    }))] : undefined,
    comment: outcome.comment,
    error: outcome.error,
    replayed: outcome.replayed,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function draftFrom(body: Record<string, unknown>): EventDraft {
  const text = (key: string) => (typeof body[key] === 'string' ? body[key] as string : undefined);
  const num = (key: string) => (typeof body[key] === 'number' ? body[key] as number : undefined);
  return {
    title: text('title'),
    type: text('type') as EventDraft['type'],
    designatedOwnerEmail: text('designatedOwnerEmail'),
    startDate: text('startDate'),
    endDate: text('endDate'),
    department: text('department'),
    targetAudience: text('targetAudience'),
    objective: text('objective'),
    format: text('format') as EventDraft['format'],
    location: text('location'),
    budget: num('budget'),
    estimatedAttendees: num('estimatedAttendees'),
    suppliers: Array.isArray(body.suppliers) ? body.suppliers.filter((item): item is string => typeof item === 'string') : undefined,
    notes: text('notes'),
    attraction: text('attraction'),
    venueCapacity: num('venueCapacity'),
    broadcastPlanned: typeof body.broadcastPlanned === 'boolean' ? body.broadcastPlanned : undefined,
    slackChannel: text('slackChannel'),
    driveFolderUrl: text('driveFolderUrl'),
    notionPlaybookUrl: text('notionPlaybookUrl'),
  };
}

function parseCreate(body: unknown): { ok: true; command: Extract<Command, { kind: 'create_event' }> } | { ok: false; error: string } {
  if (!isRecord(body)) return { ok: false, error: 'Corpo inválido.' };
  let origin: CreateOrigin = { kind: 'intake' };
  const raw = body.origin;
  if (isRecord(raw) && raw.kind === 'template' && typeof raw.templateId === 'string') origin = { kind: 'template', templateId: raw.templateId };
  else if (isRecord(raw) && raw.kind === 'duplicate' && typeof raw.sourceEventId === 'string') origin = { kind: 'duplicate', sourceEventId: raw.sourceEventId };
  else if (isRecord(raw) && raw.kind === 'intake') origin = { kind: 'intake' };
  const draft = isRecord(body.draft) ? draftFrom(body.draft) : draftFrom(body);
  return { ok: true, command: { kind: 'create_event', origin, draft } };
}

function parseReview(eventId: string, body: unknown): { ok: true; command: Extract<Command, { kind: 'review' }> } | { ok: false; error: string } {
  if (!isRecord(body) || typeof body.action !== 'string') return { ok: false, error: 'Ação inválida.' };
  const reason = typeof body.reason === 'string' ? body.reason : undefined;
  let decision: ReviewDecision;
  if (body.action === 'accept') decision = { action: 'accept', reason };
  else if (body.action === 'request_changes') decision = { action: 'request_changes', reason };
  else if (body.action === 'reject') {
    if (!reason?.trim()) return { ok: false, error: 'Rejeição exige um motivo.' };
    decision = { action: 'reject', reason };
  } else return { ok: false, error: "Ação inválida. Utilize 'accept', 'reject' ou 'request_changes'." };
  return { ok: true, command: { kind: 'review', eventId, decision } };
}

export function createApiRouter(deps: { hub: Hub; identity: Identity; sources: Sources }): Router {
  const router = Router();
  const { hub, identity, sources } = deps;

  router.get('/workspace/members', (_req, res) => {
    res.json({ success: true, members: hub.members() });
  });

  router.use(identity.guard(async (principal, req, res) => {
    try {
    const url = req.path;

    if (req.method === 'GET' && url === '/session') {
      res.json({ success: true, ...identity.session(principal), store: hub.describeStore() });
      return;
    }
    if (req.method === 'GET' && url === '/user/me') {
      res.json({ success: true, user: principal.user, identityMode: principal.issuedBy });
      return;
    }
    if (req.method === 'GET' && url === '/overview/stats') {
      res.json({ success: true, stats: hub.overview() });
      return;
    }
    if (req.method === 'GET' && url === '/analytics/governance') {
      const sla = req.query.sla ? parseInt(String(req.query.sla), 10) : 48;
      const timeframe = typeof req.query.timeframe === 'string' ? req.query.timeframe : 'all';
      res.json({ success: true, analytics: hub.governance(Number.isFinite(sla) ? sla : 48, timeframe) });
      return;
    }
    if (req.method === 'GET' && url === '/events') {
      res.json({
        success: true,
        events: hub.events(principal, {
          view: typeof req.query.view === 'string' ? req.query.view : undefined,
          status: typeof req.query.status === 'string' ? req.query.status : undefined,
          type: typeof req.query.type === 'string' ? req.query.type : undefined,
          search: typeof req.query.search === 'string' ? req.query.search : undefined,
        }),
      });
      return;
    }
    if (req.method === 'POST' && url === '/events') {
      const parsed = parseCreate(req.body);
      if (!parsed.ok) {
        res.status(400).json({ success: false, error: parsed.error });
        return;
      }
      send(res, await hub.dispatch(principal, parsed.command, commandIdOf(req)));
      return;
    }
    if (req.method === 'GET' && url === '/templates') {
      res.json({ success: true, templates: hub.templates() });
      return;
    }
    if (req.method === 'GET' && url === '/playbooks') {
      res.json({ success: true, playbooks: hub.playbooks() });
      return;
    }
    if (req.method === 'GET' && url === '/integrations/sources') {
      res.json({ success: true, sources: sources.summaries() });
      return;
    }
    if (req.method === 'GET' && url === '/integrations/calendar/conflicts') {
      const start = typeof req.query.start === 'string' ? req.query.start : '';
      const end = typeof req.query.end === 'string' ? req.query.end : start;
      const external = sources.conflicts({ start, end });
      const internal = hub.events(principal).filter(event => event.startDate <= end && start <= (event.endDate || event.startDate));
      res.json({
        success: true,
        conflicts: [
          ...external,
          ...internal.map(event => ({
            conflictingEventTitle: event.title,
            organizer: event.designatedOwnerName,
            start: event.startDate,
            end: event.endDate,
            severity: 'medio' as const,
            description: 'Outro evento deste hub ocupa a mesma janela.',
            provenance: 'hub_event' as const,
          })),
        ],
      });
      return;
    }
    if (req.method === 'GET' && url === '/ledger/verify') {
      res.json({ success: true, ...hub.verify(), store: hub.describeStore() });
      return;
    }

    const eventAudit = url.match(/^\/events\/([^/]+)\/audit-trail$/);
    if (req.method === 'GET' && eventAudit) {
      res.json({ success: true, ...hub.audit(decodeURIComponent(eventAudit[1])) });
      return;
    }
    const eventOne = url.match(/^\/events\/([^/]+)$/);
    if (req.method === 'GET' && eventOne) {
      const event = hub.event(principal, decodeURIComponent(eventOne[1]));
      if (!event) {
        res.status(404).json({ success: false, error: 'Evento não encontrado' });
        return;
      }
      res.json({ success: true, event });
      return;
    }
    const review = url.match(/^\/events\/([^/]+)\/review$/);
    if (req.method === 'POST' && review) {
      const parsed = parseReview(decodeURIComponent(review[1]), req.body);
      if (!parsed.ok) {
        res.status(400).json({ success: false, error: parsed.error });
        return;
      }
      send(res, await hub.dispatch(principal, parsed.command, commandIdOf(req)));
      return;
    }
    const task = url.match(/^\/events\/([^/]+)\/tasks\/([^/]+)$/);
    if (req.method === 'PATCH' && task) {
      send(res, await hub.dispatch(principal, {
        kind: 'set_task',
        eventId: decodeURIComponent(task[1]),
        taskId: decodeURIComponent(task[2]),
        completed: Boolean(req.body?.completed),
      }, commandIdOf(req)));
      return;
    }
    const policy = url.match(/^\/events\/([^/]+)\/policies\/([^/]+)$/);
    if (req.method === 'PATCH' && policy) {
      send(res, await hub.dispatch(principal, {
        kind: 'set_policy',
        eventId: decodeURIComponent(policy[1]),
        policyId: decodeURIComponent(policy[2]),
        completed: Boolean(req.body?.completed),
      }, commandIdOf(req)));
      return;
    }
    const stage = url.match(/^\/events\/([^/]+)\/stage\/([^/]+)$/);
    if (req.method === 'PATCH' && stage) {
      const status = req.body?.status;
      if (status !== 'pendente' && status !== 'em_montagem' && status !== 'pronto' && status !== 'bloqueado') {
        res.status(400).json({ success: false, error: 'Status de montagem inválido.' });
        return;
      }
      send(res, await hub.dispatch(principal, {
        kind: 'set_stage_zone',
        eventId: decodeURIComponent(stage[1]),
        zoneId: decodeURIComponent(stage[2]),
        status,
      }, commandIdOf(req)));
      return;
    }
    const comments = url.match(/^\/events\/([^/]+)\/comments$/);
    if (req.method === 'POST' && comments) {
      send(res, await hub.dispatch(principal, {
        kind: 'add_comment',
        eventId: decodeURIComponent(comments[1]),
        content: typeof req.body?.content === 'string' ? req.body.content : '',
      }, commandIdOf(req)));
      return;
    }
    const resources = url.match(/^\/events\/([^/]+)\/resources$/);
    if (req.method === 'POST' && resources) {
      send(res, await hub.dispatch(principal, {
        kind: 'link_resource',
        eventId: decodeURIComponent(resources[1]),
        resource: {
          type: req.body?.type,
          title: typeof req.body?.title === 'string' ? req.body.title : '',
          url: typeof req.body?.url === 'string' ? req.body.url : '',
          description: typeof req.body?.description === 'string' ? req.body.description : undefined,
        },
      }, commandIdOf(req)));
      return;
    }
    const sync = url.match(/^\/integrations\/sources\/([^/]+)\/sync$/);
    if (req.method === 'POST' && sync) {
      const kind = decodeURIComponent(sync[1]);
      if (!SOURCE_KINDS.includes(kind as SourceKind)) {
        res.status(404).json({ success: false, error: 'Fonte de dados não encontrada' });
        return;
      }
      const source = sources.reload(kind as SourceKind);
      res.json({ success: true, source });
      return;
    }

    res.status(404).json({ success: false, error: 'Rota não encontrada.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro interno.';
      if (!res.headersSent) res.status(500).json({ success: false, error: message });
    }
  }));

  return router;
}
