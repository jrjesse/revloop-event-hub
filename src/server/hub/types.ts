import type {
  EventComment,
  EventFormat,
  EventRecord,
  EventResourceLink,
  EventStatus,
  EventTemplate,
  EventType,
  PlaybookGuide,
  StageZoneStatus,
  WorkspaceUser,
} from '../../types/index.ts';

/** The only identity mode that has an implementation. Add a workspace issuer with its adapter. */
export type IdentityMode = 'local_dev';

export type LedgerKind = 'local_file';

export type Provenance = 'seeded';

export type ReviewDecision =
  | { action: 'accept'; reason?: string }
  | { action: 'reject'; reason: string }
  | { action: 'request_changes'; reason?: string };

export type CreateOrigin =
  | { kind: 'intake' }
  | { kind: 'template'; templateId: string }
  | { kind: 'duplicate'; sourceEventId: string };

/** Fields a caller may send. Status, requester, and ids are not on this type. */
export interface EventDraft {
  title?: string;
  type?: EventType;
  designatedOwnerEmail?: string;
  startDate?: string;
  endDate?: string;
  department?: string;
  targetAudience?: string;
  objective?: string;
  format?: EventFormat;
  location?: string;
  budget?: number;
  estimatedAttendees?: number;
  attraction?: string;
  venueCapacity?: number;
  broadcastPlanned?: boolean;
  suppliers?: string[];
  notes?: string;
  slackChannel?: string;
  driveFolderUrl?: string;
  notionPlaybookUrl?: string;
}

export interface ResourceLinkInput {
  type: EventResourceLink['type'];
  title: string;
  url: string;
  description?: string;
}

export type Command =
  | { kind: 'create_event'; origin: CreateOrigin; draft: EventDraft }
  | { kind: 'review'; eventId: string; decision: ReviewDecision }
  | { kind: 'set_task'; eventId: string; taskId: string; completed: boolean }
  | { kind: 'set_policy'; eventId: string; policyId: string; completed: boolean }
  | { kind: 'add_comment'; eventId: string; content: string }
  | { kind: 'link_resource'; eventId: string; resource: ResourceLinkInput }
  | { kind: 'set_stage_zone'; eventId: string; zoneId: string; status: StageZoneStatus };

export const REVIEW_TRANSITIONS = {
  accept: 'aprovado',
  reject: 'rejeitado',
  request_changes: 'em_revisao',
} as const;

export type ReviewOutcomeStatus = (typeof REVIEW_TRANSITIONS)[ReviewDecision['action']];

export const REVIEWABLE: ReadonlySet<EventStatus> = new Set<EventStatus>(['solicitado', 'em_revisao']);

/** Fresh events. Score, health, activities, and the audit trail are projections. */
export type CreatedEventRecord = Omit<EventRecord, 'policyComplianceScore' | 'health' | 'activities' | 'auditTrail'> & {
  status: 'solicitado';
};

/** Imported rows keep the status they already had. */
export type ImportedEventRecord = Omit<EventRecord, 'policyComplianceScore' | 'auditTrail'>;

export interface LegacyAuditFactBody {
  changeType: import('../../types/index.ts').AuditLogRecord['changeType'];
  fieldName: string;
  fieldKey: string;
  oldValue: string;
  newValue: string;
  summary: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
}

export type HubFact =
  | { kind: 'event_imported'; record: ImportedEventRecord }
  | { kind: 'event_created'; record: CreatedEventRecord; origin: CreateOrigin }
  | {
      kind: 'review_recorded';
      decision: ReviewDecision['action'];
      from: EventStatus;
      to: ReviewOutcomeStatus;
      reason?: string;
    }
  | { kind: 'review_denied'; decision: ReviewDecision['action']; ownerEmail: string; currentStatus: EventStatus }
  | { kind: 'task_set'; taskId: string; completed: boolean }
  | { kind: 'policy_set'; policyId: string; completed: boolean }
  | { kind: 'comment_added'; comment: EventComment }
  | { kind: 'resource_linked'; resource: EventResourceLink }
  | { kind: 'stage_zone_set'; zoneId: string; status: StageZoneStatus }
  | { kind: 'legacy_audit'; body: LegacyAuditFactBody };

export type CommandId = string & { readonly __brand: 'CommandId' };

export function asCommandId(value: string): CommandId {
  return value as CommandId;
}
