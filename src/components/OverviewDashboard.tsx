import React from 'react';
import {
  Clock,
  CalendarCheck,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  CheckSquare,
  Users,
  DollarSign,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import {
  EventRecord,
  WorkspaceUser,
  CalendarConflict,
  ConnectedSourceSummary,
} from '../types/index.ts';
import { BudgetAnalyticsChart } from './BudgetAnalyticsChart.tsx';
import { boardFor } from '../domain/showControl.ts';
import { ShowControlPanel } from './ShowControlPanel.tsx';

interface OverviewDashboardProps {
  events: EventRecord[];
  currentUser: WorkspaceUser;
  onSelectEvent: (event: EventRecord) => void;
  onNavigateToView: (view: any) => void;
  onOpenNewModal: () => void;
  calendarConflicts: CalendarConflict[];
  connectedSources: ConnectedSourceSummary[];
  onOpenSourcesModal: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  events,
  currentUser,
  onSelectEvent,
  onNavigateToView,
  onOpenNewModal,
  calendarConflicts,
  connectedSources,
  onOpenSourcesModal,
}) => {
  const pendingRequests = events.filter(e => e.status === 'solicitado' || e.status === 'em_revisao');
  const upcomingEvents = events.filter(e => e.status === 'aprovado' || e.status === 'em_planejamento');
  const featuredShow = [...events]
    .filter(event => event.status === 'aprovado' || event.status === 'em_planejamento' || event.status === 'solicitado' || event.status === 'em_revisao')
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];

  // Requests assigned specifically to the active user
  const assignedToMePending = pendingRequests.filter(
    e => e.designatedOwnerEmail.toLowerCase() === currentUser.email.toLowerCase()
  );

  const totalBudget = events.reduce((sum, e) => sum + (e.budget || 0), 0);
  const spentBudget = events.reduce((sum, e) => sum + (e.spentBudget || 0), 0);
  const avgCompliance =
    events.length > 0
      ? Math.round(events.reduce((sum, e) => sum + (e.policyComplianceScore || 0), 0) / events.length)
      : 0;

  // Next upcoming milestones
  const allMilestones = events
    .flatMap(e =>
      e.milestones.map(m => ({
        ...m,
        eventTitle: e.title,
        eventId: e.id,
        eventHealth: e.health,
      }))
    )
    .filter(m => !m.completed)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  // Recent activity stream
  const allActivities = events
    .flatMap(e =>
      e.activities.map(a => ({
        ...a,
        eventTitle: e.title,
        eventId: e.id,
      }))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      {/* Welcome & Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            Central de Comando de Operações
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Controle de shows e eventos
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ingresso, pagamento, palco, público e transmissão, com o aceite do responsável no servidor.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => onNavigateToView('analytics')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
            <span>Analytics de SLA</span>
          </button>
          <button
            onClick={() => onNavigateToView('templates')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Ver Modelos</span>
          </button>
          <button
            onClick={() => onNavigateToView('controle')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-900" />
            <span>Controle do show</span>
          </button>
          <button
            onClick={onOpenNewModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-all shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-900" />
            <span>Nova Solicitação</span>
          </button>
        </div>
      </div>

      {featuredShow && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
          <ShowControlPanel board={boardFor(featuredShow)} compact />
          <button
            type="button"
            onClick={() => onSelectEvent(featuredShow)}
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950"
          >
            Abrir {featuredShow.title}
          </button>
        </div>
      )}

      {/* Google Agenda Conflict Banner if detected */}
      {calendarConflicts.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200/80 text-amber-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800 mt-0.5 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Atenção: conflito de agenda nos exemplos
                </span>
                <span className="text-[10px] bg-amber-200/80 text-amber-900 font-semibold px-2 py-0.5 rounded-full">
                  {calendarConflicts.length} {calendarConflicts.length === 1 ? 'evento conflitante' : 'eventos conflitantes'}
                </span>
              </div>
              <p className="text-xs text-amber-900 mt-0.5">
                Existem eventos de alta prioridade da empresa agendados na mesma janela de datas planejadas (ex: All-Hands corporativo).
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {calendarConflicts.map((c, idx) => (
                  <div
                    key={idx}
                    className="text-[11px] bg-white/80 border border-amber-300/80 px-2.5 py-1 rounded-md text-amber-900 font-medium"
                  >
                    <strong>{c.conflictingEventTitle}</strong> · {new Date(c.start).toLocaleDateString('pt-BR')} ({c.location})
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigateToView('pending')}
            className="shrink-0 text-xs font-semibold px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-950 rounded-lg transition-colors cursor-pointer"
          >
            Revisar Solicitações
          </button>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Approvals */}
        <div
          onClick={() => onNavigateToView('pending')}
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Solicitações Pendentes</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{pendingRequests.length}</span>
            {assignedToMePending.length > 0 && (
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                {assignedToMePending.length} sob sua alçada
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Aguardando decisão do responsável</p>
        </div>

        {/* Confirmed / In Planning */}
        <div
          onClick={() => onNavigateToView('upcoming')}
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Próximos Confirmados</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{upcomingEvents.length}</span>
            <span className="text-[11px] text-slate-500">em planejamento</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Datas bloqueadas e aprovadas</p>
        </div>

        {/* Policy Compliance Index */}
        <div
          onClick={() => onNavigateToView('playbooks')}
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Conformidade de Políticas</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{avgCompliance}%</span>
            <span className="text-[11px] font-semibold text-indigo-800 bg-indigo-100 px-1.5 py-0.5 rounded">
              Auditoria
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Média das 6 diretrizes do Notion</p>
        </div>

        {/* Budget Allocation */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Orçamento Comprometido</span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-extrabold text-slate-900">{formatCurrency(spentBudget)}</span>
            <span className="text-[11px] text-slate-500">de {formatCurrency(totalBudget)}</span>
          </div>
          {/* Simple progress bar */}
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.round((spentBudget / (totalBudget || 1)) * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Recharts Annual & Quarterly Budget Distribution Analytics */}
      <BudgetAnalyticsChart events={events} />

      {/* Main Grid: Pending Approvals & Health Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Actionable Pending Approvals & Upcoming Milestones */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending Approvals Card */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Solicitações que Requerem Avaliação ({pendingRequests.length})
                </h3>
              </div>
              <button
                onClick={() => onNavigateToView('pending')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Ver todas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {pendingRequests.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  Nenhuma solicitação pendente no momento. Todas as propostas foram avaliadas!
                </div>
              ) : (
                pendingRequests.map(req => {
                  const isResponsible =
                    req.viewer?.isOwner ??
                    req.designatedOwnerEmail.toLowerCase() === currentUser.email.toLowerCase();
                  return (
                    <div
                      key={req.id}
                      onClick={() => onSelectEvent(req)}
                      className="p-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
                            {req.type.replace('_', ' ')}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 hover:text-emerald-600 transition-colors">
                            {req.title}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{req.objective}</p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                          <span>
                            Solicitado por: <strong className="text-slate-700">{req.requestedByName}</strong>
                          </span>
                          <span>·</span>
                          <span>
                            Responsável: <strong className="text-slate-800">{req.designatedOwnerName}</strong>
                          </span>
                          <span>·</span>
                          <span>{formatCurrency(req.budget)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                        {isResponsible ? (
                          <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500 text-slate-950 flex items-center gap-1 shadow-xs">
                            <CheckSquare className="w-3.5 h-3.5" />
                            Avaliar Agora
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-medium text-slate-500 bg-slate-100 rounded border border-slate-200">
                            Aguardando {req.designatedOwnerName.split(' ')[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Upcoming Milestones */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Próximos Marcos Importantes da Operação
                </h3>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {allMilestones.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Nenhum marco pendente cadastrado.
                </div>
              ) : (
                allMilestones.map(m => (
                  <div
                    key={m.id}
                    onClick={() => {
                      const evt = events.find(e => e.id === m.eventId);
                      if (evt) onSelectEvent(evt);
                    }}
                    className="p-3.5 hover:bg-slate-50/80 transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 truncate">
                      <div className="font-semibold text-slate-800 truncate">{m.title}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span className="text-emerald-700 font-medium truncate">{m.eventTitle}</span>
                        <span>·</span>
                        <span>Resp: {m.ownerName}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-[11px] font-mono font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {new Date(m.dueDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Event Health Indicators & Connected Sources */}
        <div className="space-y-6">
          {/* Health Summary Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Saúde Operacional dos Eventos
            </h3>
            <div className="space-y-2.5">
              {upcomingEvents.slice(0, 4).map(e => {
                const healthConfig = {
                  saudavel: { label: 'Saudável', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                  atencao: { label: 'Em Atenção', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
                  critico: { label: 'Crítico', bg: 'bg-rose-50 text-rose-800 border-rose-200' },
                  concluido: { label: 'Concluído', bg: 'bg-slate-50 text-slate-800 border-slate-200' },
                }[e.health];

                return (
                  <div
                    key={e.id}
                    onClick={() => onSelectEvent(e)}
                    className="p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-all cursor-pointer text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-800 truncate max-w-[160px]">{e.title}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${healthConfig.bg}`}>
                        {healthConfig.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{new Date(e.startDate).toLocaleDateString('pt-BR')}</span>
                      <span>{e.policyComplianceScore}% compliance</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Connected Data Sources Widget */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Exemplos de fontes
              </h3>
              <button
                onClick={onOpenSourcesModal}
                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
              >
                Gerenciar
              </button>
            </div>
            <div className="space-y-2">
              {connectedSources.map(s => (
                <div
                  key={s.id}
                  onClick={onOpenSourcesModal}
                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors cursor-pointer text-xs flex items-center justify-between"
                >
                  <div className="truncate">
                    <p className="font-semibold text-slate-800 truncate">{s.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{s.details}</p>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded shrink-0 ml-2">
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Stream */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Atividades Recentes no Workspace
            </h3>
            <div className="space-y-3">
              {allActivities.map(act => (
                <div key={act.id} className="text-xs border-l-2 border-slate-200 pl-2.5 py-0.5 space-y-0.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-semibold text-slate-700">{act.actorName}</span>
                    <span>{new Date(act.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-slate-700 font-medium">{act.action}</p>
                  <p className="text-[11px] text-slate-500 leading-snug line-clamp-1">{act.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
