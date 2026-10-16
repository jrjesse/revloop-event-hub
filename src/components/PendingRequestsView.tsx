import React from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  MapPin,
  Calendar,
  Users,
  DollarSign,
} from 'lucide-react';
import { EventRecord, WorkspaceUser } from '../types/index.ts';

interface PendingRequestsViewProps {
  events: EventRecord[];
  currentUser: WorkspaceUser;
  onSelectEvent: (event: EventRecord) => void;
  onOpenReviewModal: (event: EventRecord, initialAction?: 'accept' | 'reject' | 'request_changes') => void;
  onOpenNewModal: () => void;
}

export const PendingRequestsView: React.FC<PendingRequestsViewProps> = ({
  events,
  currentUser,
  onSelectEvent,
  onOpenReviewModal,
  onOpenNewModal,
}) => {
  const pending = events.filter(e => e.status === 'solicitado' || e.status === 'em_revisao');

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Governança e Fluxo de Aprovação
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Solicitações de Eventos em Andamento
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Apenas o responsável formalmente designado possui autorização governamental no servidor para aprovar ou rejeitar.
          </p>
        </div>

        <button
          onClick={onOpenNewModal}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-all shadow-xs cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-slate-900" />
          <span>Nova Solicitação</span>
        </button>
      </div>

      {/* Requests List */}
      {pending.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900">Nenhuma solicitação pendente no momento</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Todas as solicitações de eventos submetidas pelos membros do workspace foram avaliadas pelos seus respectivos responsáveis.
          </p>
          <button
            onClick={onOpenNewModal}
            className="mt-4 px-4 py-2 bg-emerald-500 text-slate-950 font-semibold text-xs rounded-lg hover:bg-emerald-400 transition-colors cursor-pointer"
          >
            Submeter Nova Proposta
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map(req => {
            const isResponsible =
              req.viewer?.isOwner ??
              req.designatedOwnerEmail.toLowerCase() === currentUser.email.toLowerCase();

            return (
              <div
                key={req.id}
                className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all p-5 shadow-xs space-y-4"
              >
                {/* Top Row: Title, Type & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {req.type.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                        {req.status === 'solicitado' ? 'Aguardando Aprovação' : 'Em Revisão / Ajustes'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Criado em {new Date(req.createdAt).toLocaleDateString('pt-BR')} por <strong>{req.requestedByName}</strong>
                      </span>
                    </div>
                    <h3
                      onClick={() => onSelectEvent(req)}
                      className="text-base font-bold text-slate-900 hover:text-emerald-600 transition-colors cursor-pointer"
                    >
                      {req.title}
                    </h3>
                  </div>

                  {/* Responsible User Indicator */}
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-medium">Responsável Designado</p>
                      <p className="text-xs font-bold text-slate-800">{req.designatedOwnerName}</p>
                    </div>
                    {isResponsible ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" title="Você é o responsável!" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400" title="Outro usuário é o responsável" />
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400">Período</p>
                      <p className="font-semibold text-slate-800">
                        {new Date(req.startDate).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="truncate">
                      <p className="text-[10px] text-slate-400">Local / Formato</p>
                      <p className="font-semibold text-slate-800 capitalize truncate">{req.format} · {req.location}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400">Orçamento Previsto</p>
                      <p className="font-semibold text-slate-800">{formatCurrency(req.budget)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400">Participantes</p>
                      <p className="font-semibold text-slate-800">~{req.estimatedAttendees} convidados</p>
                    </div>
                  </div>
                </div>

                {/* Objective & Notes */}
                <div className="bg-slate-50/70 p-3 rounded-lg text-xs space-y-1 border border-slate-100">
                  <span className="font-bold text-slate-700">Objetivo:</span>
                  <p className="text-slate-600 text-[11px] leading-relaxed">{req.objective}</p>
                  {req.notes && (
                    <div className="pt-1 text-[11px] text-slate-500">
                      <strong>Observações:</strong> {req.notes}
                    </div>
                  )}
                </div>

                {/* Action Bar with Server Validation Guidance */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="text-xs">
                    {isResponsible ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-800 font-semibold text-[11px]">
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                        Você é o responsável designado com permissão formal para decidir.
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-slate-500 text-[11px]">
                        <ShieldAlert className="w-4 h-4 text-slate-400" />
                        Apenas <strong>{req.designatedOwnerName}</strong> pode aceitar ou rejeitar no servidor.
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onSelectEvent(req)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Ver Detalhes Completos
                    </button>

                    <button
                      onClick={() => onOpenReviewModal(req, 'accept')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer ${
                        isResponsible
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                      }`}
                      title={
                        isResponsible
                          ? 'Aceitar solicitação e aprovar evento'
                          : 'Só o responsável designado pode aceitar. O servidor recusa os demais.'
                      }
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Aceitar solicitação</span>
                    </button>

                    <button
                      onClick={() => onOpenReviewModal(req, 'reject')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Rejeitar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
