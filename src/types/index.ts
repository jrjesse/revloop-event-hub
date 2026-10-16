export type EventType =
  | 'show'
  | 'festival'
  | 'meetup'
  | 'jantar_clientes'
  | 'webinar'
  | 'recrutamento'
  | 'offsite'
  | 'conferencia'
  | 'workshop';

export type StageZoneStatus = 'pendente' | 'em_montagem' | 'pronto' | 'bloqueado';

export interface StageZone {
  id: string;
  label: string;
  detail: string;
  x: number;
  y: number;
  w: number;
  h: number;
  status: StageZoneStatus;
}

export type ControlTone = 'pronto' | 'andamento' | 'bloqueado' | 'encerrado';

export interface ControlChannel {
  id: string;
  label: string;
  value: string;
  detail: string;
}

export interface ControlDesk {
  id: 'ingressos' | 'pagamentos' | 'palco' | 'crm' | 'transmissao' | 'controle';
  title: string;
  tone: ControlTone;
  headline: string;
  channels: ControlChannel[];
}

export interface ShowCue {
  id: string;
  label: string;
  time: string;
  state: 'feito' | 'agora' | 'proximo' | 'aguardando';
}

/** Operational picture composed from the event. It is not a live box-office or encoder feed. */
export interface ShowControlBoard {
  provenance: 'quadro_do_hub';
  attraction: string;
  desks: ControlDesk[];
  cues: ShowCue[];
}

export type EventStatus =
  | 'solicitado'
  | 'em_revisao'
  | 'aprovado'
  | 'rejeitado'
  | 'em_planejamento'
  | 'concluido'
  | 'cancelado';

export type EventHealth = 'saudavel' | 'atencao' | 'critico' | 'concluido';

export type EventFormat = 'presencial' | 'hibrido' | 'virtual';

export interface WorkspaceUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar: string;
}

export interface Milestone {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  ownerName: string;
  phase: 'planejamento' | 'divulgacao' | 'operacao' | 'pos_evento';
}

export interface EventTask {
  id: string;
  title: string;
  category: 'logistica' | 'marketing' | 'conteudo' | 'fornecedores' | 'financeiro';
  assignedTo: string;
  assignedEmail: string;
  completed: boolean;
  dueDate: string;
  priority: 'alta' | 'media' | 'baixa';
}

export interface PolicyCheckItem {
  id: string;
  category:
    | 'aprovacoes_gerais'
    | 'acessibilidade'
    | 'swag_brindes'
    | 'avaliacao_fornecedores'
    | 'privacidade_lgpd'
    | 'comunicacoes';
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface EventComment {
  id: string;
  authorName: string;
  authorEmail: string;
  authorRole: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
  isOwnerNote?: boolean;
}

export interface EventResourceLink {
  id: string;
  type: 'drive' | 'slack' | 'notion' | 'calendar' | 'external';
  title: string;
  url: string;
  description?: string;
  metadata?: string;
}

export interface ActivityUpdate {
  id: string;
  timestamp: string;
  actorName: string;
  actorEmail: string;
  action: string;
  details: string;
  category: 'status' | 'tarefa' | 'politica' | 'comentario' | 'orçamento';
}

export interface AuditLogRecord {
  id: string;
  eventId: string;
  timestamp: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  actorAvatar?: string;
  fieldName: string;
  fieldKey: string;
  oldValue: string;
  newValue: string;
  changeType: 'criacao' | 'aprovacao' | 'rejeicao' | 'revisao' | 'edicao_campo' | 'tarefa' | 'compliance' | 'comentario' | 'recurso' | 'negado' | 'importacao';
  changeSummary: string;
  entryHash: string;
  prevHash: string;
  identityMode: 'local_dev' | 'system';
  isSystemAudit?: boolean;
}

export interface ConnectedSourceSummary {
  id: string;
  source: 'google_calendar' | 'slack' | 'google_drive' | 'notion';
  name: string;
  status: 'exemplo_semeado' | 'conectado' | 'sincronizado' | 'atencao';
  accountOrWorkspace: string;
  lastSync: string;
  details: string;
  itemCount: number;
}

export interface CalendarConflict {
  conflictingEventTitle: string;
  organizer: string;
  start: string;
  end: string;
  location?: string;
  severity: 'alto' | 'medio' | 'baixo';
  description: string;
}

export interface EventRecord {
  id: string;
  title: string;
  type: EventType;
  department?: string;
  targetAudience: string;
  objective: string;
  designatedOwnerName: string;
  designatedOwnerEmail: string;
  requestedByName: string;
  requestedByEmail: string;
  createdAt: string;
  updatedAt: string;
  startDate: string;
  endDate: string;
  format: EventFormat;
  location: string;
  budget: number;
  spentBudget?: number;
  estimatedAttendees: number;
  actualAttendees?: number;
  attraction?: string;
  venueCapacity?: number;
  broadcastPlanned?: boolean;
  showControl?: ShowControlBoard;
  stagePlan?: StageZone[];
  suppliers: string[];
  status: EventStatus;
  health: EventHealth;
  policyComplianceScore: number;
  rejectionReason?: string;
  notes?: string;
  slackChannel?: string;
  driveFolderUrl?: string;
  notionPlaybookUrl?: string;
  calendarEventId?: string;
  milestones: Milestone[];
  tasks: EventTask[];
  policyChecklist: PolicyCheckItem[];
  comments: EventComment[];
  resources: EventResourceLink[];
  activities: ActivityUpdate[];
  auditTrail?: AuditLogRecord[];
  viewer?: { isOwner: boolean; canReview: boolean };
}

export interface EventTemplate {
  id: string;
  name: string;
  type: EventType;
  description: string;
  targetAudience?: string;
  recommendedAttendees: string;
  estimatedBudgetRange: string;
  leadTimeDays: number;
  defaultFormat: EventFormat;
  tags: string[];
  defaultMilestones: Omit<Milestone, 'id' | 'completed'>[];
  defaultTasks: Omit<EventTask, 'id' | 'completed'>[];
  defaultPolicyItems: Omit<PolicyCheckItem, 'id' | 'completed'>[];
  defaultResourceTemplates: Omit<EventResourceLink, 'id'>[];
}

export interface PlaybookGuide {
  id: string;
  title: string;
  category: PolicyCheckItem['category'];
  version: string;
  updatedAt: string;
  summary: string;
  fullContent: string;
  notionUrl: string;
  mandatoryFor: EventType[];
}

export interface DepartmentApprovalMetric {
  department: string;
  totalEvents: number;
  decidedEventsCount: number;
  approvedCount: number;
  pendingCount: number;
  inRevisionCount: number;
  rejectedCount: number;
  averageApprovalHours: number;
  averageApprovalDays: number;
  medianApprovalHours: number;
  minApprovalHours: number;
  maxApprovalHours: number;
  slaTargetHours: number;
  slaCompliancePercent: number;
  isBottleneck: boolean;
  bottleneckSeverity: 'normal' | 'atencao' | 'critico';
  longestPendingEvent?: {
    id: string;
    title: string;
    requestedBy: string;
    designatedOwner: string;
    hoursPending: number;
    budget: number;
  };
  keyDesignatedOwners: string[];
}

export interface GovernanceAnalyticsSummary {
  globalAverageHours: number;
  globalAverageDays: number;
  totalEventsEvaluated: number;
  globalSlaRate: number;
  fastestDepartment: string;
  bottleneckDepartment: string;
  criticalPendingCount: number;
  departmentMetrics: DepartmentApprovalMetric[];
  monthlyTrends: {
    monthKey: string;
    monthLabel: string;
    averageHours: number;
    totalEvaluated: number;
    slaComplianceRate: number;
  }[];
  bottleneckAlerts: {
    id: string;
    type: 'sla_breach' | 'high_latency' | 'backlog_pileup';
    department: string;
    title: string;
    description: string;
    recommendation: string;
    severity: 'atencao' | 'critico';
  }[];
}

export interface OfflineQueueItem {
  id: number;
  timestamp: string;
  type: 'review_event' | 'toggle_task' | 'toggle_policy' | 'add_comment' | 'add_resource' | 'create_event';
  eventId?: string;
  payload: any;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
}

export interface CacheMetadata {
  lastSyncTime: string | null;
  eventsCount: number;
  templatesCount: number;
  playbooksCount: number;
  offlineQueueCount: number;
  storageSizeBytes?: number;
}
