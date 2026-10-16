import React, { useState } from 'react';
import {
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Clock,
} from 'lucide-react';
import { EventRecord, WorkspaceUser } from '../types/index.ts';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventRecord | null;
  currentUser: WorkspaceUser;
  initialAction?: 'accept' | 'reject' | 'request_changes';
  onSubmitReview: (
    eventId: string,
    action: 'accept' | 'reject' | 'request_changes',
    reason?: string
  ) => Promise<{ success: boolean; error?: string }>;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  event,
  currentUser,
  initialAction = 'accept',
  onSubmitReview,
}) => {
  const [action, setAction] = useState<'accept' | 'reject' | 'request_changes'>(initialAction);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  if (!isOpen || !event) return null;

  const isResponsible =
    event.viewer?.isOwner ??
    event.designatedOwnerEmail.toLowerCase() === currentUser.email.toLowerCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (action === 'reject' && !reason.trim()) {
      setServerError('Por favor, informe a justificativa da rejeição.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await onSubmitReview(event.id, action, reason.trim());
      if (res.success) {
        onClose();
      } else {
        setServerError(res.error || 'Falha ao processar revisão.');
      }
    } catch (err: any) {
      setServerError(err.message || 'Erro de comunicação com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in-50 zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Avaliação de Governança do Evento
              </h2>
              <p className="text-[11px] text-slate-500">Validação server-side de alçadas Revloop</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Target Event Info */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-[10px] uppercase font-mono font-semibold text-slate-500">
              Evento Selecionado:
            </span>
            <p className="font-bold text-slate-900 text-sm">{event.title}</p>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>
                Solicitado por: <strong>{event.requestedByName}</strong>
              </span>
              <span>
                Orçamento: <strong>R$ {event.budget?.toLocaleString('pt-BR')}</strong>
              </span>
            </div>
          </div>

          {/* Authorization Status Warning Box */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              isResponsible
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/80 border-amber-300 text-amber-950'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {isResponsible ? (
                <UserCheck className="w-5 h-5 text-emerald-600" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-amber-600" />
              )}
            </div>

            <div className="space-y-1">
              <p className="font-bold text-xs">
                {isResponsible
                  ? 'Autorização Confirmada: Você é o Responsável Designado'
                  : 'Aviso: Usuário Diferente do Responsável Designado'}
              </p>
              <div className="text-[11px] leading-relaxed">
                {isResponsible ? (
                  <span>
                    Sua sessão atual (<strong>{currentUser.email}</strong>) coincide com a alçada do evento. Sua decisão será gravada pelo servidor.
                  </span>
                ) : (
                  <span>
                    O responsável registrado é <strong>{event.designatedOwnerName} ({event.designatedOwnerEmail})</strong>. Seu usuário atual é <strong>{currentUser.name} ({currentUser.email})</strong>. Se você tentar aprovar, o servidor retornará <strong>HTTP 403 Forbidden</strong>.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Server Error Alert if 403 or other error returned */}
          {serverError && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl space-y-1 animate-in fade-in">
              <div className="flex items-center gap-1.5 font-bold text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Bloqueio de Segurança Server-Side</span>
              </div>
              <p className="text-[11px] leading-relaxed pl-5">{serverError}</p>
            </div>
          )}

          {/* Action Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">
              Escolha a Decisão
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAction('accept')}
                className={`p-2.5 rounded-lg border font-semibold text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  action === 'accept'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-600 shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span>Aceitar</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('request_changes')}
                className={`p-2.5 rounded-lg border font-semibold text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  action === 'request_changes'
                    ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Pedir Ajustes</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('reject')}
                className={`p-2.5 rounded-lg border font-semibold text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  action === 'reject'
                    ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <XCircle className="w-4 h-4" />
                <span>Rejeitar</span>
              </button>
            </div>
          </div>

          {/* Reason / Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              {action === 'reject'
                ? 'Motivo da Rejeição (Obrigatório) *'
                : 'Observações do Responsável (Opcional)'}
            </label>
            <textarea
              rows={3}
              required={action === 'reject'}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={
                action === 'accept'
                  ? 'Ex: Proposta alinhada com as metas do Q4. Aprovado para início de contratações.'
                  : action === 'reject'
                  ? 'Ex: Orçamento excede o limite disponível para este formato ou data inviável.'
                  : 'Ex: Favor renegociar fornecedor de buffet e checar acessibilidade do local.'
              }
              className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg outline-none text-slate-800 resize-none text-xs"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 font-bold text-xs rounded-lg transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50 ${
                action === 'accept'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  : action === 'reject'
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
              }`}
            >
              {isSubmitting ? 'Processando...' : 'Confirmar Decisão no Servidor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
