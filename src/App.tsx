import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Sidebar, NavView } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { OverviewDashboard } from './components/OverviewDashboard.tsx';
import { PendingRequestsView } from './components/PendingRequestsView.tsx';
import { UpcomingEventsView } from './components/UpcomingEventsView.tsx';
import { PastEventsView } from './components/PastEventsView.tsx';
import { TemplatesView } from './components/TemplatesView.tsx';
import { PlaybooksView } from './components/PlaybooksView.tsx';
import { AnalyticsView } from './components/AnalyticsView.tsx';
import { ShowControlView } from './components/ShowControlView.tsx';
import { EventDetailView } from './components/EventDetailView.tsx';
import { NewEventModal } from './components/NewEventModal.tsx';
import { ReviewModal } from './components/ReviewModal.tsx';
import { SourcesModal } from './components/SourcesModal.tsx';
import { OfflineCacheModal } from './components/OfflineCacheModal.tsx';
import { OfflineBanner } from './components/OfflineBanner.tsx';
import {
  EventRecord,
  WorkspaceUser,
  EventTemplate,
  PlaybookGuide,
  ConnectedSourceSummary,
  CalendarConflict,
  OfflineQueueItem,
} from './types/index.ts';
import { api } from './services/api.ts';
import { indexedDbCache } from './services/indexedDbCache.ts';
import { WORKSPACE_USERS } from './data/initialData.ts';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

function eventIdFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/^\/eventos\/([^/]+)\/?$/);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

function publishEventUrl(eventId: string | null, mode: 'push' | 'replace') {
  const path = eventId ? `/eventos/${encodeURIComponent(eventId)}` : '/';
  if (window.location.pathname === path) return;
  const state = { eventId };
  if (mode === 'push') window.history.pushState(state, '', path);
  else window.history.replaceState(state, '', path);
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<WorkspaceUser | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceUser[]>(WORKSPACE_USERS);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [playbooks, setPlaybooks] = useState<PlaybookGuide[]>([]);
  const [connectedSources, setConnectedSources] = useState<ConnectedSourceSummary[]>([]);
  const [calendarConflicts, setCalendarConflicts] = useState<CalendarConflict[]>([]);

  const [currentView, setCurrentView] = useState<NavView>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(eventIdFromLocation);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Offline & IndexedDB Cache State
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [cachedEventsCount, setCachedEventsCount] = useState<number>(0);
  const [cachedTemplatesCount, setCachedTemplatesCount] = useState<number>(0);
  const [cachedPlaybooksCount, setCachedPlaybooksCount] = useState<number>(0);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>([]);
  const [isCacheModalOpen, setIsCacheModalOpen] = useState<boolean>(false);

  // Computed effective offline state
  const effectiveOffline = !isOnline || isSimulatedOffline;

  // Modals
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [newEventPrefill, setNewEventPrefill] = useState<Partial<EventRecord> | null>(null);

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewTargetEvent, setReviewTargetEvent] = useState<EventRecord | null>(null);
  const [reviewInitialAction, setReviewInitialAction] = useState<'accept' | 'reject' | 'request_changes'>('accept');

  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = (type: ToastNotification['type'], title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Refresh cache summary from IndexedDB
  const refreshCacheSummary = useCallback(async () => {
    try {
      const summary = await indexedDbCache.getCacheSummary();
      setCachedEventsCount(summary.count);
      setCachedTemplatesCount(summary.templatesCount);
      setCachedPlaybooksCount(summary.playbooksCount);
      setLastSyncTime(summary.lastSync);
      const queue = await indexedDbCache.getOfflineQueue();
      setOfflineQueue(queue);
    } catch (err) {
      console.warn('Erro ao atualizar resumo do cache:', err);
    }
  }, []);

  // Flush queued offline actions to backend server
  const flushOfflineQueue = async (): Promise<number> => {
    const queue = await indexedDbCache.getOfflineQueue();
    if (queue.length === 0) return 0;

    let successfulFlushes = 0;
    for (const item of queue) {
      try {
        if (item.type === 'review_event' && item.eventId) {
          await api.reviewEvent(item.eventId, item.payload.action, item.payload.reason, String(item.id));
        } else if (item.type === 'toggle_task' && item.eventId) {
          await api.toggleTask(item.eventId, item.payload.taskId, item.payload.completed, String(item.id));
        } else if (item.type === 'toggle_policy' && item.eventId) {
          await api.togglePolicyItem(item.eventId, item.payload.policyId, item.payload.completed, String(item.id));
        } else if (item.type === 'add_comment' && item.eventId) {
          await api.addComment(item.eventId, item.payload.content, String(item.id));
        } else if (item.type === 'add_resource' && item.eventId) {
          await api.addResource(item.eventId, item.payload.resource, String(item.id));
        } else if (item.type === 'create_event') {
          await api.createEvent(item.payload, String(item.id));
        }
        await indexedDbCache.removeOfflineQueueItem(item.id);
        successfulFlushes++;
      } catch (err) {
        console.warn('Erro ao sincronizar item offline:', item, err);
      }
    }
    return successfulFlushes;
  };

  // Sync with server and update IndexedDB
  const handleSyncNow = async (): Promise<void> => {
    if (isSyncing) return;
    try {
      setIsSyncing(true);

      // If simulated offline is active, notify user or proceed if online
      if (!isOnline) {
        throw new Error('Dispositivo sem conexão de rede física.');
      }

      // Flush pending queue
      const flushedCount = await flushOfflineQueue();

      // Pull fresh data from server
      const [evts, tpls, pbs, srcs] = await Promise.all([
        api.getEvents(),
        api.getTemplates(),
        api.getPlaybooks(),
        api.getConnectedSources(),
      ]);

      setEvents(evts);
      setTemplates(tpls);
      setPlaybooks(pbs);
      setConnectedSources(srcs);

      // Persist in IndexedDB
      await indexedDbCache.saveEvents(evts);
      await indexedDbCache.saveTemplates(tpls);
      await indexedDbCache.savePlaybooks(pbs);

      const nowIso = new Date().toISOString();
      await indexedDbCache.setMeta('last_sync_time', nowIso);
      setLastSyncTime(nowIso);
      await refreshCacheSummary();

      addToast(
        'success',
        'Sincronização Concluída',
        flushedCount > 0
          ? `${flushedCount} alteração(ões) offline enviadas ao hub e cache atualizado (${evts.length} eventos).`
          : `Dados atualizados com o servidor do hub e persistidos no IndexedDB (${evts.length} eventos).`
      );
    } catch (err: any) {
      console.warn('Erro durante sincronização:', err);
      addToast(
        'warning',
        'Falha na Sincronização',
        err.message || 'Não foi possível contatar o servidor. Continuando no modo cache local.'
      );
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // Clear all IndexedDB cache
  const handleClearCache = async () => {
    await indexedDbCache.clearAllCache();
    await refreshCacheSummary();
    addToast('info', 'Cache Limpo', 'O cache IndexedDB foi redefinido com sucesso.');
  };

  // Toggle simulated offline mode
  const handleToggleSimulatedOffline = () => {
    setIsSimulatedOffline(prev => {
      const next = !prev;
      if (next) {
        addToast(
          'warning',
          'Simulação Offline Ativada',
          'O aplicativo agora opera desconectado, consultando eventos e progresso via IndexedDB.'
        );
      } else {
        addToast(
          'success',
          'Simulação Offline Desativada',
          'Modo online restaurado. Sincronizando dados com o servidor...'
        );
        setTimeout(() => {
          handleSyncNow().catch(() => {});
        }, 300);
      }
      return next;
    });
  };

  // Initial load: Stale-While-Revalidate pattern using IndexedDB
  const loadData = async () => {
    // 1. Instantly read from IndexedDB cache if available
    try {
      const [cachedEvts, cachedTpls, cachedPbs] = await Promise.all([
        indexedDbCache.getEvents(),
        indexedDbCache.getTemplates(),
        indexedDbCache.getPlaybooks(),
      ]);

      if (cachedEvts && cachedEvts.length > 0) {
        setEvents(cachedEvts);
      }
      if (cachedTpls && cachedTpls.length > 0) {
        setTemplates(cachedTpls);
      }
      if (cachedPbs && cachedPbs.length > 0) {
        setPlaybooks(cachedPbs);
      }
      await refreshCacheSummary();
    } catch (err) {
      console.warn('Erro ao carregar dados do IndexedDB inicial:', err);
    }

    // 2. Fetch fresh data from network if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const [session, members, evts, tpls, pbs, srcs] = await Promise.all([
          api.getSession(),
          api.getWorkspaceMembers(),
          api.getEvents(),
          api.getTemplates(),
          api.getPlaybooks(),
          api.getConnectedSources(),
        ]);

        if (members && members.length) setWorkspaceMembers(members);
        if (!session) {
          setSignedIn(false);
          setCurrentUser(null);
          setEventsLoaded(true);
          return;
        }
        setCurrentUser(session.user);
        setSignedIn(true);
        if (evts && evts.length) {
          setEvents(evts);
          await indexedDbCache.saveEvents(evts);
        }
        if (tpls && tpls.length) {
          setTemplates(tpls);
          await indexedDbCache.saveTemplates(tpls);
        }
        if (pbs && pbs.length) {
          setPlaybooks(pbs);
          await indexedDbCache.savePlaybooks(pbs);
        }
        setConnectedSources(srcs);

        const nowIso = new Date().toISOString();
        await indexedDbCache.setMeta('last_sync_time', nowIso);
        setLastSyncTime(nowIso);
        await refreshCacheSummary();

        // Check conflicts for upcoming events
        const upcoming = evts.find(e => e.status === 'aprovado' || e.status === 'em_planejamento');
        if (upcoming) {
          const confs = await api.checkCalendarConflicts(upcoming.startDate, upcoming.endDate);
          setCalendarConflicts(confs);
        }
        setEventsLoaded(true);
      } catch (err) {
        console.warn('Servidor inacessível, mantendo dados do IndexedDB:', err);
        setEventsLoaded(true);
      }
    } else {
      setEventsLoaded(true);
    }
  };

  useEffect(() => {
    loadData();

    // Setup network online/offline listeners
    const handleOnline = () => {
      setIsOnline(true);
      addToast(
        'success',
        'Conexão Restabelecida',
        'Sua rede voltou. Sincronizando alterações gravadas no IndexedDB...'
      );
      handleSyncNow().catch(() => {});
    };

    const handleOffline = () => {
      setIsOnline(false);
      addToast(
        'warning',
        'Conexão Perdida',
        'Você está offline. O aplicativo agora opera via cache IndexedDB para consultas e visualização de progresso.'
      );
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const onPop = () => setSelectedEventId(eventIdFromLocation());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (!signedIn || !eventsLoaded || !selectedEventId) return;
    if (events.some(event => event.id === selectedEventId)) return;
    setSelectedEventId(null);
    publishEventUrl(null, 'replace');
  }, [signedIn, eventsLoaded, events, selectedEventId]);

  // Switch workspace user session
  const handleSwitchUser = async (user: WorkspaceUser) => {
    try {
      const signed = await api.devSignIn(user.email);
      setCurrentUser(signed);
      setSignedIn(true);
      addToast('info', 'Sessão do workspace', `Sessão local emitida para ${signed.name}. O servidor é quem confirma a identidade.`);
      if (!effectiveOffline) {
        const refreshed = await api.getEvents();
        setEvents(refreshed);
        setEventsLoaded(true);
        await indexedDbCache.saveEvents(refreshed);
        await refreshCacheSummary();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao abrir sessão.';
      addToast('error', 'Sessão recusada', message);
    }
  };

  // Filter events based on search query
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(
      e =>
        e.title.toLowerCase().includes(q) ||
        e.designatedOwnerName.toLowerCase().includes(q) ||
        e.requestedByName.toLowerCase().includes(q) ||
        (e.department && e.department.toLowerCase().includes(q)) ||
        e.location.toLowerCase().includes(q) ||
        e.objective.toLowerCase().includes(q)
    );
  }, [events, searchQuery]);

  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return events.find(e => e.id === selectedEventId) || null;
  }, [events, selectedEventId]);

  const pendingCount = useMemo(() => {
    return events.filter(e => e.status === 'solicitado' || e.status === 'em_revisao').length;
  }, [events]);

  // Actions
  const handleSelectEvent = (event: EventRecord) => {
    setSelectedEventId(event.id);
    publishEventUrl(event.id, 'push');
  };

  const handleBackToList = () => {
    setSelectedEventId(null);
    publishEventUrl(null, 'push');
  };

  const handleOpenReviewModal = (
    event: EventRecord,
    action: 'accept' | 'reject' | 'request_changes' = 'accept'
  ) => {
    setReviewTargetEvent(event);
    setReviewInitialAction(action);
    setIsReviewModalOpen(true);
  };

  const handleSubmitReview = async (
    eventId: string,
    action: 'accept' | 'reject' | 'request_changes',
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Sessão ausente.' };
    // Offline mutation handling
    if (effectiveOffline) {
      const target = events.find(e => e.id === eventId);
      if (!target) return { success: false, error: 'Evento não encontrado no cache local' };

      // Role check: Only designated owner can approve
      if (currentUser.email.toLowerCase() !== target.designatedOwnerEmail.toLowerCase()) {
        addToast(
          'error',
          'Permissão Negada',
          `Apenas o responsável formal (${target.designatedOwnerName}) tem alçada para aprovar ou rejeitar.`
        );
        return { success: false, error: 'Apenas o responsável formal pode aprovar' };
      }

      const updatedStatus: EventRecord['status'] =
        action === 'accept' ? 'aprovado' : action === 'reject' ? 'rejeitado' : 'em_revisao';

      const updatedEvent: EventRecord = {
        ...target,
        status: updatedStatus,
        updatedAt: new Date().toISOString(),
        activities: [
          {
            id: `act-offline-${Date.now()}`,
            timestamp: new Date().toISOString(),
            actorName: currentUser.name,
            actorEmail: currentUser.email,
            action: `REVISAO_${action.toUpperCase()}_OFFLINE`,
            details: `Decisão de ${action} registrada no modo offline IndexedDB. Motivo: ${reason || 'Conforme alçada'}`,
            category: 'status',
          },
          ...target.activities,
        ],
      };

      setEvents(prev => prev.map(e => (e.id === eventId ? updatedEvent : e)));
      await indexedDbCache.saveEvent(updatedEvent);
      await indexedDbCache.enqueueOfflineMutation({
        type: 'review_event',
        eventId,
        payload: { action, reason },
      });
      await refreshCacheSummary();

      addToast(
        'info',
        'Gravado no Cache IndexedDB',
        `A decisão de ${action === 'accept' ? 'aprovação' : action} foi persistida localmente e será enviada ao servidor do hub na reconexão.`
      );
      return { success: true };
    }

    try {
      const res = await api.reviewEvent(eventId, action, reason);
      if (res.success && res.event) {
        // Update local events and IndexedDB
        setEvents(prev => prev.map(e => (e.id === eventId ? res.event! : e)));
        await indexedDbCache.saveEvent(res.event);
        await refreshCacheSummary();
        addToast(
          'success',
          action === 'accept' ? 'Solicitação Aprovada!' : 'Decisão Registrada',
          action === 'accept'
            ? 'O evento foi formalmente aceito pelo responsável designado e agora está liberado para planejamento.'
            : `Solicitação atualizada com sucesso no arquivo local do hub.`
        );
        return { success: true };
      }
      return { success: false, error: res.error };
    } catch (err: any) {
      addToast('error', 'Acesso Negado (403 Forbidden)', err.message);
      return { success: false, error: err.message };
    }
  };

  const handleEventCreated = async (newEvent: EventRecord) => {
    setEvents(prev => [newEvent, ...prev]);
    setSelectedEventId(newEvent.id);
    publishEventUrl(newEvent.id, 'push');
    await indexedDbCache.saveEvent(newEvent);

    if (effectiveOffline) {
      await indexedDbCache.enqueueOfflineMutation({
        type: 'create_event',
        eventId: newEvent.id,
        payload: newEvent,
      });
      addToast(
        'info',
        'Evento Salvo no IndexedDB (Modo Offline)',
        `'${newEvent.title}' foi criado e persistido no armazenamento local do navegador.`
      );
    } else {
      addToast(
        'success',
        'Solicitação Criada com Sucesso!',
        `O evento '${newEvent.title}' foi registrado no hub e aguarda aprovação de ${newEvent.designatedOwnerName}.`
      );
    }
    await refreshCacheSummary();
  };

  const handleDuplicateEvent = async (sourceEvent: EventRecord) => {
    if (effectiveOffline) {
      const duplicated: EventRecord = {
        ...sourceEvent,
        id: `evt-offline-${Date.now().toString(36)}`,
        title: `${sourceEvent.title} (Nova Edição)`,
        status: 'solicitado',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tasks: sourceEvent.tasks.map(t => ({ ...t, id: `task-${Math.random()}`, completed: false })),
        milestones: sourceEvent.milestones.map(m => ({ ...m, id: `ms-${Math.random()}`, completed: false })),
      };
      setEvents(prev => [duplicated, ...prev]);
      setSelectedEventId(duplicated.id);
      publishEventUrl(duplicated.id, 'push');
      await indexedDbCache.saveEvent(duplicated);
      await indexedDbCache.enqueueOfflineMutation({
        type: 'create_event',
        eventId: sourceEvent.id,
        payload: {
          origin: { kind: 'duplicate', sourceEventId: sourceEvent.id },
          draft: { startDate: sourceEvent.startDate, endDate: sourceEvent.endDate },
        },
      });
      await refreshCacheSummary();
      addToast('info', 'Evento Duplicado no IndexedDB', 'Cópia criada e persistida no cache local.');
      return;
    }

    try {
      const duplicated = await api.duplicateEvent(sourceEvent.id);
      setEvents(prev => [duplicated, ...prev]);
      setSelectedEventId(duplicated.id);
      publishEventUrl(duplicated.id, 'push');
      await indexedDbCache.saveEvent(duplicated);
      await refreshCacheSummary();
      addToast(
        'success',
        'Evento Duplicado!',
        `Estrutura de '${sourceEvent.title}' duplicada com sucesso para uma nova edição.`
      );
    } catch (err: any) {
      addToast('error', 'Erro ao duplicar', err.message);
    }
  };

  const handleUseTemplate = (template: EventTemplate) => {
    setNewEventPrefill({
      title: `${template.name} Revloop`,
      type: template.type,
      targetAudience: template.description,
      objective: `Executar ${template.name} seguindo as diretrizes homologadas do Notion.`,
      format: template.defaultFormat,
      budget: parseInt(template.estimatedBudgetRange.replace(/[^0-9]/g, '')) || 15000,
      estimatedAttendees: parseInt(template.recommendedAttendees) || 60,
    });
    setIsNewEventModalOpen(true);
  };

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    if (!selectedEventId) return;

    if (effectiveOffline) {
      const target = events.find(e => e.id === selectedEventId);
      if (!target) return;

      const updated: EventRecord = {
        ...target,
        tasks: target.tasks.map(t => (t.id === taskId ? { ...t, completed } : t)),
        updatedAt: new Date().toISOString(),
      };
      setEvents(prev => prev.map(e => (e.id === selectedEventId ? updated : e)));
      await indexedDbCache.saveEvent(updated);
      await indexedDbCache.enqueueOfflineMutation({
        type: 'toggle_task',
        eventId: selectedEventId,
        payload: { taskId, completed },
      });
      await refreshCacheSummary();
      addToast('info', 'Tarefa Atualizada no IndexedDB', 'O status de progresso foi recalculado no cache local.');
      return;
    }

    try {
      const updated = await api.toggleTask(selectedEventId, taskId, completed);
      setEvents(prev => prev.map(e => (e.id === selectedEventId ? updated : e)));
      await indexedDbCache.saveEvent(updated);
    } catch (err: any) {
      addToast('error', 'Erro ao atualizar tarefa', err.message);
    }
  };

  const handleSetStageZone = async (zoneId: string, status: 'pendente' | 'em_montagem' | 'pronto' | 'bloqueado') => {
    if (!selectedEventId) return;
    if (effectiveOffline) {
      addToast('info', 'Sem conexão', 'A montagem só grava no hub com a sessão online.');
      return;
    }
    try {
      const updated = await api.setStageZone(selectedEventId, zoneId, status);
      setEvents(prev => prev.map(event => (event.id === selectedEventId ? updated : event)));
      await indexedDbCache.saveEvent(updated);
    } catch (err: any) {
      addToast('error', 'Erro na montagem', err.message);
    }
  };

  const handleTogglePolicy = async (policyId: string, completed: boolean) => {
    if (!selectedEventId) return;

    if (effectiveOffline) {
      const target = events.find(e => e.id === selectedEventId);
      if (!target) return;

      const updatedChecklist = target.policyChecklist.map(p =>
        p.id === policyId ? { ...p, completed } : p
      );
      const completedCount = updatedChecklist.filter(p => p.completed).length;
      const score = Math.round((completedCount / updatedChecklist.length) * 100);

      const updated: EventRecord = {
        ...target,
        policyChecklist: updatedChecklist,
        policyComplianceScore: score,
        updatedAt: new Date().toISOString(),
      };
      setEvents(prev => prev.map(e => (e.id === selectedEventId ? updated : e)));
      await indexedDbCache.saveEvent(updated);
      await indexedDbCache.enqueueOfflineMutation({
        type: 'toggle_policy',
        eventId: selectedEventId,
        payload: { policyId, completed },
      });
      await refreshCacheSummary();
      addToast('info', 'Checklist de Política Gravado no IndexedDB', 'Pontuação de conformidade atualizada.');
      return;
    }

    try {
      const updated = await api.togglePolicyItem(selectedEventId, policyId, completed);
      setEvents(prev => prev.map(e => (e.id === selectedEventId ? updated : e)));
      await indexedDbCache.saveEvent(updated);
      addToast('success', 'Conformidade Atualizada', 'O checklist de políticas corporativas foi registrado na trilha do hub.');
    } catch (err: any) {
      addToast('error', 'Erro ao atualizar política', err.message);
    }
  };

  const handleAddComment = async (content: string) => {
    if (!selectedEventId || !currentUser) return;

    if (effectiveOffline) {
      const target = events.find(e => e.id === selectedEventId);
      if (!target) return;

      const newComment = {
        id: `cmt-offline-${Date.now()}`,
        authorName: currentUser.name,
        authorEmail: currentUser.email,
        authorRole: currentUser.role,
        authorAvatar: currentUser.avatar,
        content,
        createdAt: new Date().toISOString(),
      };

      const updated: EventRecord = {
        ...target,
        comments: [...target.comments, newComment],
        updatedAt: new Date().toISOString(),
      };
      setEvents(prev => prev.map(e => (e.id === selectedEventId ? updated : e)));
      await indexedDbCache.saveEvent(updated);
      await indexedDbCache.enqueueOfflineMutation({
        type: 'add_comment',
        eventId: selectedEventId,
        payload: { content },
      });
      await refreshCacheSummary();
      addToast('info', 'Comentário Gravado no IndexedDB', 'Nota salva com persistência local.');
      return;
    }

    try {
      const result = await api.addComment(selectedEventId, content);
      setEvents(prev => prev.map(e => (e.id === selectedEventId ? result.event : e)));
      await indexedDbCache.saveEvent(result.event);
      addToast('success', 'Comentário Publicado', 'Sua nota foi gravada no registro do evento.');
    } catch (err: any) {
      addToast('error', 'Erro ao comentar', err.message);
    }
  };

  const handleAddResource = async (resource: { type: string; title: string; url: string; description?: string }) => {
    if (!selectedEventId || !currentUser) return;

    if (effectiveOffline) {
      const target = events.find(e => e.id === selectedEventId);
      if (!target) return;

      const newResourceItem = {
        id: `res-offline-${Date.now()}`,
        type: resource.type as any,
        title: resource.title,
        url: resource.url,
        description: resource.description,
        addedBy: currentUser.name,
        addedAt: new Date().toISOString(),
      };

      const updated: EventRecord = {
        ...target,
        resources: [...target.resources, newResourceItem],
        updatedAt: new Date().toISOString(),
      };
      setEvents(prev => prev.map(e => (e.id === selectedEventId ? updated : e)));
      await indexedDbCache.saveEvent(updated);
      await indexedDbCache.enqueueOfflineMutation({
        type: 'add_resource',
        eventId: selectedEventId,
        payload: { resource },
      });
      await refreshCacheSummary();
      addToast('info', 'Recurso Vinculado no IndexedDB', 'Link corporativo salvo localmente.');
      return;
    }

    try {
      const updated = await api.addResource(selectedEventId, resource);
      setEvents(prev => prev.map(e => (e.id === selectedEventId ? updated : e)));
      await indexedDbCache.saveEvent(updated);
      addToast('success', 'Recurso Vinculado', 'O link corporativo foi adicionado com sucesso.');
    } catch (err: any) {
      addToast('error', 'Erro ao vincular recurso', err.message);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <h1 className="text-xl font-semibold">Workspace de demonstração</h1>
          <p className="text-sm text-slate-400 mt-2">
            A sessão é emitida pelo servidor para um membro do workspace. Não há entrada automática.
          </p>
          <div className="mt-4 space-y-2">
            {workspaceMembers.map(member => (
              <button
                key={member.id}
                type="button"
                onClick={() => handleSwitchUser(member)}
                className="w-full text-left px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-600"
              >
                <span className="block text-sm font-medium">{member.name}</span>
                <span className="block text-xs text-slate-400">{member.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 antialiased overflow-hidden">
      {/* Toast notifications container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-lg border flex items-start gap-3 transition-all duration-300 animate-in slide-in-from-top-2 ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : toast.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : toast.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-slate-900 border-slate-800 text-white'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
            {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold leading-tight">{toast.title}</p>
              <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-current opacity-60 hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-1 w-full overflow-hidden">
        {/* Global Sidebar Navigation */}
        {mobileNavOpen && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
            aria-label="Fechar navegação"
            onClick={() => setMobileNavOpen(false)}
          />
        )}
        <Sidebar
          currentView={currentView}
          mobileOpen={mobileNavOpen}
          onSelectView={(view: NavView) => {
            setSelectedEventId(null);
            publishEventUrl(null, 'push');
            setCurrentView(view);
            setMobileNavOpen(false);
          }}
          pendingCount={pendingCount}
          currentUser={currentUser}
          connectedSources={connectedSources}
          onOpenNewModal={() => {
            setNewEventPrefill(null);
            setIsNewEventModalOpen(true);
          }}
          onOpenSourcesModal={() => setIsSourcesModalOpen(true)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <Header
            currentUser={currentUser}
            workspaceMembers={workspaceMembers}
            onSwitchUser={handleSwitchUser}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            conflicts={calendarConflicts}
            onOpenConflictModal={() => {
              setCurrentView('overview');
            }}
            onOpenNewEventModal={() => {
              setNewEventPrefill(null);
              setIsNewEventModalOpen(true);
            }}
            isOnline={isOnline}
            isSimulatedOffline={isSimulatedOffline}
            cachedEventsCount={cachedEventsCount}
            onOpenCacheModal={() => setIsCacheModalOpen(true)}
            onOpenNav={() => setMobileNavOpen(true)}
          />

          <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto">
            {/* Offline Alert Banner if offline or simulated */}
            {effectiveOffline && (
              <OfflineBanner
                isSimulatedOffline={isSimulatedOffline}
                onToggleSimulatedOffline={handleToggleSimulatedOffline}
                cachedEventsCount={cachedEventsCount}
                lastSyncTime={lastSyncTime}
                onOpenCacheModal={() => setIsCacheModalOpen(true)}
                onSyncNow={handleSyncNow}
                isSyncing={isSyncing}
              />
            )}

            {selectedEvent ? (
              <EventDetailView
                event={selectedEvent}
                currentUser={currentUser}
                onBack={handleBackToList}
                onToggleTask={handleToggleTask}
                onTogglePolicy={handleTogglePolicy}
                onSetStageZone={handleSetStageZone}
                onAddComment={handleAddComment}
                onAddResource={handleAddResource}
                onOpenReviewModal={action => handleOpenReviewModal(selectedEvent, action)}
                onDuplicateEvent={() => handleDuplicateEvent(selectedEvent)}
                calendarConflicts={calendarConflicts}
                isOffline={effectiveOffline}
              />
            ) : (
              <>
                {currentView === 'overview' && (
                  <OverviewDashboard
                    events={filteredEvents}
                    currentUser={currentUser}
                    onSelectEvent={handleSelectEvent}
                    onNavigateToView={v => setCurrentView(v)}
                    onOpenNewModal={() => {
                      setNewEventPrefill(null);
                      setIsNewEventModalOpen(true);
                    }}
                    calendarConflicts={calendarConflicts}
                    connectedSources={connectedSources}
                    onOpenSourcesModal={() => setIsSourcesModalOpen(true)}
                  />
                )}

                {currentView === 'pending' && (
                  <PendingRequestsView
                    events={filteredEvents}
                    currentUser={currentUser}
                    onSelectEvent={handleSelectEvent}
                    onOpenReviewModal={handleOpenReviewModal}
                    onOpenNewModal={() => {
                      setNewEventPrefill(null);
                      setIsNewEventModalOpen(true);
                    }}
                  />
                )}

                {currentView === 'upcoming' && (
                  <UpcomingEventsView
                    events={filteredEvents}
                    onSelectEvent={handleSelectEvent}
                    onOpenNewModal={() => {
                      setNewEventPrefill(null);
                      setIsNewEventModalOpen(true);
                    }}
                  />
                )}

                {currentView === 'controle' && (
                  <ShowControlView events={filteredEvents} onSelectEvent={handleSelectEvent} />
                )}

                {currentView === 'past' && (
                  <PastEventsView
                    events={filteredEvents}
                    onSelectEvent={handleSelectEvent}
                    onDuplicateEvent={handleDuplicateEvent}
                  />
                )}

                {currentView === 'analytics' && (
                  <AnalyticsView
                    events={events}
                    currentUser={currentUser}
                    onSelectEvent={handleSelectEvent}
                    onNavigateToView={v => setCurrentView(v)}
                  />
                )}

                {currentView === 'templates' && (
                  <TemplatesView
                    templates={templates}
                    onUseTemplate={handleUseTemplate}
                    onNavigateToPlaybooks={() => setCurrentView('playbooks')}
                  />
                )}

                {currentView === 'playbooks' && (
                  <PlaybooksView playbooks={playbooks} />
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Modals */}
      <NewEventModal
        isOpen={isNewEventModalOpen}
        onClose={() => setIsNewEventModalOpen(false)}
        workspaceMembers={workspaceMembers}
        currentUser={currentUser}
        onEventCreated={handleEventCreated}
        prefillData={newEventPrefill}
      />

      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        event={reviewTargetEvent}
        currentUser={currentUser}
        initialAction={reviewInitialAction}
        onSubmitReview={handleSubmitReview}
      />

      <SourcesModal
        isOpen={isSourcesModalOpen}
        onClose={() => setIsSourcesModalOpen(false)}
        sources={connectedSources}
        onSourceUpdated={updated => {
          setConnectedSources(prev => prev.map(s => (s.id === updated.id ? updated : s)));
          addToast('success', 'Fonte Sincronizada', `${updated.name} atualizada com sucesso.`);
        }}
      />

      {/* IndexedDB Offline Cache Management Modal */}
      <OfflineCacheModal
        isOpen={isCacheModalOpen}
        onClose={() => setIsCacheModalOpen(false)}
        isOnline={isOnline}
        isSimulatedOffline={isSimulatedOffline}
        onToggleSimulatedOffline={handleToggleSimulatedOffline}
        cachedEventsCount={cachedEventsCount}
        cachedTemplatesCount={cachedTemplatesCount}
        cachedPlaybooksCount={cachedPlaybooksCount}
        lastSyncTime={lastSyncTime}
        offlineQueue={offlineQueue}
        isSyncing={isSyncing}
        onSyncNow={handleSyncNow}
        onClearCache={handleClearCache}
      />
    </div>
  );
}
