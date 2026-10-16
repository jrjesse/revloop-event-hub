import fs from 'node:fs';
import type { AuditLogRecord, EventRecord, EventTemplate, PlaybookGuide, WorkspaceUser } from '../../types/index.ts';
import { EVENT_TEMPLATES, INITIAL_EVENTS, PLAYBOOK_GUIDES, WORKSPACE_USERS } from '../../data/initialData.ts';
import { sealEntry, type Catalog, type LedgerDocument, type LedgerEntry } from './ledger.ts';
import type { HubFact, LegacyAuditFactBody } from './types.ts';

const importer = { kind: 'system' as const, reason: 'legacy_import' as const };

export function genesisDocument(legacyPath: string): LedgerDocument {
  const legacy = fs.existsSync(legacyPath)
    ? (JSON.parse(fs.readFileSync(legacyPath, 'utf8')) as {
        events?: EventRecord[];
        templates?: EventTemplate[];
        playbooks?: PlaybookGuide[];
        workspaceUsers?: WorkspaceUser[];
        auditRecords?: AuditLogRecord[];
        auditLogs?: { timestamp: string; actorEmail: string; targetId: string; authorized: boolean; details: string }[];
      })
    : null;

  const catalog: Catalog = {
    users: legacy?.workspaceUsers?.length ? legacy.workspaceUsers : WORKSPACE_USERS,
    templates: legacy?.templates?.length ? legacy.templates : EVENT_TEMPLATES,
    playbooks: legacy?.playbooks?.length ? legacy.playbooks : PLAYBOOK_GUIDES,
  };

  const drafts: { at: string; eventId: string; fact: HubFact }[] = [];
  for (const event of legacy?.events?.length ? legacy.events : INITIAL_EVENTS) {
    const { auditTrail: _audit, policyComplianceScore: _score, viewer: _viewer, ...record } = event;
    void _audit;
    void _score;
    void _viewer;
    drafts.push({ at: event.createdAt, eventId: event.id, fact: { kind: 'event_imported', record } });
  }

  for (const row of legacy?.auditRecords ?? []) {
    const body: LegacyAuditFactBody = {
      changeType: row.changeType,
      fieldName: row.fieldName,
      fieldKey: row.fieldKey,
      oldValue: row.oldValue,
      newValue: row.newValue,
      summary: row.changeSummary,
      actorName: row.actorName,
      actorEmail: row.actorEmail,
      actorRole: row.actorRole,
    };
    drafts.push({ at: row.timestamp, eventId: row.eventId, fact: { kind: 'legacy_audit', body } });
  }

  for (const log of legacy?.auditLogs ?? []) {
    if (log.authorized !== false) continue;
    const user = catalog.users.find(member => member.email.toLowerCase() === log.actorEmail.toLowerCase());
    drafts.push({
      at: log.timestamp,
      eventId: log.targetId,
      fact: {
        kind: 'legacy_audit',
        body: {
          changeType: 'negado',
          fieldName: 'Tentativa de revisão',
          fieldKey: 'review',
          oldValue: '',
          newValue: 'negado',
          summary: log.details,
          actorName: user?.name || log.actorEmail,
          actorEmail: log.actorEmail,
          actorRole: user?.role || 'membro',
        },
      },
    });
  }

  drafts.sort((a, b) => a.at.localeCompare(b.at) || a.eventId.localeCompare(b.eventId));
  let prev = 'genesis';
  const entries: LedgerEntry[] = drafts.map((draft, seq) => {
    const entry = sealEntry({
      seq,
      at: draft.at,
      actor: importer,
      commandId: null,
      eventId: draft.eventId,
      fact: draft.fact,
      group: { size: 1, index: 0 },
      prevHash: prev,
    });
    prev = entry.hash;
    return entry;
  });
  return { catalog, entries };
}
