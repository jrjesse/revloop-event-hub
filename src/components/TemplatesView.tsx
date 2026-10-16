import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  Users,
  DollarSign,
  Clock,
  CheckCircle2,
  Calendar,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { EventTemplate } from '../types/index.ts';

interface TemplatesViewProps {
  templates: EventTemplate[];
  onUseTemplate: (template: EventTemplate) => void;
  onNavigateToPlaybooks: () => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  templates,
  onUseTemplate,
  onNavigateToPlaybooks,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<EventTemplate | null>(templates[0] || null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            Playbooks Operacionais Padronizados
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Modelos de Eventos Revloop
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Estruturas validadas com cronogramas, checklists de compliance do Notion, alçadas e tarefas recomendadas.
          </p>
        </div>

        <button
          onClick={onNavigateToPlaybooks}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <BookOpen className="w-3.5 h-3.5 text-slate-500" />
          <span>Ver Diretrizes & Políticas</span>
        </button>
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {templates.map(tpl => {
          const isSelected = selectedTemplate?.id === tpl.id;
          return (
            <div
              key={tpl.id}
              onClick={() => setSelectedTemplate(tpl)}
              className={`bg-white rounded-xl border transition-all p-5 flex flex-col justify-between cursor-pointer shadow-xs ${
                isSelected
                  ? 'border-emerald-500 ring-2 ring-emerald-100 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Format & Tags */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] uppercase font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {tpl.type.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {tpl.leadTimeDays} dias de antecedência
                  </span>
                </div>

                {/* Name */}
                <h3 className="text-base font-bold text-slate-900">{tpl.name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {tpl.description}
                </p>

                {/* Key Metrics */}
                <div className="mt-4 space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Público Estimado:</span>
                    <span className="font-semibold text-slate-800">{tpl.recommendedAttendees}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Faixa de Orçamento:</span>
                    <span className="font-semibold text-slate-800">{tpl.estimatedBudgetRange}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Formato Padrão:</span>
                    <span className="font-semibold text-slate-800 capitalize">{tpl.defaultFormat}</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {tpl.tags.map((tag, i) => (
                    <span key={i} className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {tpl.defaultMilestones.length} marcos · {tpl.defaultTasks.length} tarefas
                </span>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onUseTemplate(tpl);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Usar este Modelo</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Template Deep-Dive Preview */}
      {selectedTemplate && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] uppercase font-mono font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                Estrutura Pré-Configurada
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-1">
                Detalhamento do Modelo: {selectedTemplate.name}
              </h2>
            </div>
            <button
              onClick={() => onUseTemplate(selectedTemplate)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Iniciar Solicitação com este Modelo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Milestones Preview */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                Marcos Padrão ({selectedTemplate.defaultMilestones.length})
              </h4>
              <div className="space-y-2">
                {selectedTemplate.defaultMilestones.map((m, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded-lg text-xs border border-slate-100">
                    <p className="font-semibold text-slate-800">{m.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Prazo: {m.dueDate} · {m.ownerName}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tasks Preview */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Tarefas Recomendadas ({selectedTemplate.defaultTasks.length})
              </h4>
              <div className="space-y-2">
                {selectedTemplate.defaultTasks.map((t, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded-lg text-xs border border-slate-100">
                    <p className="font-semibold text-slate-800">{t.title}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                      <span className="capitalize">{t.category}</span>
                      <span>·</span>
                      <span className="text-amber-700 font-semibold uppercase">{t.priority} prioridade</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Policy Items Preview */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                Checklist de Políticas ({selectedTemplate.defaultPolicyItems.length})
              </h4>
              <div className="space-y-2">
                {selectedTemplate.defaultPolicyItems.map((p, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded-lg text-xs border border-slate-100">
                    <p className="font-semibold text-slate-800">{p.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{p.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
