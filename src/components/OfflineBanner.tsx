import React from 'react';
import { WifiOff, Database, RefreshCw, HardDrive, ShieldCheck, ArrowRight } from 'lucide-react';

interface OfflineBannerProps {
  isSimulatedOffline: boolean;
  onToggleSimulatedOffline: () => void;
  cachedEventsCount: number;
  lastSyncTime: string | null;
  onOpenCacheModal: () => void;
  onSyncNow: () => void;
  isSyncing: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isSimulatedOffline,
  onToggleSimulatedOffline,
  cachedEventsCount,
  lastSyncTime,
  onOpenCacheModal,
  onSyncNow,
  isSyncing,
}) => {
  const formattedSync = lastSyncTime
    ? new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(lastSyncTime))
    : null;

  return (
    <div className="mb-6 rounded-xl border border-amber-300 bg-linear-to-r from-amber-50 via-amber-50/80 to-amber-100/50 p-3.5 sm:p-4 text-amber-950 shadow-xs animate-in fade-in slide-in-from-top-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-200/80 text-amber-800 shrink-0">
            <WifiOff className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-amber-900">
                {isSimulatedOffline ? 'Modo Offline Simulado' : 'Você está sem conexão à rede'}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 font-semibold border border-amber-300">
                <Database className="w-3 h-3 text-amber-800" />
                Cache IndexedDB Ativo ({cachedEventsCount} eventos)
              </span>
            </div>
            <p className="text-xs text-amber-800 mt-0.5">
              Consultas, marcos contratuais e status de progresso estão disponíveis localmente com persistência segura no navegador.
              {formattedSync && (
                <span className="hidden md:inline text-amber-700 font-medium ml-1">
                  (Última sincronização às {formattedSync})
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            onClick={onOpenCacheModal}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/80 hover:bg-white border border-amber-300 text-amber-900 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <HardDrive className="w-3.5 h-3.5 text-amber-800" />
            <span>Gerenciar Cache</span>
          </button>

          {isSimulatedOffline ? (
            <button
              onClick={onToggleSimulatedOffline}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
            >
              <span>Voltar ao Online</span>
            </button>
          ) : (
            <button
              onClick={onSyncNow}
              disabled={isSyncing}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando' : 'Tentar Reconectar'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
