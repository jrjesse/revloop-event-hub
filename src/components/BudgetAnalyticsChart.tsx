import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Building,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
  AlertOctagon,
  AlertCircle,
  SlidersHorizontal,
  X,
  Check,
  Download,
  FileSpreadsheet,
  Printer,
  FileText,
  ChevronDown,
} from 'lucide-react';
import { EventRecord, EventType } from '../types/index.ts';

interface BudgetAnalyticsChartProps {
  events: EventRecord[];
}

type ChartViewMode = 'quarterly_type' | 'budget_vs_spent' | 'category_donut';

interface TypeConfig {
  label: string;
  color: string;
}

const EVENT_TYPE_CONFIG: Record<EventType, TypeConfig> = {
  show: { label: 'Show', color: '#db2777' },
  festival: { label: 'Festival', color: '#7c3aed' },
  conferencia: { label: 'Conferência / Summit', color: '#059669' }, // Emerald 600
  offsite: { label: 'Encontro da Equipe / Offsite', color: '#0284c7' }, // Sky 600
  jantar_clientes: { label: 'Jantar com Clientes', color: '#d97706' }, // Amber 600
  recrutamento: { label: 'Recrutamento / Tech Day', color: '#7c3aed' }, // Violet 600
  webinar: { label: 'Webinar Estratégico', color: '#0d9488' }, // Teal 600
  meetup: { label: 'Meetup Comunitário', color: '#e11d48' }, // Rose 600
  workshop: { label: 'Workshop Prático', color: '#64748b' }, // Slate 500
};

interface QuarterEventItem {
  id: string;
  title: string;
  budget: number;
  spent: number;
  type: EventType;
  status: string;
}

interface TypeDetailInQuarter {
  budget: number;
  spent: number;
  count: number;
  avgBudget: number;
  avgSpent: number;
  events: QuarterEventItem[];
}

export type QuarterAlertLevel = 'normal' | 'warning' | 'critical';

interface QuarterDataRecord {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  label: string;
  quarterName: string;
  totalBudget: number;
  totalSpent: number;
  eventCount: number;
  avgCostPerEvent: number;
  avgSpentPerEvent: number;
  targetBudget: number;
  targetUsagePercent: number;
  alertLevel: QuarterAlertLevel;
  overspendAmount: number;
  remainingAmount: number;
  eventsList: QuarterEventItem[];
  typeDetails: Record<EventType, TypeDetailInQuarter>;
  conferencia: number;
  show: number;
  festival: number;
  offsite: number;
  jantar_clientes: number;
  recrutamento: number;
  webinar: number;
  meetup: number;
  workshop: number;
}

interface TargetConfigMap {
  [year: string]: {
    Q1: number;
    Q2: number;
    Q3: number;
    Q4: number;
  };
}

const DEFAULT_TARGETS: TargetConfigMap = {
  '2026': {
    Q1: 40000,
    Q2: 50000,
    Q3: 45000,  // Comprometido R$ 37.000 (82.2% -> Atenção / Próximo de exceder!)
    Q4: 320000, // Comprometido R$ 339.500 (106.1% -> Crítico / Excedeu a meta!)
  },
  '2025': {
    Q1: 30000,
    Q2: 35000,
    Q3: 40000,
    Q4: 150000,
  },
};

export const BudgetAnalyticsChart: React.FC<BudgetAnalyticsChartProps> = ({ events }) => {
  const [viewMode, setViewMode] = useState<ChartViewMode>('quarterly_type');
  const [selectedYear, setSelectedYear] = useState<string>('2026');

  // Configurable targets per quarter
  const [targetsMap, setTargetsMap] = useState<TargetConfigMap>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('revloop_budget_targets');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          // fallback
        }
      }
    }
    return DEFAULT_TARGETS;
  });

  const [isAdjustTargetsOpen, setIsAdjustTargetsOpen] = useState(false);
  const [editQ1, setEditQ1] = useState(40000);
  const [editQ2, setEditQ2] = useState(50000);
  const [editQ3, setEditQ3] = useState(45000);
  const [editQ4, setEditQ4] = useState(320000);

  // Export dropdown & report modal state
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Available years from event data
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    events.forEach(e => {
      if (e.startDate) {
        const y = new Date(e.startDate).getFullYear().toString();
        if (!isNaN(Number(y))) years.add(y);
      }
    });
    return Array.from(years).sort().reverse();
  }, [events]);

  // Active targets for the selected year
  const activeYearTargets = useMemo(() => {
    const yr = selectedYear === 'all' ? '2026' : selectedYear;
    return targetsMap[yr] || { Q1: 40000, Q2: 50000, Q3: 45000, Q4: 320000 };
  }, [targetsMap, selectedYear]);

  // Open targets edit modal
  const handleOpenAdjustTargets = () => {
    setEditQ1(activeYearTargets.Q1);
    setEditQ2(activeYearTargets.Q2);
    setEditQ3(activeYearTargets.Q3);
    setEditQ4(activeYearTargets.Q4);
    setIsAdjustTargetsOpen(true);
  };

  const handleSaveTargets = (e: React.FormEvent) => {
    e.preventDefault();
    const yr = selectedYear === 'all' ? '2026' : selectedYear;
    const updated: TargetConfigMap = {
      ...targetsMap,
      [yr]: {
        Q1: Number(editQ1) || 0,
        Q2: Number(editQ2) || 0,
        Q3: Number(editQ3) || 0,
        Q4: Number(editQ4) || 0,
      },
    };
    setTargetsMap(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('revloop_budget_targets', JSON.stringify(updated));
    }
    setIsAdjustTargetsOpen(false);
  };

  // Filter events by selected year
  const yearFilteredEvents = useMemo(() => {
    if (selectedYear === 'all') return events;
    return events.filter(e => {
      if (!e.startDate) return false;
      return new Date(e.startDate).getFullYear().toString() === selectedYear;
    });
  }, [events, selectedYear]);

  // Annual Summary Metrics
  const annualSummary = useMemo(() => {
    const totalBudget = yearFilteredEvents.reduce((acc, e) => acc + (e.budget || 0), 0);
    const totalSpent = yearFilteredEvents.reduce((acc, e) => acc + (e.spentBudget || 0), 0);
    const totalAnnualTarget =
      activeYearTargets.Q1 + activeYearTargets.Q2 + activeYearTargets.Q3 + activeYearTargets.Q4;
    const balance = totalBudget - totalSpent;
    const executionRate = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
    const eventCount = yearFilteredEvents.length;

    return {
      totalBudget,
      totalSpent,
      totalAnnualTarget,
      balance,
      executionRate,
      eventCount,
    };
  }, [yearFilteredEvents, activeYearTargets]);

  // Helper to create empty type map
  const createEmptyTypeDetails = (): Record<EventType, TypeDetailInQuarter> => ({
    conferencia: { budget: 0, spent: 0, count: 0, avgBudget: 0, avgSpent: 0, events: [] },
    show: { budget: 0, spent: 0, count: 0, avgBudget: 0, avgSpent: 0, events: [] },
    festival: { budget: 0, spent: 0, count: 0, avgBudget: 0, avgSpent: 0, events: [] },
    offsite: { budget: 0, spent: 0, count: 0, avgBudget: 0, avgSpent: 0, events: [] },
    jantar_clientes: { budget: 0, spent: 0, count: 0, avgBudget: 0, avgSpent: 0, events: [] },
    recrutamento: { budget: 0, spent: 0, count: 0, avgBudget: 0, avgSpent: 0, events: [] },
    webinar: { budget: 0, spent: 0, count: 0, avgBudget: 0, avgSpent: 0, events: [] },
    meetup: { budget: 0, spent: 0, count: 0, avgBudget: 0, avgSpent: 0, events: [] },
    workshop: { budget: 0, spent: 0, count: 0, avgBudget: 0, avgSpent: 0, events: [] },
  });

  // Quarterly aggregated data with target comparison & alert levels
  const quarterlyData = useMemo(() => {
    const quarters: QuarterDataRecord[] = [
      {
        quarter: 'Q1',
        label: 'Q1 (Jan - Mar)',
        quarterName: '1º Trimestre',
        totalBudget: 0,
        totalSpent: 0,
        eventCount: 0,
        avgCostPerEvent: 0,
        avgSpentPerEvent: 0,
        targetBudget: activeYearTargets.Q1,
        targetUsagePercent: 0,
        alertLevel: 'normal',
        overspendAmount: 0,
        remainingAmount: activeYearTargets.Q1,
        eventsList: [],
        typeDetails: createEmptyTypeDetails(),
        conferencia: 0,
        show: 0,
        festival: 0,
        offsite: 0,
        jantar_clientes: 0,
        recrutamento: 0,
        webinar: 0,
        meetup: 0,
        workshop: 0,
      },
      {
        quarter: 'Q2',
        label: 'Q2 (Abr - Jun)',
        quarterName: '2º Trimestre',
        totalBudget: 0,
        totalSpent: 0,
        eventCount: 0,
        avgCostPerEvent: 0,
        avgSpentPerEvent: 0,
        targetBudget: activeYearTargets.Q2,
        targetUsagePercent: 0,
        alertLevel: 'normal',
        overspendAmount: 0,
        remainingAmount: activeYearTargets.Q2,
        eventsList: [],
        typeDetails: createEmptyTypeDetails(),
        conferencia: 0,
        show: 0,
        festival: 0,
        offsite: 0,
        jantar_clientes: 0,
        recrutamento: 0,
        webinar: 0,
        meetup: 0,
        workshop: 0,
      },
      {
        quarter: 'Q3',
        label: 'Q3 (Jul - Set)',
        quarterName: '3º Trimestre',
        totalBudget: 0,
        totalSpent: 0,
        eventCount: 0,
        avgCostPerEvent: 0,
        avgSpentPerEvent: 0,
        targetBudget: activeYearTargets.Q3,
        targetUsagePercent: 0,
        alertLevel: 'normal',
        overspendAmount: 0,
        remainingAmount: activeYearTargets.Q3,
        eventsList: [],
        typeDetails: createEmptyTypeDetails(),
        conferencia: 0,
        show: 0,
        festival: 0,
        offsite: 0,
        jantar_clientes: 0,
        recrutamento: 0,
        webinar: 0,
        meetup: 0,
        workshop: 0,
      },
      {
        quarter: 'Q4',
        label: 'Q4 (Out - Dez)',
        quarterName: '4º Trimestre',
        totalBudget: 0,
        totalSpent: 0,
        eventCount: 0,
        avgCostPerEvent: 0,
        avgSpentPerEvent: 0,
        targetBudget: activeYearTargets.Q4,
        targetUsagePercent: 0,
        alertLevel: 'normal',
        overspendAmount: 0,
        remainingAmount: activeYearTargets.Q4,
        eventsList: [],
        typeDetails: createEmptyTypeDetails(),
        conferencia: 0,
        show: 0,
        festival: 0,
        offsite: 0,
        jantar_clientes: 0,
        recrutamento: 0,
        webinar: 0,
        meetup: 0,
        workshop: 0,
      },
    ];

    yearFilteredEvents.forEach(e => {
      if (!e.startDate) return;
      const month = new Date(e.startDate).getMonth(); // 0 to 11
      const qIndex = Math.floor(month / 3); // 0, 1, 2, 3
      if (qIndex >= 0 && qIndex <= 3) {
        const q = quarters[qIndex];
        const b = e.budget || 0;
        const s = e.spentBudget || 0;
        q.totalBudget += b;
        q.totalSpent += s;
        q.eventCount += 1;

        const eventItem: QuarterEventItem = {
          id: e.id,
          title: e.title,
          budget: b,
          spent: s,
          type: e.type,
          status: e.status,
        };
        q.eventsList.push(eventItem);

        if (e.type in q.typeDetails) {
          const td = q.typeDetails[e.type];
          td.budget += b;
          td.spent += s;
          td.count += 1;
          td.events.push(eventItem);
        }

        if (e.type in q) {
          (q as any)[e.type] += b;
        }
      }
    });

    // Calculate averages & determine alert levels
    quarters.forEach(q => {
      q.avgCostPerEvent = q.eventCount > 0 ? Math.round(q.totalBudget / q.eventCount) : 0;
      q.avgSpentPerEvent = q.eventCount > 0 ? Math.round(q.totalSpent / q.eventCount) : 0;

      // Target calculations
      if (q.targetBudget > 0) {
        q.targetUsagePercent = Math.round((q.totalBudget / q.targetBudget) * 100);
        q.remainingAmount = Math.max(0, q.targetBudget - q.totalBudget);
        q.overspendAmount = Math.max(0, q.totalBudget - q.targetBudget);

        if (q.totalBudget >= q.targetBudget) {
          q.alertLevel = 'critical';
        } else if (q.totalBudget >= q.targetBudget * 0.8) {
          q.alertLevel = 'warning';
        } else {
          q.alertLevel = 'normal';
        }
      }

      Object.values(q.typeDetails).forEach(td => {
        if (td.count > 0) {
          td.avgBudget = Math.round(td.budget / td.count);
          td.avgSpent = Math.round(td.spent / td.count);
        }
      });
    });

    return quarters;
  }, [yearFilteredEvents, activeYearTargets]);

  // Identify any quarters with active warnings or critical alerts
  const alertQuarters = useMemo(() => {
    return quarterlyData.filter(q => q.alertLevel === 'critical' || q.alertLevel === 'warning');
  }, [quarterlyData]);

  // Distribution by Event Type for Donut Chart with rich averages and counts
  const typeDistributionData = useMemo(() => {
    const map: Partial<Record<EventType, {
      name: string;
      budget: number;
      spent: number;
      count: number;
      color: string;
      avgBudget: number;
      avgSpent: number;
      events: { id: string; title: string; budget: number; status: string }[];
    }>> = {};

    yearFilteredEvents.forEach(e => {
      const t = e.type;
      const config = EVENT_TYPE_CONFIG[t] || { label: t, color: '#64748b' };
      if (!map[t]) {
        map[t] = {
          name: config.label,
          budget: 0,
          spent: 0,
          count: 0,
          color: config.color,
          avgBudget: 0,
          avgSpent: 0,
          events: [],
        };
      }
      map[t]!.budget += e.budget || 0;
      map[t]!.spent += e.spentBudget || 0;
      map[t]!.count += 1;
      map[t]!.events.push({
        id: e.id,
        title: e.title,
        budget: e.budget || 0,
        status: e.status,
      });
    });

    return Object.entries(map).map(([key, val]) => {
      const avgBudget = val.count > 0 ? Math.round(val.budget / val.count) : 0;
      const avgSpent = val.count > 0 ? Math.round(val.spent / val.count) : 0;
      return {
        key,
        name: val.name,
        value: val.budget,
        spent: val.spent,
        count: val.count,
        color: val.color,
        avgBudget,
        avgSpent,
        events: val.events,
      };
    }).sort((a, b) => b.value - a.value);
  }, [yearFilteredEvents]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  const formatShortCurrency = (val: number) => {
    if (val >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `R$ ${(val / 1000).toFixed(0)}k`;
    return `R$ ${val}`;
  };

  // EXPORT CSV HANDLER
  const handleExportCSV = () => {
    const yr = selectedYear === 'all' ? 'Consolidado' : selectedYear;
    const now = new Date().toLocaleDateString('pt-BR');

    let csv = '\uFEFF'; // UTF-8 BOM
    csv += `REVLOOP.COM.BR - CENTRAL DE PLANEJAMENTO DE EVENTOS\r\n`;
    csv += `RELATÓRIO FINANCEIRO CONSOLIDADO POR TRIMESTRE E TIPO DE EVENTO\r\n`;
    csv += `Ano de Referência:;${yr}\r\n`;
    csv += `Data de Emissão:;${now} às ${new Date().toLocaleTimeString('pt-BR')}\r\n\r\n`;

    // 1. Resumo Anual
    csv += `1. RESUMO EXECUTIVO ANUAL\r\n`;
    csv += `Orçamento Anual Alocado;Gasto Executado;Meta Total;Saldo Disponível;Taxa de Execução;Total de Eventos\r\n`;
    csv += `R$ ${annualSummary.totalBudget.toLocaleString('pt-BR')};R$ ${annualSummary.totalSpent.toLocaleString('pt-BR')};R$ ${annualSummary.totalAnnualTarget.toLocaleString('pt-BR')};R$ ${annualSummary.balance.toLocaleString('pt-BR')};${annualSummary.executionRate}%;${annualSummary.eventCount}\r\n\r\n`;

    // 2. Gastos por Trimestre
    csv += `2. GASTOS E METAS POR TRIMESTRE\r\n`;
    csv += `Trimestre;Meta Trimestral;Orçamento Comprometido;Gasto Executado;% da Meta Comprometida;Status Governança;Saldo Restante ou Excedido;Qtd Eventos;Custo Médio / Evento\r\n`;
    quarterlyData.forEach(q => {
      const statusText = q.alertLevel === 'critical' ? 'CRÍTICO: Meta Excedida' : q.alertLevel === 'warning' ? 'ATENÇÃO: Próximo da Meta' : 'NORMAL: Dentro da Meta';
      const balanceText = q.alertLevel === 'critical' ? `+R$ ${q.overspendAmount.toLocaleString('pt-BR')} (Excedido)` : `R$ ${q.remainingAmount.toLocaleString('pt-BR')} (Disponível)`;
      csv += `"${q.label}";R$ ${q.targetBudget.toLocaleString('pt-BR')};R$ ${q.totalBudget.toLocaleString('pt-BR')};R$ ${q.totalSpent.toLocaleString('pt-BR')};${q.targetUsagePercent}%;"${statusText}";"${balanceText}";${q.eventCount};R$ ${q.avgCostPerEvent.toLocaleString('pt-BR')}\r\n`;
    });
    csv += `\r\n`;

    // 3. Matriz por Tipo de Evento
    csv += `3. DISTRIBUIÇÃO CONSOLIDADA POR TIPO DE EVENTO E TRIMESTRE\r\n`;
    csv += `Tipo de Evento;Q1 (Jan-Mar);Q2 (Abr-Jun);Q3 (Jul-Set);Q4 (Out-Dez);Total Anual Alocado;Gasto Executado;Qtd Eventos;Custo Médio / Evento;% do Orçamento Anual\r\n`;
    typeDistributionData.forEach(t => {
      const q1Val = quarterlyData[0].typeDetails[t.key as EventType]?.budget || 0;
      const q2Val = quarterlyData[1].typeDetails[t.key as EventType]?.budget || 0;
      const q3Val = quarterlyData[2].typeDetails[t.key as EventType]?.budget || 0;
      const q4Val = quarterlyData[3].typeDetails[t.key as EventType]?.budget || 0;
      const share = annualSummary.totalBudget > 0 ? ((t.value / annualSummary.totalBudget) * 100).toFixed(1) : '0';
      csv += `"${t.name}";R$ ${q1Val.toLocaleString('pt-BR')};R$ ${q2Val.toLocaleString('pt-BR')};R$ ${q3Val.toLocaleString('pt-BR')};R$ ${q4Val.toLocaleString('pt-BR')};R$ ${t.value.toLocaleString('pt-BR')};R$ ${t.spent.toLocaleString('pt-BR')};${t.count};R$ ${t.avgBudget.toLocaleString('pt-BR')};${share}%\r\n`;
    });
    csv += `\r\n`;

    // 4. Detalhamento dos Eventos
    csv += `4. DETALHAMENTO ANALÍTICO DE EVENTOS\r\n`;
    csv += `ID Evento;Título do Evento;Tipo;Trimestre;Data Início;Responsável Designado;Status;Orçamento Previsto;Gasto Executado;Saúde Operacional\r\n`;
    yearFilteredEvents.forEach(e => {
      const m = e.startDate ? new Date(e.startDate).getMonth() : 0;
      const qStr = `Q${Math.floor(m / 3) + 1}`;
      csv += `"${e.id}";"${e.title.replace(/"/g, '""')}";"${EVENT_TYPE_CONFIG[e.type]?.label || e.type}";${qStr};"${new Date(e.startDate).toLocaleDateString('pt-BR')}";"${e.designatedOwnerName}";"${e.status}";R$ ${(e.budget || 0).toLocaleString('pt-BR')};R$ ${(e.spentBudget || 0).toLocaleString('pt-BR')};"${e.health}"\r\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_gastos_revloop_${yr.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsExportMenuOpen(false);
  };

  // PRINT / PDF EXPORT HANDLER
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Component Header with View Controls & Year Filter */}
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            Inteligência Financeira de Eventos
          </div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Distribuição de Orçamento por Trimestre & Tipo de Evento
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhamento gerencial com alertas visuais preventivos quando o orçamento acumulado se aproxima ou excede os tetos trimestrais.
          </p>
        </div>

        {/* Top Controls: Year Filter + Adjust Targets + Export Button + Segmented View Tabs */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Year Filter */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200/80 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="bg-transparent text-slate-800 font-bold outline-none pr-2 py-0.5 cursor-pointer text-xs"
            >
              {availableYears.map(yr => (
                <option key={yr} value={yr}>
                  Ano {yr}
                </option>
              ))}
              <option value="all">Todos os Anos</option>
            </select>
          </div>

          {/* Quick Button to Adjust Quarterly Targets */}
          <button
            onClick={handleOpenAdjustTargets}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            title="Ajustar limites e metas trimestrais"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Metas Trimestrais</span>
          </button>

          {/* EXPORT BUTTON & DROPDOWN MENU */}
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-900 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>Exportar</span>
              <ChevronDown className="w-3 h-3 text-emerald-700" />
            </button>

            {isExportMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsExportMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in-50 zoom-in-95 text-xs">
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Exportar Dados Consolidados
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Gastos por trimestre e tipo ({selectedYear === 'all' ? 'Geral' : selectedYear})
                    </p>
                  </div>

                  <button
                    onClick={handleExportCSV}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800">Baixar Planilha (CSV)</p>
                      <p className="text-[10px] text-slate-400">Compatível com Excel, Sheets e BI</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      setIsReportModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer border-t border-slate-100"
                  >
                    <Printer className="w-4 h-4 text-slate-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800">Relatório Executivo (PDF)</p>
                      <p className="text-[10px] text-slate-400">Visualizar e imprimir para Diretoria</p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Segmented Control for View Mode */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/80">
            <button
              onClick={() => setViewMode('quarterly_type')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'quarterly_type'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Trimestre & Tipo
            </button>
            <button
              onClick={() => setViewMode('budget_vs_spent')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'budget_vs_spent'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Previsto vs. Realizado
            </button>
            <button
              onClick={() => setViewMode('category_donut')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'category_donut'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Composição Anual
            </button>
          </div>
        </div>
      </div>

      {/* VISUAL ALERT BANNER: Proximity or Exceeded Quarterly Target Warning */}
      {alertQuarters.length > 0 && (
        <div className="p-4 bg-amber-50/95 border-b border-amber-200/90 text-amber-950 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-amber-700 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-950">
                  Alerta de Governança: Pressão Orçamentária Trimestral
                </span>
                <span className="text-[10px] bg-amber-200/90 text-amber-900 font-semibold px-2 py-0.5 rounded-full">
                  {alertQuarters.length} {alertQuarters.length === 1 ? 'trimestre sob atenção' : 'trimestres sob atenção'}
                </span>
              </div>
              <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                O orçamento acumulado de eventos planejados/aprovados está próximo ou ultrapassou as metas estipuladas:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {alertQuarters.map(q => (
                  <div
                    key={q.quarter}
                    className={`text-[11px] px-2.5 py-1 rounded-md border font-medium flex items-center gap-1.5 ${
                      q.alertLevel === 'critical'
                        ? 'bg-rose-50 border-rose-300 text-rose-900 font-semibold'
                        : 'bg-white/90 border-amber-300 text-amber-900'
                    }`}
                  >
                    {q.alertLevel === 'critical' ? (
                      <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    )}
                    <span>
                      <strong>{q.quarter}</strong>: {formatCurrency(q.totalBudget)} de {formatCurrency(q.targetBudget)} (
                      <strong className={q.alertLevel === 'critical' ? 'text-rose-700' : 'text-amber-800'}>
                        {q.targetUsagePercent}%
                      </strong>
                      )
                    </span>
                    {q.alertLevel === 'critical' && (
                      <span className="text-[10px] text-rose-700 underline font-bold">
                        +{formatCurrency(q.overspendAmount)} acima da meta
                      </span>
                    )}
                    {q.alertLevel === 'warning' && (
                      <span className="text-[10px] text-amber-800">
                        ({formatCurrency(q.remainingAmount)} restante)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
            <button
              onClick={handleExportCSV}
              className="text-xs font-semibold px-2.5 py-1.5 bg-white hover:bg-amber-100/70 border border-amber-300 text-amber-950 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5 text-amber-700" />
              <span>Exportar Resumo</span>
            </button>
            <button
              onClick={handleOpenAdjustTargets}
              className="text-xs font-semibold px-3 py-1.5 bg-amber-200/90 hover:bg-amber-300 text-amber-950 rounded-lg transition-colors cursor-pointer"
            >
              Ajustar Metas
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-slate-50/70 border-b border-slate-100">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
            Orçamento Anual Alocado ({selectedYear === 'all' ? 'Geral' : selectedYear})
          </span>
          <p className="text-lg font-extrabold text-slate-900">
            {formatCurrency(annualSummary.totalBudget)}
          </p>
          <span className="text-[11px] text-slate-500">
            {annualSummary.eventCount} eventos no período
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
            Gasto Executado (Liquidado)
          </span>
          <p className="text-lg font-extrabold text-emerald-800">
            {formatCurrency(annualSummary.totalSpent)}
          </p>
          <span className="text-[11px] text-slate-500">
            comprovado em faturas
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
            Meta Anual Estabelecida
          </span>
          <p className="text-lg font-extrabold text-slate-800">
            {formatCurrency(annualSummary.totalAnnualTarget)}
          </p>
          <span className="text-[11px] text-slate-500">
            Soma dos 4 trimestres
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Uso da Meta Anual
            </span>
            <span
              className={`text-xs font-bold ${
                annualSummary.totalBudget > annualSummary.totalAnnualTarget
                  ? 'text-rose-600'
                  : annualSummary.totalBudget >= annualSummary.totalAnnualTarget * 0.8
                  ? 'text-amber-600'
                  : 'text-emerald-700'
              }`}
            >
              {annualSummary.totalAnnualTarget > 0
                ? Math.round((annualSummary.totalBudget / annualSummary.totalAnnualTarget) * 100)
                : 0}
              %
            </span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full rounded-full transition-all ${
                annualSummary.totalBudget > annualSummary.totalAnnualTarget
                  ? 'bg-rose-500'
                  : annualSummary.totalBudget >= annualSummary.totalAnnualTarget * 0.8
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{
                width: `${Math.min(
                  100,
                  annualSummary.totalAnnualTarget > 0
                    ? Math.round((annualSummary.totalBudget / annualSummary.totalAnnualTarget) * 100)
                    : 0
                )}%`,
              }}
            />
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            meta corporativa anual: ≤ 95%
          </span>
        </div>
      </div>

      {/* QUARTERLY BUDGET CARDS WITH DEDICATED VISUAL WARNING ICONS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-5 bg-slate-50/40 border-b border-slate-100">
        {quarterlyData.map(q => {
          const isCritical = q.alertLevel === 'critical';
          const isWarning = q.alertLevel === 'warning';

          return (
            <div
              key={q.quarter}
              className={`p-3.5 rounded-xl border transition-all space-y-2 ${
                isCritical
                  ? 'bg-rose-50/80 border-rose-200 shadow-xs'
                  : isWarning
                  ? 'bg-amber-50/80 border-amber-200 shadow-xs'
                  : 'bg-white border-slate-200'
              }`}
            >
              {/* Top Header of Quarter Card with Warning/Alert Icon */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 text-xs">{q.quarter}</span>
                  <span className="text-[10px] text-slate-400">({q.eventCount} ev)</span>
                </div>

                {/* VISUAL ALERT BADGE WITH WARNING ICON */}
                {isCritical ? (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-300">
                    <AlertOctagon className="w-3 h-3 text-rose-600 animate-pulse" />
                    <span>Meta Excedida</span>
                  </span>
                ) : isWarning ? (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
                    <AlertTriangle className="w-3 h-3 text-amber-600 animate-pulse" />
                    <span>Próximo do Limite</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Dentro da Meta</span>
                  </span>
                )}
              </div>

              {/* Budget vs Target Numbers */}
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-base font-extrabold text-slate-900 font-mono">
                    {formatCurrency(q.totalBudget)}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Meta: {formatCurrency(q.targetBudget)}
                  </span>
                </div>

                {/* Progress bar towards quarterly target */}
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-1.5">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isCritical
                        ? 'bg-rose-500'
                        : isWarning
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, q.targetUsagePercent)}%` }}
                  />
                </div>
              </div>

              {/* Status Note */}
              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200/60">
                <span
                  className={
                    isCritical
                      ? 'text-rose-700 font-bold'
                      : isWarning
                      ? 'text-amber-800 font-bold'
                      : 'text-slate-500'
                  }
                >
                  {q.targetUsagePercent}% comprometido
                </span>
                <span className="text-slate-500">
                  {isCritical ? (
                    <strong className="text-rose-700">+{formatCurrency(q.overspendAmount)}</strong>
                  ) : (
                    <span>{formatCurrency(q.remainingAmount)} livre</span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart Canvas Area */}
      <div className="p-6">
        {/* VIEW 1: Stacked Bar Chart with Visual Alert Tooltips */}
        {viewMode === 'quarterly_type' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold text-slate-700">
                Alocação Orçamentária por Trimestre (Empilhada por Tipo de Evento)
              </span>
              <span className="text-[11px] text-slate-400">
                Ícones de alerta ⚠️ indicam trimestres próximos ou acima da meta
              </span>
            </div>

            <div className="h-84 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={quarterlyData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    tick={({ x, y, payload }) => {
                      const qRecord = quarterlyData.find(q => q.label === payload.value);
                      const hasAlert = qRecord?.alertLevel === 'critical' || qRecord?.alertLevel === 'warning';
                      const isCritical = qRecord?.alertLevel === 'critical';

                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text
                            x={0}
                            y={16}
                            textAnchor="middle"
                            fill={isCritical ? '#e11d48' : hasAlert ? '#d97706' : '#475569'}
                            fontSize={12}
                            fontWeight={hasAlert ? 700 : 500}
                          >
                            {payload.value} {isCritical ? '🚨' : hasAlert ? '⚠️' : ''}
                          </text>
                        </g>
                      );
                    }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatShortCurrency}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const qObj = quarterlyData.find(q => q.label === label);
                      if (!qObj) return null;

                      const activeEntries = payload.filter(entry => entry.value && Number(entry.value) > 0);
                      const isCritical = qObj.alertLevel === 'critical';
                      const isWarning = qObj.alertLevel === 'warning';

                      return (
                        <div className="bg-slate-950 text-white p-4 rounded-xl shadow-2xl border border-slate-800 text-xs min-w-[290px] max-w-sm animate-in fade-in zoom-in-95">
                          {/* Quarter Header */}
                          <div className="border-b border-slate-800 pb-2.5 mb-2.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                                {qObj.label}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                                {qObj.eventCount} {qObj.eventCount === 1 ? 'evento' : 'eventos'}
                              </span>
                            </div>

                            {/* VISUAL ALERT BADGE IN TOOLTIP */}
                            <div className="mt-2">
                              {isCritical ? (
                                <div className="p-2 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-200 flex items-center gap-2 text-[11px]">
                                  <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
                                  <div>
                                    <strong className="text-rose-100">Meta Trimestral Excedida!</strong>
                                    <p className="text-[10px] text-rose-300">
                                      {qObj.targetUsagePercent}% da meta de {formatCurrency(qObj.targetBudget)} (+{formatCurrency(qObj.overspendAmount)} acima do teto)
                                    </p>
                                  </div>
                                </div>
                              ) : isWarning ? (
                                <div className="p-2 rounded-lg bg-amber-950/80 border border-amber-800/80 text-amber-200 flex items-center gap-2 text-[11px]">
                                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                                  <div>
                                    <strong className="text-amber-100">Atenção: Próximo de Exceder a Meta!</strong>
                                    <p className="text-[10px] text-amber-300">
                                      {qObj.targetUsagePercent}% da meta comprometida. Restam apenas {formatCurrency(qObj.remainingAmount)}.
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 flex items-center justify-between text-[11px]">
                                  <span className="flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Dentro da Meta Trimestral</span>
                                  </span>
                                  <span className="font-mono">{qObj.targetUsagePercent}% da meta</span>
                                </div>
                              )}
                            </div>

                            {/* Quarter Average Cost Highlight */}
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-1.5 border-t border-slate-850">
                              <span>Custo médio por evento:</span>
                              <span className="font-mono font-bold text-slate-200">
                                {qObj.eventCount > 0 ? formatCurrency(qObj.avgCostPerEvent) : 'R$ 0'}
                              </span>
                            </div>
                          </div>

                          {/* Specific Event Type Breakdown with Counts and Averages */}
                          <div className="space-y-2">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Detalhamento por Linha de Evento
                            </div>

                            {activeEntries.length === 0 ? (
                              <p className="text-slate-500 italic text-[11px]">Nenhum evento neste trimestre</p>
                            ) : (
                              activeEntries.map((entry, idx) => {
                                const typeKey = (entry.dataKey as EventType);
                                const typeData = qObj.typeDetails[typeKey];
                                const typeBudget = Number(entry.value) || 0;
                                const count = typeData?.count || 1;
                                const avgCost = typeData?.avgBudget || typeBudget;
                                const shareOfQuarter = qObj.totalBudget > 0
                                  ? Math.round((typeBudget / qObj.totalBudget) * 100)
                                  : 0;

                                return (
                                  <div
                                    key={idx}
                                    className="p-2 bg-slate-900/90 rounded-lg border border-slate-800/80 space-y-1"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <span
                                          className="w-2.5 h-2.5 rounded-full shrink-0"
                                          style={{ backgroundColor: entry.color }}
                                        />
                                        <span className="font-semibold text-slate-200 text-[11px]">
                                          {entry.name}
                                        </span>
                                      </div>
                                      <span className="font-mono font-bold text-slate-100 text-xs">
                                        {formatCurrency(typeBudget)}
                                      </span>
                                    </div>

                                    {/* Event Count & Average Cost metrics */}
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 pl-4">
                                      <span>
                                        <strong>{count}</strong> {count === 1 ? 'evento planejado' : 'eventos planejados'} ({shareOfQuarter}%)
                                      </span>
                                      <span className="text-emerald-400 font-medium">
                                        Média: <strong>{formatCurrency(avgCost)}</strong>/unid
                                      </span>
                                    </div>

                                    {/* Preview event titles */}
                                    {typeData?.events && typeData.events.length > 0 && (
                                      <div className="pl-4 pt-0.5 space-y-0.5">
                                        {typeData.events.slice(0, 2).map((ev, i) => (
                                          <div key={i} className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                                            <span className="text-slate-600">↳</span>
                                            <span className="truncate">{ev.title}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Quarter Financial Summary Footer */}
                          <div className="mt-3 pt-2.5 border-t border-slate-800 space-y-1 text-xs">
                            <div className="flex items-center justify-between font-bold">
                              <span className="text-emerald-400">Total Previsto no Trimestre:</span>
                              <span className="text-white font-mono">{formatCurrency(qObj.totalBudget)}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span>Meta Trimestral Fixada:</span>
                              <span className="font-mono text-slate-300">{formatCurrency(qObj.targetBudget)}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span>Total Executado / Faturado:</span>
                              <span className="font-mono text-emerald-300 font-semibold">{formatCurrency(qObj.totalSpent)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ paddingTop: '16px', fontSize: '11px' }}
                  />
                  <Bar dataKey="show" name="Show" stackId="a" fill={EVENT_TYPE_CONFIG.show.color} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="festival" name="Festival" stackId="a" fill={EVENT_TYPE_CONFIG.festival.color} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="conferencia" name="Conferência / Summit" stackId="a" fill={EVENT_TYPE_CONFIG.conferencia.color} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="offsite" name="Encontro de Equipe / Offsite" stackId="a" fill={EVENT_TYPE_CONFIG.offsite.color} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="jantar_clientes" name="Jantar com Clientes" stackId="a" fill={EVENT_TYPE_CONFIG.jantar_clientes.color} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="recrutamento" name="Recrutamento Tech" stackId="a" fill={EVENT_TYPE_CONFIG.recrutamento.color} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="webinar" name="Webinar Estratégico" stackId="a" fill={EVENT_TYPE_CONFIG.webinar.color} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="meetup" name="Meetup Comunitário" stackId="a" fill={EVENT_TYPE_CONFIG.meetup.color} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="workshop" name="Workshop Prático" stackId="a" fill={EVENT_TYPE_CONFIG.workshop.color} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* VIEW 2: Budget Allocated vs. Spent with Visual Alert Tooltips */}
        {viewMode === 'budget_vs_spent' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold text-slate-700">
                Comparativo: Orçamento Previsto vs. Gasto Efetivo por Trimestre
              </span>
              <span className="text-[11px] text-slate-400">
                Exibe taxa de queima orçamentária e conformidade com tetos corporativos
              </span>
            </div>

            <div className="h-84 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={quarterlyData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    tick={({ x, y, payload }) => {
                      const qRecord = quarterlyData.find(q => q.label === payload.value);
                      const hasAlert = qRecord?.alertLevel === 'critical' || qRecord?.alertLevel === 'warning';
                      const isCritical = qRecord?.alertLevel === 'critical';

                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text
                            x={0}
                            y={16}
                            textAnchor="middle"
                            fill={isCritical ? '#e11d48' : hasAlert ? '#d97706' : '#475569'}
                            fontSize={12}
                            fontWeight={hasAlert ? 700 : 500}
                          >
                            {payload.value} {isCritical ? '🚨' : hasAlert ? '⚠️' : ''}
                          </text>
                        </g>
                      );
                    }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatShortCurrency}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const qObj = quarterlyData.find(q => q.label === label);
                      if (!qObj) return null;

                      const budgeted = qObj.totalBudget;
                      const spent = qObj.totalSpent;
                      const balance = budgeted - spent;
                      const rate = budgeted > 0 ? Math.round((spent / budgeted) * 100) : 0;
                      const avgBudget = qObj.eventCount > 0 ? Math.round(budgeted / qObj.eventCount) : 0;
                      const avgSpent = qObj.eventCount > 0 ? Math.round(spent / qObj.eventCount) : 0;
                      const isCritical = qObj.alertLevel === 'critical';
                      const isWarning = qObj.alertLevel === 'warning';

                      return (
                        <div className="bg-slate-950 text-white p-4 rounded-xl shadow-2xl border border-slate-800 text-xs min-w-[280px] max-w-sm animate-in fade-in zoom-in-95">
                          {/* Header */}
                          <div className="border-b border-slate-800 pb-2 mb-3 flex items-center justify-between">
                            <div>
                              <p className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                                {qObj.label}
                              </p>
                              <span className="text-[10px] text-slate-400">
                                {qObj.quarterName} · Revloop.com.br
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                              {qObj.eventCount} {qObj.eventCount === 1 ? 'evento' : 'eventos'}
                            </span>
                          </div>

                          {/* Alert Notice if near or exceeding target */}
                          {isCritical && (
                            <div className="p-2 mb-2 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-200 flex items-center gap-2 text-[11px]">
                              <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
                              <div>
                                <strong className="text-rose-100">Meta Trimestral Excedida!</strong>
                                <p className="text-[10px] text-rose-300">
                                  {qObj.targetUsagePercent}% da meta ({formatCurrency(qObj.targetBudget)})
                                </p>
                              </div>
                            </div>
                          )}

                          {isWarning && (
                            <div className="p-2 mb-2 rounded-lg bg-amber-950/80 border border-amber-800/80 text-amber-200 flex items-center gap-2 text-[11px]">
                              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                              <div>
                                <strong className="text-amber-100">Atenção: Próximo da Meta Trimestral</strong>
                                <p className="text-[10px] text-amber-300">
                                  {qObj.targetUsagePercent}% da meta ({formatCurrency(qObj.targetBudget)})
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Budget Breakdown & Averages */}
                          <div className="space-y-2.5">
                            {/* Previsto */}
                            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                                  Orçamento Previsto:
                                </span>
                                <span className="font-mono font-bold text-slate-100">
                                  {formatCurrency(budgeted)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 pl-4">
                                <span>Custo médio previsto:</span>
                                <span className="font-mono font-medium text-slate-300">
                                  {formatCurrency(avgBudget)} / evento
                                </span>
                              </div>
                            </div>

                            {/* Executado */}
                            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                                  Gasto Realizado:
                                </span>
                                <span className="font-mono font-bold text-emerald-300">
                                  {formatCurrency(spent)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 pl-4">
                                <span>Custo médio executado:</span>
                                <span className="font-mono font-medium text-emerald-400">
                                  {formatCurrency(avgSpent)} / evento
                                </span>
                              </div>
                            </div>

                            {/* Summary Metrics */}
                            <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[11px]">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">Meta Estabelecida:</span>
                                <span className="font-mono text-slate-200">{formatCurrency(qObj.targetBudget)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">Saldo Disponível no Trimestre:</span>
                                <span className="font-mono font-bold text-slate-200">{formatCurrency(balance)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">Taxa de Execução Orçamentária:</span>
                                <span className="font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                                  {rate}%
                                </span>
                              </div>
                            </div>

                            {/* Event Titles in this Quarter */}
                            {qObj.eventsList.length > 0 && (
                              <div className="pt-2 border-t border-slate-800/80">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                  Eventos Registrados neste Trimestre:
                                </span>
                                <div className="space-y-1 max-h-24 overflow-y-auto">
                                  {qObj.eventsList.map(ev => (
                                    <div key={ev.id} className="text-[10px] text-slate-300 flex items-center justify-between gap-2">
                                      <span className="truncate">• {ev.title}</span>
                                      <span className="font-mono font-semibold text-slate-400 shrink-0">
                                        {formatCurrency(ev.budget)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ paddingTop: '16px', fontSize: '11px' }}
                  />
                  <Bar
                    dataKey="totalBudget"
                    name="Orçamento Previsto"
                    fill="#94a3b8"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="totalSpent"
                    name="Gasto Realizado"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* VIEW 3: Donut Composition Chart with Enhanced Custom Tooltip */}
        {viewMode === 'category_donut' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Donut Chart */}
            <div className="md:col-span-6 h-76 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {typeDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload;
                      const percent = annualSummary.totalBudget > 0
                        ? ((item.value / annualSummary.totalBudget) * 100).toFixed(1)
                        : '0';

                      return (
                        <div className="bg-slate-950 text-white p-4 rounded-xl shadow-2xl border border-slate-800 text-xs min-w-[260px] max-w-sm animate-in fade-in zoom-in-95">
                          {/* Header */}
                          <div className="border-b border-slate-800 pb-2 mb-2.5">
                            <p className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                              {item.name}
                            </p>
                            <span className="text-[10px] text-slate-400 font-medium">
                              Representa <strong>{percent}%</strong> do orçamento anual alocado
                            </span>
                          </div>

                          {/* Breakdown with counts and average cost */}
                          <div className="space-y-2">
                            <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-400">Orçamento Total da Linha:</span>
                                <span className="font-mono font-bold text-slate-100">
                                  {formatCurrency(item.value)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-400">Total de Eventos:</span>
                                <span className="font-bold text-emerald-400">
                                  {item.count} {item.count === 1 ? 'evento' : 'eventos'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                                <span className="text-slate-400">Custo Médio por Evento:</span>
                                <span className="font-mono font-bold text-white">
                                  {formatCurrency(item.avgBudget)}
                                </span>
                              </div>
                            </div>

                            <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 space-y-1 text-[11px]">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">Gasto Liquidado:</span>
                                <span className="font-mono font-bold text-emerald-300">
                                  {formatCurrency(item.spent)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">Média Executada / Evento:</span>
                                <span className="font-mono text-emerald-400">
                                  {formatCurrency(item.avgSpent)}
                                </span>
                              </div>
                            </div>

                            {/* Event list */}
                            {item.events && item.events.length > 0 && (
                              <div className="pt-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                  Eventos Associados ({item.events.length}):
                                </span>
                                <div className="space-y-1 max-h-20 overflow-y-auto">
                                  {item.events.map((ev: any, i: number) => (
                                    <div key={i} className="text-[10px] text-slate-300 flex items-center justify-between gap-2">
                                      <span className="truncate">• {ev.title}</span>
                                      <span className="font-mono text-slate-400">{formatCurrency(ev.budget)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Total in Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Total Anual
                </span>
                <span className="text-base font-extrabold text-slate-900">
                  {formatShortCurrency(annualSummary.totalBudget)}
                </span>
                <span className="text-[10px] text-slate-500">
                  {annualSummary.eventCount} eventos
                </span>
              </div>
            </div>

            {/* Breakdown List */}
            <div className="md:col-span-6 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Composição por Linha de Evento ({selectedYear === 'all' ? 'Consolidado' : selectedYear})
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {typeDistributionData.map(item => {
                  const share = annualSummary.totalBudget > 0
                    ? ((item.value / annualSummary.totalBudget) * 100).toFixed(1)
                    : '0';

                  return (
                    <div
                      key={item.key}
                      className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="truncate">
                          <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span>
                              <strong>{item.count}</strong> {item.count === 1 ? 'evento' : 'eventos'}
                            </span>
                            <span>·</span>
                            <span>Média: <strong>{formatCurrency(item.avgBudget)}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-bold font-mono text-slate-900">{formatCurrency(item.value)}</p>
                        <p className="text-[10px] font-semibold text-slate-500">{share}% do anual</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer Insight Note & Quick Actions */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Fonte: Metas e limites trimestrais estipulados pela Controladoria da <strong>Revloop.com.br</strong>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleExportCSV}
              className="text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer underline flex items-center gap-1"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Baixar Planilha (CSV)</span>
            </button>
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="text-slate-700 hover:text-slate-900 font-semibold cursor-pointer underline flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Relatório Executivo PDF</span>
            </button>
            <button
              onClick={handleOpenAdjustTargets}
              className="text-slate-500 hover:text-slate-700 font-medium cursor-pointer underline flex items-center gap-1"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Configurar Tetos</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: AJUSTE DE METAS TRIMESTRAIS */}
      {isAdjustTargetsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in-50 zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Ajustar Metas Trimestrais ({selectedYear === 'all' ? '2026' : selectedYear})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Defina o teto orçamentário para disparo de avisos preventivos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAdjustTargetsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTargets} className="p-5 space-y-4 text-xs">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Quando o orçamento acumulado de eventos em planejamento ou aprovados atingir <strong>80% da meta</strong>, um aviso visual âmbar será disparado. Caso atinja <strong>100%</strong>, um alerta crítico vermelho será acionado.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Meta Q1 (Jan - Mar) em R$
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={editQ1}
                    onChange={e => setEditQ1(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-lg font-mono text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Meta Q2 (Abr - Jun) em R$
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={editQ2}
                    onChange={e => setEditQ2(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-lg font-mono text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Meta Q3 (Jul - Set) em R$
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={editQ3}
                    onChange={e => setEditQ3(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-lg font-mono text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Meta Q4 (Out - Dez) em R$
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={editQ4}
                    onChange={e => setEditQ4(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-lg font-mono text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustTargetsOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Metas</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RELATÓRIO EXECUTIVO PDF / IMPRESSÃO (#printable-report) */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full my-8 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95">
            {/* Top Toolbar (No-Print) */}
            <div className="no-print p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Relatório Financeiro Consolidado de Eventos
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pronto para visualização, download em CSV ou impressão em PDF A4
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Baixar CSV</span>
                </button>
                <button
                  onClick={handlePrintReport}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / Salvar em PDF</span>
                </button>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content Area with #printable-report */}
            <div className="p-8 overflow-y-auto space-y-6 text-xs text-slate-800 font-sans" id="printable-report">
              {/* Document Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-sm tracking-tight">
                      Rv
                    </div>
                    <div>
                      <h1 className="font-extrabold text-slate-900 text-lg tracking-tight">
                        Revloop Tecnologia Brasil Ltda.
                      </h1>
                      <p className="text-[10px] text-slate-500 font-mono">CNPJ: 45.892.120/0001-83 · revloop.com.br</p>
                    </div>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mt-2">
                    Relatório Financeiro Consolidado de Gastos por Trimestre e Linha de Evento
                  </h2>
                </div>

                <div className="text-right text-[11px] text-slate-500">
                  <p>
                    <strong>Ano de Exercício:</strong> {selectedYear === 'all' ? 'Consolidado' : selectedYear}
                  </p>
                  <p>
                    <strong>Emissão:</strong> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
                  </p>
                  <p className="text-[10px] text-emerald-800 font-semibold mt-1">
                    ✓ Auditado na trilha do hub
                  </p>
                </div>
              </div>

              {/* 1. Resumo Executivo Anual */}
              <div>
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  1. Resumo Executivo Financeiro Anual
                </h3>
                <div className="grid grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Planejado</span>
                    <span className="font-mono font-extrabold text-sm text-slate-900">{formatCurrency(annualSummary.totalBudget)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Gasto Executado</span>
                    <span className="font-mono font-extrabold text-sm text-emerald-700">{formatCurrency(annualSummary.totalSpent)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Meta Anual Estabelecida</span>
                    <span className="font-mono font-extrabold text-sm text-slate-800">{formatCurrency(annualSummary.totalAnnualTarget)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Taxa de Queima</span>
                    <span className="font-bold text-sm text-emerald-800">{annualSummary.executionRate}%</span>
                  </div>
                </div>
              </div>

              {/* 2. Tabela Consolidada por Trimestre */}
              <div>
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  2. Demonstrativo Consolidado de Gastos por Trimestre
                </h3>
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Trimestre</th>
                      <th className="py-2.5 px-3 text-right">Meta Trimestral</th>
                      <th className="py-2.5 px-3 text-right">Orçamento Comprometido</th>
                      <th className="py-2.5 px-3 text-right">Gasto Executado</th>
                      <th className="py-2.5 px-3 text-center">% da Meta</th>
                      <th className="py-2.5 px-3 text-center">Status de Governança</th>
                      <th className="py-2.5 px-3 text-right">Saldo Livre</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {quarterlyData.map(q => (
                      <tr key={q.quarter} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-sans font-bold text-slate-900">{q.label}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(q.targetBudget)}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">{formatCurrency(q.totalBudget)}</td>
                        <td className="py-2 px-3 text-right text-emerald-700">{formatCurrency(q.totalSpent)}</td>
                        <td className="py-2 px-3 text-center font-bold">{q.targetUsagePercent}%</td>
                        <td className="py-2 px-3 text-center font-sans text-[10px]">
                          {q.alertLevel === 'critical' && (
                            <span className="text-rose-700 font-bold">🚨 Meta Excedida</span>
                          )}
                          {q.alertLevel === 'warning' && (
                            <span className="text-amber-800 font-bold">⚠️ Próximo do Limite</span>
                          )}
                          {q.alertLevel === 'normal' && (
                            <span className="text-emerald-700 font-semibold">✓ Dentro da Meta</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-sans">
                          {q.alertLevel === 'critical' ? (
                            <span className="text-rose-700 font-bold">+{formatCurrency(q.overspendAmount)}</span>
                          ) : (
                            <span>{formatCurrency(q.remainingAmount)}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 3. Matriz por Tipo de Evento */}
              <div>
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  3. Matriz de Gastos por Linha de Evento e Trimestre
                </h3>
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Linha de Evento</th>
                      <th className="py-2.5 px-3 text-right">Q1</th>
                      <th className="py-2.5 px-3 text-right">Q2</th>
                      <th className="py-2.5 px-3 text-right">Q3</th>
                      <th className="py-2.5 px-3 text-right">Q4</th>
                      <th className="py-2.5 px-3 text-right">Total Anual</th>
                      <th className="py-2.5 px-3 text-center">Eventos</th>
                      <th className="py-2.5 px-3 text-right">Custo Médio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {typeDistributionData.map(t => {
                      const q1Val = quarterlyData[0].typeDetails[t.key as EventType]?.budget || 0;
                      const q2Val = quarterlyData[1].typeDetails[t.key as EventType]?.budget || 0;
                      const q3Val = quarterlyData[2].typeDetails[t.key as EventType]?.budget || 0;
                      const q4Val = quarterlyData[3].typeDetails[t.key as EventType]?.budget || 0;

                      return (
                        <tr key={t.key} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-sans font-semibold text-slate-900 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                            <span>{t.name}</span>
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">{q1Val > 0 ? formatCurrency(q1Val) : '-'}</td>
                          <td className="py-2 px-3 text-right text-slate-600">{q2Val > 0 ? formatCurrency(q2Val) : '-'}</td>
                          <td className="py-2 px-3 text-right text-slate-600">{q3Val > 0 ? formatCurrency(q3Val) : '-'}</td>
                          <td className="py-2 px-3 text-right text-slate-600">{q4Val > 0 ? formatCurrency(q4Val) : '-'}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">{formatCurrency(t.value)}</td>
                          <td className="py-2 px-3 text-center font-sans">{t.count}</td>
                          <td className="py-2 px-3 text-right text-emerald-800 font-medium">{formatCurrency(t.avgBudget)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 4. Lista Analítica dos Eventos */}
              <div>
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  4. Detalhamento de Eventos Registrados no Período
                </h3>
                <div className="space-y-1.5">
                  {yearFilteredEvents.map(e => {
                    const m = e.startDate ? new Date(e.startDate).getMonth() : 0;
                    const qStr = `Q${Math.floor(m / 3) + 1}`;
                    return (
                      <div key={e.id} className="p-2 bg-slate-50 border border-slate-200 rounded flex items-center justify-between text-[11px]">
                        <div>
                          <strong className="text-slate-900">{e.title}</strong>
                          <div className="text-[10px] text-slate-500">
                            {EVENT_TYPE_CONFIG[e.type]?.label} · {qStr} · {new Date(e.startDate).toLocaleDateString('pt-BR')} · Resp: {e.designatedOwnerName}
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <span className="font-bold text-slate-900">{formatCurrency(e.budget)}</span>
                          <span className="text-[10px] text-slate-400 block capitalize">{e.status.replace('_', ' ')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Assinaturas de Governança para PDF */}
              <div className="pt-8 mt-6 border-t border-slate-300 grid grid-cols-2 gap-12 text-center text-xs">
                <div>
                  <div className="border-b border-slate-400 pb-1 mb-1">
                    <span className="font-bold text-slate-800">Controladoria & Gestão Orçamentária</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Revloop Tecnologia Brasil</span>
                </div>

                <div>
                  <div className="border-b border-slate-400 pb-1 mb-1">
                    <span className="font-bold text-slate-800">Diretoria Executiva / VP</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Aprovação Governamental de Alçada</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
