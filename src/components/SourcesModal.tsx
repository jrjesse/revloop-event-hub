import React, { useState } from 'react';
import {
  X,
  Share2,
  RefreshCw,
  CheckCircle2,
  Calendar,
  FolderOpen,
  FileText,
  Building,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { ConnectedSourceSummary } from '../types/index.ts';
import { api } from '../services/api.ts';

interface SourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: ConnectedSourceSummary[];
  onSourceUpdated: (updated: ConnectedSourceSummary) => void;
}

export const SourcesModal: React.FC<SourcesModalProps> = ({
  isOpen,
  onClose,
  sources,
  onSourceUpdated,
}) => {
  const [syncingId, setSyncingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSync = async (sourceId: string) => {
    try {
      setSyncingId(sourceId);
      const updated = await api.syncSource(sourceId);
      onSourceUpdated(updated);
    } catch (err) {
      console.error('Failed to sync source:', err);
    } finally {
      setSyncingId(null);
    }
  };

  const getSourceIcon = (sourceType: ConnectedSourceSummary['source']) => {
    switch (sourceType) {
      case 'google_calendar':
        return <Calendar className="w-5 h-5 text-blue-600" />;
      case 'slack':
        return <Share2 className="w-5 h-5 text-emerald-600" />;
      case 'google_drive':
        return <FolderOpen className="w-5 h-5 text-amber-500" />;
      case 'notion':
        return <FileText className="w-5 h-5 text-slate-800" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in-50 zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-0.5">
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              Integrações Corporativas Conectadas
            </div>
            <h2 className="text-base font-bold text-slate-900">
              Fontes de Dados do Workspace Revloop
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <p className="text-slate-500 leading-relaxed text-[11px]">
            O Hub usa exemplos semeados das ferramentas de trabalho da Revloop. As fontes mantêm referências configuráveis para evitar duplicidade de arquivos e conflitos de agendas.
          </p>

          <div className="space-y-3">
            {sources.map(src => {
              const isSyncing = syncingId === src.id;
              return (
                <div
                  key={src.id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-xs">
                        {getSourceIcon(src.source)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{src.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono">{src.accountOrWorkspace}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {src.status}
                      </span>
                      <button
                        onClick={() => handleSync(src.id)}
                        disabled={isSyncing}
                        className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition-colors cursor-pointer"
                        title="Sincronizar agora"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed pl-11">
                    {src.details}
                  </p>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400 pl-11">
                    <span>Última sincronização: <strong>{src.lastSync}</strong></span>
                    <span>{src.itemCount} registros rastreados</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-[11px] text-emerald-950 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong>Segurança e Privacidade:</strong> Nenhuma informação pessoal ou confidencial não relacionada a eventos corporativos é exposta. Os registros ficam no arquivo local do hub, com auditoria encadeada.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
