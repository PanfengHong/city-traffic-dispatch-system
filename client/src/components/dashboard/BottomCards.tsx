import ReactECharts from 'echarts-for-react';
import { useTrafficStore } from '../../store/trafficStore';

export function BottomCards() {
  const { snapshot, trends } = useTrafficStore();
  const stats = snapshot?.stats;
  const roads = snapshot?.roads ?? [];

  // 1. 路网热力：拥堵度 Top3 路段
  const topRoads = [...roads]
    .sort((a, b) => b.congestion - a.congestion)
    .slice(0, 3)
    .map((r) => ({
      id: r.id,
      level: Math.round(r.congestion * 100),
      color:
        r.congestion > 0.6 ? '#dd6b20' : r.congestion > 0.4 ? '#ecc94b' : '#48bb78',
    }));

  // 2. 当前流量折线图数据
  const flowValue = stats?.currentFlow ?? 0;
  const lineData =
    trends.length > 0
      ? trends.map((t) => t.flow)
      : [flowValue * 0.6, flowValue * 0.75, flowValue * 0.9, flowValue, flowValue * 1.1, flowValue * 0.95, flowValue];
  const lineXAxis =
    trends.length > 0 ? trends.map((t) => t.hour) : ['18:00', '18:05', '18:10', '18:15', '18:20', '18:25', '18:30'];

  // 3. 今日均衡（资源占比）
  const dispatchRate = stats?.dispatchRate ?? 64;
  const fastOp = stats?.fastOperation ?? 14;
  const assigned = Math.max(0, 100 - dispatchRate - fastOp);

  // 4. 调度收益指标
  const congestionBenefit = stats?.congestionBenefit ?? 34;
  const carbonSaved = (congestionBenefit * 0.15).toFixed(3);
  const idleRate = -(100 - (stats?.dispatchRate ?? 70)).toFixed(0);

  // 5. 恢复进度（拥堵越低恢复越高）
  const avgCongestion =
    roads.length > 0 ? roads.reduce((s, r) => s + r.congestion, 0) / roads.length : 0;
  const recovery = Math.round(Math.max(0, 100 - avgCongestion * 110));

  return (
    <div className="absolute bottom-4 left-4 right-4 z-20 grid grid-cols-5 gap-3">
      {/* 卡片1：路网热力 */}
      <div className="glass-panel rounded-lg p-3 h-[160px] overflow-hidden">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-textLight">路网热力</span>
          <span className="text-xs text-textLight">{stats?.congestionPoints ?? 0} 个热点</span>
        </div>
        <div className="space-y-2">
          {topRoads.length > 0 ? (
            topRoads.map((r) => (
              <div key={r.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-textMain">{r.id}</span>
                  <span className="text-textLight">{r.level}</span>
                </div>
                <div className="w-full h-[6px] bg-gray-100 rounded overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${r.level}%`, background: r.color }} />
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs text-textLight py-4 text-center">数据加载中...</div>
          )}
        </div>
        <p className="text-[10px] text-textLight mt-2">商圈、学校和快速路入口正在升温。</p>
      </div>

      {/* 卡片2：流量趋势折线图 */}
      <div className="glass-panel rounded-lg p-3 h-[160px] overflow-hidden">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-textLight">当前流量</span>
          <span className="text-xs font-bold text-textMain">
            {flowValue.toFixed(2)} <span className="text-[10px] text-textLight font-normal">千车/时</span>
          </span>
        </div>
        <ReactECharts
          option={{
            grid: { top: 10, right: 10, bottom: 25, left: 35 },
            xAxis: {
              type: 'category',
              data: lineXAxis,
              axisLabel: { fontSize: 9, color: '#94a3b8' },
              axisLine: { lineStyle: { color: '#cbd5e0' } },
            },
            yAxis: {
              type: 'value',
              min: 0,
              axisLabel: { fontSize: 9, color: '#94a3b8' },
              splitLine: { lineStyle: { color: '#e2e8f0' } },
            },
            series: [
              {
                data: lineData,
                type: 'line',
                smooth: true,
                itemStyle: { color: '#4299e1' },
                areaStyle: {
                  color: {
                    type: 'linear',
                    x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [
                      { offset: 0, color: 'rgba(66,153,225,0.3)' },
                      { offset: 1, color: 'rgba(66,153,225,0.05)' },
                    ],
                  },
                },
              },
            ],
          }}
          style={{ width: '100%', height: 110 }}
          opts={{ renderer: 'svg' }}
        />
      </div>

      {/* 卡片3：资源占比环形图 */}
      <div className="glass-panel rounded-lg p-3 h-[160px] overflow-hidden">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-textLight">今日均衡</span>
          <span className="text-xs font-bold text-textMain">
            {(stats?.currentFlow ?? 0).toFixed(2)} <span className="text-[10px] text-textLight font-normal">公里排队</span>
          </span>
        </div>
        <div className="flex items-center h-[110px]">
          <ReactECharts
            option={{
              series: [
                {
                  type: 'pie',
                  radius: ['60%', '80%'],
                  avoidLabelOverlap: false,
                  silent: true,
                  data: [
                    { value: dispatchRate, itemStyle: { color: '#48bb78' } },
                    { value: assigned, itemStyle: { color: '#4299e1' } },
                    { value: fastOp, itemStyle: { color: '#ecc94b' } },
                  ],
                  label: { show: false },
                },
              ],
            }}
            style={{ width: 110, height: 110 }}
            opts={{ renderer: 'svg' }}
          />
          <div className="text-xs ml-2 space-y-1 text-textMain">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-[#48bb78]" />可调度 {dispatchRate.toFixed(0)}%
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-[#4299e1]" />处理中 {assigned.toFixed(0)}%
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-[#ecc94b]" />待命 {fastOp.toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* 卡片4：调度收益指标 */}
      <div className="glass-panel rounded-lg p-3 h-[160px] overflow-hidden">
        <div className="grid grid-rows-3 h-full">
          <div className="flex justify-between items-center">
            <span className="text-xs text-textLight">调度收益</span>
            <div className="text-right">
              <span className="text-base font-bold text-textMain">{congestionBenefit.toFixed(1)}</span>
              <span className="text-[10px] text-textLight"> 节省分钟</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-textLight">碳排节约</span>
            <div className="text-right">
              <span className="text-base font-bold text-success">{carbonSaved}</span>
              <span className="text-[10px] text-textLight"> kg 预估</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-textLight">资源空转</span>
            <div className="text-right">
              <span className="text-base font-bold text-danger">{idleRate}%</span>
              <span className="text-[10px] text-textLight"> 疏导优化</span>
            </div>
          </div>
        </div>
      </div>

      {/* 卡片5：恢复进度环形 */}
      <div className="glass-panel rounded-lg p-3 h-[160px] overflow-hidden">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-textLight">恢复进度</span>
          <span className="text-xs font-bold text-textMain">
            {recovery} <span className="text-[10px] text-textLight font-normal">%</span>
          </span>
        </div>
        <div className="flex justify-center items-center h-[110px]">
          <ReactECharts
            option={{
              series: [
                {
                  type: 'pie',
                  radius: ['70%', '85%'],
                  startAngle: 90,
                  silent: true,
                  data: [
                    { value: recovery, itemStyle: { color: '#dd6b20' } },
                    { value: 100 - recovery, itemStyle: { color: '#e2e8f0' } },
                  ],
                  label: { show: false },
                },
              ],
            }}
            style={{ width: 110, height: 110 }}
            opts={{ renderer: 'svg' }}
          />
        </div>
      </div>
    </div>
  );
}
