import React from 'react';
import { Radio } from 'lucide-react';
import type { EventRecord } from '../types/index.ts';
import { boardFor } from '../domain/showControl.ts';
import { ShowControlPanel } from './ShowControlPanel.tsx';

interface ShowControlViewProps {
  events: EventRecord[];
  onSelectEvent: (event: EventRecord) => void;
}

export const ShowControlView: React.FC<ShowControlViewProps> = ({ events, onSelectEvent }) => {
  const shows = events.filter(event => event.status !== 'rejeitado' && event.status !== 'cancelado');

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-800">
          <Radio className="w-3.5 h-3.5" />
          Operação da casa
        </div>
        <h1 className="text-xl font-extrabold text-slate-900 mt-1">Controle do show</h1>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl">
          Cada data reúne bilheteria, pagamento, mapa de palco, CRM do público, transmissão e a ordem da noite. O aceite do responsável abre o lote e destrava o controle.
        </p>
      </div>

      {shows.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">Nenhum show em operação.</div>
      ) : (
        shows.map(event => (
          <button
            key={event.id}
            type="button"
            onClick={() => onSelectEvent(event)}
            className="w-full text-left bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{event.location}</p>
                <h2 className="text-sm font-bold text-slate-900">{event.title}</h2>
              </div>
              <span className="text-[11px] font-semibold text-emerald-800">Abrir show</span>
            </div>
            <ShowControlPanel board={boardFor(event)} compact />
          </button>
        ))
      )}
    </div>
  );
};
