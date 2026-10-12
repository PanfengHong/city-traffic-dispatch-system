import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTrafficStore } from '../../store/trafficStore';
import { useUIStore } from '../../store/uiStore';
import { buildFlowOptimizations } from '../../utils/analytics';

const PRIORITY_COLOR: Record<'高' | '中' | '低', string> = {
  高: '#e53e3e',
  中: '#dd6b20',
  低: '#4299e1',
};

export function FlowView() {
  const snapshot = useTrafficStore((s) => s.snapshot);
  const setFocusRoadId = useUIStore((s) => s.setFocusRoadId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<string[]>([]);

  const roads = snapshot?.roads ?? [];
  const stats = snapshot?.stats;

  const optimizations = useMemo(() => buildFlowOptimizations(roads, stats), [roads, stats]);
  const active = optimizations.find((o) => o.id === selectedId) ?? optimizations[0] ?? null;

  const avgSpeed = stats?.avgSpeed ?? 0;
  const avgCongestion = roads.length
    ? roads.reduce((s, r) => s + r.congestion, 0) / roads.length
    : 0;
  const totalSpeedUp = optimizations.length
    ? Math.round(optimizations.reduce((s, o) => s + o.expectedSpeedUp, 0) / optimizations.length)
    : 0;
  const totalDelayDown = optimizations.length
    ? Math.round(optimizations.reduce((s, o) => s + o.expectedDelayDown, 0) / optimizations.length)
    : 0;
  const carbonSaved = (
    (roads.reduce((s, r) => s + r.congestion, 0) * 0.36) /
    10
  ).toFixed(1);

  const applyOpt = (id: string) => {
    setAppliedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const select = (id: string, roadId: string) => {
    setSelectedId(id);
    setFocusRoadId(roadId);
  };

  return (
    <>
      {/* ===== 左侧：优化建议 ===== */}
      <aside className="absolute left-4 top-[80px] z-20 w-[300px] flex flex-col gap-3">
        <div className="glass-panel rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-medium text-textMain">
              <i className="fa fa-sliders text-primary mr-2" />
              流量优化
            </h2>
            <span className="text-xs text-textLight">{optimizations.length} 条建议</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-white/60 px-2 py-1.5">
              <div className="text-[10px] text-textLight">平均车速</div>
              <div className="text-sm font-bold text-textMain">{avgSpeed.toFixed(0)} km/h</div>
            </div>
            <div className="rounded-lg bg-white/60 px-2 py-1.5">
              <div className="text-[10px] text-textLight">路网负荷</div>
              <div className="text-sm font-bold text-warn">{(avgCongestion * 100).toFixed(0)}%</div>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-lg p-2 flex-1 min-h-0">
          <div className="overflow-y-auto max-h-[400px] space-y-2 pr-1">
            {optimizations.map((o) => {
              const isActive = active?.id === o.id;
              return (
                <button
                  key={o.id}
                  onClick={() => select(o.id, o.roadId)}
                  className={`w-full text-left rounded-lg p-2 border transition-all ${
                    isActive
                      ? 'border-primary bg-blue-50/80 shadow'
                      : 'border-transparent bg-white/50 hover:bg-white/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-textMain truncate">{o.kindLabel}</span>
                    <span
                      className="text-[9px] px-1 rounded shrink-0"
                      style={{ color: PRIORITY_COLOR[o.priority], background: `${PRIORITY_COLOR[o.priority]}1a` }}
                    >
                      {o.priority}优先
                    </span>
                  </div>
                  <div className="text-[10px] text-textLight truncate">{o.roadName}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-success">
                      <i className="fa fa-arrow-up mr-0.5" />
                      提速 {o.expectedSpeedUp}%
                    </span>
                    <span className="text-[10px] text-primary">
                      <i className="fa fa-clock-o mr-0.5" />
                      延误 -{o.expectedDelayDown}%
                    </span>
                    {appliedIds.includes(o.id) && (
                      <i className="fa fa-check-circle text-success text-[10px] ml-auto" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ===== 右侧：方案详情 ===== */}
      <aside className="absolute right-4 top-[80px] z-20 w-[340px] glass-panel rounded-lg p-4 max-h-[calc(100%-260px)] overflow-y-auto">
        {!active ? (
          <div className="text-xs text-textLight text-center py-10">路网运行良好，暂无优化建议</div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-teal-500 text-white flex items-center justify-center text-xs">
                  <i className="fa fa-magic" />
                </div>
                <span className="text-sm font-medium text-textMain">优化方案</span>
              </div>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ color: PRIORITY_COLOR[active.priority], background: `${PRIORITY_COLOR[active.priority]}1a` }}
              >
                {active.priority}优先级
              </span>
            </div>

            <div className="text-sm font-medium text-textMain mb-1">{active.kindLabel}</div>
            <div className="text-[11px] text-textLight mb-3">{active.roadName}</div>

            {/* 参数对比 */}
            <div className="rounded-lg bg-white/60 p-3 mb-3">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-textLight">{active.paramLabel}</span>
                <span className="text-textLight">当前 → 建议</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-textLight line-through">
                  {active.currentValue}
                  <span className="text-[10px] font-normal ml-0.5">{active.unit}</span>
                </span>
                <i className="fa fa-long-arrow-right text-primary" />
                <span className="text-2xl font-bold text-primary">
                  {active.suggestedValue}
                  <span className="text-xs font-normal ml-0.5">{active.unit}</span>
                </span>
              </div>
              <div className="mt-2 w-full h-[6px] bg-gray-100 rounded overflow-hidden">
                <div
                  className="h-full rounded bg-primary"
                  style={{ width: `${Math.min(100, active.suggestedValue)}%` }}
                />
              </div>
            </div>

            {/* 预期收益 */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-lg bg-white/60 px-2 py-1.5">
                <div className="text-[10px] text-textLight">通行速度提升</div>
                <div className="text-sm font-bold text-success">+{active.expectedSpeedUp}%</div>
              </div>
              <div className="rounded-lg bg-white/60 px-2 py-1.5">
                <div className="text-[10px] text-textLight">平均延误下降</div>
                <div className="text-sm font-bold text-primary">-{active.expectedDelayDown}%</div>
              </div>
              <div className="rounded-lg bg-white/60 px-2 py-1.5">
                <div className="text-[10px] text-textLight">路段饱和度</div>
                <div className="text-sm font-bold text-warn">
                  {(active.congestion * 100).toFixed(0)}%
                </div>
              </div>
              <div className="rounded-lg bg-white/60 px-2 py-1.5">
                <div className="text-[10px] text-textLight">预计生效</div>
                <div className="text-sm font-bold text-textMain">5 min</div>
              </div>
            </div>

            <div className="rounded-lg bg-teal-50/70 px-3 py-2 mb-3 text-[11px] text-teal-700 leading-relaxed">
              <i className="fa fa-info-circle mr-1" />
              {active.note}
            </div>

            <button
              onClick={() => applyOpt(active.id)}
              disabled={appliedIds.includes(active.id)}
              className={`w-full px-3 py-2 rounded text-xs text-white transition-colors ${
                appliedIds.includes(active.id)
                  ? 'bg-success cursor-default'
                  : 'bg-primary hover:bg-blue-700'
              }`}
            >
              {appliedIds.includes(active.id) ? (
                <>
                  <i className="fa fa-check mr-1" />
                  方案已下发执行
                </>
              ) : (
                <>
                  <i className="fa fa-play mr-1" />
                  应用优化方案
                </>
              )}
            </button>
          </>
        )}
      </aside>

      {/* ===== 底部：优化收益看板 ===== */}
      <div className="absolute bottom-4 left-4 right-4 z-20 grid grid-cols-3 gap-3">
        <div className="glass-panel rounded-lg p-3 h-[160px]">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-textLight">优化前后车速对比</span>
            <span className="text-xs text-textLight">km/h</span>
          </div>
          <ReactECharts
            option={{
              grid: { top: 20, right: 10, bottom: 20, left: 35 },
              xAxis: {
                type: 'category',
                data: ['当前', '优化后'],
                axisLabel: { fontSize: 10, color: '#94a3b8' },
                axisLine: { lineStyle: { color: '#cbd5e0' } },
              },
              yAxis: {
                type: 'value',
                axisLabel: { fontSize: 9, color: '#94a3b8' },
                splitLine: { lineStyle: { color: '#e2e8f0' } },
              },
              series: [
                {
                  type: 'bar',
                  data: [
                    { value: +avgSpeed.toFixed(1), itemStyle: { color: '#a8c6e0', borderRadius: [4, 4, 0, 0] } },
                    {
                      value: +(avgSpeed * (1 + totalSpeedUp / 100)).toFixed(1),
                      itemStyle: { color: '#38a169', borderRadius: [4, 4, 0, 0] },
                    },
                  ],
                  barWidth: 40,
                  label: { show: true, position: 'top', fontSize: 10, color: '#64748b' },
                },
              ],
            }}
            style={{ width: '100%', height: 120 }}
            opts={{ renderer: 'svg' }}
          />
        </div>

        <div className="glass-panel rounded-lg p-3 h-[160px]">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-textLight">路段饱和度 Top4</span>
            <span className="text-xs text-textLight">%</span>
          </div>
          <ReactECharts
            option={{
              grid: { top: 10, right: 20, bottom: 20, left: 30 },
              xAxis: {
                type: 'category',
                data: optimizations.map((o) => o.roadName.slice(0, 4)),
                axisLabel: { fontSize: 9, color: '#94a3b8', interval: 0 },
                axisLine: { lineStyle: { color: '#cbd5e0' } },
              },
              yAxis: {
                type: 'value',
                max: 100,
                axisLabel: { fontSize: 9, color: '#94a3b8' },
                splitLine: { lineStyle: { color: '#e2e8f0' } },
              },
              series: [
                {
                  type: 'bar',
                  data: optimizations.map((o) => Math.round(o.congestion * 100)),
                  barWidth: 16,
                  itemStyle: { color: '#4299e1', borderRadius: [4, 4, 0, 0] },
                  label: { show: true, position: 'top', fontSize: 9, color: '#64748b' },
                },
              ],
            }}
            style={{ width: '100%', height: 120 }}
            opts={{ renderer: 'svg' }}
          />
        </div>

        <div className="glass-panel rounded-lg p-3 h-[160px]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-textLight">优化收益预估</span>
            <span className="text-xs text-textLight">全域</span>
          </div>
          <div className="grid grid-rows-3 h-[118px]">
            <div className="flex justify-between items-center border-b border-gray-100">
              <span className="text-xs text-textLight">平均提速</span>
              <div className="text-right">
                <span className="text-base font-bold text-success">+{totalSpeedUp}</span>
                <span className="text-[10px] text-textLight"> %</span>
              </div>
            </div>
            <div className="flex justify-between items-center border-b border-gray-100">
              <span className="text-xs text-textLight">平均延误下降</span>
              <div className="text-right">
                <span className="text-base font-bold text-primary">-{totalDelayDown}</span>
                <span className="text-[10px] text-textLight"> %</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-textLight">碳排节约</span>
              <div className="text-right">
                <span className="text-base font-bold text-success">{carbonSaved}</span>
                <span className="text-[10px] text-textLight"> kg 预估</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}