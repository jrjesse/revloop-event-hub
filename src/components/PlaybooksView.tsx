import React, { useState } from 'react';
import {
  BookOpen,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  FileText,
  Building,
  HeartHandshake,
  Gift,
  Truck,
  Lock,
  Megaphone,
} from 'lucide-react';
import { PlaybookGuide, PolicyCheckItem } from '../types/index.ts';

interface PlaybooksViewProps {
  playbooks: PlaybookGuide[];
}

export const PlaybooksView: React.FC<PlaybooksViewProps> = ({ playbooks }) => {
  const [selectedPlaybook, setSelectedPlaybook] = useState<PlaybookGuide>(playbooks[0] || null);

  const getCategoryIcon = (cat: PolicyCheckItem['category']) => {
    switch (cat) {
      case 'aprovacoes_gerais':
        return <Building className="w-4 h-4 text-emerald-600" />;
      case 'acessibilidade':
        return <HeartHandshake className="w-4 h-4 text-indigo-600" />;
      case 'swag_brindes':
        return <Gift className="w-4 h-4 text-amber-600" />;
      case 'avaliacao_fornecedores':
        return <Truck className="w-4 h-4 text-blue-600" />;
      case 'privacidade_lgpd':
        return <Lock className="w-4 h-4 text-rose-600" />;
      case 'comunicacoes':
        return <Megaphone className="w-4 h-4 text-purple-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
            Base de Conhecimento & Compliance Notion
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Políticas & Playbooks Corporativos Revloop
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Diretrizes mandatórias de alçadas, acessibilidade, homologação de fornecedores, privacidade e sustentabilidade.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Sincronizado com Notion Wiki Revloop</span>
        </div>
      </div>

      {/* Main Split: Left Sidebar of Policies + Right Document Reader */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 4 Cols: Policy Navigation */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
            6 Diretrizes Essenciais
          </div>
          {playbooks.map(pb => {
            const isSelected = selectedPlaybook?.id === pb.id;
            return (
              <div
                key={pb.id}
                onClick={() => setSelectedPlaybook(pb)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer text-xs ${
                  isSelected
                    ? 'bg-white border-emerald-500 shadow-sm ring-2 ring-emerald-50'
                    : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {getCategoryIcon(pb.category)}
                  <span className="font-bold text-slate-900 truncate">{pb.title}</span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                  {pb.summary}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
                  <span>Versão {pb.version}</span>
                  <span>Atualizado: {pb.updatedAt}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right 8 Cols: Active Document Reader */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
          {selectedPlaybook ? (
            <>
              {/* Document Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Revloop Policy · Notion Sync
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Versão {selectedPlaybook.version}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">
                    {selectedPlaybook.title}
                  </h2>
                </div>

                <a
                  href={selectedPlaybook.notionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir no Notion</span>
                </a>
              </div>

              {/* Summary box */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600">
                <strong className="text-slate-800 block mb-1">Resumo Executivo da Política:</strong>
                {selectedPlaybook.summary}
              </div>

              {/* Full Content */}
              <div className="prose prose-sm max-w-none text-slate-700 space-y-4 text-xs leading-relaxed">
                {selectedPlaybook.fullContent.split('\n\n').map((paragraph, idx) => {
                  if (paragraph.startsWith('### ')) {
                    return (
                      <h3 key={idx} className="text-sm font-bold text-slate-900 pt-3 border-b border-slate-100 pb-1">
                        {paragraph.replace('### ', '')}
                      </h3>
                    );
                  }
                  if (paragraph.startsWith('- ')) {
                    const items = paragraph.split('\n- ');
                    return (
                      <ul key={idx} className="list-disc pl-5 space-y-1">
                        {items.map((item, i) => (
                          <li key={i}>{item.replace(/^- /, '')}</li>
                        ))}
                      </ul>
                    );
                  }
                  return <p key={idx}>{paragraph}</p>;
                })}
              </div>

              {/* Mandatory Checklist requirement notes */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Obrigatório para os tipos de evento:{' '}
                  <strong className="text-slate-700">{selectedPlaybook.mandatoryFor.join(', ')}</strong>
                </span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Auditado em todos os eventos
                </span>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              Selecione uma diretriz ao lado para visualizar os detalhes completos.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
