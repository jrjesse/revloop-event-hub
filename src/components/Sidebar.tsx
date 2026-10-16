import React from 'react';
import {
  LayoutDashboard,
  Clock,
  CalendarCheck,
  History,
  Layers,
  BookOpen,
  Share2,
  PlusCircle,
  ShieldCheck,
  BarChart3,
  Radio,
} from 'lucide-react';
import { WorkspaceUser, ConnectedSourceSummary } from '../types/index.ts';

export type NavView =
  | 'overview'
  | 'pending'
  | 'upcoming'
  | 'controle'
  | 'past'
  | 'analytics'
  | 'templates'
  | 'playbooks';

interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  pendingCount: number;
  onOpenNewModal: () => void;
  onOpenSourcesModal: () => void;
  currentUser: WorkspaceUser;
  connectedSources: ConnectedSourceSummary[];
  mobileOpen?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  pendingCount,
  onOpenNewModal,
  onOpenSourcesModal,
  currentUser,
  connectedSources,
  mobileOpen = false,
}) => {
  const navItems: { id: NavView; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'overview',
      label: 'Visão Geral',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'pending',
      label: 'Solicitações em Andamento',
      icon: <Clock className="w-4 h-4" />,
      badge: pendingCount,
    },
    {
      id: 'upcoming',
      label: 'Próximos Eventos',
      icon: <CalendarCheck className="w-4 h-4" />,
    },
    {
      id: 'controle',
      label: 'Controle do show',
      icon: <Radio className="w-4 h-4" />,
    },
    {
      id: 'past',
      label: 'Eventos Passados',
      icon: <History className="w-4 h-4" />,
    },
    {
      id: 'analytics',
      label: 'Analytics de Governança',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'templates',
      label: 'Modelos de Eventos',
      icon: <Layers className="w-4 h-4" />,
    },
    {
      id: 'playbooks',
      label: 'Políticas & Playbooks',
      icon: <BookOpen className="w-4 h-4" />,
    },
  ];

  return (
    <aside className={`${mobileOpen ? 'fixed inset-y-0 left-0 z-40 flex' : 'hidden'} lg:relative lg:flex w-64 bg-slate-950 text-slate-200 border-r border-slate-800 flex-col shrink-0 min-h-screen select-none`}>
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold tracking-tight shadow-md">
            Rv
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-base tracking-tight">Revloop</span>
              <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-1.5 py-0.2 rounded">
                Corp
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate">revloop.com.br · Event Hub</p>
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          onClick={onOpenNewModal}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg transition-all shadow-sm active:scale-[0.98] cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Solicitar Novo Evento</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Navegação Principal
        </div>
        {navItems.map(item => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                isActive
                  ? 'bg-slate-800 text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? 'text-emerald-400' : 'text-slate-400'}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-slate-950">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-5 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Integrações Corporativas</span>
          <button
            onClick={onOpenSourcesModal}
            className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 cursor-pointer lowercase"
          >
            <Share2 className="w-2.5 h-2.5" /> gerenciar
          </button>
        </div>

        {/* Connected Sources Status Widget */}
        <div className="space-y-1 px-1">
          {connectedSources.map(src => (
            <div
              key={src.id}
              onClick={onOpenSourcesModal}
              className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-slate-900 transition-colors cursor-pointer text-[11px]"
            >
              <div className="flex items-center gap-2 truncate">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    src.status === 'exemplo_semeado'
                      ? 'bg-amber-400'
                      : src.status === 'sincronizado' || src.status === 'conectado'
                      ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]'
                      : 'bg-amber-400'
                  }`}
                />
                <span className="text-slate-300 truncate">{src.name}</span>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0 font-mono">exemplo</span>
            </div>
          ))}
        </div>
      </nav>

      {/* Governance & Server Validation Guarantee Banner */}
      <div className="mx-3 my-2 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 text-slate-200 font-semibold mb-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Governança Server-Side</span>
        </div>
        <p className="text-[10px] leading-relaxed text-slate-400">
          Validação no servidor: apenas o responsável designado aceita solicitações.
        </p>
      </div>

      {/* User Session Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80">
        <div className="flex items-center gap-2.5">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700 shrink-0"
          />
          <div className="truncate flex-1">
            <p className="text-xs font-semibold text-white truncate">{currentUser.name}</p>
            <p className="text-[10px] text-slate-400 truncate">{currentUser.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
