import React from 'react';
import type { ControlTone, ShowControlBoard } from '../types/index.ts';

const TONE: Record<ControlTone, string> = {
  pronto: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  andamento: 'bg-amber-50 text-amber-900 border-amber-200',
  bloqueado: 'bg-rose-50 text-rose-800 border-rose-200',
  encerrado: 'bg-slate-100 text-slate-700 border-slate-200',
};

const TONE_LABEL: Record<ControlTone, string> = {
  pronto: 'Pronto',
  andamento: 'Em curso',
  bloqueado: 'Bloqueado',
  encerrado: 'Encerrado',
};

const CUE: Record<ShowControlBoard['cues'][number]['state'], string> = {
  feito: 'bg-emerald-500',
  agora: 'bg-amber-500',
  proximo: 'bg-sky-500',
  aguardando: 'bg-slate-300',
};

export const ShowControlPanel: React.FC<{ board: ShowControlBoard; compact?: boolean }> = ({ board, compact = false }) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Controle do show</p>
          <h3 className="text-sm font-extrabold text-slate-900">{board.attraction}</h3>
        </div>
        <p className="text-[11px] text-slate-500 max-w-md">
          Ingresso, pagamento, palco, público, transmissão e a ordem da noite. O quadro acompanha o evento neste hub.
        </p>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${compact ? 'xl:grid-cols-3' : 'lg:grid-cols-3'} gap-3`}>
        {board.desks.map(desk => (
          <article key={desk.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-900">{desk.title}</h4>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TONE[desk.tone]}`}>{TONE_LABEL[desk.tone]}</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">{desk.headline}</p>
            {!compact && (
              <dl className="space-y-1.5">
                {desk.channels.map(channel => (
                  <div key={channel.id} className="flex items-baseline justify-between gap-3 text-[11px]">
                    <dt className="text-slate-500">{channel.label}</dt>
                    <dd className="font-semibold text-slate-800 text-right">{channel.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </article>
        ))}
      </div>

      {!compact && (
        <ol className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {board.cues.map(cue => (
            <li key={cue.id} className="bg-white border border-slate-200 rounded-lg px-2.5 py-2">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${CUE[cue.state]}`} />
                <span className="text-[10px] font-bold text-slate-800">{cue.label}</span>
              </div>
              <p className="text-[11px] font-mono text-slate-600 mt-1">{cue.time}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};
