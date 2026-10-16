import type { CalendarConflict, PlaybookGuide } from '../types/index.ts';
import { CALENDAR_COMPANY_EVENTS, PLAYBOOK_GUIDES } from '../data/initialData.ts';
import type { Provenance } from './hub/types.ts';

export const SOURCE_KINDS = ['google_calendar', 'slack', 'google_drive', 'notion'] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export interface SourceSummary {
  id: SourceKind;
  source: SourceKind;
  name: string;
  provenance: Provenance;
  status: 'exemplo_semeado';
  accountOrWorkspace: string;
  lastSync: 'catálogo semeado';
  details: string;
  itemCount: number;
  scope: string[];
  lastSyncedAt: null;
  live: false;
}

const NAMES: Record<SourceKind, { name: string; account: string; details: string }> = {
  google_calendar: {
    name: 'Google Agenda (exemplos)',
    account: 'eventos@revloop.com.br',
    details: 'Blocos de exemplo para conflito de agenda. Não há consulta à agenda da empresa.',
  },
  slack: {
    name: 'Slack (exemplos)',
    account: 'revloop.slack.com',
    details: 'Canais de exemplo. Não há leitura do workspace.',
  },
  google_drive: {
    name: 'Google Drive (exemplos)',
    account: 'drive.google.com/corp/revloop-eventos',
    details: 'Links de exemplo. Arquivos não são copiados.',
  },
  notion: {
    name: 'Notion (exemplos)',
    account: 'notion.so/revloop/event-hub',
    details: 'Playbooks de exemplo guardados neste hub.',
  },
};

export interface Sources {
  summaries(): SourceSummary[];
  conflicts(window: { start: string; end: string }): (CalendarConflict & { provenance: Provenance })[];
  playbooks(): (PlaybookGuide & { provenance: Provenance })[];
  reload(kind: SourceKind): SourceSummary | null;
}

function overlaps(start: string, end: string, blockStart: string, blockEnd: string): boolean {
  const a = new Date(start).getTime();
  const b = new Date(end || start).getTime();
  const c = new Date(blockStart).getTime();
  const d = new Date(blockEnd || blockStart).getTime();
  if ([a, b, c, d].some(value => Number.isNaN(value))) return false;
  return a < d && b > c;
}

export function createSources(): Sources {
  const summaries = (): SourceSummary[] =>
    SOURCE_KINDS.map(kind => ({
      id: kind,
      source: kind,
      name: NAMES[kind].name,
      provenance: 'seeded',
      status: 'exemplo_semeado',
      accountOrWorkspace: NAMES[kind].account,
      lastSync: 'catálogo semeado',
      details: NAMES[kind].details,
      itemCount: kind === 'google_calendar' ? CALENDAR_COMPANY_EVENTS.length : kind === 'notion' ? PLAYBOOK_GUIDES.length : 0,
      scope: [NAMES[kind].account],
      lastSyncedAt: null,
      live: false,
    }));

  return {
    summaries,
    conflicts(window) {
      return CALENDAR_COMPANY_EVENTS.filter(block => overlaps(window.start, window.end, block.start, block.end)).map(block => ({
        ...block,
        provenance: 'seeded' as const,
      }));
    },
    playbooks() {
      return PLAYBOOK_GUIDES.map(guide => ({ ...guide, provenance: 'seeded' as const }));
    },
    reload(kind) {
      return summaries().find(item => item.id === kind) ?? null;
    },
  };
}
