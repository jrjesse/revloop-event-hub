import React, { useState } from 'react';
import {
  Database,
  Wifi,
  WifiOff,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HardDrive,
  FileText,
  BookOpen,
  Calendar,
  X,
  Layers,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { OfflineQueueItem } from '../types/index.ts';

interface OfflineCacheModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  isSimulatedOffline: boolean;
  onToggleSimulatedOffline: () => void;
  cachedEventsCount: number;
  cachedTemplatesCount: number;
  cachedPlaybooksCount: number;
  lastSyncTime: string | null;
  offlineQueue: OfflineQueueItem[];
  isSyncing: boolean;
  onSyncNow: () => Promise<void>;
  onClearCache: () => Promise<void>;
}

export const OfflineCacheModal: React.FC<OfflineCacheModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  isSimulatedOffline,
  onToggleSimulatedOffline,
  cachedEventsCount,
  cachedTemplatesCount,
  cachedPlaybooksCount,
  lastSyncTime,
  offlineQueue,
  isSyncing,
  onSyncNow,
  onClearCache,
}) => {
  const [isClearing, setIsClearing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const effectiveOffline = !isOnline || isSimulatedOffline;

  const handleClear = async () => {
    if (window.confirm('Tem certeza que deseja limpar o cache local do IndexedDB? Os dados serão recarregados do servidor na próxima sincronização.')) {
      setIsClearing(true);
      try {
        await onClearCache();
        setFeedbackMsg('Cache IndexedDB limpo com sucesso.');
        setTimeout(() => setFeedbackMsg(null), 3500);
      } finally {
        setIsClearing(false);
      }
    }
  };

  const handleSync = async () => {
    try {
      await onSyncNow();
      setFeedbackMsg('Sincronização concluída com o servidor do hub e cache atualizado.');
      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch (err: any) {
      setFeedbackMsg(`Erro ao sincronizar: ${err.message || 'Verifique a conexão'}`);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const formatLastSync = (iso: string | null) => {
    if (!iso) return 'Nunca sincronizado';
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(d);
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Persistência de Cache IndexedDB
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Navegador
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Gerenciador de armazenamento local para operação e consulta offline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {feedbackMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {/* Network & Simulation Status Card */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Estado de Conectividade:</span>
              {effectiveOffline ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                  <WifiOff className="w-3.5 h-3.5 text-amber-700" />
                  Modo Offline Ativo
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
                  <Wifi className="w-3.5 h-3.5 text-emerald-700" />
                  Conexão Online Ativa
                </span>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-800">Simular Modo Offline</p>
                <p className="text-[11px] text-slate-500">
                  Teste o aplicativo desconectado sem precisar desativar sua internet.
                </p>
              </div>
              <button
                onClick={onToggleSimulatedOffline}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 ${
                  isSimulatedOffline
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {isSimulatedOffline ? 'Desativar Simulação' : 'Simular Offline'}
              </button>
            </div>
          </div>

          {/* IndexedDB Storage Metrics */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5" />
              Armazenamento Local no Navegador
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">Eventos</span>
                </div>
                <div className="text-lg font-bold text-slate-800">{cachedEventsCount}</div>
                <div className="text-[10px] text-slate-500">Eventos em cache</div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span className="text-[10px] font-bold text-indigo-600 uppercase">Modelos</span>
                </div>
                <div className="text-lg font-bold text-slate-800">{cachedTemplatesCount}</div>
                <div className="text-[10px] text-slate-500">Templates prontos</div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  <span className="text-[10px] font-bold text-amber-600 uppercase">Guias</span>
                </div>
                <div className="text-lg font-bold text-slate-800">{cachedPlaybooksCount}</div>
                <div className="text-[10px] text-slate-500">Playbooks Notion</div>
              </div>
            </div>
          </div>

          {/* Sync Metadata Details */}
          <div className="space-y-2 text-xs text-slate-600 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                Última Sincronização:
              </span>
              <span className="font-semibold text-slate-800">{formatLastSync(lastSyncTime)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5" />
                Mecanismo de Persistência:
              </span>
              <span className="font-semibold text-slate-800 font-mono text-[11px]">
                IndexedDB (revloop_events_cache_v1)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Layers className="w-3.5 h-3.5" />
                Fila de Mutações Offline:
              </span>
              <span className="font-semibold text-slate-800">
                {offlineQueue.length === 0 ? (
                  <span className="text-emerald-600">Nenhuma ação pendente</span>
                ) : (
                  <span className="text-amber-600">{offlineQueue.length} ação(ões) a sincronizar</span>
                )}
              </span>
            </div>
          </div>

          {/* Offline Queue Items if any */}
          {offlineQueue.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700">Ações Gravadas no Modo Offline:</h4>
              <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                {offlineQueue.map(item => (
                  <div
                    key={item.id}
                    className="p-2 bg-amber-50/80 border border-amber-200 rounded-lg text-[11px] flex items-center justify-between text-amber-900"
                  >
                    <div>
                      <span className="font-semibold uppercase tracking-wider text-[10px]">
                        {item.type.replace('_', ' ')}
                      </span>
                      {item.eventId && <span className="ml-1 text-slate-500">({item.eventId})</span>}
                    </div>
                    <span className="text-[10px] text-amber-700">Aguardando reconexão</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Capabilities offline info box */}
          <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs text-slate-600 space-y-1.5">
            <p className="font-semibold text-emerald-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              O que você pode fazer sem conexão à internet:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600 pl-1">
              <li>Consultar a lista completa de eventos e pesquisar por título, responsável ou local.</li>
              <li>Visualizar o status de progresso, marcos contratuais e checklist de tarefas operacionais.</li>
              <li>Inspecionar a pontuação de conformidade com políticas corporativas.</li>
              <li>Acessar templates e playbooks operacionais já carregados.</li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            onClick={handleClear}
            disabled={isClearing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar Cache</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              Fechar
            </button>
            <button
              onClick={handleSync}
              disabled={isSyncing || effectiveOffline}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-white shadow-xs transition-colors cursor-pointer ${
                effectiveOffline
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
