import type { EventRecord, GovernanceAnalyticsSummary, WorkspaceUser } from '../../types/index.ts';

function inTimeframe(event: EventRecord, timeframe: string, now: number): boolean {
  if (timeframe === '30d') return now - new Date(event.createdAt).getTime() <= 30 * 24 * 3600 * 1000;
  if (timeframe === '90d') return now - new Date(event.createdAt).getTime() <= 90 * 24 * 3600 * 1000;
  if (timeframe === '2026') return event.startDate.startsWith('2026') || event.createdAt.startsWith('2026');
  return true;
}

function departmentOf(event: EventRecord, users: readonly WorkspaceUser[]): string {
  if (event.department) return event.department;
  if (event.type === 'show' || event.type === 'festival') return 'Produção de Shows';
  if (event.type === 'recrutamento') return 'Recursos Humanos';
  if (event.type === 'jantar_clientes') return 'Vendas Enterprise';
  if (event.type === 'webinar') return 'Marketing de Produto';
  if (event.type === 'conferencia') return 'Marketing';
  const requester = users.find(user => user.email.toLowerCase() === event.requestedByEmail.toLowerCase());
  return requester?.department || 'Operações & Tecnologia';
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function governanceAnalytics(
  events: readonly EventRecord[],
  users: readonly WorkspaceUser[],
  decisionAt: ReadonlyMap<string, string>,
  slaTargetHours: number,
  timeframe: string,
  now = Date.now()
): GovernanceAnalyticsSummary {
  const filtered = events.filter(event => inTimeframe(event, timeframe, now));
  const hoursOf = (event: EventRecord): number | null => {
    const decided = event.status === 'aprovado' || event.status === 'em_planejamento' || event.status === 'concluido' || event.status === 'rejeitado';
    if (!decided) return null;
    const stamped = decisionAt.get(event.id);
    const end = stamped ? new Date(stamped).getTime() : new Date(event.updatedAt).getTime();
    const ms = end - new Date(event.createdAt).getTime();
    return Math.max(0.1, round1(ms / 3600000));
  };

  const deptMap = new Map<string, {
    total: number;
    approved: number;
    pending: number;
    inRevision: number;
    rejected: number;
    durations: number[];
    pendingEvents: { event: EventRecord; hoursWaiting: number }[];
    owners: Set<string>;
  }>();

  for (const event of filtered) {
    const dept = departmentOf(event, users);
    const bucket = deptMap.get(dept) ?? {
      total: 0, approved: 0, pending: 0, inRevision: 0, rejected: 0, durations: [], pendingEvents: [], owners: new Set<string>(),
    };
    bucket.total += 1;
    bucket.owners.add(event.designatedOwnerName);
    const wait = Math.max(0.1, round1((now - new Date(event.createdAt).getTime()) / 3600000));
    if (event.status === 'aprovado' || event.status === 'em_planejamento' || event.status === 'concluido') {
      bucket.approved += 1;
      const dur = hoursOf(event);
      if (dur !== null) bucket.durations.push(dur);
    } else if (event.status === 'rejeitado') {
      bucket.rejected += 1;
      const dur = hoursOf(event);
      if (dur !== null) bucket.durations.push(dur);
    } else if (event.status === 'em_revisao') {
      bucket.inRevision += 1;
      bucket.pendingEvents.push({ event, hoursWaiting: wait });
    } else if (event.status === 'solicitado') {
      bucket.pending += 1;
      bucket.pendingEvents.push({ event, hoursWaiting: wait });
    }
    deptMap.set(dept, bucket);
  }

  const departmentMetrics = [...deptMap.entries()].map(([department, data]) => {
    const durations = [...data.durations].sort((a, b) => a - b);
    const decidedCount = durations.length;
    let avgHours = 0;
    let minHours = 0;
    let maxHours = 0;
    let medianHours = 0;
    let slaCompliance = 100;
    if (decidedCount > 0) {
      avgHours = round1(durations.reduce((sum, value) => sum + value, 0) / decidedCount);
      minHours = durations[0];
      maxHours = durations[durations.length - 1];
      const mid = Math.floor(durations.length / 2);
      medianHours = durations.length % 2 !== 0 ? durations[mid] : round1((durations[mid - 1] + durations[mid]) / 2);
      slaCompliance = Math.round((durations.filter(hour => hour <= slaTargetHours).length / decidedCount) * 100);
    } else if (data.pendingEvents.length > 0) {
      avgHours = round1(data.pendingEvents.reduce((sum, item) => sum + item.hoursWaiting, 0) / data.pendingEvents.length);
      minHours = avgHours;
      maxHours = avgHours;
      medianHours = avgHours;
      slaCompliance = avgHours <= slaTargetHours ? 100 : 0;
    }
    const hasCriticalPending = data.pendingEvents.some(item => item.hoursWaiting > slaTargetHours);
    const isBottleneck = avgHours > slaTargetHours || hasCriticalPending || data.pending + data.inRevision > 2;
    let bottleneckSeverity: 'normal' | 'atencao' | 'critico' = 'normal';
    if (avgHours > slaTargetHours * 1.3 || data.pendingEvents.some(item => item.hoursWaiting > slaTargetHours * 1.5)) bottleneckSeverity = 'critico';
    else if (isBottleneck || avgHours > slaTargetHours * 0.85) bottleneckSeverity = 'atencao';
    const longest = [...data.pendingEvents].sort((a, b) => b.hoursWaiting - a.hoursWaiting)[0];
    return {
      department,
      totalEvents: data.total,
      decidedEventsCount: decidedCount,
      approvedCount: data.approved,
      pendingCount: data.pending,
      inRevisionCount: data.inRevision,
      rejectedCount: data.rejected,
      averageApprovalHours: avgHours,
      averageApprovalDays: round1(avgHours / 24),
      medianApprovalHours: medianHours,
      minApprovalHours: minHours,
      maxApprovalHours: maxHours,
      slaTargetHours,
      slaCompliancePercent: slaCompliance,
      isBottleneck,
      bottleneckSeverity,
      longestPendingEvent: longest
        ? {
            id: longest.event.id,
            title: longest.event.title,
            requestedBy: longest.event.requestedByName,
            designatedOwner: longest.event.designatedOwnerName,
            hoursPending: longest.hoursWaiting,
            budget: longest.event.budget,
          }
        : undefined,
      keyDesignatedOwners: [...data.owners],
    };
  }).sort((a, b) => b.averageApprovalHours - a.averageApprovalHours);

  const allDurations = [...deptMap.values()].flatMap(bucket => bucket.durations);
  const globalAverageHours = allDurations.length ? round1(allDurations.reduce((sum, value) => sum + value, 0) / allDurations.length) : 0;
  const monthMap = new Map<string, number[]>();
  for (const event of filtered) {
    const stamped = decisionAt.get(event.id);
    if (!stamped) continue;
    const monthKey = stamped.slice(0, 7);
    const hours = hoursOf(event);
    if (hours === null) continue;
    const list = monthMap.get(monthKey) ?? [];
    list.push(hours);
    monthMap.set(monthKey, list);
  }
  const monthlyTrends = [...monthMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([monthKey, hours]) => ({
    monthKey,
    monthLabel: monthKey,
    averageHours: round1(hours.reduce((sum, value) => sum + value, 0) / hours.length),
    totalEvaluated: hours.length,
    slaComplianceRate: Math.round((hours.filter(hour => hour <= slaTargetHours).length / hours.length) * 100),
  }));

  const bottleneckAlerts: GovernanceAnalyticsSummary['bottleneckAlerts'] = [];
  const worst = departmentMetrics[0];
  if (worst && worst.averageApprovalHours > slaTargetHours) {
    bottleneckAlerts.push({
      id: 'alert-dept-latency',
      type: 'high_latency',
      department: worst.department,
      title: `Tempo médio acima do SLA em ${worst.department}`,
      description: `Média de ${worst.averageApprovalHours}h para decidir, acima da meta de ${slaTargetHours}h.`,
      recommendation: 'Rever a fila desse departamento com o responsável designado.',
      severity: worst.bottleneckSeverity === 'critico' ? 'critico' : 'atencao',
    });
  }
  for (const metric of departmentMetrics) {
    if (metric.longestPendingEvent && metric.longestPendingEvent.hoursPending > slaTargetHours) {
      bottleneckAlerts.push({
        id: `alert-pending-${metric.longestPendingEvent.id}`,
        type: 'sla_breach',
        department: metric.department,
        title: `Solicitação além do SLA: ${metric.longestPendingEvent.title}`,
        description: `Aguardando ${metric.longestPendingEvent.designatedOwner} há ${Math.round(metric.longestPendingEvent.hoursPending)}h.`,
        recommendation: `Cobrar ${metric.longestPendingEvent.designatedOwner}.`,
        severity: 'critico',
      });
    }
  }

  return {
    globalAverageHours,
    globalAverageDays: round1(globalAverageHours / 24),
    totalEventsEvaluated: allDurations.length,
    globalSlaRate: allDurations.length ? Math.round((allDurations.filter(hour => hour <= slaTargetHours).length / allDurations.length) * 100) : 100,
    fastestDepartment: [...departmentMetrics].sort((a, b) => a.averageApprovalHours - b.averageApprovalHours)[0]?.department || '—',
    bottleneckDepartment: departmentMetrics[0]?.department || '—',
    criticalPendingCount: departmentMetrics.filter(metric => metric.longestPendingEvent && metric.longestPendingEvent.hoursPending > slaTargetHours).length,
    departmentMetrics,
    monthlyTrends,
    bottleneckAlerts,
  };
}
