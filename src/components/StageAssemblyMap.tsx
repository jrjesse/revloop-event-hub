import React from 'react';
import type { StageZone, StageZoneStatus } from '../types/index.ts';
import { nextStageStatus, stageReadiness } from '../domain/stagePlan.ts';

const STATUS_LABEL: Record<StageZoneStatus, string> = {
  pendente: 'Pendente',
  em_montagem: 'Em montagem',
  pronto: 'Pronto',
  bloqueado: 'Bloqueado',
};

const STATUS_CLASS: Record<StageZoneStatus, string> = {
  pendente: 'border-slate-500 bg-slate-800/80 text-slate-100',
  em_montagem: 'border-amber-300 bg-amber-500/90 text-slate-950',
  pronto: 'border-emerald-300 bg-emerald-500 text-slate-950',
  bloqueado: 'border-rose-300 bg-rose-500 text-white',
};

interface StageAssemblyMapProps {
  zones: StageZone[];
  onAdvance: (zoneId: string, status: StageZoneStatus) => void;
  busy?: boolean;
}

export const StageAssemblyMap: React.FC<StageAssemblyMapProps> = ({ zones, onAdvance, busy = false }) => {
  const { ready, total } = stageReadiness(zones);

  return (
    <section className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Projeto de montagem</p>
          <h3 className="text-sm font-extrabold text-slate-900">Planta da casa</h3>
        </div>
        <p className="text-[11px] text-slate-500">
          {ready} de {total} áreas prontas. Clique numa área para avançar o estado.
        </p>
      </div>

      <div className="relative w-full aspect-[16/10] rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden">
        <p className="absolute left-3 top-2 text-[10px] uppercase tracking-widest text-slate-500">Vista da casa</p>
        {zones.map(zone => (
          <button
            key={zone.id}
            type="button"
            disabled={busy}
            onClick={() => onAdvance(zone.id, nextStageStatus(zone.status))}
            style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.w}%`, height: `${zone.h}%` }}
            className={`absolute rounded-lg border px-1.5 py-1 text-left shadow-sm transition-colors disabled:opacity-60 ${STATUS_CLASS[zone.status]}`}
            title={`${zone.detail}. Próximo: ${STATUS_LABEL[nextStageStatus(zone.status)]}`}
          >
            <span className="block text-[10px] font-extrabold leading-tight">{zone.label}</span>
            <span className="block text-[9px] font-semibold opacity-80">{STATUS_LABEL[zone.status]}</span>
          </button>
        ))}
      </div>

      <ul className="flex flex-wrap gap-2 text-[10px] font-semibold text-slate-600">
        {(Object.keys(STATUS_LABEL) as StageZoneStatus[]).map(status => (
          <li key={status} className="inline-flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-sm border ${STATUS_CLASS[status]}`} />
            {STATUS_LABEL[status]}
          </li>
        ))}
      </ul>
    </section>
  );
};
