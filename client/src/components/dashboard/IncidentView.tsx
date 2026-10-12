import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTrafficStore } from '../../store/trafficStore';
import { useUIStore } from '../../store/uiStore';
import type { IncidentData } from '../../types';
import {
  analyzeIncident,
  INCIDENT_TYPE_LABEL,
  SEVERITY_COLOR,
  SEVERITY_LABEL,
  SEVERITY_WEIGHT,
} from '../../utils/analytics';

const TYPE_ICON: Record<IncidentData['type'], string> = {
  accident: 'fa-exclamation-triangle',
  construction: 'fa-wrench',
  breakdown: 'fa-car',
  signal_fault: 'fa-lightbulb-o',
};

type SevFilter = 'all' | IncidentData['severity'];

export function IncidentView() {
  const snapshot = useTrafficStore((s) => s.snapshot);
  const selectedIncidentId = useUIStore((s) => s.selectedIncidentId);
  const setSelectedIncidentId = useUIStore((s) => s.setSelectedIncidentId);
  const [filter, setFilter] = useState<SevFilter>('all');
  const [dispatchedIds, setDispatchedIds] = useState<string[]>([]);

  const roads = snapshot?.roads ?? [];
  const incidents = snapshot?.incidents ?? [];

  // 按严重级别排序
  const sorted = useMemo(
    () =>
      [...incidents].sort(
        (a, b) =>
          SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity] || b.createdAt - a.createdAt
      ),
    [incidents]
  );

  const filtered = useMemo(
    () => (filter === 'all' ? sorted : sorted.filter((i) => i.severity === filter)),
    [sorted, filter]
  );

  const activeId = selectedIncidentId ?? filtered[0]?.id ?? sorted[0]?.id ?? null;
  const active = sorted.find((i) => i.id === activeId) ?? null;
  const analysis = active ? analyzeIncident(active, roads, snapshot?.stats) : null;

  const counts = useMemo(() => {
    const byType: Record<string, number> = {};
    const bySev: Record<string, number> = { high: 0, medium: 0, low: 0 };
    for (const inc of incidents) {
      byType[INCIDENT_TYPE_LABEL[inc.type]] = (byType[INCIDENT_TYPE_LABEL[inc.type]] || 0) + 1;
      bySev[inc.severity]++;
    }
    return { byType, bySev };
  }, [incidents]);

  const dispatch = (id: string) => {
    setDispatchedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  return (
    <>
      {/* ===== 左侧：事件列表 ===== */}
      <aside className="absolute left-4 top-[80px] z-20 w-[300px] flex flex-col gap-3">
        <div className="glass-panel rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-medium text-textMain">
              <i className="fa fa-bullhorn text-primary mr-2" />
              事件研判
            </h2>
            <span className="text-xs text-textLight">共 {incidents.length} 起</span>
          </div>
          <div className="flex gap-1">
            {(['all', 'high', 'medium', 'low'] as SevFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 px-2 py-1 rounded text-xs transition-colors ${
                  filter === f
                    ? 'bg-primary text-white'
                    : 'bg-white/60 text-textLight hover:bg-white'
                }`}
              >
                {f === 'all' ? '全部' : SEVERITY_LABEL[f]}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-lg p-2 flex-1 min-h-0">
          <div className="overflow-y-auto max-h-[420px] space-y-2 pr-1">
            {filtered.length === 0 && (
              <div className="text-xs text-textLight text-center py-8">该级别下暂无事件</div>
            )}
            {filtered.map((inc) => {
              const isActive = inc.id === activeId;
              return (
                <button
                  key={inc.id}
                  onClick={() => setSelectedIncidentId(inc.id)}
                  className={`w-full text-left rounded-lg p-2 border transition-all ${
                    isActive
                      ? 'border-primary bg-blue-50/80 shadow'
                      : 'border-transparent bg-white/50 hover:bg-white/80'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded flex items-center justify-center text-white text-xs shrink-0"
                      style={{ background: SEVERITY_COLOR[inc.severity] }}
                    >
                      <i className={`fa ${TYPE_ICON[inc.type]}`} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-textMain truncate">
                          {INCIDENT_TYPE_LABEL[inc.type]}
                        </span>
                        <span
                          className="text-[10px] px-1 rounded"
                          style={{ color: SEVERITY_COLOR[inc.severity] }}
                        >
                          {SEVERITY_LABEL[inc.severity]}
                        </span>
                      </div>
                      <div className="text-[10px] text-textLight truncate">
                        {inc.description} · {inc.roadId}
                      </div>
                    </div>
                    {dispatchedIds.includes(inc.id) && (
                      <i className="fa fa-check-circle text-success text-xs" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ===== 右侧：研判详情 ===== */}
      <aside className="absolute right-4 top-[80px] z-20 w-[340px] glass-panel rounded-lg p-4 max-h-[calc(100%-260px)] overflow-y-auto">
        {!active || !analysis ? (
          <div className="text-xs text-textLight text-center py-10">
            当前无待研判事件，路网运行平稳
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-teal-500 text-white flex items-center justify-center text-xs">
                  <i className="fa fa-eye" />
                </div>
                <span className="text-sm font-medium text-textMain">智能研判</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-600">
                置信度 {analysis.confidence}%
              </span>
            </div>

            <div className="rounded-lg bg-white/60 p-3 mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-8 h-8 rounded flex items-center justify-center text-white"
                  style={{ background: analysis.severityColor }}
                >
                  <i className={`fa ${TYPE_ICON[active.type]}`} />
                </span>
                <div>
                  <div className="text-sm font-medium text-textMain">
                    {analysis.typeLabel} · {analysis.severityLabel}级
                  </div>
                  <div className="text-xs text-textLight">{analysis.roadName}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    analysis.riskLevel === '严重'
                      ? 'bg-red-50 text-danger'
                      : analysis.riskLevel === '较高'
                        ? 'bg-orange-50 text-warn'
                        : 'bg-blue-50 text-primary'
                  }`}
                >
                  风险等级 {analysis.riskLevel}
                </span>
                <span className="text-[10px] text-textLight">
                  已持续 {analysis.ageMin} 分钟
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <Stat label="影响路段" value={`${analysis.impactedRoads} 条`} />
              <Stat label="外溢指数" value={`${analysis.spilloverIndex}`} danger />
              <Stat label="预测排队" value={`${analysis.predictedQueueKm} km`} />
              <Stat label="波及车辆" value={`${analysis.affectedVehicles} 辆`} />
              <Stat label="预计清障" value={`${analysis.clearanceMin} min`} />
              <Stat label="研判置信度" value={`${analysis.confidence}%`} />
            </div>

            <div className="text-xs font-medium text-textMain mb-2">处置建议</div>
            <div className="space-y-1.5 mb-3">
              {analysis.recommendations.map((r, i) => (
                <div key={i} className="flex gap-2 text-xs text-textMain pl-2 border-l-2 border-teal-400">
                  <span className="text-teal-600 font-medium">{i + 1}</span>
                  <span className="leading-relaxed">{r}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => dispatch(active.id)}
                disabled={dispatchedIds.includes(active.id)}
                className={`flex-1 px-3 py-2 rounded text-xs text-white transition-colors ${
                  dispatchedIds.includes(active.id)
                    ? 'bg-success cursor-default'
                    : 'bg-primary hover:bg-blue-700'
                }`}
              >
                {dispatchedIds.includes(active.id) ? (
                  <>
                    <i className="fa fa-check mr-1" />
                    已生成处置单
                  </>
                ) : (
                  <>
                    <i className="fa fa-paper-plane mr-1" />
                    生成处置单
                  </>
                )}
              </button>
              <button className="px-3 py-2 rounded text-xs bg-white/70 text-textMain hover:bg-white">
                <i className="fa fa-share-alt mr-1" />
                协同通报
              </button>
            </div>
          </>
        )}
      </aside>

      {/* ===== 底部：研判图表 ===== */}
      <div className="absolute bottom-4 left-4 right-4 z-20 grid grid-cols-3 gap-3">
        <div className="glass-panel rounded-lg p-3 h-[160px]">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-textLight">事件类型分布</span>
            <span className="text-xs text-textLight">实时</span>
          </div>
          <ReactECharts
            option={{
              grid: { top: 10, right: 10, bottom: 10, left: 70 },
              xAxis: {
                type: 'value',
                axisLabel: { fontSize: 9, color: '#94a3b8' },
                splitLine: { lineStyle: { color: '#e2e8f0' } },
              },
              yAxis: {
                type: 'category',
                data: Object.keys(counts.byType),
                axisLabel: { fontSize: 10, color: '#64748b' },
                axisLine: { lineStyle: { color: '#cbd5e0' } },
              },
              series: [
                {
                  type: 'bar',
                  data: Object.values(counts.byType),
                  barWidth: 12,
                  itemStyle: { color: '#4299e1', borderRadius: [0, 4, 4, 0] },
                  label: { show: true, position: 'right', fontSize: 9, color: '#64748b' },
                },
              ],
            }}
            style={{ width: '100%', height: 120 }}
            opts={{ renderer: 'svg' }}
          />
        </div>

        <div className="glass-panel rounded-lg p-3 h-[160px]">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-textLight">严重度结构</span>
            <span className="text-xs font-bold text-textMain">
              {incidents.length} <span className="text-[10px] text-textLight font-normal">起</span>
            </span>
          </div>
          <div className="flex items-center h-[120px]">
            <ReactECharts
              option={{
                series: [
                  {
                    type: 'pie',
                    radius: ['58%', '80%'],
                    silent: true,
                    data: [
                      { value: counts.bySev.high, itemStyle: { color: '#f87171' } },
                      { value: counts.bySev.medium, itemStyle: { color: '#fbbf24' } },
                      { value: counts.bySev.low, itemStyle: { color: '#60a5fa' } },
                    ],
                    label: { show: false },
                  },
                ],
              }}
              style={{ width: 120, height: 120 }}
              opts={{ renderer: 'svg' }}
            />
            <div className="text-xs space-y-2 text-textMain ml-1">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-[#f87171]" />高风险 {counts.bySev.high}
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-[#fbbf24]" />中风险 {counts.bySev.medium}
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-[#60a5fa]" />低风险 {counts.bySev.low}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-lg p-3 h-[160px]">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-textLight">处置时效对比</span>
            <span className="text-xs text-textLight">分钟</span>
          </div>
          <ReactECharts
            option={{
              grid: { top: 20, right: 10, bottom: 20, left: 35 },
              legend: { show: false },
              xAxis: {
                type: 'category',
                data: sorted.slice(0, 4).map((i) => i.id.slice(-4)),
                axisLabel: { fontSize: 9, color: '#94a3b8' },
                axisLine: { lineStyle: { color: '#cbd5e0' } },
              },
              yAxis: {
                type: 'value',
                axisLabel: { fontSize: 9, color: '#94a3b8' },
                splitLine: { lineStyle: { color: '#e2e8f0' } },
              },
              series: [
                {
                  name: '预计清障',
                  type: 'bar',
                  data: sorted.slice(0, 4).map((i) => analyzeIncident(i, roads, snapshot?.stats).clearanceMin),
                  barWidth: 10,
                  itemStyle: { color: '#dd6b20', borderRadius: [4, 4, 0, 0] },
                },
                {
                  name: '目标时限',
                  type: 'line',
                  data: sorted.slice(0, 4).map(() => 20),
                  symbolSize: 5,
                  lineStyle: { color: '#38a169', type: 'dashed' },
                  itemStyle: { color: '#38a169' },
                },
              ],
            }}
            style={{ width: '100%', height: 120 }}
            opts={{ renderer: 'svg' }}
          />
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-lg bg-white/60 px-2 py-1.5">
      <div className="text-[10px] text-textLight">{label}</div>
      <div className={`text-sm font-bold ${danger ? 'text-danger' : 'text-textMain'}`}>{value}</div>
    </div>
  );
}