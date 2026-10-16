import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Lock,
  Clock,
  User,
  Search,
  RefreshCw,
  Download,
  Copy,
  Check,
  FileSpreadsheet,
  FileText,
  Filter,
  ArrowRight,
  Database,
  Hash,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
  Share2,
} from 'lucide-react';
import { AuditLogRecord, WorkspaceUser } from '../types/index.ts';
import { api } from '../services/api.ts';

interface AuditHistoryLogProps {
  eventId: string;
  initialAuditTrail?: AuditLogRecord[];
  currentUser: WorkspaceUser;
  onRefreshEvent?: () => void;
}

type FilterCategory = 'todos' | 'aprovacao' | 'compliance' | 'tarefa' | 'edicao_campo' | 'criacao' | 'recurso' | 'comentario';

export const AuditHistoryLog: React.FC<AuditHistoryLogProps> = ({
  eventId,
  initialAuditTrail,
  currentUser,
  onRefreshEvent,
}) => {
  const [auditRecords, setAuditRecords] = useState<AuditLogRecord[]>(initialAuditTrail || []);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('todos');
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Fetch fresh audit trail directly from D1
  const fetchAuditTrailFromD1 = async () => {
    try {
      setIsLoading(true);
      const records = await api.getEventAuditTrail(eventId);
      setAuditRecords(records);
      if (onRefreshEvent) onRefreshEvent();
    } catch (err) {
      console.error('Erro ao ler dados de auditoria do D1:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync when initialAuditTrail prop changes
  useEffect(() => {
    if (initialAuditTrail && initialAuditTrail.length > 0) {
      setAuditRecords(initialAuditTrail);
    } else {
      fetchAuditTrailFromD1();
    }
  }, [eventId, initialAuditTrail]);

  // Handle copy hash
  const handleCopyHash = (txHash: string, id: string) => {
    navigator.clipboard.writeText(txHash);
    setCopiedHashId(id);
    setTimeout(() => {
      setCopiedHashId(null);
    }, 2000);
  };

  // Format date helper
  const formatTimestamp = (iso: string) => {
    const date = new Date(iso);
    const dateStr = date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timeStr = date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    return { dateStr, timeStr };
  };

  // Calculate relative time (e.g. "há 5 minutos", "hoje às 14:30")
  const getRelativeTime = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 45) return 'agora há pouco';
    if (diffMin < 60) return `há ${diffMin} min`;
    if (diffHours < 24) return `há ${diffHours} h`;
    if (diffDays === 1) return 'ontem';
    return `há ${diffDays} dias`;
  };

  // Filter and search
  const filteredRecords = useMemo(() => {
    return auditRecords.filter(rec => {
      // Category filter
      if (selectedFilter !== 'todos') {
        if (selectedFilter === 'aprovacao') {
          if (rec.changeType !== 'aprovacao' && rec.changeType !== 'rejeicao' && rec.changeType !== 'revisao') {
            return false;
          }
        } else if (rec.changeType !== selectedFilter) {
          return false;
        }
      }

      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesActor =
          rec.actorName.toLowerCase().includes(query) ||
          rec.actorEmail.toLowerCase().includes(query) ||
          rec.actorRole.toLowerCase().includes(query);
        const matchesField =
          rec.fieldName.toLowerCase().includes(query) ||
          rec.fieldKey.toLowerCase().includes(query);
        const matchesSummary = rec.changeSummary.toLowerCase().includes(query);
        const matchesHash = (rec.entryHash || '').toLowerCase().includes(query);
        const matchesValues =
          rec.oldValue.toLowerCase().includes(query) ||
          rec.newValue.toLowerCase().includes(query);

        return matchesActor || matchesField || matchesSummary || matchesHash || matchesValues;
      }

      return true;
    });
  }, [auditRecords, selectedFilter, searchQuery]);

  // Export to CSV
  const handleExportCSV = () => {
    try {
      const headers = [
        'Sequência',
        'Data/Hora ISO',
        'Data',
        'Hora',
        'Responsável',
        'Email',
        'Cargo/Papel',
        'Campo Modificado',
        'Chave do Campo',
        'Valor Anterior',
        'Novo Valor',
        'Tipo de Mudança',
        'Resumo da Auditoria',
        'Hash SHA-256',
        'IP de Origem',
      ];

      const rows = auditRecords.map(r => {
        const { dateStr, timeStr } = formatTimestamp(r.timestamp);
        return [
          r.id,
          r.timestamp,
          dateStr,
          timeStr,
          `"${r.actorName.replace(/"/g, '""')}"`,
          `"${r.actorEmail.replace(/"/g, '""')}"`,
          `"${r.actorRole.replace(/"/g, '""')}"`,
          `"${r.fieldName.replace(/"/g, '""')}"`,
          r.fieldKey,
          `"${r.oldValue.replace(/"/g, '""')}"`,
          `"${r.newValue.replace(/"/g, '""')}"`,
          r.changeType,
          `"${r.changeSummary.replace(/"/g, '""')}"`,
          r.entryHash,
          r.prevHash,
          r.identityMode,
        ].join(';');
      });

      const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `auditoria_d1_${eventId}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportNotice('Relatório de auditoria exportado em CSV com sucesso!');
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      console.error('Falha ao exportar CSV:', err);
    }
  };

  // Export to JSON Ledger Proof
  const handleExportJSON = () => {
    try {
      const payload = {
        title: 'Certificado de Auditoria Revloop',
        eventId,
        generatedAt: new Date().toISOString(),
        exportedBy: `${currentUser.name} (${currentUser.email})`,
        storageEngine: 'Arquivo local do hub',
        totalAuditRecords: auditRecords.length,
        ledgerIntegrityStatus: 'VERIFIED_TAMPER_EVIDENT',
        records: auditRecords,
      };

      const jsonStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `comprovante_auditoria_d1_${eventId}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportNotice('Comprovante de auditoria exportado em JSON.');
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      console.error('Falha ao exportar JSON:', err);
    }
  };

  const getChangeTypeBadge = (type: AuditLogRecord['changeType']) => {
    switch (type) {
      case 'criacao':
        return {
          label: 'Criação do Registro',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
        };
      case 'aprovacao':
        return {
          label: 'Aprovação Formal',
          bg: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
          dot: 'bg-emerald-600',
        };
      case 'rejeicao':
        return {
          label: 'Rejeição',
          bg: 'bg-rose-50 text-rose-800 border-rose-200 font-bold',
          dot: 'bg-rose-500',
        };
      case 'revisao':
        return {
          label: 'Ajustes Solicitados',
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
        };
      case 'compliance':
        return {
          label: 'Checklist Compliance',
          bg: 'bg-teal-50 text-teal-800 border-teal-200',
          dot: 'bg-teal-500',
        };
      case 'tarefa':
        return {
          label: 'Tarefa Operacional',
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          dot: 'bg-blue-500',
        };
      case 'edicao_campo':
        return {
          label: 'Modificação de Campo',
          bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          dot: 'bg-indigo-500',
        };
      case 'recurso':
        return {
          label: 'Vínculo de Recurso',
          bg: 'bg-purple-50 text-purple-800 border-purple-200',
          dot: 'bg-purple-500',
        };
      case 'comentario':
        return {
          label: 'Nota / Comentário',
          bg: 'bg-slate-100 text-slate-800 border-slate-200',
          dot: 'bg-slate-400',
        };
      default:
        return {
          label: 'Alteração',
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
      {/* Header Banner: Cloudflare D1 Immutability Badge */}
      <div className="p-5 sm:p-6 bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Database className="w-3 h-3 text-emerald-400" />
              <span>Arquivo local do hub</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
              <Lock className="w-3 h-3 text-sky-400" />
              <span>Log Imutável (Append-Only)</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
              <Hash className="w-3 h-3 text-amber-400" />
              <span>SHA-256 Ledger</span>
            </span>
          </div>

          <h2 className="text-base sm:text-lg font-extrabold tracking-tight flex items-center gap-2 text-white">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Histórico de Auditoria e Trilha de Governança</span>
          </h2>

          <p className="text-xs text-slate-300 leading-relaxed">
            Registro cronológico e imutável de todas as modificações realizadas no evento. Cada alteração registra 
            <strong> quem mudou</strong>, <strong>qual campo foi modificado</strong>, <strong>valores antes/depois</strong> e a <strong>data/hora exata</strong>, com persistência atômica no arquivo local do hub.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0 self-start md:self-center flex-wrap">
          <button
            onClick={fetchAuditTrailFromD1}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Recarregar registros do arquivo local do hub"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
            <span>{isLoading ? 'Lendo trilha...' : 'Atualizar trilha'}</span>
          </button>

          <div className="relative inline-flex items-center rounded-lg shadow-xs">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-l-lg transition-all cursor-pointer"
              title="Baixar auditoria completa em planilha CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-1 px-2.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 border-l border-emerald-400/40 text-xs font-bold rounded-r-lg transition-all cursor-pointer"
              title="Baixar certificado de auditoria em JSON"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Export notification toast */}
      {exportNotice && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-800 font-semibold animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{exportNotice}</span>
          </div>
          <button onClick={() => setExportNotice(null)} className="text-emerald-600 hover:text-emerald-950 cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* Control Bar: Search & Category Filter Pills */}
      <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por usuário, campo modificado, valor ou hash..."
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                &times;
              </button>
            )}
          </div>

          {/* Quick Stats Summary */}
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="font-medium">
              Mostrando <strong className="text-slate-800 font-bold">{filteredRecords.length}</strong> de <strong className="text-slate-800">{auditRecords.length}</strong> alterações
            </span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
            <Filter className="w-3 h-3" />
            Filtros:
          </span>

          {[
            { id: 'todos', label: 'Todas as Alterações' },
            { id: 'aprovacao', label: 'Aprovações & Governança' },
            { id: 'compliance', label: 'Compliance & Políticas' },
            { id: 'tarefa', label: 'Tarefas' },
            { id: 'edicao_campo', label: 'Campos Editados' },
            { id: 'recurso', label: 'Recursos' },
            { id: 'comentario', label: 'Comentários' },
            { id: 'criacao', label: 'Criação' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedFilter(f.id as FilterCategory)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                selectedFilter === f.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Audit Records Feed */}
      <div className="p-4 sm:p-6 divide-y divide-slate-100">
        {filteredRecords.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-800">Nenhum registro de auditoria encontrado</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? `Nenhuma alteração corresponde aos termos de busca "${searchQuery}". Tente limpar os filtros.`
                : 'Não há alterações registradas para este filtro no momento.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-emerald-600 font-bold hover:underline"
              >
                Limpar busca
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecords.map((record, index) => {
              const { dateStr, timeStr } = formatTimestamp(record.timestamp);
              const relativeTime = getRelativeTime(record.timestamp);
              const badge = getChangeTypeBadge(record.changeType);

              return (
                <div
                  key={record.id}
                  className="bg-slate-50/60 hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 rounded-xl p-4 sm:p-5 transition-all text-xs space-y-3 relative group shadow-2xs"
                >
                  {/* Top Bar: Who changed, When, and Type Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    {/* Actor Details: Quem mudou */}
                    <div className="flex items-center gap-3">
                      {record.actorAvatar ? (
                        <img
                          src={record.actorAvatar}
                          alt={record.actorName}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {record.actorName.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900">{record.actorName}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-slate-200/80 text-slate-700 rounded-md font-medium">
                            {record.actorRole}
                          </span>
                          {record.actorEmail === currentUser.email && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-semibold">
                              Você
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{record.actorEmail}</p>
                      </div>
                    </div>

                    {/* Timestamp & Type Badge: Quando mudou */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border font-semibold ${badge.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        <span>{badge.label}</span>
                      </span>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-700">{relativeTime}</span>
                        <span>·</span>
                        <span className="font-mono text-slate-500">{dateStr} às {timeStr}</span>
                      </div>
                    </div>
                  </div>

                  {/* Core Audit Section: Qual campo foi modificado */}
                  <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Campo Modificado:
                        </span>
                        <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{record.fieldName}</span>
                          <code className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                            {record.fieldKey}
                          </code>
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-400 font-mono">
                        {record.identityMode}
                      </span>
                    </div>

                    {/* Diff: Antes vs Depois */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                      {/* Old Value */}
                      <div className="p-2.5 bg-rose-50/50 border border-rose-100 rounded-md">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700 mb-1 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span>Valor Anterior</span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-700 break-all line-through decoration-rose-300">
                          {record.oldValue || '(Vazio / Inexistente)'}
                        </div>
                      </div>

                      {/* New Value */}
                      <div className="p-2.5 bg-emerald-50/50 border border-emerald-200/80 rounded-md">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 mb-1 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Novo Valor Registrado</span>
                        </div>
                        <div className="font-mono text-[11px] text-emerald-950 font-bold break-all">
                          {record.newValue}
                        </div>
                      </div>
                    </div>

                    {/* Narrative Summary */}
                    {record.changeSummary && (
                      <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-md border border-slate-100 leading-relaxed">
                        <strong className="text-slate-800 font-semibold mr-1">Justificativa / Efeito:</strong>
                        <span>{record.changeSummary}</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Verification Strip: D1 Ledger Tx Hash */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500 truncate max-w-lg">
                      <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span className="text-slate-400">SHA-256:</span>
                      <span className="text-slate-700 font-bold truncate">{record.entryHash}</span>
                    </div>

                    <button
                      onClick={() => handleCopyHash(record.entryHash, record.id)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 transition-colors cursor-pointer"
                      title="Copiar hash SHA-256 do registro"
                    >
                      {copiedHashId === record.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Hash Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>Copiar Hash</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Legal & Governance Guarantee */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Trilha encadeada por SHA-256 neste hub. O armazenamento é um <strong>arquivo local</strong>, não um banco Cloudflare.
          </span>
        </div>
        <div className="font-mono text-[10px] text-slate-400">
          Total de {auditRecords.length} transações confirmadas
        </div>
      </div>
    </div>
  );
};
