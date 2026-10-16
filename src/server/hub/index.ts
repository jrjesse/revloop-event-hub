import type { AuditLogRecord, EventRecord, EventTemplate, PlaybookGuide, WorkspaceUser } from '../../types/index.ts';
import type { Principal, WorkspaceDirectory } from '../identity.ts';
import { directoryFrom } from '../identity.ts';
import type { Sources } from '../sources.ts';
import { decide } from './decide.ts';
import { governanceAnalytics } from './governance.ts';
import { fold, project, toAuditLogRecord, type HubState } from './project.ts';
import { openFileLedger, sealEntry, verifyChain, type ActorStamp, type LedgerEntry, type LedgerStore } from './ledger.ts';
import { genesisDocument } from './seed.ts';
import { REVIEWABLE, type Command, type CommandId } from './types.ts';
import { boardFor } from '../../domain/showControl.ts';
import { SHOW_TEMPLATES } from '../../domain/showTemplates.ts';
import { stagePlanFor } from '../../domain/stagePlan.ts';

export interface EventView extends EventRecord {
  auditTrail: AuditLogRecord[];
  viewer: { isOwner: boolean; canReview: boolean };
}

export interface DispatchOutcome {
  ok: boolean;
  status: number;
  event?: EventView;
  conflicts?: { external: unknown[]; internal: { eventId: string; title: string }[] };
  comment?: EventRecord['comments'][number];
  error?: string;
  replayed: boolean;
  recorded: boolean;
}

export interface Hub {
  dispatch(principal: Principal, command: Command, commandId: CommandId): Promise<DispatchOutcome>;
  directory(): WorkspaceDirectory;
  describeStore(): { kind: 'local_file'; label: string; entries: number; headHash: string };
  events(principal: Principal, filter?: { view?: string; status?: string; type?: string; search?: string }): EventView[];
  event(principal: Principal, id: string): EventView | null;
  audit(eventId: string): { auditTrail: AuditLogRecord[]; presentation: { storeLabel: string; hashLabel: string; chainIntact: boolean }; count: number };
  verify(): { ok: true; head: string; entries: number } | { ok: false; brokenAtSeq: number };
  overview(): {
    total: number;
    pending: number;
    upcoming: number;
    completed: number;
    totalBudget: number;
    spentBudget: number;
    avgCompliance: number;
    sourcesConnected: number;
  };
  governance(slaTargetHours: number, timeframe: string): ReturnType<typeof governanceAnalytics>;
  templates(): (EventTemplate & { usage: { count: number; lastUsedAt: string | null } })[];
  playbooks(): PlaybookGuide[];
  members(): readonly WorkspaceUser[];
}

function commandKey(principal: Principal, commandId: CommandId): string {
  return `${principal.user.email.toLowerCase()}\u0000${commandId}`;
}

function viewOf(state: HubState, event: EventRecord, principal: Principal): EventView {
  const auditTrail = (state.entriesByEvent.get(event.id) ?? []).map(toAuditLogRecord).reverse();
  const isOwner = event.designatedOwnerEmail.toLowerCase() === principal.user.email.toLowerCase();
  return {
    ...event,
    auditTrail,
    showControl: event.showControl ?? boardFor({ ...event, stagePlan: event.stagePlan?.length ? event.stagePlan : stagePlanFor(event) }),
    stagePlan: event.stagePlan?.length ? event.stagePlan : stagePlanFor(event),
    viewer: { isOwner, canReview: isOwner && REVIEWABLE.has(event.status) },
  };
}

function decisionStamp(state: HubState): Map<string, string> {
  const stamps = new Map<string, string>();
  for (const [eventId, entries] of state.entriesByEvent) {
    const hit = [...entries].reverse().find(entry => {
      if (entry.fact.kind === 'review_recorded') return entry.fact.decision === 'accept' || entry.fact.decision === 'reject';
      return entry.fact.kind === 'legacy_audit' && (entry.fact.body.changeType === 'aprovacao' || entry.fact.body.changeType === 'rejeicao');
    });
    if (hit) stamps.set(eventId, hit.at);
  }
  return stamps;
}

function filterEvents(events: EventRecord[], filter?: { view?: string; status?: string; type?: string; search?: string }): EventRecord[] {
  const today = new Date().toISOString().slice(0, 10);
  return events.filter(event => {
    if (filter?.view === 'pending' && event.status !== 'solicitado' && event.status !== 'em_revisao') return false;
    if (filter?.view === 'upcoming' && event.status !== 'aprovado' && event.status !== 'em_planejamento') return false;
    if (filter?.view === 'past' && event.status !== 'concluido' && event.startDate >= today) return false;
    if (filter?.status && filter.status !== 'all' && event.status !== filter.status) return false;
    if (filter?.type && filter.type !== 'all' && event.type !== filter.type) return false;
    if (filter?.search) {
      const hay = [event.title, event.designatedOwnerName, event.requestedByName, event.department, event.location, event.objective].join(' ').toLowerCase();
      if (!hay.includes(filter.search.toLowerCase())) return false;
    }
    return true;
  });
}

export async function openHub(options: { ledgerPath: string; legacyPath: string; sources: Sources; clock?: () => Date }): Promise<Hub> {
  const store: LedgerStore = openFileLedger(options.ledgerPath);
  const clock = options.clock ?? (() => new Date());
  let document = await store.load();
  if (!document) {
    document = genesisDocument(options.legacyPath);
    await store.create(document);
  }
  let state = fold(document.entries);
  let catalog = document.catalog;
  let tail: Promise<void> = Promise.resolve();

  function serialized<T>(work: () => Promise<T>): Promise<T> {
    const run = tail.then(work, work);
    tail = run.then(() => undefined, () => undefined);
    return run;
  }

  const directory = () => directoryFrom(catalog.users);

  async function applyEntries(entries: LedgerEntry[]): Promise<void> {
    const appended = await store.append(state.head.seq, entries);
    if (!appended.ok) {
      const reloaded = await store.load();
      if (!reloaded) throw new Error('Ledger sumiu durante a gravação.');
      state = fold(reloaded.entries);
      catalog = reloaded.catalog;
      throw new Error('head_moved');
    }
    state = entries.reduce(project, state);
  }

  async function dispatch(principal: Principal, command: Command, commandId: CommandId): Promise<DispatchOutcome> {
    return serialized(async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const prior = state.commands.get(commandKey(principal, commandId));
        if (prior) {
          const event = state.events.get(prior.eventId);
          if (prior.outcome === 'ok' && event) {
            return { ok: true, status: 200, event: viewOf(state, event, principal), replayed: true, recorded: false };
          }
          return { ok: false, status: 403, error: 'Tentativa já registrada para este comando.', replayed: true, recorded: true };
        }

        const decision = decide(state, principal, command, {
          now: clock(),
          directory: directory(),
          templates: catalog.templates,
          newId: prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        });

        if (decision.kind === 'refused') {
          const status = decision.reason === 'not_found' ? 404 : decision.reason === 'invalid_transition' ? 409 : 400;
          return { ok: false, status, error: decision.message, replayed: false, recorded: false };
        }
        if (decision.kind === 'accepted' && decision.facts.length === 0) {
          const event = state.events.get(decision.eventId);
          return { ok: true, status: 200, event: event ? viewOf(state, event, principal) : undefined, replayed: false, recorded: false };
        }

        const actor: ActorStamp = { kind: 'principal', user: principal.user, issuedBy: principal.issuedBy, sessionId: principal.sessionId };
        let prev = state.head.seq < 0 ? 'genesis' : state.head.hash;
        let seq = state.head.seq;
        const entries = decision.facts.map((draft, index) => {
          seq += 1;
          const entry = sealEntry({
            seq,
            at: clock().toISOString(),
            actor,
            commandId,
            eventId: draft.eventId,
            fact: draft.fact,
            group: { size: decision.facts.length, index },
            prevHash: prev,
          });
          prev = entry.hash;
          return entry;
        });

        try {
          await applyEntries(entries);
        } catch (err) {
          if (err instanceof Error && err.message === 'head_moved' && attempt === 0) continue;
          throw err;
        }

        const eventId = decision.kind === 'accepted' ? decision.eventId : decision.facts[0].eventId;
        const event = state.events.get(eventId);
        const conflicts = command.kind === 'create_event' && event
          ? {
              external: options.sources.conflicts({ start: event.startDate, end: event.endDate }),
              internal: [...state.events.values()]
                .filter(other => other.id !== event.id && other.startDate <= (event.endDate || event.startDate) && event.startDate <= (other.endDate || other.startDate))
                .map(other => ({ eventId: other.id, title: other.title })),
            }
          : undefined;
        const added = decision.facts.find(fact => fact.fact.kind === 'comment_added');
        if (decision.kind === 'denied_recorded') {
          return { ok: false, status: 403, error: decision.message, replayed: false, recorded: true };
        }
        return {
          ok: true,
          status: command.kind === 'create_event' ? 201 : 200,
          event: event ? viewOf(state, event, principal) : undefined,
          conflicts,
          comment: added && added.fact.kind === 'comment_added' ? added.fact.comment : undefined,
          replayed: false,
          recorded: false,
        };
      }
      return { ok: false, status: 409, error: 'O ledger mudou durante a gravação.', replayed: false, recorded: false };
    });
  }

  return {
    dispatch,
    directory,
    describeStore: () => ({
      kind: 'local_file',
      label: store.description.label,
      entries: state.head.seq + 1,
      headHash: state.head.hash,
    }),
    events: (principal, filter) => filterEvents([...state.events.values()], filter).map(event => viewOf(state, event, principal)),
    event: (principal, id) => {
      const found = state.events.get(id);
      return found ? viewOf(state, found, principal) : null;
    },
    audit: eventId => {
      const auditTrail = (state.entriesByEvent.get(eventId) ?? []).map(toAuditLogRecord).reverse();
      const check = verifyChain([...state.entriesByEvent.values()].flat().sort((a, b) => a.seq - b.seq));
      return {
        auditTrail,
        count: auditTrail.length,
        presentation: {
          storeLabel: 'Arquivo local do hub',
          hashLabel: 'SHA-256 encadeado do registro',
          chainIntact: check.ok,
        },
      };
    },
    verify: () => {
      const entries = [...state.entriesByEvent.values()].flat().sort((a, b) => a.seq - b.seq);
      const check = verifyChain(entries);
      return check.ok ? { ok: true as const, head: check.head, entries: entries.length } : check;
    },
    overview: () => {
      const events = [...state.events.values()];
      return {
        total: events.length,
        pending: events.filter(event => event.status === 'solicitado' || event.status === 'em_revisao').length,
        upcoming: events.filter(event => event.status === 'aprovado' || event.status === 'em_planejamento').length,
        completed: events.filter(event => event.status === 'concluido').length,
        totalBudget: events.reduce((sum, event) => sum + (event.budget || 0), 0),
        spentBudget: events.reduce((sum, event) => sum + (event.spentBudget || 0), 0),
        avgCompliance: events.length ? Math.round(events.reduce((sum, event) => sum + event.policyComplianceScore, 0) / events.length) : 0,
        sourcesConnected: options.sources.summaries().length,
      };
    },
    governance: (sla, timeframe) => governanceAnalytics([...state.events.values()], catalog.users, decisionStamp(state), sla, timeframe, clock().getTime()),
    templates: () => {
      const known = new Set(catalog.templates.map(template => template.id));
      return [...SHOW_TEMPLATES.filter(template => !known.has(template.id)), ...catalog.templates].map(template => ({
        ...template,
        usage: state.templateUsage.get(template.id) ?? { count: 0, lastUsedAt: null },
      }));
    },
    playbooks: () => catalog.playbooks,
    members: () => catalog.users,
  };
}
