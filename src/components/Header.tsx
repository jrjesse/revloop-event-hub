import React, { useState } from 'react';
import {
  Search,
  Bell,
  Building2,
  AlertTriangle,
  ChevronDown,
  UserCheck,
  Check,
  Database,
  Wifi,
  WifiOff,
  Menu,
} from 'lucide-react';
import { WorkspaceUser, CalendarConflict } from '../types/index.ts';

interface HeaderProps {
  currentUser: WorkspaceUser;
  workspaceMembers: WorkspaceUser[];
  onSwitchUser: (user: WorkspaceUser) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  conflicts: CalendarConflict[];
  onOpenConflictModal: () => void;
  onOpenNewEventModal: () => void;
  isOnline?: boolean;
  isSimulatedOffline?: boolean;
  cachedEventsCount?: number;
  onOpenCacheModal?: () => void;
  onOpenNav?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  workspaceMembers,
  onSwitchUser,
  searchQuery,
  onSearchChange,
  conflicts,
  onOpenConflictModal,
  onOpenNewEventModal,
  isOnline = true,
  isSimulatedOffline = false,
  cachedEventsCount = 0,
  onOpenCacheModal,
  onOpenNav,
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const effectiveOffline = !isOnline || isSimulatedOffline;

  return (
    <header className="h-16 border-b border-slate-200 bg-white px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs gap-2">
      <div className="flex items-center gap-2 sm:gap-6 flex-1 min-w-0 max-w-2xl">
        {onOpenNav && (
          <button
            type="button"
            onClick={onOpenNav}
            className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100"
            aria-label="Abrir navegação"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-center gap-2 text-slate-800 text-xs font-semibold shrink-0">
          <Building2 className="w-4 h-4 text-emerald-600" />
          <span className="hidden sm:inline">Revloop.com.br</span>
          <span className="text-slate-300 font-normal">/</span>
          <span className="text-slate-500 font-normal">Central de Eventos</span>
        </div>

        {/* Global Search Bar */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Buscar eventos por título, responsável, local ou objetivo..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg text-slate-800 placeholder-slate-400 outline-none transition-all"
          />
        </div>
      </div>

      {/* Right: Actions, Conflict warnings & Workspace User Switcher */}
      <div className="flex items-center gap-3">
        {/* IndexedDB Cache & Network Status Indicator */}
        {onOpenCacheModal && (
          <button
            onClick={onOpenCacheModal}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
              effectiveOffline
                ? 'bg-amber-100 hover:bg-amber-200/80 text-amber-900 border-amber-300 animate-pulse'
                : 'bg-emerald-50/80 hover:bg-emerald-100/70 text-emerald-800 border-emerald-200'
            }`}
            title="Clique para gerenciar o cache IndexedDB e status offline"
          >
            {effectiveOffline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">Offline (IndexedDB)</span>
                <span className="sm:hidden">Offline</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">IndexedDB Ativo</span>
                {cachedEventsCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-200/80 text-emerald-900 font-bold">
                    {cachedEventsCount}
                  </span>
                )}
              </>
            )}
          </button>
        )}

        {/* Calendar Conflict alert button if conflicts detected */}
        {conflicts.length > 0 && (
          <button
            onClick={onOpenConflictModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-medium transition-colors cursor-pointer"
            title="Conflitos com blocos de exemplo da agenda"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span className="hidden md:inline">{conflicts.length} Conflito de Agenda</span>
          </button>
        )}

        {/* User Switcher Dropdown (Demonstrates true server-side role validation) */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100/60 transition-all text-left cursor-pointer"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-6 h-6 rounded-full object-cover border border-slate-300 shrink-0"
            />
            <div className="hidden lg:block text-[11px] leading-tight max-w-[140px] truncate">
              <span className="font-semibold text-slate-800 block truncate">{currentUser.name}</span>
              <span className="text-[10px] text-slate-500 block truncate">{currentUser.department}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {userDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setUserDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-40 animate-in fade-in-50 zoom-in-95">
                <div className="px-3 py-1.5 border-b border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Alternar Usuário do Workspace
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Escolha um membro. O servidor emite a sessão e só o responsável designado aceita o pedido.
                  </p>
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  {workspaceMembers.map(member => {
                    const isSelected = member.email.toLowerCase() === currentUser.email.toLowerCase();
                    return (
                      <button
                        key={member.id}
                        onClick={() => {
                          onSwitchUser(member);
                          setUserDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-slate-50 cursor-pointer ${
                          isSelected ? 'bg-emerald-50/60 text-emerald-950 font-medium' : 'text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-7 h-7 rounded-full object-cover shrink-0"
                          />
                          <div className="truncate">
                            <p className="font-semibold truncate">{member.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{member.role}</p>
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
                <div className="p-2 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-500 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sessão local emitida pelo servidor. Não é login do Google Workspace.</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
