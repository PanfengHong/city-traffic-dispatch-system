import { useTrafficStore } from '../../store/trafficStore';

type StepKind = 'input' | 'think' | 'exec';

interface ReasonStep {
  kind: StepKind;
  text: string;
}

export function RightPanel() {
  const { snapshot } = useTrafficStore();
  const roads = snapshot?.roads ?? [];
  const congestion =
    roads.length > 0
      ? Math.min(10, (roads.reduce((s, r) => s + r.congestion, 0) / roads.length) * 12)
      : 0;
  const incidents = snapshot?.incidents ?? [];

  // 根据实时态势生成 AI 推理步骤
  const steps: ReasonStep[] = buildReasoningSteps(congestion, incidents);
  const execCount = steps.filter((s) => s.kind === 'exec').length;
  const total = steps.length;
  const progress = Math.round((execCount / total) * 100);

  return (
    <aside className="absolute right-4 top-[80px] z-20 w-[340px] glass-panel rounded-lg p-4">
      {/* 头部：语音识别 */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded bg-teal-500 text-white flex items-center justify-center text-xs">
          <i className="fa fa-microphone" />
        </div>
        <span className="text-sm font-medium text-textMain">语音识别</span>
      </div>

      {/* 推理状态 + 进度 */}
      <div className="text-xs text-teal-600 mb-2">正在推理方案</div>
      <div className="w-full h-[20px] bg-gray-100 rounded mb-3 overflow-hidden">
        <div
          className="h-full bg-teal-400 opacity-60 transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 推理步骤列表 */}
      <div className="space-y-2 text-xs">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`py-1 pl-2 border-l-2 ${
              step.kind === 'input'
                ? 'border-teal-400 text-textMain'
                : step.kind === 'exec'
                  ? 'border-primary text-textMain'
                  : 'border-gray-300 text-textLight'
            }`}
          >
            {step.kind === 'input' && <span className="font-medium">声纹输入</span>}
            {step.kind === 'think' && <span>思考：</span>}
            {step.kind === 'exec' && <span>执行：</span>}
            {step.text}
          </div>
        ))}
      </div>
    </aside>
  );
}

function buildReasoningSteps(congestion: number, incidents: any[]): ReasonStep[] {
  const steps: ReasonStep[] = [
    { kind: 'input', text: '帮我评估当前全域路网是否需要主动调度。' },
    { kind: 'think', text: '读取三维路网热力' },
    { kind: 'think', text: congestion >= 6 ? '识别到拥堵扩散方向，锁定高负荷路段' : '识别拥堵扩散方向，当前扩散趋势可控' },
    { kind: 'think', text: '核对在线资源与管制点' },
  ];

  if (incidents.length > 0) {
    const top = incidents[0];
    steps.push({ kind: 'exec', text: `锁定${top.type === 'accident' ? '事故' : top.type === 'congestion' ? '拥堵' : '事件'}：${top.roadId}` });
  } else {
    steps.push({ kind: 'exec', text: '全域无突发事故，维持常态巡航' });
  }

  if (congestion >= 5) {
    steps.push({ kind: 'exec', text: '提前启用上游绿波' });
    steps.push({ kind: 'exec', text: '湖滨路纳入观察队列' });
  } else {
    steps.push({ kind: 'exec', text: '保持当前信号配时方案' });
  }

  return steps;
}
