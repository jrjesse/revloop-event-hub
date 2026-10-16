import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Calendar,
  AlertTriangle,
  Clock,
  DollarSign,
  Users,
  MapPin,
  Building,
  FolderOpen,
  Share2,
  FileText,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import {
  EventType,
  EventFormat,
  WorkspaceUser,
  CalendarConflict,
  EventRecord,
} from '../types/index.ts';
import { api } from '../services/api.ts';

interface NewEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceMembers: WorkspaceUser[];
  currentUser: WorkspaceUser;
  onEventCreated: (event: EventRecord) => void;
  prefillData?: Partial<EventRecord> | null;
}

export const NewEventModal: React.FC<NewEventModalProps> = ({
  isOpen,
  onClose,
  workspaceMembers,
  currentUser,
  onEventCreated,
  prefillData,
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<EventType>('meetup');
  const [targetAudience, setTargetAudience] = useState('');
  const [designatedOwnerEmail, setDesignatedOwnerEmail] = useState('');
  const [objective, setObjective] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [format, setFormat] = useState<EventFormat>('presencial');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState<number | ''>(15000);
  const [estimatedAttendees, setEstimatedAttendees] = useState<number | ''>(60);
  const [suppliers, setSuppliers] = useState('');
  const [notes, setNotes] = useState('');
  const [slackChannel, setSlackChannel] = useState('');
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  const [attraction, setAttraction] = useState('');
  const [venueCapacity, setVenueCapacity] = useState(800);
  const [broadcastPlanned, setBroadcastPlanned] = useState(false);

  const [conflicts, setConflicts] = useState<CalendarConflict[]>([]);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Apply prefill data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (prefillData) {
        setTitle(prefillData.title || '');
        setType(prefillData.type || 'meetup');
        setTargetAudience(prefillData.targetAudience || '');
        setDesignatedOwnerEmail(prefillData.designatedOwnerEmail || workspaceMembers[1]?.email || '');
        setObjective(prefillData.objective || '');
        setStartDate(prefillData.startDate || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 16));
        setEndDate(prefillData.endDate || new Date(Date.now() + 14 * 86400000 + 14400000).toISOString().slice(0, 16));
        setFormat(prefillData.format || 'presencial');
        setLocation(prefillData.location || 'Revloop São Paulo');
        setBudget(prefillData.budget ?? 15000);
        setEstimatedAttendees(prefillData.estimatedAttendees ?? 50);
        setSuppliers(prefillData.suppliers ? prefillData.suppliers.join(', ') : '');
        setNotes(prefillData.notes || '');
        setSlackChannel(prefillData.slackChannel || '');
        setDriveFolderUrl(prefillData.driveFolderUrl || '');
        setAttraction(prefillData.attraction || '');
        setVenueCapacity(prefillData.venueCapacity || prefillData.estimatedAttendees || 800);
        setBroadcastPlanned(prefillData.broadcastPlanned ?? prefillData.format === 'hibrido');
      } else {
        // Default clean state
        setTitle('');
        setType('meetup');
        setTargetAudience('Comunidade de RevOps, analistas e líderes de receita');
        setDesignatedOwnerEmail(workspaceMembers[1]?.email || currentUser.email);
        setObjective('');
        const nextMonth = new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 16);
        setStartDate(nextMonth);
        setEndDate(new Date(Date.now() + 20 * 86400000 + 14400000).toISOString().slice(0, 16));
        setFormat('presencial');
        setLocation('São Paulo - SP');
        setBudget(15000);
        setEstimatedAttendees(80);
        setSuppliers('Buffet, Audiovisual, Gráfica');
        setNotes('');
        setSlackChannel('#evento-revloop');
        setDriveFolderUrl('https://drive.google.com/corp/revloop/eventos');
        setAttraction('');
        setVenueCapacity(800);
        setBroadcastPlanned(false);
      }
      setErrorMsg('');
    }
  }, [isOpen, prefillData, workspaceMembers, currentUser]);

  // Check Calendar conflicts whenever dates change
  useEffect(() => {
    if (!startDate) return;
    let isCancelled = false;

    const check = async () => {
      setIsCheckingConflicts(true);
      try {
        const found = await api.checkCalendarConflicts(startDate, endDate);
        if (!isCancelled) {
          setConflicts(found);
        }
      } catch (err) {
        console.warn('Could not check conflicts:', err);
      } finally {
        if (!isCancelled) setIsCheckingConflicts(false);
      }
    };

    const timer = setTimeout(check, 350);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [startDate, endDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !designatedOwnerEmail) {
      setErrorMsg('Preencha os campos obrigatórios (Título e Responsável).');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      const designatedMember = workspaceMembers.find(
        m => m.email.toLowerCase() === designatedOwnerEmail.toLowerCase()
      );

      const payload: Partial<EventRecord> = {
        title: title.trim(),
        type,
        targetAudience: targetAudience.trim(),
        designatedOwnerName: designatedMember ? designatedMember.name : designatedOwnerEmail.split('@')[0],
        designatedOwnerEmail: designatedOwnerEmail.trim(),
        objective: objective.trim(),
        startDate,
        endDate: endDate || startDate,
        format,
        location: location.trim(),
        budget: Number(budget) || 0,
        estimatedAttendees: Number(estimatedAttendees) || 50,
        suppliers: suppliers
          ? suppliers.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        notes: notes.trim(),
        slackChannel: slackChannel.trim(),
        driveFolderUrl: driveFolderUrl.trim(),
        attraction: attraction.trim() || undefined,
        venueCapacity: Number(venueCapacity) || undefined,
        broadcastPlanned,
      };

      const result = await api.createEvent(payload);
      onEventCreated(result.event);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao submeter solicitação de evento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full my-8 max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-0.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Fluxo Governamental de Solicitação
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Solicitar Novo Evento Corporativo
            </h2>
            <p className="text-xs text-slate-500">
              Disponível para todos os membros do Workspace Revloop.com.br.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Basic Info */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1">
              1. Identificação do Evento
            </h3>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Título do Evento *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Revloop Meetup SP #15 ou Jantar C-Level Faria Lima"
                className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg outline-none font-medium text-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Tipo de Evento *
                </label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as EventType)}
                  className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg outline-none font-medium text-slate-800"
                >
                  <option value="show">Show em casa</option>
                  <option value="festival">Festival</option>
                  <option value="meetup">Meetup Técnico / Comunitário</option>
                  <option value="jantar_clientes">Jantar com Clientes (C-Level VIP)</option>
                  <option value="webinar">Webinar Estratégico / Masterclass</option>
                  <option value="recrutamento">Evento de Recrutamento (Tech Day)</option>
                  <option value="offsite">Encontro da Equipe (Offsite)</option>
                  <option value="conferencia">Conferência / Summit</option>
                  <option value="workshop">Workshop Prático</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Responsável Designado (Alçada de Decisão) *
                </label>
                <select
                  value={designatedOwnerEmail}
                  onChange={e => setDesignatedOwnerEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg outline-none font-medium text-slate-800"
                >
                  {workspaceMembers.map(m => (
                    <option key={m.id} value={m.email}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Apenas este usuário poderá aceitar ou rejeitar a solicitação no servidor.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Público-Alvo
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value)}
                placeholder="Ex: 20 CROs e VPs de Vendas de contas Enterprise"
                className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg outline-none text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Objetivo Estratégico
              </label>
              <textarea
                rows={2}
                value={objective}
                onChange={e => setObjective(e.target.value)}
                placeholder="Ex: Fortalecer relacionamento com clientes VIP e apresentar novidades do roadmap de produto"
                className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg outline-none text-slate-800 resize-none"
              />
            </div>
          </div>

          {/* Section 2: Dates & Calendar Conflict Check */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1">
              2. Período e conflitos de agenda
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Data e Hora de Início *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg outline-none font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Data e Hora de Término
                </label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg outline-none font-mono text-slate-800"
                />
              </div>
            </div>

            {/* Google Calendar Conflict Warning Alert */}
            {conflicts.length > 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-950 space-y-1.5 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-amber-900 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Aviso: a data coincide com um bloco de exemplo.</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-snug">
                  A data informada coincide com o seguinte evento oficial do Revloop:
                </p>
                {conflicts.map((c, i) => (
                  <div key={i} className="text-[11px] bg-white/90 p-2 rounded border border-amber-200 font-medium">
                    <strong>{c.conflictingEventTitle}</strong> ({new Date(c.start).toLocaleDateString('pt-BR')} das {new Date(c.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} às {new Date(c.end).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})
                    <p className="text-[10px] text-amber-800 mt-0.5">{c.description}</p>
                  </div>
                ))}
              </div>
            ) : startDate ? (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-medium pt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Nenhum conflito de agenda neste intervalo.</span>
              </div>
            ) : null}
          </div>

          {/* Section 3: Format, Budget & Attendees */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1">
              3. Local, Formato & Orçamento
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Formato do Evento
                </label>
                <select
                  value={format}
                  onChange={e => setFormat(e.target.value as EventFormat)}
                  className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg outline-none font-medium text-slate-800"
                >
                  <option value="presencial">Presencial</option>
                  <option value="hibrido">Híbrido</option>
                  <option value="virtual">100% Virtual / Remoto</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Orçamento Previsto (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={budget}
                  onChange={e => setBudget(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="15000"
                  className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg outline-none font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Estimativa de Participantes
                </label>
                <input
                  type="number"
                  min="1"
                  value={estimatedAttendees}
                  onChange={e => setEstimatedAttendees(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="50"
                  className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg outline-none font-mono text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Local Físico ou Plataforma Virtual
              </label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Ex: Manioca - Jardim Paulistano ou Zoom Enterprise"
                className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg outline-none text-slate-800"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
              <h3 className="text-xs font-bold text-slate-900">Controle do show</h3>
              <p className="text-[11px] text-slate-500">Atração, casa e transmissão entram no quadro de ingresso, palco e mídia.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Atração</label>
                  <input
                    type="text"
                    value={attraction}
                    onChange={e => setAttraction(e.target.value)}
                    placeholder="Nome da atração"
                    className="w-full p-2.5 bg-white border border-slate-200 focus:border-emerald-500 rounded-lg outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Capacidade da casa</label>
                  <input
                    type="number"
                    min="1"
                    value={venueCapacity}
                    onChange={e => setVenueCapacity(e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-slate-200 focus:border-emerald-500 rounded-lg outline-none font-mono text-slate-800"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700">
                <input type="checkbox" checked={broadcastPlanned} onChange={e => setBroadcastPlanned(e.target.checked)} className="accent-emerald-600" />
                Transmissão ao vivo com controle de mídia
              </label>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Fornecedores Previstos (separados por vírgula)
              </label>
              <input
                type="text"
                value={suppliers}
                onChange={e => setSuppliers(e.target.value)}
                placeholder="Ex: Restaurante, Gráfica FinePrint, A/V Streaming"
                className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg outline-none text-slate-800"
              />
            </div>
          </div>

          {/* Section 4: Resource Links */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1">
              4. Recursos & Links Conectados (Drive & Slack)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Pasta Google Drive (Briefing & Ativos)
                </label>
                <input
                  type="url"
                  value={driveFolderUrl}
                  onChange={e => setDriveFolderUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg outline-none text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Canal no Slack para Coordenação
                </label>
                <input
                  type="text"
                  value={slackChannel}
                  onChange={e => setSlackChannel(e.target.value)}
                  placeholder="#evento-q4-sp"
                  className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg outline-none text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Observações Adicionais
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Detalhes sobre palestrantes, restrições alimentares ou diretrizes de segurança..."
                className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg outline-none text-slate-800 resize-none"
              />
            </div>
          </div>

          {/* Governance Notice */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-800">Governança Revloop:</strong> Ao enviar, a solicitação será registrada no hub com status <span className="font-semibold text-amber-700">"Solicitado"</span>. Somente o responsável indicado terá autorização para aprovar o início do planejamento e alocação orçamentária.
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
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
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Gravando...' : 'Submeter Solicitação de Evento'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
