import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Copy,
  AlertTriangle,
  FolderOpen,
  Share2,
  FileText,
  UserCheck,
  ShieldAlert,
  Building,
  HeartHandshake,
  Gift,
  Truck,
  Lock,
  Megaphone,
  CheckSquare,
  Square,
  Check,
  Database,
  WifiOff,
} from 'lucide-react';
import {
  EventRecord,
  WorkspaceUser,
  Milestone,
  EventTask,
  PolicyCheckItem,
  CalendarConflict,
} from '../types/index.ts';
import { AuditHistoryLog } from './AuditHistoryLog.tsx';
import { boardFor } from '../domain/showControl.ts';
import { ShowControlPanel } from './ShowControlPanel.tsx';
import { StageAssemblyMap } from './StageAssemblyMap.tsx';
import { stagePlanFor } from '../domain/stagePlan.ts';
import type { StageZoneStatus } from '../types/index.ts';

interface EventDetailViewProps {
  event: EventRecord;
  currentUser: WorkspaceUser;
  onBack: () => void;
  onToggleTask: (taskId: string, completed: boolean) => Promise<void>;
  onTogglePolicy: (policyId: string, completed: boolean) => Promise<void>;
  onSetStageZone: (zoneId: string, status: StageZoneStatus) => Promise<void>;
  onAddComment: (content: string) => Promise<void>;
  onAddResource: (resource: { type: string; title: string; url: string; description?: string }) => Promise<void>;
  onOpenReviewModal: (action: 'accept' | 'reject' | 'request_changes') => void;
  onDuplicateEvent: () => void;
  calendarConflicts: CalendarConflict[];
  isOffline?: boolean;
}

export const EventDetailView: React.FC<EventDetailViewProps> = ({
  event,
  currentUser,
  onBack,
  onToggleTask,
  onTogglePolicy,
  onSetStageZone,
  onAddComment,
  onAddResource,
  onOpenReviewModal,
  onDuplicateEvent,
  calendarConflicts,
  isOffline = false,
}) => {
  const [activeTab, setActiveTab] = useState<'controle' | 'marcos_tarefas' | 'politicas' | 'comentarios' | 'recursos' | 'auditoria'>('controle');
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Operational and progress calculation
  const totalMilestones = event.milestones?.length || 0;
  const completedMilestones = event.milestones?.filter(m => m.completed).length || 0;
  const totalTasks = event.tasks?.length || 0;
  const completedTasks = event.tasks?.filter(t => t.completed).length || 0;
  const totalOperationalItems = totalMilestones + totalTasks;
  const completedOperationalItems = completedMilestones + completedTasks;
  const operationalPercentage = totalOperationalItems > 0
    ? Math.round((completedOperationalItems / totalOperationalItems) * 100)
    : event.status === 'concluido'
    ? 100
    : event.status === 'aprovado' || event.status === 'em_planejamento'
    ? 50
    : 15;

  // New resource modal state
  const [showAddResource, setShowAddResource] = useState(false);
  const [resourceType, setResourceType] = useState<'drive' | 'slack' | 'notion' | 'calendar' | 'external'>('drive');
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');

  const isResponsible =
    event.viewer?.isOwner ??
    event.designatedOwnerEmail.toLowerCase() === currentUser.email.toLowerCase();

  const isPendingReview = event.status === 'solicitado' || event.status === 'em_revisao';

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  const healthConfig = {
    saudavel: { label: 'Saudável', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    atencao: { label: 'Em Atenção', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
    critico: { label: 'Crítico', bg: 'bg-rose-50 text-rose-800 border-rose-200' },
    concluido: { label: 'Concluído', bg: 'bg-slate-50 text-slate-800 border-slate-200' },
  }[event.health];

  const statusConfig = {
    solicitado: { label: 'Solicitado · Aguardando Aceite', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
    em_revisao: { label: 'Em Revisão · Ajustes Solicitados', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
    aprovado: { label: 'Aprovado pelo Responsável', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    em_planejamento: { label: 'Em Planejamento Ativo', bg: 'bg-blue-50 text-blue-800 border-blue-200' },
    concluido: { label: 'Realizado com Sucesso', bg: 'bg-slate-100 text-slate-800 border-slate-300' },
    rejeitado: { label: 'Solicitação Rejeitada', bg: 'bg-rose-50 text-rose-800 border-rose-200' },
    cancelado: { label: 'Cancelado', bg: 'bg-slate-50 text-slate-600 border-slate-200' },
  }[event.status];

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || isSubmittingComment) return;
    try {
      setIsSubmittingComment(true);
      await onAddComment(newCommentText);
      setNewCommentText('');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceTitle.trim() || !resourceUrl.trim()) return;
    await onAddResource({
      type: resourceType,
      title: resourceTitle.trim(),
      url: resourceUrl.trim(),
    });
    setResourceTitle('');
    setResourceUrl('');
    setShowAddResource(false);
  };

  const getPolicyCategoryIcon = (category: PolicyCheckItem['category']) => {
    switch (category) {
      case 'aprovacoes_gerais':
        return <Building className="w-4 h-4 text-emerald-600" />;
      case 'acessibilidade':
        return <HeartHandshake className="w-4 h-4 text-indigo-600" />;
      case 'swag_brindes':
        return <Gift className="w-4 h-4 text-amber-600" />;
      case 'avaliacao_fornecedores':
        return <Truck className="w-4 h-4 text-blue-600" />;
      case 'privacidade_lgpd':
        return <Lock className="w-4 h-4 text-rose-600" />;
      case 'comunicacoes':
        return <Megaphone className="w-4 h-4 text-purple-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para lista de eventos</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onDuplicateEvent}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-xs active:scale-95"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            <span>Duplicar Evento</span>
          </button>
        </div>
      </div>

      {/* Main Command Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {event.type.replace('_', ' ')}
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border ${statusConfig.bg}`}>
                {statusConfig.label}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${healthConfig.bg}`}>
                Saúde: {healthConfig.label}
              </span>
              {isOffline && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-900 border-amber-300 inline-flex items-center gap-1">
                  <Database className="w-3 h-3 text-amber-700" />
                  Consulta Offline (IndexedDB)
                </span>
              )}
              <span className="text-[11px] text-slate-400">
                ID: <code className="font-mono">{event.id}</code>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {event.title}
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
              {event.objective}
            </p>
          </div>

          {/* Responsible Card */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl shrink-0 flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                Responsável Designado
              </p>
              <p className="text-xs font-bold text-slate-800">{event.designatedOwnerName}</p>
              <p className="text-[10px] text-slate-500">{event.designatedOwnerEmail}</p>
            </div>
            {isResponsible ? (
              <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1">
                <UserCheck className="w-4 h-4" />
                <span className="text-[10px]">Você</span>
              </span>
            ) : (
              <span className="p-1.5 bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold">
                <ShieldAlert className="w-4 h-4" />
              </span>
            )}
          </div>
        </div>

        {/* Operational Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Data & Horário</p>
              <p className="font-bold text-slate-800">
                {new Date(event.startDate).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-2.5 truncate">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="truncate">
              <p className="text-[10px] text-slate-400 font-medium">Local / Formato</p>
              <p className="font-bold text-slate-800 capitalize truncate">
                {event.format} · {event.location}
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-2.5">
            <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Orçamento</p>
              <p className="font-bold text-slate-800">
                {formatCurrency(event.spentBudget || 0)} / {formatCurrency(event.budget)}
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-2.5">
            <Users className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Participantes</p>
              <p className="font-bold text-slate-800">
                ~{event.estimatedAttendees} previstos
              </p>
            </div>
          </div>
        </div>

        {/* Connected Resources Strip (Drive, Slack, Notion, Calendar) */}
        <div className="flex items-center gap-2 flex-wrap pt-2 text-xs">
          <span className="text-[11px] font-bold text-slate-500 mr-1">Referências:</span>
          {event.slackChannel && (
            <a
              href={`https://revloop.slack.com/archives/${encodeURIComponent(event.slackChannel)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md font-medium transition-colors"
            >
              <span className="font-bold text-emerald-600">#</span>
              <span>{event.slackChannel}</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          )}
          {event.driveFolderUrl && (
            <a
              href={event.driveFolderUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md font-medium transition-colors"
            >
              <FolderOpen className="w-3 h-3 text-amber-500" />
              <span>Google Drive</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          )}
          {event.notionPlaybookUrl && (
            <a
              href={event.notionPlaybookUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md font-medium transition-colors"
            >
              <FileText className="w-3 h-3 text-slate-700" />
              <span>Playbook Notion</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          )}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-md font-medium border border-emerald-200">
            <Calendar className="w-3 h-3 text-emerald-600" />
            <span>Agenda</span>
          </span>
        </div>

        {/* Progress & Governance Status Tracker (Offline Accessible via IndexedDB) */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                Status de Progresso do Evento
              </span>
              <span className="text-[11px] text-slate-500">
                ({completedOperationalItems} de {totalOperationalItems} entregas operacionais concluídas)
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-600 font-medium">
                Conclusão Operacional: <strong className="text-slate-900">{operationalPercentage}%</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600 font-medium">
                Conformidade: <strong className="text-emerald-700">{event.policyComplianceScore}%</strong>
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-500 rounded-full shadow-xs"
              style={{ width: `${Math.max(operationalPercentage, 4)}%` }}
            />
          </div>

          {/* Stage Flow Stepper */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
            <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
              event.status !== 'rejeitado' && event.status !== 'cancelado'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold leading-tight">1. Solicitação</p>
                <p className="text-[10px] text-emerald-700">Registrada no hub</p>
              </div>
            </div>

            <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
              event.status === 'aprovado' || event.status === 'em_planejamento' || event.status === 'concluido'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : event.status === 'rejeitado'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-amber-50/70 border-amber-200 text-amber-900'
            }`}>
              {event.status === 'aprovado' || event.status === 'em_planejamento' || event.status === 'concluido' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : event.status === 'rejeitado' ? (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
              )}
              <div>
                <p className="font-semibold leading-tight">2. Governança</p>
                <p className="text-[10px] text-slate-600">
                  {event.status === 'solicitado' || event.status === 'em_revisao'
                    ? 'Aguardando Aceite'
                    : event.status === 'rejeitado'
                    ? 'Rejeitado'
                    : 'Aprovado'}
                </p>
              </div>
            </div>

            <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
              event.status === 'em_planejamento' || event.status === 'concluido'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : event.status === 'aprovado'
                ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <p className="font-semibold leading-tight">3. Planejamento</p>
                <p className="text-[10px] text-slate-600">
                  {completedTasks}/{totalTasks} tarefas feitas
                </p>
              </div>
            </div>

            <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
              event.status === 'concluido'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold leading-tight">4. Execução</p>
                <p className="text-[10px] text-slate-600">
                  {event.status === 'concluido' ? 'Concluído com Sucesso' : 'Em Andamento'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CRITICAL SERVER-SIDE GOVERNANCE & APPROVAL DECISION BOX */}
      {isPendingReview && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-lg mt-0.5">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  Decisão de Aprovação Governamental Requerida
                </h3>
                <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                  Conforme política corporativa da Revloop, <strong>apenas o responsável formalmente designado ({event.designatedOwnerName})</strong> tem autorização no servidor para aceitar ou rejeitar.
                </p>
                <div className="mt-1 text-[11px] text-amber-800">
                  Usuário atual autenticado no workspace:{' '}
                  <strong>{currentUser.name} ({currentUser.email})</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
              <button
                onClick={() => onOpenReviewModal('accept')}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Aceitar solicitação</span>
              </button>

              <button
                onClick={() => onOpenReviewModal('request_changes')}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-amber-100 text-amber-900 font-semibold text-xs rounded-lg border border-amber-300 transition-colors cursor-pointer"
              >
                <span>Solicitar Ajustes</span>
              </button>

              <button
                onClick={() => onOpenReviewModal('reject')}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-rose-50 text-rose-700 font-semibold text-xs rounded-lg border border-rose-200 transition-colors cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>Rejeitar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-4 rounded-xl shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('controle')}
          className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'controle'
              ? 'border-emerald-500 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Controle do show
        </button>
        <button
          onClick={() => setActiveTab('marcos_tarefas')}
          className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'marcos_tarefas'
              ? 'border-emerald-500 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Linha do Tempo, Marcos & Tarefas ({event.milestones.length + event.tasks.length})
        </button>

        <button
          onClick={() => setActiveTab('politicas')}
          className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'politicas'
              ? 'border-emerald-500 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Checklist de Políticas ({event.policyComplianceScore}%)</span>
        </button>

        <button
          onClick={() => setActiveTab('comentarios')}
          className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'comentarios'
              ? 'border-emerald-500 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Comentários & Notas ({event.comments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('recursos')}
          className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'recursos'
              ? 'border-emerald-500 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Recursos & Links ({event.resources.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('auditoria')}
          className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'auditoria'
              ? 'border-emerald-500 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>Histórico de Auditoria ({event.auditTrail?.length || event.activities.length})</span>
        </button>
      </div>

      {/* Tab 1: Marcos & Tarefas */}
      {activeTab === 'controle' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <StageAssemblyMap
              zones={event.stagePlan?.length ? event.stagePlan : stagePlanFor(event)}
              onAdvance={onSetStageZone}
            />
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <ShowControlPanel board={boardFor(event)} />
          </div>
        </div>
      )}

      {activeTab === 'marcos_tarefas' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Milestones / Linha do Tempo */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Linha do Tempo & Marcos Importantes
              </h3>
              <span className="text-[11px] text-slate-500">
                {event.milestones.filter(m => m.completed).length} de {event.milestones.length} concluídos
              </span>
            </div>

            <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
              {event.milestones.map((m, idx) => (
                <div key={m.id} className="relative flex items-start gap-3 pl-1 text-xs">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${
                      m.completed ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-100 text-slate-500 border border-slate-300'
                    }`}
                  >
                    {m.completed ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <div className="flex-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`font-semibold ${m.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {m.title}
                      </p>
                      <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                        {new Date(m.dueDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                      <span className="capitalize">{m.phase.replace('_', ' ')}</span>
                      <span>·</span>
                      <span>Responsável: {m.ownerName}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks & Assignees */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                Tarefas Operacionais & Responsáveis
              </h3>
              <span className="text-[11px] text-slate-500">
                {event.tasks.filter(t => t.completed).length} de {event.tasks.length} concluídas
              </span>
            </div>

            <div className="space-y-2">
              {event.tasks.map(t => (
                <div
                  key={t.id}
                  onClick={() => onToggleTask(t.id, !t.completed)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 text-xs ${
                    t.completed
                      ? 'bg-slate-50/70 border-slate-200 text-slate-400'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    {t.completed ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <div className="truncate">
                      <p className={`font-semibold truncate ${t.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {t.title}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="capitalize">{t.category}</span>
                        <span>·</span>
                        <span>Resp: {t.assignedTo}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        t.priority === 'alta'
                          ? 'bg-rose-50 text-rose-700'
                          : t.priority === 'media'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {t.priority}
                    </span>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {new Date(t.dueDate).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Checklist de Políticas */}
      {activeTab === 'politicas' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Checklist Rigoroso de Políticas & Compliance
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Marque os itens à medida que forem auditados. A validação é gravada no arquivo do hub com carimbo de auditoria.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Índice de Conformidade</span>
                <span className="text-xl font-extrabold text-emerald-600">{event.policyComplianceScore}%</span>
              </div>
              <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${event.policyComplianceScore}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {event.policyChecklist.map(item => (
              <div
                key={item.id}
                onClick={() => onTogglePolicy(item.id, !item.completed)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 text-xs ${
                  item.completed
                    ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {item.completed ? (
                    <CheckSquare className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-300" />
                  )}
                </div>

                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {getPolicyCategoryIcon(item.category)}
                      <span className={`font-bold ${item.completed ? 'text-slate-800' : 'text-slate-900'}`}>
                        {item.title}
                      </span>
                    </div>
                    {item.required && (
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                        Obrigatório
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{item.description}</p>
                  {item.completed && item.verifiedBy && (
                    <p className="text-[10px] text-emerald-800 font-semibold pt-1">
                      ✓ Auditado por {item.verifiedBy} em {item.verifiedAt || 'Hoje'}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Comentários & Notas do Responsável */}
      {activeTab === 'comentarios' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              Comentários e Notas do Responsável Designado
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comunicação centralizada para aprovações, alinhamentos de fornecedores e observações.
            </p>
          </div>

          {/* New Comment Input */}
          <form onSubmit={handleCommentSubmit} className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-5 h-5 rounded-full object-cover"
              />
              <span>
                Publicando como <strong>{currentUser.name}</strong> {isResponsible && '(Responsável pelo Evento)'}
              </span>
            </div>
            <textarea
              value={newCommentText}
              onChange={e => setNewCommentText(e.target.value)}
              placeholder="Escreva uma nota, alinhamento ou decisão sobre este evento..."
              rows={3}
              className="w-full p-3 text-xs bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg outline-none transition-all resize-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!newCommentText.trim() || isSubmittingComment}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publicar Comentário</span>
              </button>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-4 pt-2">
            {event.comments.map(c => (
              <div
                key={c.id}
                className={`p-4 rounded-xl border text-xs space-y-2 ${
                  c.isOwnerNote
                    ? 'bg-emerald-50/40 border-emerald-200 shadow-xs'
                    : 'bg-slate-50/70 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={c.authorAvatar}
                      alt={c.authorName}
                      className="w-6 h-6 rounded-full object-cover shrink-0"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900">{c.authorName}</span>
                      <span className="text-[10px] text-slate-400">· {c.authorRole}</span>
                      {c.isOwnerNote && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                          Nota do Responsável
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(c.createdAt).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(c.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed text-xs pl-8">{c.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Recursos & Links */}
      {activeTab === 'recursos' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Share2 className="w-4 h-4 text-emerald-600" />
                Recursos Conectados & Ativos Digitais
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Vincule briefings, orçamentos, roteiros run-of-show e canais de discussão.
              </p>
            </div>

            <button
              onClick={() => setShowAddResource(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Vincular Recurso</span>
            </button>
          </div>

          {/* Add Resource Inline Form Modal/Box */}
          {showAddResource && (
            <form onSubmit={handleResourceSubmit} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="font-bold text-slate-800">Novo Recurso Conectado</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">Tipo de Fonte</label>
                  <select
                    value={resourceType}
                    onChange={e => setResourceType(e.target.value as any)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none"
                  >
                    <option value="drive">Google Drive / Docs</option>
                    <option value="slack">Slack Channel / Thread</option>
                    <option value="notion">Notion Playbook / Wiki</option>
                    <option value="calendar">Google Agenda</option>
                    <option value="external">Outro Link Externo</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">Título do Recurso</label>
                  <input
                    type="text"
                    required
                    value={resourceTitle}
                    onChange={e => setResourceTitle(e.target.value)}
                    placeholder="Ex: Roteiro Min-a-Min Run-of-Show"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">URL / Link</label>
                  <input
                    type="url"
                    required
                    value={resourceUrl}
                    onChange={e => setResourceUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddResource(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-emerald-400"
                >
                  Salvar Recurso
                </button>
              </div>
            </form>
          )}

          {/* List of Resources */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {event.resources.map(res => (
              <a
                key={res.id}
                href={res.url}
                target="_blank"
                rel="noreferrer"
                className="p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-slate-300 rounded-xl transition-all flex items-start justify-between gap-3 text-xs group"
              >
                <div className="flex items-start gap-3 truncate">
                  <div className="p-2 bg-white rounded-lg border border-slate-200 shrink-0">
                    {res.type === 'drive' && <FolderOpen className="w-4 h-4 text-amber-500" />}
                    {res.type === 'slack' && <Share2 className="w-4 h-4 text-emerald-600" />}
                    {res.type === 'notion' && <FileText className="w-4 h-4 text-slate-700" />}
                    {res.type === 'calendar' && <Calendar className="w-4 h-4 text-blue-600" />}
                    {res.type === 'external' && <ExternalLink className="w-4 h-4 text-slate-500" />}
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                      {res.title}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{res.url}</p>
                    {res.metadata && (
                      <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                        {res.metadata}
                      </span>
                    )}
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 shrink-0 mt-1" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Histórico de Auditoria Imutável (D1) */}
      {activeTab === 'auditoria' && (
        <AuditHistoryLog
          eventId={event.id}
          initialAuditTrail={event.auditTrail}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};
