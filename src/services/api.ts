import {
  EventRecord,
  WorkspaceUser,
  CalendarConflict,
  EventTemplate,
  PlaybookGuide,
  ConnectedSourceSummary,
  EventComment,
  AuditLogRecord,
  GovernanceAnalyticsSummary,
} from '../types/index.ts';

class ApiService {
  private headers(commandId?: string, json = false): Record<string, string> {
    const headers: Record<string, string> = {};
    if (json) headers['Content-Type'] = 'application/json';
    if (commandId) headers['Idempotency-Key'] = commandId;
    return headers;
  }

  public async getSession(): Promise<{ user: WorkspaceUser; identityMode: string; store?: { label: string } } | null> {
    const res = await fetch('/api/session', { headers: this.headers() });
    if (res.status === 401) return null;
    const data = await res.json();
    if (!res.ok) return null;
    return { user: data.user, identityMode: data.identityMode, store: data.store };
  }

  public async devSignIn(email: string): Promise<WorkspaceUser> {
    const res = await fetch('/api/session/dev', {
      method: 'POST',
      headers: this.headers(undefined, true),
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Não foi possível abrir a sessão.');
    return data.user;
  }

  public async getWorkspaceMembers(): Promise<WorkspaceUser[]> {
    const res = await fetch('/api/workspace/members', { headers: this.headers() });
    const data = await res.json();
    return data.members || [];
  }

  public async getOverviewStats(): Promise<{
    total: number;
    pending: number;
    upcoming: number;
    completed: number;
    totalBudget: number;
    spentBudget: number;
    avgCompliance: number;
    sourcesConnected: number;
  }> {
    const res = await fetch('/api/overview/stats', { headers: this.headers() });
    const data = await res.json();
    return data.stats;
  }

  public async getGovernanceAnalytics(slaTarget: number = 48, timeframe: string = 'all'): Promise<GovernanceAnalyticsSummary> {
    const query = new URLSearchParams({ sla: slaTarget.toString(), timeframe });
    const res = await fetch(`/api/analytics/governance?${query.toString()}`, { headers: this.headers() });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Erro ao carregar métricas de governança');
    return data.analytics;
  }

  public async getEvents(params?: {
    status?: string;
    type?: string;
    view?: 'overview' | 'pending' | 'upcoming' | 'past' | 'all';
    search?: string;
  }): Promise<EventRecord[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.type) query.set('type', params.type);
    if (params?.view) query.set('view', params.view);
    if (params?.search) query.set('search', params.search);

    const res = await fetch(`/api/events?${query.toString()}`, { headers: this.headers() });
    const data = await res.json();
    return data.events || [];
  }

  public async getEventById(id: string): Promise<EventRecord> {
    const res = await fetch(`/api/events/${id}`, { headers: this.headers() });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Erro ao carregar evento');
    return data.event;
  }

  public async getEventAuditTrail(id: string): Promise<AuditLogRecord[]> {
    const res = await fetch(`/api/events/${id}/audit-trail`, { headers: this.headers() });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Erro ao carregar histórico de auditoria');
    return data.auditTrail || [];
  }

  public async createEvent(payload: Partial<EventRecord> | { origin: { kind: 'intake' } | { kind: 'template'; templateId: string } | { kind: 'duplicate'; sourceEventId: string }; draft?: Partial<EventRecord> }, commandId?: string): Promise<{ event: EventRecord; conflicts?: CalendarConflict[] }> {
    const body = payload && typeof payload === 'object' && 'origin' in payload ? payload : { origin: { kind: 'intake' }, draft: payload };
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: this.headers(commandId, true),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Erro ao criar solicitação de evento');
    }
    return { event: data.event, conflicts: data.conflicts };
  }

  public async reviewEvent(
    id: string,
    action: 'accept' | 'reject' | 'request_changes',
    reason?: string,
    commandId?: string
  ): Promise<{ success: boolean; event?: EventRecord; error?: string }> {
    const res = await fetch(`/api/events/${id}/review`, {
      method: 'POST',
      headers: this.headers(commandId, true),
      body: JSON.stringify({ action, reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      // 403 Forbidden or 400
      throw new Error(data.error || 'Falha ao processar revisão');
    }
    return data;
  }

  public async duplicateEvent(id: string, dates?: { startDate: string; endDate?: string }, commandId?: string): Promise<EventRecord> {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: this.headers(commandId, true),
      body: JSON.stringify({
        origin: { kind: 'duplicate', sourceEventId: id },
        draft: { startDate: dates?.startDate, endDate: dates?.endDate },
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Erro ao duplicar evento');
    }
    return data.event;
  }

  public async toggleTask(eventId: string, taskId: string, completed: boolean, commandId?: string): Promise<EventRecord> {
    const res = await fetch(`/api/events/${eventId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: this.headers(commandId, true),
      body: JSON.stringify({ completed }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao atualizar tarefa');
    return data.event;
  }

  public async setStageZone(eventId: string, zoneId: string, status: 'pendente' | 'em_montagem' | 'pronto' | 'bloqueado', commandId?: string): Promise<EventRecord> {
    const res = await fetch(`/api/events/${eventId}/stage/${zoneId}`, {
      method: 'PATCH',
      headers: this.headers(commandId, true),
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao atualizar a montagem');
    return data.event;
  }

  public async togglePolicyItem(eventId: string, policyId: string, completed: boolean, commandId?: string): Promise<EventRecord> {
    const res = await fetch(`/api/events/${eventId}/policies/${policyId}`, {
      method: 'PATCH',
      headers: this.headers(commandId, true),
      body: JSON.stringify({ completed }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao atualizar checklist de política');
    return data.event;
  }

  public async addComment(eventId: string, content: string, commandId?: string): Promise<{ event: EventRecord; comment: EventComment }> {
    const res = await fetch(`/api/events/${eventId}/comments`, {
      method: 'POST',
      headers: this.headers(commandId, true),
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao publicar comentário');
    return { event: data.event, comment: data.comment };
  }

  public async addResource(eventId: string, resource: { type: string; title: string; url: string; description?: string }, commandId?: string): Promise<EventRecord> {
    const res = await fetch(`/api/events/${eventId}/resources`, {
      method: 'POST',
      headers: this.headers(commandId, true),
      body: JSON.stringify(resource),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao vincular recurso');
    return data.event;
  }

  public async getTemplates(): Promise<EventTemplate[]> {
    const res = await fetch('/api/templates', { headers: this.headers() });
    const data = await res.json();
    return data.templates || [];
  }

  public async getPlaybooks(): Promise<PlaybookGuide[]> {
    const res = await fetch('/api/playbooks', { headers: this.headers() });
    const data = await res.json();
    return data.playbooks || [];
  }

  public async getConnectedSources(): Promise<ConnectedSourceSummary[]> {
    const res = await fetch('/api/integrations/sources', { headers: this.headers() });
    const data = await res.json();
    return data.sources || [];
  }

  public async syncSource(id: string): Promise<ConnectedSourceSummary> {
    const res = await fetch(`/api/integrations/sources/${id}/sync`, {
      method: 'POST',
      headers: this.headers(),
    });
    const data = await res.json();
    return data.source;
  }

  public async checkCalendarConflicts(start: string, end: string): Promise<CalendarConflict[]> {
    if (!start) return [];
    const query = new URLSearchParams({ start, end: end || start });
    const res = await fetch(`/api/integrations/calendar/conflicts?${query.toString()}`, { headers: this.headers() });
    const data = await res.json();
    return data.conflicts || [];
  }
}

export const api = new ApiService();
