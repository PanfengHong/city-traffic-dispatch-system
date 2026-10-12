import { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTrafficStore } from '../../store/trafficStore';
import { DISPATCH_PLANS, type DispatchPlan } from '../../utils/analytics';

interface RunState {
  id: string;
  progress: number;
  done: boolean;
}

export function PlanView() {
  const snapshot = useTrafficStore((s) => s.snapshot);
  const stats = snapshot?.stats;
  const incidents = snapshot?.incidents ?? [];
  const roads = snapshot?.roads ?? [];

  const [selectedPlanId, setSelectedPlanId] = useState(DISPATCH_PLANS[0].id);
  const [run, setRun] = useState<RunState | null>(null);

  const plan = DISPATCH_PLANS.find((p) => p.id === selectedPlanId) ?? DISPATCH_PLANS[0];

  // 依据实时态势推荐预案
  const recommendedId = useMemo(() => {
    if (incidents.some((i) => i.type === 'accident' && i.severity === 'high')) return 'p-accident';
    if (incidents.some((i) => i.type === 'signal_fault')) return 'p-signal';
    if (incidents.some((i) => i.type === 'construction')) return 'p-construction';
    const congestionPoints = stats?.congestionPoints ?? 0;
    if (congestionPoints > 8) return 'p-event';
    return null;
  }, [incidents, stats]);

  // 调度下发进度模拟
  useEffect(() => {
    if (!run || run.done) return;
    const timer = setInterval(() => {
      setRun((prev) => {
        if (!prev) return prev;
        const next = Math.min(100, prev.progress + 4);
        return { ...prev, progress: next, done: next >= 100 };
      });
    }, 90);
    return () => clearInterval(timer);
  }, [run?.id, run?.done]);

  const running = run && run.id === plan.id ? run : null;
  const litSteps = running ? Math.floor((running.progress / 100) * plan.steps.length + 0.999) : 0;

  // 资源分布（结合实时事件与运营率推导）
  const busy = Math.min(45, incidents.length * 8 + (stats?.congestionPoints ?? 0) * 2);
  const standby = Math.round((stats?.fastOperation ?? 0.72) * 100);
  const available = Math.max(10, 100 - busy - standby);
  const resourceDist = [
    { name: '可调度', value: available, color: '#48bb78' },
    { name: '执行中', value: busy, color: '#4299e1' },
    { name: '待命', value: standby, color: '#ecc94b' },
  ];

  const avgCongestion = roads.length
    ? roads.reduce((s, r) => s + r.congestion, 0) / roads.length
    : 0;

  return (
    <>
      {/* ===== 左侧：预案库 + 资源状态 ===== */}
      <aside className="absolute left-4 top-[80px] z-20 w-[300px] flex flex-col gap-3">
        <div className="glass-panel rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-medium text-textMain">
              <i className="fa fa-sitemap text-primary mr-2" />
              预案库
            </h2>
            <span className="text-xs text-textLight">{DISPATCH_PLANS.length} 套预案</span>
          </div>
          <div className="space-y-2">
            {DISPATCH_PLANS.map((p) => {
              const active = p.id === selectedPlanId;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlanId(p.id)}
                  className={`w-full text-left rounded-lg p-2 border transition-all ${
                    active
                      ? 'border-primary bg-blue-50/80 shadow'
                      : 'border-transparent bg-white/50 hover:bg-white/80'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-8 rounded" style={{ background: p.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium text-textMain truncate">{p.name}</span>
                        {recommendedId === p.id && (
                          <span className="shrink-0 text-[9px] px-1 rounded bg-teal-50 text-teal-600">
                            AI 推荐
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-textLight">
                        {p.category} · {p.level}响应 · {p.duration}min
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="glass-panel rounded-lg p-3">
          <div className="text-xs font-medium text-textMain mb-2">
            <i className="fa fa-users text-textLight mr-2" />
            资源在线状态
          </div>
          {resourceDist.map((r) => (
            <div key={r.name} className="mb-2 last:mb-0">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-textLight">{r.name}</span>
                <span className="text-textMain font-medium">{r.value}%</span>
              </div>
              <div className="w-full h-[6px] bg-gray-100 rounded overflow-hidden">
                <div className="h-full rounded" style={{ width: `${r.value}%`, background: r.color }} />
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ===== 右侧：预案详情 + 下发 ===== */}
      <aside className="absolute right-4 top-[80px] z-20 w-[340px] glass-panel rounded-lg p-4 max-h-[calc(100%-260px)] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded flex items-center justify-center text-white text-xs" style={{ background: plan.color }}>
              <i className="fa fa-clipboard" />
            </span>
            <span className="text-sm font-medium text-textMain">预案详情</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-primary">
            {plan.level}响应
          </span>
        </div>

        <div className="text-sm font-medium text-textMain mb-1">{plan.name}</div>
        <div className="text-[11px] text-textLight mb-3 leading-relaxed">
          触发条件：{plan.trigger}
        </div>

        {/* 处置流程 */}
        <div className="text-xs font-medium text-textMain mb-2">处置流程</div>
        <div className="space-y-1.5 mb-3">
          {plan.steps.map((s, i) => {
            const lit = running && i < litSteps;
            return (
              <div
                key={i}
                className={`flex gap-2 text-xs pl-2 border-l-2 transition-colors ${
                  lit ? 'border-success text-textMain' : 'border-gray-300 text-textLight'
                }`}
              >
                <span className={lit ? 'text-success font-medium' : 'text-textLight'}>
                  {lit ? <i className="fa fa-check-circle" /> : i + 1}
                </span>
                <span className="leading-relaxed">{s}</span>
              </div>
            );
          })}
        </div>

        {/* 涉及资源 */}
        <div className="text-xs font-medium text-textMain mb-2">涉及资源</div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {plan.resources.map((r) => (
            <div key={r.name} className="rounded-lg bg-white/60 px-2 py-1.5 flex justify-between items-center">
              <span className="text-[11px] text-textLight">{r.name}</span>
              <span className="text-sm font-bold text-textMain">{r.count}</span>
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-teal-50/70 px-3 py-2 mb-3 text-[11px] text-teal-700 leading-relaxed">
          <i className="fa fa-line-chart mr-1" />
          预期效果：{plan.expectedEffect}
        </div>

        {/* 下发进度 */}
        {running && (
          <div className="mb-3">
            <div className="flex justify-between text-[11px] mb-1">
              <span className={running.done ? 'text-success' : 'text-primary'}>
                {running.done ? '调度已下发完成' : '正在下发调度指令…'}
              </span>
              <span className="text-textLight">{running.progress}%</span>
            </div>
            <div className="w-full h-[8px] bg-gray-100 rounded overflow-hidden">
              <div
                className={`h-full rounded transition-all duration-100 ${running.done ? 'bg-success' : 'bg-primary'}`}
                style={{ width: `${running.progress}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={() => setRun({ id: plan.id, progress: 0, done: false })}
          className={`w-full px-3 py-2 rounded text-xs text-white transition-colors ${
            running && !running.done
              ? 'bg-primary/60 cursor-default'
              : running?.done
                ? 'bg-success'
                : 'bg-primary hover:bg-blue-700'
          }`}
          disabled={!!running && !running.done}
        >
          {running?.done ? (
            <>
              <i className="fa fa-check mr-1" />
              调度已生效
            </>
          ) : running ? (
            <>
              <i className="fa fa-spinner fa-spin mr-1" />
              下发中 {running.progress}%
            </>
          ) : (
            <>
              <i className="fa fa-paper-plane mr-1" />
              一键下发调度
            </>
          )}
        </button>
      </aside>

      {/* ===== 底部：调度看板 ===== */}
      <div className="absolute bottom-4 left-4 right-4 z-20 grid grid-cols-3 gap-3">
        <div className="glass-panel rounded-lg p-3 h-[160px]">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-textLight">资源调度分布</span>
            <span className="text-xs text-textLight">实时</span>
          </div>
          <div className="flex items-center h-[120px]">
            <ReactECharts
              option={{
                series: [
                  {
                    type: 'pie',
                    radius: ['58%', '80%'],
                    silent: true,
                    data: resourceDist.map((r) => ({ value: r.value, itemStyle: { color: r.color } })),
                    label: { show: false },
                  },
                ],
              }}
              style={{ width: 120, height: 120 }}
              opts={{ renderer: 'svg' }}
            />
            <div className="text-xs space-y-2 text-textMain ml-1">
              {resourceDist.map((r) => (
                <div key={r.name} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded" style={{ background: r.color }} />
                  {r.name} {r.value}%
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-lg p-3 h-[160px]">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-textLight">预案处置时长对比</span>
            <span className="text-xs text-textLight">分钟</span>
          </div>
          <ReactECharts
            option={{
              grid: { top: 10, right: 12, bottom: 20, left: 30 },
              xAxis: {
                type: 'category',
                data: DISPATCH_PLANS.map((p) => p.category),
                axisLabel: { fontSize: 9, color: '#94a3b8', interval: 0 },
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
                  data: DISPATCH_PLANS.map((p) => ({
                    value: p.duration,
                    itemStyle: { color: p.id === plan.id ? '#2377bb' : '#a8c6e0', borderRadius: [4, 4, 0, 0] },
                  })),
                  barWidth: 16,
                },
              ],
            }}
            style={{ width: '100%', height: 120 }}
            opts={{ renderer: 'svg' }}
          />
        </div>

        <div className="glass-panel rounded-lg p-3 h-[160px]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-textLight">调度执行看板</span>
            <span className="text-xs text-textLight">实时</span>
          </div>
          <div className="grid grid-rows-3 h-[118px]">
            <div className="flex justify-between items-center border-b border-gray-100">
              <span className="text-xs text-textLight">当前调度状态</span>
              <span className={`text-sm font-bold ${running?.done ? 'text-success' : running ? 'text-primary' : 'text-textMain'}`}>
                {running?.done ? '已生效' : running ? `下发中 ${running.progress}%` : '待下发'}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-100">
              <span className="text-xs text-textLight">路网平均负荷</span>
              <div className="text-right">
                <span className="text-base font-bold text-textMain">{(avgCongestion * 100).toFixed(0)}</span>
                <span className="text-[10px] text-textLight"> %</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-textLight">调度完成率</span>
              <div className="text-right">
                <span className="text-base font-bold text-success">
                  {((stats?.dispatchRate ?? 0.9) * 100).toFixed(0)}
                </span>
                <span className="text-[10px] text-textLight"> %</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}