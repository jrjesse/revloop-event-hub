import React, { useState } from 'react';
import {
  History,
  Copy,
  CheckCircle2,
  Calendar,
  Users,
  DollarSign,
  MapPin,
  TrendingUp,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { EventRecord } from '../types/index.ts';

interface PastEventsViewProps {
  events: EventRecord[];
  onSelectEvent: (event: EventRecord) => void;
  onDuplicateEvent: (event: EventRecord) => void;
}

export const PastEventsView: React.FC<PastEventsViewProps> = ({
  events,
  onSelectEvent,
  onDuplicateEvent,
}) => {
  const pastEvents = events.filter(e => e.status === 'concluido' || e.health === 'concluido');

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <History className="w-3.5 h-3.5 text-slate-600" />
            Histórico & Conhecimento Reutilizável
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Eventos Passados Realizados
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Analise métricas reais de eventos anteriores e duplique configurações com 1 clique para novas edições.
          </p>
        </div>
      </div>

      {/* Grid of Past Events */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {pastEvents.map(evt => (
          <div
            key={evt.id}
            className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all p-5 flex flex-col justify-between shadow-xs space-y-4"
          >
            <div>
              {/* Type & Completed Badge */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-mono font-semibold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                  {evt.type.replace('_', ' ')}
                </span>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Realizado em {new Date(evt.startDate).toLocaleDateString('pt-BR')}
                </span>
              </div>

              {/* Title */}
              <h3
                onClick={() => onSelectEvent(evt)}
                className="text-base font-bold text-slate-900 hover:text-emerald-600 transition-colors cursor-pointer"
              >
                {evt.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{evt.objective}</p>

              {/* Post Event Real Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 p-3 bg-slate-50 rounded-lg text-xs">
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Participantes Reais</p>
                  <p className="font-bold text-slate-800 text-sm">
                    {evt.actualAttendees || evt.estimatedAttendees} pessoas
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Custo Final</p>
                  <p className="font-bold text-slate-800 text-sm">
                    {formatCurrency(evt.spentBudget || evt.budget)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Compliance Final</p>
                  <p className="font-bold text-emerald-700 text-sm">
                    {evt.policyComplianceScore}% aprovado
                  </p>
                </div>
              </div>

              {/* Notes */}
              {evt.notes && (
                <div className="mt-3 text-[11px] text-slate-600 bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-lg">
                  <strong className="text-emerald-900">Aprendizados & Retrospectiva:</strong> {evt.notes}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                onClick={() => onSelectEvent(evt)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Ver Relatório Completo
              </button>

              <button
                onClick={() => onDuplicateEvent(evt)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicar este Evento</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
