import { useTrafficStore } from '../../store/trafficStore';

export function LeftPanel() {
  const { snapshot } = useTrafficStore();
  const stats = snapshot?.stats;
  const roads = snapshot?.roads ?? [];
  // 拥堵指数 0-10：基于路网平均拥堵度
  const congestion =
    roads.length > 0
      ? Math.min(10, (roads.reduce((s, r) => s + r.congestion, 0) / roads.length) * 12)
      : 0;
  const avgSpeed = stats?.avgSpeed ?? 0;
  const incidents = stats?.incidentCount ?? 0;
  const highPriority = snapshot?.incidents.filter((i) => i.severity === 'high').length ?? 0;
  const onlineRate = stats?.fastOperation ?? 0; // 快速运营率作为在线资源率

  // 趋势指标（相对基准的偏离）
  const congestionTrend = (congestion - 5).toFixed(1);
  const speedTrend = (avgSpeed - 30).toFixed(0);
  const onlineTrend = (onlineRate - 85).toFixed(0);

  return (
    <aside className="absolute left-4 top-[80px] z-20 w-[300px] flex flex-col gap-3">
      {/* 标题模块 */}
      <div className="glass-panel rounded-lg p-3">
        <h1 className="text-[44px] font-normal text-textMain leading-tight tracking-wide">
          交通调度
          <br />
          管理系统
        </h1>
        <p className="text-xs text-textMain/70 mt-2 leading-relaxed">
          全域交通韧性监测，识别需要主动干预的路段与事件研判。
        </p>
      </div>

      {/* 告警提示 */}
      <div className="glass-panel rounded-lg p-3 text-xs">
        <div className="bg-blue-50 rounded p-2 mb-2 text-primary">
          <p>
            <strong>01 全域总览：</strong>三维巡航与二维指标共同发现风险
          </p>
          <p className="mt-1">
            {incidents > 0
              ? `检测到 ${incidents} 起事件，${highPriority} 起高优先级`
              : '当前路网运行平稳，暂无事件'}
          </p>
          <p className="mt-1 text-textLight">事故点、外溢路口和可用资源已同步到处置视图。</p>
        </div>
        <div className="flex gap-2">
          <button className="px-2 py-1 rounded bg-primary text-white text-xs">主动巡航</button>
          <button className="px-2 py-1 rounded bg-gray-100 text-textMain text-xs hover:bg-gray-200">
            热力监控
          </button>
          <button className="px-2 py-1 rounded bg-gray-100 text-textMain text-xs hover:bg-gray-200">
            信号联动
          </button>
        </div>
      </div>

      {/* 指标卡片组 */}
      <div className="glass-panel rounded-lg p-3">
        <MetricRow
          label="拥堵指数"
          value={congestion.toFixed(1)}
          unit="/10"
          trend={Number(congestionTrend) >= 0 ? `+${congestionTrend}` : congestionTrend}
          trendUp={Number(congestionTrend) >= 0}
          badWhenUp
        />
        <MetricRow
          label="平均速度"
          value={avgSpeed.toFixed(0)}
          unit="公里/时"
          trend={Number(speedTrend) >= 0 ? `+${speedTrend}` : speedTrend}
          trendUp={Number(speedTrend) >= 0}
        />
        <MetricRow
          label="重点事件"
          value={String(incidents)}
          unit="起"
          trend={highPriority > 0 ? `${highPriority}高优先级` : '平稳'}
          trendHighlight
        />
        <MetricRow
          label="在线资源"
          value={onlineRate.toFixed(0)}
          unit="%"
          trend={Number(onlineTrend) >= 0 ? `+${onlineTrend}%` : `${onlineTrend}%`}
          trendUp={Number(onlineTrend) >= 0}
          last
        />
      </div>
    </aside>
  );
}

function MetricRow({
  label,
  value,
  unit,
  trend,
  trendUp,
  badWhenUp,
  trendHighlight,
  last,
}: {
  label: string;
  value: string;
  unit: string;
  trend: string;
  trendUp?: boolean;
  badWhenUp?: boolean;
  trendHighlight?: boolean;
  last?: boolean;
}) {
  // trendUp=true 且 badWhenUp => 红色（变差）；trendUp=true 且 !badWhenUp => 绿色（变好）
  const trendColor = trendHighlight
    ? 'text-primary'
    : trendUp
      ? badWhenUp
        ? 'text-danger'
        : 'text-success'
      : badWhenUp
        ? 'text-success'
        : 'text-danger';

  return (
    <div
      className={`flex justify-between items-center py-2 ${last ? '' : 'border-b border-gray-100'}`}
    >
      <span className="text-sm text-textLight">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold text-textMain">{value}</span>
        <span className="text-xs text-textLight">{unit}</span>
        <span className={`text-xs ${trendColor}`}>{trend}</span>
      </div>
    </div>
  );
}
