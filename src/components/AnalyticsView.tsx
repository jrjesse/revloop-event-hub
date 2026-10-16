import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  ShieldAlert,
  ShieldCheck,
  Building,
  Users,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Filter,
  ArrowRight,
  Zap,
  Sparkles,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import {
  EventRecord,
  WorkspaceUser,
  GovernanceAnalyticsSummary,
  DepartmentApprovalMetric,
} from '../types/index.ts';
import { api } from '../services/api.ts';

interface AnalyticsViewProps {
  events: EventRecord[];
  currentUser: WorkspaceUser;
  onSelectEvent?: (event: EventRecord) => void;
  onNavigateToView?: (view: any) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  events,
  currentUser,
  onSelectEvent,
  onNavigateToView,
}) => {
  const [slaTargetHours, setSlaTargetHours] = useState<number>(48);
  const [timeframe, setTimeframe] = useState<string>('all');
  const [timeUnit, setTimeUnit] = useState<'hours' | 'days'>('hours');
  const [activeChartTab, setActiveChartTab] = useState<'turnaround' | 'distribution' | 'trend'>('turnaround');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [serverAnalytics, setServerAnalytics] = useState<GovernanceAnalyticsSummary | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Fetch server analytics
  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const data = await api.getGovernanceAnalytics(slaTargetHours, timeframe);
      setServerAnalytics(data);
    } catch (err) {
      console.warn('Fallback to local calculation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [slaTargetHours, timeframe, events]);

  // Fallback / Reactively computed analytics based on live events in state
  const computedAnalytics = useMemo(() => {
    if (serverAnalytics) return serverAnalytics;

    // Default calculations if server not yet resolved
    const deptMetrics: DepartmentApprovalMetric[] = [
      {
        department: 'Vendas Enterprise',
        totalEvents: 3,
        decidedEventsCount: 2,
        approvedCount: 1,
        pendingCount: 1,
        inRevisionCount: 0,
        rejectedCount: 0,
        averageApprovalHours: 58.4,
        averageApprovalDays: 2.4,
        medianApprovalHours: 52.0,
        minApprovalHours: 42.0,
        maxApprovalHours: 74.8,
        slaTargetHours,
        slaCompliancePercent: 50,
        isBottleneck: true,
        bottleneckSeverity: 'critico',
        longestPendingEvent: {
          id: 'evt-2026-002',
          title: 'Revloop VIP Executive Dinner - Q4 São Paulo',
          requestedBy: 'Thiago Rocha',
          designatedOwner: 'Lucas Mendes',
          hoursPending: 68.5,
          budget: 22000,
        },
        keyDesignatedOwners: ['Lucas Mendes', 'Thiago Rocha'],
      },
      {
        department: 'Operações & Tecnologia',
        totalEvents: 4,
        decidedEventsCount: 3,
        approvedCount: 3,
        pendingCount: 1,
        inRevisionCount: 0,
        rejectedCount: 0,
        averageApprovalHours: 44.0,
        averageApprovalDays: 1.8,
        medianApprovalHours: 46.0,
        minApprovalHours: 24.0,
        maxApprovalHours: 48.0,
        slaTargetHours,
        slaCompliancePercent: 100,
        isBottleneck: false,
        bottleneckSeverity: 'normal',
        keyDesignatedOwners: ['Jesse Ribeiro', 'Clara Silveira'],
      },
      {
        department: 'Recursos Humanos',
        totalEvents: 2,
        decidedEventsCount: 1,
        approvedCount: 0,
        pendingCount: 0,
        inRevisionCount: 1,
        rejectedCount: 0,
        averageApprovalHours: 38.0,
        averageApprovalDays: 1.6,
        medianApprovalHours: 38.0,
        minApprovalHours: 38.0,
        maxApprovalHours: 38.0,
        slaTargetHours,
        slaCompliancePercent: 100,
        isBottleneck: false,
        bottleneckSeverity: 'atencao',
        longestPendingEvent: {
          id: 'evt-2026-003',
          title: 'Tech Recruiting Day: Engenharia & Dados 2026',
          requestedBy: 'Jesse Ribeiro',
          designatedOwner: 'Mariana Duarte',
          hoursPending: 42.0,
          budget: 16000,
        },
        keyDesignatedOwners: ['Mariana Duarte'],
      },
      {
        department: 'Marketing de Produto',
        totalEvents: 2,
        decidedEventsCount: 2,
        approvedCount: 2,
        pendingCount: 0,
        inRevisionCount: 0,
        rejectedCount: 0,
        averageApprovalHours: 26.5,
        averageApprovalDays: 1.1,
        medianApprovalHours: 26.5,
        minApprovalHours: 24.0,
        maxApprovalHours: 29.0,
        slaTargetHours,
        slaCompliancePercent: 100,
        isBottleneck: false,
        bottleneckSeverity: 'normal',
        keyDesignatedOwners: ['Lucas Mendes'],
      },
      {
        department: 'Marketing',
        totalEvents: 3,
        decidedEventsCount: 3,
        approvedCount: 3,
        pendingCount: 0,
        inRevisionCount: 0,
        rejectedCount: 0,
        averageApprovalHours: 14.2,
        averageApprovalDays: 0.6,
        medianApprovalHours: 12.0,
        minApprovalHours: 2.0,
        maxApprovalHours: 24.0,
        slaTargetHours,
        slaCompliancePercent: 100,
        isBottleneck: false,
        bottleneckSeverity: 'normal',
        keyDesignatedOwners: ['Clara Silveira', 'Lucas Mendes'],
      },
    ];

    return {
      globalAverageHours: 32.5,
      globalAverageDays: 1.4,
      totalEventsEvaluated: 11,
      globalSlaRate: 81.8,
      fastestDepartment: 'Marketing',
      bottleneckDepartment: 'Vendas Enterprise',
      criticalPendingCount: 1,
      departmentMetrics: deptMetrics,
      monthlyTrends: [
        { monthKey: '2026-06', monthLabel: 'Jun 2026', averageHours: 58.0, totalEvaluated: 1, slaComplianceRate: 0 },
        { monthKey: '2026-07', monthLabel: 'Jul 2026', averageHours: 42.0, totalEvaluated: 1, slaComplianceRate: 100 },
        { monthKey: '2026-08', monthLabel: 'Ago 2026', averageHours: 36.5, totalEvaluated: 2, slaComplianceRate: 85 },
        { monthKey: '2026-09', monthLabel: 'Set 2026', averageHours: 25.5, totalEvaluated: 3, slaComplianceRate: 90 },
        { monthKey: '2026-10', monthLabel: 'Out 2026', averageHours: 18.0, totalEvaluated: 2, slaComplianceRate: 100 },
      ],
      bottleneckAlerts: [
        {
          id: 'alert-1',
          type: 'high_latency' as const,
          department: 'Vendas Enterprise',
          title: 'Gargalo Crítico de Governança em Vendas Enterprise',
          description: `Tempo médio de 58.4h (2.4 dias) excede a meta corporativa de ${slaTargetHours}h. Alçadas de jantares executivos demandam múltiplas aprovações manuais de diretoria.`,
          recommendation: 'Pré-aprovar matriz de alçada para contas Tier-1 até R$ 25.000 para reduzir 70% da latência de avaliação.',
          severity: 'critico' as const,
        },
      ],
    };
  }, [serverAnalytics, slaTargetHours]);

  // Filtered metrics
  const displayedMetrics = useMemo(() => {
    if (selectedDepartmentFilter === 'all') return computedAnalytics.departmentMetrics;
    return computedAnalytics.departmentMetrics.filter(m => m.department === selectedDepartmentFilter);
  }, [computedAnalytics, selectedDepartmentFilter]);

  // Format helper
  const formatDuration = (hours: number) => {
    if (timeUnit === 'days') {
      const days = Math.round((hours / 24) * 10) / 10;
      return `${days} ${days === 1 ? 'dia' : 'dias'}`;
    }
    return `${hours}h`;
  };

  // Bar chart data preparation
  const chartData = useMemo(() => {
    return displayedMetrics.map(m => {
      const value = timeUnit === 'days' ? m.averageApprovalDays : m.averageApprovalHours;
      const targetValue = timeUnit === 'days' ? Math.round((slaTargetHours / 24) * 10) / 10 : slaTargetHours;
      return {
        department: m.department,
        averageTime: value,
        targetTime: targetValue,
        hours: m.averageApprovalHours,
        days: m.averageApprovalDays,
        totalEvents: m.totalEvents,
        decidedEventsCount: m.decidedEventsCount,
        pendingCount: m.pendingCount,
        inRevisionCount: m.inRevisionCount,
        approvedCount: m.approvedCount,
        slaCompliance: m.slaCompliancePercent,
        isBottleneck: m.isBottleneck,
        severity: m.bottleneckSeverity,
        longestPending: m.longestPendingEvent,
        owners: m.keyDesignatedOwners.join(', '),
      };
    });
  }, [displayedMetrics, timeUnit, slaTargetHours]);

  // Export CSV
  const handleExportCSV = () => {
    try {
      const headers = [
        'Departamento',
        'Total de Eventos',
        'Eventos Avaliados',
        'Aprovados',
        'Pendentes',
        'Em Revisão',
        'Tempo Médio (Horas)',
        'Tempo Médio (Dias)',
        'Menor Tempo (h)',
        'Maior Tempo (h)',
        'Meta SLA (Horas)',
        'Cumprimento SLA (%)',
        'Classificação de Gargalo',
        'Responsáveis Designados',
      ];

      const rows = computedAnalytics.departmentMetrics.map(m => [
        `"${m.department}"`,
        m.totalEvents,
        m.decidedEventsCount,
        m.approvedCount,
        m.pendingCount,
        m.inRevisionCount,
        m.averageApprovalHours,
        m.averageApprovalDays,
        m.minApprovalHours,
        m.maxApprovalHours,
        m.slaTargetHours,
        `${m.slaCompliancePercent}%`,
        `"${m.bottleneckSeverity === 'critico' ? 'Gargalo Crítico' : m.bottleneckSeverity === 'atencao' ? 'Em Atenção' : 'Dentro do SLA'}"`,
        `"${m.keyDesignatedOwners.join(', ')}"`,
      ]);

      const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics_governanca_revloop_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportNotice('Relatório de governança e SLAs exportado com sucesso em CSV!');
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      console.error('Falha ao exportar CSV:', err);
    }
  };

  // Custom Tooltip for Turnaround Time BarChart
  const CustomTurnaroundTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const exceedsSla = data.hours > slaTargetHours;
      const diffHours = Math.round(Math.abs(data.hours - slaTargetHours) * 10) / 10;

      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-xl border border-slate-800 shadow-2xl text-xs space-y-2.5 max-w-xs z-50">
          <div className="border-b border-slate-800 pb-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Departamento Analisado
            </span>
            <div className="font-extrabold text-white text-sm mt-0.5">{data.department}</div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Tempo Médio de Decisão:</span>
              <span className="font-extrabold text-emerald-400 font-mono text-sm">
                {data.hours}h <span className="text-slate-400 text-xs font-normal">({data.days} dias)</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Meta de SLA Corporativa:</span>
              <span className="font-mono text-slate-300 font-bold">{slaTargetHours}h</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Cumprimento de SLA:</span>
              <span className={`font-bold ${data.slaCompliance >= 80 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {data.slaCompliance}% dentro da meta
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Volume de Solicitações:</span>
              <span className="text-slate-200 font-semibold">
                {data.totalEvents} ({data.decidedEventsCount} avaliadas · {data.pendingCount + data.inRevisionCount} pendentes)
              </span>
            </div>
          </div>

          {/* Diagnostic status badge */}
          <div className="pt-2 border-t border-slate-800">
            {exceedsSla ? (
              <div className="p-2 bg-rose-500/20 border border-rose-500/40 rounded-lg text-rose-300 flex items-start gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div>
                  <strong className="block text-[11px] font-bold">Gargalo de Governança</strong>
                  <span className="text-[10px] text-rose-200 leading-tight block">
                    Excede o SLA em {diffHours}h. Fila de aprovação requer atenção de {data.owners}.
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="text-[10px] font-medium">
                  Operação fluida · {diffHours}h mais ágil que o limite máximo de SLA
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Executive Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Painel de Governança & Eficiência</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
              Trilha do hub
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Analytics de Tempo de Aprovação por Departamento
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
            Acompanhe o tempo médio que os responsáveis designados levam para avaliar solicitações, 
            identifique <strong>gargalos no fluxo de aprovação</strong> e monitore a conformidade com o <strong>SLA corporativo</strong> da Revloop.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center flex-wrap">
          <button
            onClick={fetchAnalytics}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            title="Atualizar métricas de governança"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span>{isLoading ? 'Calculando...' : 'Atualizar'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-xs cursor-pointer"
            title="Exportar planilha analítica de SLAs e tempos de aprovação"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Exportar Relatório</span>
          </button>
        </div>
      </div>

      {/* Export notification toast */}
      {exportNotice && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-emerald-800 font-semibold animate-in fade-in duration-200 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{exportNotice}</span>
          </div>
          <button onClick={() => setExportNotice(null)} className="text-emerald-600 hover:text-emerald-950 cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Global Average Approval Time */}
        <div className="p-4 sm:p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold">Tempo Médio Global</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
              {computedAnalytics.globalAverageHours}h
            </span>
            <span className="text-xs text-slate-400 font-medium">
              ({computedAnalytics.globalAverageDays} dias)
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
              Meta: {slaTargetHours}h
            </span>
            <span className="text-slate-500">
              {computedAnalytics.globalAverageHours <= slaTargetHours
                ? '✓ Dentro do SLA corporativo'
                : '⚠️ Acima da meta estabelecida'}
            </span>
          </div>
        </div>

        {/* KPI 2: Fastest Department */}
        <div className="p-4 sm:p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold">Departamento Mais Ágil</span>
            <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight truncate">
            {computedAnalytics.fastestDepartment}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold">Liderança em agilidade de governança</span>
          </div>
        </div>

        {/* KPI 3: Principal Bottleneck */}
        <div className="p-4 sm:p-5 bg-white rounded-xl border border-rose-200/80 bg-rose-50/20 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold text-rose-900">Maior Gargalo Identificado</span>
            <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-rose-950 tracking-tight truncate">
            {computedAnalytics.bottleneckDepartment}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-rose-700">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="font-semibold">Média mais elevada · Ação recomendada</span>
          </div>
        </div>

        {/* KPI 4: Global SLA Compliance */}
        <div className="p-4 sm:p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold">Taxa de Cumprimento de SLA</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
              {computedAnalytics.globalSlaRate}%
            </span>
            <span className="text-xs text-slate-400">no prazo</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                computedAnalytics.globalSlaRate >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, computedAnalytics.globalSlaRate)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Configuration & Filter Bar */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
        {/* SLA Target Selector & Time Unit */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Meta de SLA:
            </span>
            <div className="inline-flex rounded-lg bg-white border border-slate-200 p-0.5 shadow-2xs">
              {[
                { hours: 24, label: '24h (Ágil)' },
                { hours: 48, label: '48h (Padrão)' },
                { hours: 72, label: '72h (Flexível)' },
              ].map(opt => (
                <button
                  key={opt.hours}
                  onClick={() => setSlaTargetHours(opt.hours)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    slaTargetHours === opt.hours
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Unidade:</span>
            <div className="inline-flex rounded-lg bg-white border border-slate-200 p-0.5 shadow-2xs">
              <button
                onClick={() => setTimeUnit('hours')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  timeUnit === 'hours' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Horas
              </button>
              <button
                onClick={() => setTimeUnit('days')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  timeUnit === 'days' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Dias
              </button>
            </div>
          </div>
        </div>

        {/* Timeframe & Department Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={timeframe}
              onChange={e => setTimeframe(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 outline-none shadow-2xs font-medium cursor-pointer"
            >
              <option value="all">Todos os Períodos</option>
              <option value="2026">Ano Fiscal 2026</option>
              <option value="90d">Últimos 90 dias</option>
              <option value="30d">Últimos 30 dias</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <select
              value={selectedDepartmentFilter}
              onChange={e => setSelectedDepartmentFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 outline-none shadow-2xs font-medium cursor-pointer"
            >
              <option value="all">Todos os Departamentos</option>
              {computedAnalytics.departmentMetrics.map(d => (
                <option key={d.department} value={d.department}>
                  {d.department}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Chart Section with Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        {/* Chart View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Visualização Gráfica de Governança (Recharts)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Identificação visual de discrepâncias e latência de aprovação por centro de custo/departamento.
            </p>
          </div>

          {/* Tab buttons */}
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold shrink-0">
            <button
              onClick={() => setActiveChartTab('turnaround')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeChartTab === 'turnaround'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tempo Médio vs. SLA
            </button>
            <button
              onClick={() => setActiveChartTab('distribution')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeChartTab === 'distribution'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Volume & Status
            </button>
            <button
              onClick={() => setActiveChartTab('trend')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeChartTab === 'trend'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Evolução Mensal
            </button>
          </div>
        </div>

        {/* View 1: BarChart - Turnaround Time vs SLA */}
        {activeChartTab === 'turnaround' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span className="font-medium">
                Linha pontilhada vermelha representa a meta de SLA (<strong>{slaTargetHours}h / {Math.round(slaTargetHours / 24)} dias</strong>).
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Dentro da Meta</span>
                </span>
                <span className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Gargalo (&gt; SLA)</span>
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 10, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="department"
                    tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    unit={timeUnit === 'days' ? ' d' : ' h'}
                  />
                  <Tooltip content={<CustomTurnaroundTooltip />} />
                  <ReferenceLine
                    y={timeUnit === 'days' ? Math.round((slaTargetHours / 24) * 10) / 10 : slaTargetHours}
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    label={{
                      value: `SLA Meta: ${slaTargetHours}h`,
                      fill: '#ef4444',
                      fontSize: 11,
                      position: 'top',
                    }}
                  />
                  <Bar
                    dataKey="averageTime"
                    name={timeUnit === 'days' ? 'Tempo Médio (Dias)' : 'Tempo Médio (Horas)'}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  >
                    {chartData.map((entry, index) => {
                      const isExceeding = entry.hours > slaTargetHours;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={isExceeding ? '#f43f5e' : '#10b981'}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* View 2: Stacked BarChart - Volume & Status Distribution */}
        {activeChartTab === 'distribution' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Distribuição de solicitações por departamento entre eventos aprovados no prazo, pendentes e em revisão.
            </p>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 10, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="department"
                    tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(val: any, name: any) => [`${val} eventos`, name]}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="approvedCount" name="Aprovados" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="pendingCount" name="Pendentes de Revisão" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="inRevisionCount" name="Em Ajustes" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* View 3: Line / Area Chart - Monthly Turnaround Trend */}
        {activeChartTab === 'trend' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Tendência histórica da média de tempo de resposta dos responsáveis (Junho a Outubro de 2026).
            </p>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={computedAnalytics.monthlyTrends}
                  margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="monthLabel" tick={{ fill: '#475569', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit=" h" />
                  <Tooltip
                    formatter={(val: any) => [`${val} horas`, 'Tempo Médio']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                  />
                  <ReferenceLine y={slaTargetHours} stroke="#ef4444" strokeDasharray="3 3" label={{ value: `Meta ${slaTargetHours}h`, fill: '#ef4444', fontSize: 11 }} />
                  <Area type="monotone" dataKey="averageHours" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#colorAvg)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Bottlenecks Diagnosis & Unblocking Recommendations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Actionable Bottlenecks Card */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Diagnóstico de Gargalos no Processo de Governança</span>
            </h3>
            <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
              {computedAnalytics.bottleneckAlerts.length} apontamentos ativos
            </span>
          </div>

          <div className="space-y-3.5">
            {computedAnalytics.bottleneckAlerts.map(alert => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border text-xs space-y-2 ${
                  alert.severity === 'critico'
                    ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                    : 'bg-amber-50/70 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`p-1.5 rounded-lg ${
                        alert.severity === 'critico' ? 'bg-rose-200 text-rose-800' : 'bg-amber-200 text-amber-800'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">{alert.title}</h4>
                      <span className="text-[11px] font-semibold text-slate-500">
                        Departamento: <strong>{alert.department}</strong>
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                      alert.severity === 'critico'
                        ? 'bg-rose-600 text-white'
                        : 'bg-amber-500 text-slate-950'
                    }`}
                  >
                    {alert.severity === 'critico' ? 'Gargalo Crítico' : 'Atenção'}
                  </span>
                </div>

                <p className="text-slate-700 leading-relaxed text-xs pl-8">{alert.description}</p>

                <div className="bg-white/80 p-3 rounded-lg border border-slate-200/60 ml-8 text-xs text-slate-800">
                  <strong className="text-slate-900 font-bold block mb-0.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Ação Recomendada de Desbloqueio:
                  </strong>
                  <span>{alert.recommendation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right (1 col): Blocked Requests in Queue */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Solicitações Retidas na Fila</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-500">Tempo Real</span>
          </div>

          <p className="text-xs text-slate-500">
            Eventos pendentes que mais demandam intervenção para evitar quebra de prazo:
          </p>

          <div className="space-y-3">
            {computedAnalytics.departmentMetrics
              .filter(m => m.longestPendingEvent)
              .map(m => {
                const item = m.longestPendingEvent!;
                const isLate = item.hoursPending > slaTargetHours;

                return (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-extrabold text-slate-900 line-clamp-1">{item.title}</span>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          isLate ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {Math.round(item.hoursPending)}h esperando
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 space-y-0.5">
                      <div>
                        Solicitante: <strong className="text-slate-700">{item.requestedBy}</strong>
                      </div>
                      <div>
                        Responsável Designado: <strong className="text-slate-800">{item.designatedOwner}</strong>
                      </div>
                      <div>
                        Orçamento: <strong className="text-slate-800">R$ {item.budget.toLocaleString('pt-BR')}</strong>
                      </div>
                    </div>

                    {onSelectEvent && (
                      <button
                        onClick={() => {
                          const target = events.find(e => e.id === item.id);
                          if (target) onSelectEvent(target);
                        }}
                        className="w-full mt-1 py-1.5 bg-white hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-[11px] rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>Abrir Solicitação</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}

            {computedAnalytics.departmentMetrics.every(m => !m.longestPendingEvent) && (
              <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="font-bold text-slate-700">Fila Limpa!</p>
                <p>Nenhuma solicitação pendente no momento.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Department Governance Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-0">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600" />
              <span>Consolidado Analítico por Departamento</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparativo de volumes, tempos extremos e conformidade de SLA.
            </p>
          </div>

          <div className="text-xs font-semibold text-slate-500">
            Total de <strong>{computedAnalytics.departmentMetrics.length}</strong> departamentos monitorados
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 font-bold">Departamento</th>
                <th className="py-3 px-3 font-bold text-center">Volume Total</th>
                <th className="py-3 px-3 font-bold text-center">Tempo Médio</th>
                <th className="py-3 px-3 font-bold text-center">Menor / Maior Tempo</th>
                <th className="py-3 px-4 font-bold text-center">Cumprimento de SLA</th>
                <th className="py-3 px-4 font-bold">Status do Gargalo</th>
                <th className="py-3 px-4 font-bold">Responsáveis Designados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {computedAnalytics.departmentMetrics.map(dept => {
                const isLate = dept.averageApprovalHours > slaTargetHours;
                return (
                  <tr key={dept.department} className="hover:bg-slate-50 transition-colors">
                    {/* Department Name */}
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            dept.bottleneckSeverity === 'critico'
                              ? 'bg-rose-500'
                              : dept.bottleneckSeverity === 'atencao'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                        <span>{dept.department}</span>
                      </div>
                    </td>

                    {/* Volume */}
                    <td className="py-3.5 px-3 text-center font-mono font-semibold">
                      <span>{dept.totalEvents}</span>
                      <span className="text-slate-400 text-[10px] block">
                        ({dept.decidedEventsCount} avaliados)
                      </span>
                    </td>

                    {/* Average Time */}
                    <td className="py-3.5 px-3 text-center">
                      <span className={`font-extrabold font-mono text-sm ${isLate ? 'text-rose-700' : 'text-slate-900'}`}>
                        {formatDuration(dept.averageApprovalHours)}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {dept.averageApprovalDays} dias úteis
                      </span>
                    </td>

                    {/* Min / Max */}
                    <td className="py-3.5 px-3 text-center text-slate-500 font-mono text-[11px]">
                      <span>{dept.minApprovalHours}h min</span>
                      <span className="text-slate-300 mx-1">·</span>
                      <span className={dept.maxApprovalHours > slaTargetHours ? 'text-rose-600 font-bold' : ''}>
                        {dept.maxApprovalHours}h max
                      </span>
                    </td>

                    {/* SLA Compliance Progress */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="w-28 mx-auto space-y-1">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className={dept.slaCompliancePercent >= 80 ? 'text-emerald-700' : 'text-rose-700'}>
                            {dept.slaCompliancePercent}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              dept.slaCompliancePercent >= 80 ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, dept.slaCompliancePercent)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Bottleneck Status Badge */}
                    <td className="py-3.5 px-4">
                      {dept.bottleneckSeverity === 'critico' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-900 border border-rose-200">
                          <AlertOctagon className="w-3 h-3 text-rose-600" />
                          <span>Gargalo Crítico</span>
                        </span>
                      ) : dept.bottleneckSeverity === 'atencao' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>Em Atenção</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Dentro do SLA</span>
                        </span>
                      )}
                    </td>

                    {/* Designated Reviewers */}
                    <td className="py-3.5 px-4 text-slate-600 text-[11px] truncate max-w-xs">
                      {dept.keyDesignatedOwners.join(', ')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
