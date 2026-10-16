import React from 'react';
import {
  CalendarCheck,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  ShieldCheck,
  ExternalLink,
  Clock,
  Sparkles,
  ArrowRight,
  FolderOpen,
} from 'lucide-react';
import { EventRecord } from '../types/index.ts';

interface UpcomingEventsViewProps {
  events: EventRecord[];
  onSelectEvent: (event: EventRecord) => void;
  onOpenNewModal: () => void;
}

export const UpcomingEventsView: React.FC<UpcomingEventsViewProps> = ({
  events,
  onSelectEvent,
  onOpenNewModal,
}) => {
  const upcoming = events.filter(e => e.status === 'aprovado' || e.status === 'em_planejamento');

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  const getDaysRemaining = (targetDate: string) => {
    const diff = new Date(targetDate).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Data passada';
    if (days === 0) return 'Hoje!';
    if (days === 1) return 'Amanhã';
    return `Em ${days} dias`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
            <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
            Calendário Oficial de Operações
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Próximos Eventos Confirmados
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Eventos aprovados pelo responsável em fase ativa de contratação, execução de marcos e divulgação.
          </p>
        </div>

        <button
          onClick={onOpenNewModal}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-all shadow-xs cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-slate-900" />
          <span>Solicitar Novo Evento</span>
        </button>
      </div>

      {/* Grid of Upcoming Events */}
      {upcoming.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900">Nenhum evento aprovado agendado</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Assim que as solicitações em andamento forem aprovadas pelo responsável designado, elas aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {upcoming.map(evt => {
            const healthConfig = {
              saudavel: { label: 'Saudável', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
              atencao: { label: 'Em Atenção', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
              critico: { label: 'Crítico', bg: 'bg-rose-50 text-rose-800 border-rose-200' },
              concluido: { label: 'Concluído', bg: 'bg-slate-50 text-slate-800 border-slate-200' },
            }[evt.health];

            const completedTasks = evt.tasks.filter(t => t.completed).length;
            const totalTasks = evt.tasks.length;
            const completedMilestones = evt.milestones.filter(m => m.completed).length;
            const totalMilestones = evt.milestones.length;

            return (
              <div
                key={evt.id}
                onClick={() => onSelectEvent(evt)}
                className="bg-white rounded-xl border border-slate-200 hover:border-emerald-500/50 hover:shadow-md transition-all p-5 flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  {/* Top line: Type, Countdown & Health badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-semibold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {evt.type.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-600" />
                        {getDaysRemaining(evt.startDate)}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${healthConfig.bg}`}>
                      {healthConfig.label}
                    </span>
                  </div>

                  {/* Title & Goal */}
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                    {evt.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {evt.objective}
                  </p>

                  {/* Metadata Chips */}
                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 truncate">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{new Date(evt.startDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate capitalize">{evt.format} · {evt.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{formatCurrency(evt.budget)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">~{evt.estimatedAttendees} pessoas</span>
                    </div>
                  </div>

                  {/* Progress Bars (Policy & Milestones) */}
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-500 font-medium">Conformidade de Políticas</span>
                        <span className="font-bold text-slate-800">{evt.policyComplianceScore}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{ width: `${evt.policyComplianceScore}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>Marcos: <strong>{completedMilestones}/{totalMilestones}</strong></span>
                      <span>Tarefas: <strong>{completedTasks}/{totalTasks}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Footer Bar */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">
                      Resp: <strong className="text-slate-800">{evt.designatedOwnerName}</strong>
                    </span>
                  </div>
                  <span className="text-emerald-700 font-bold text-xs flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Gerenciar Operação</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
