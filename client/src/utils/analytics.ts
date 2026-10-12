import type { IncidentData, RoadData, TrafficStats } from '../types';

// ============ 通用 ============

export const INCIDENT_TYPE_LABEL: Record<IncidentData['type'], string> = {
  accident: '交通事故',
  construction: '道路施工',
  breakdown: '车辆故障',
  signal_fault: '信号灯故障',
};

export const SEVERITY_LABEL: Record<IncidentData['severity'], string> = {
  low: '低',
  medium: '中',
  high: '高',
};

export const SEVERITY_WEIGHT: Record<IncidentData['severity'], number> = {
  low: 1,
  medium: 2,
  high: 3,
};

export const SEVERITY_COLOR: Record<IncidentData['severity'], string> = {
  low: '#60a5fa',
  medium: '#fbbf24',
  high: '#f87171',
};

const ROAD_NAMES = [
  '中山路',
  '人民大道',
  '滨江大道',
  '湖滨路',
  '南京路',
  '解放路',
  '建设路',
  '科技大道',
  '环城高架',
  '望江路',
];

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/** 由 roadId 生成一个稳定的中文路名 */
export function roadLabel(roadId: string, isMain = false): string {
  let hash = 0;
  for (let i = 0; i < roadId.length; i++) hash = (hash * 31 + roadId.charCodeAt(i)) >>> 0;
  const name = ROAD_NAMES[hash % ROAD_NAMES.length];
  const prefix = roadId.startsWith('d-') ? '快速路' : isMain ? '主干道' : '支路';
  return `${name}（${prefix}）`;
}

// ============ 事件研判 ============

export interface IncidentAnalysis {
  typeLabel: string;
  severityLabel: string;
  severityColor: string;
  roadId: string;
  roadName: string;
  ageMin: number;
  impactedRoads: number;
  spilloverIndex: number;
  clearanceMin: number;
  confidence: number;
  riskLevel: '一般' | '较高' | '严重';
  predictedQueueKm: number;
  affectedVehicles: number;
  recommendations: string[];
}

/** 结合实时路网态势对单起事件做影响研判 */
export function analyzeIncident(
  inc: IncidentData,
  roads: RoadData[],
  stats?: TrafficStats
): IncidentAnalysis {
  const road = roads.find((r) => r.id === inc.roadId);
  const w = SEVERITY_WEIGHT[inc.severity];
  const cong = road?.congestion ?? 0.4;
  const congestionPoints = stats?.congestionPoints ?? 0;

  const ageMin = Math.max(0, Math.round((Date.now() - inc.createdAt) / 60000));
  const impactedRoads = Math.round(w * 2 + cong * 6 + (stats?.incidentCount ?? 0) * 0.5);
  const spilloverIndex = clamp(Math.round(w * 18 + cong * 45 + congestionPoints * 2), 8, 98);
  const baseClear =
    inc.type === 'accident'
      ? 26
      : inc.type === 'construction'
        ? 45
        : inc.type === 'signal_fault'
          ? 18
          : 14;
  const clearanceMin = Math.round(baseClear * (0.7 + w * 0.25) + cong * 10);
  const confidence = clamp(Math.round(96 - w * 4 - cong * 6), 70, 97);
  const riskLevel: IncidentAnalysis['riskLevel'] =
    w >= 3 || spilloverIndex > 70 ? '严重' : w === 2 || spilloverIndex > 45 ? '较高' : '一般';
  const predictedQueueKm = +(0.4 + w * 0.5 + cong * 1.6).toFixed(1);
  const affectedVehicles = Math.round(predictedQueueKm * (60 + w * 25));

  return {
    typeLabel: INCIDENT_TYPE_LABEL[inc.type],
    severityLabel: SEVERITY_LABEL[inc.severity],
    severityColor: SEVERITY_COLOR[inc.severity],
    roadId: inc.roadId,
    roadName: roadLabel(inc.roadId, road?.isMain ?? false),
    ageMin,
    impactedRoads,
    spilloverIndex,
    clearanceMin,
    confidence,
    riskLevel,
    predictedQueueKm,
    affectedVehicles,
    recommendations: buildRecommendations(inc, cong),
  };
}

function buildRecommendations(inc: IncidentData, cong: number): string[] {
  const rec: string[] = [];
  if (inc.severity === 'high') rec.push('启动一级响应，就近交警 5 分钟内到场处置');

  switch (inc.type) {
    case 'accident':
      rec.push('事故快处快撤，先行引导车辆撤离主车道');
      rec.push('上游 2 个路口开启分流诱导，缓解排队外溢');
      break;
    case 'construction':
      rec.push('核验施工围挡范围与警示标志设置');
      rec.push('发布施工绕行提示并调整相邻路口配时');
      break;
    case 'breakdown':
      rec.push('就近调度拖车清障，恢复车道通行能力');
      break;
    case 'signal_fault':
      rec.push('调度信号机检修班组，现场启用人工手势指挥');
      break;
  }

  if (cong > 0.55) rec.push('该路段负荷较高，建议同步纳入绿波协调观察队列');
  rec.push('通过情报板与导航 App 发布实时路况诱导');
  return rec;
}

// ============ 流量优化 ============

export type OptimizationKind = 'green_wave' | 'signal_timing' | 'ramp_metering' | 'speed_limit';

export const OPTIMIZATION_KIND_LABEL: Record<OptimizationKind, string> = {
  green_wave: '绿波带协调',
  signal_timing: '信号配时优化',
  ramp_metering: '匝道流入控制',
  speed_limit: '可变限速',
};

export interface FlowOptimization {
  id: string;
  kind: OptimizationKind;
  kindLabel: string;
  title: string;
  roadId: string;
  roadName: string;
  congestion: number;
  priority: '高' | '中' | '低';
  paramLabel: string;
  currentValue: number;
  suggestedValue: number;
  unit: string;
  expectedSpeedUp: number;
  expectedDelayDown: number;
  note: string;
}

const KIND_CYCLE: OptimizationKind[] = [
  'green_wave',
  'signal_timing',
  'ramp_metering',
  'speed_limit',
];

/** 基于实时拥堵排名生成流量优化建议 */
export function buildFlowOptimizations(roads: RoadData[], stats?: TrafficStats): FlowOptimization[] {
  const ranked = [...roads].sort((a, b) => b.congestion - a.congestion).slice(0, 4);

  return ranked.map((road, i) => {
    const kind = KIND_CYCLE[i % KIND_CYCLE.length];
    const cong = road.congestion;
    const currentPeriod = Math.round((90 + cong * 60) / 5) * 5;
    const suggestedPeriod = Math.round((currentPeriod * (1 - 0.1 - cong * 0.08)) / 5) * 5;
    const currentGreenRatio = Math.round(45 + cong * 12);
    const suggestedGreenRatio = Math.min(72, currentGreenRatio + 8);
    const inflow = Math.round(70 + cong * 20);
    const expectedSpeedUp = Math.round(6 + cong * 20 + (stats ? stats.avgSpeed / 60 : 0) * 4);
    const expectedDelayDown = Math.round(8 + cong * 22);
    const priority: FlowOptimization['priority'] =
      cong > 0.6 ? '高' : cong > 0.4 ? '中' : '低';

    // 按优化类型选取主展示参数
    let paramLabel = '绿信比';
    let currentValue = currentGreenRatio;
    let suggestedValue = suggestedGreenRatio;
    let unit = '%';
    if (kind === 'signal_timing') {
      paramLabel = '信号周期';
      currentValue = currentPeriod;
      suggestedValue = suggestedPeriod;
      unit = 's';
    } else if (kind === 'ramp_metering') {
      paramLabel = '匝道流入率';
      currentValue = inflow;
      suggestedValue = Math.max(40, inflow - 12);
      unit = '%';
    } else if (kind === 'speed_limit') {
      paramLabel = '限速值';
      currentValue = road.speedLimit;
      suggestedValue = Math.max(40, road.speedLimit - 10);
      unit = 'km/h';
    }

    return {
      id: `opt-${road.id}`,
      kind,
      kindLabel: OPTIMIZATION_KIND_LABEL[kind],
      title: `${roadLabel(road.id, road.isMain)} ${OPTIMIZATION_KIND_LABEL[kind]}`,
      roadId: road.id,
      roadName: roadLabel(road.id, road.isMain),
      congestion: cong,
      priority,
      paramLabel,
      currentValue,
      suggestedValue,
      unit,
      expectedSpeedUp,
      expectedDelayDown,
      note:
        kind === 'green_wave'
          ? '对沿线连续路口按设计车速统一协调相位差，减少停车次数'
          : kind === 'signal_timing'
            ? '延长主方向绿灯时长，压缩空放相位'
            : kind === 'ramp_metering'
              ? '高峰时段对入口匝道按饱和度限制流入'
              : '按实时能见度与饱和度动态调整限速值',
    };
  });
}

// ============ 预案库 ============

export interface DispatchPlan {
  id: string;
  name: string;
  category: string;
  level: '一级' | '二级' | '三级';
  trigger: string;
  color: string;
  steps: string[];
  resources: { name: string; count: number }[];
  duration: number; // 预计处置分钟
  expectedEffect: string;
}

export const DISPATCH_PLANS: DispatchPlan[] = [
  {
    id: 'p-accident',
    name: '交通事故快速处置预案',
    category: '事件处置',
    level: '一级',
    trigger: '主干道发生事故且外溢指数 > 60',
    color: '#e53e3e',
    steps: [
      '锁定事故点并推送至就近交警与拖车',
      '上游路口开启分流诱导，封闭受损车道',
      '情报板与导航 App 同步发布绕行提示',
      '现场快处快撤后回收车道、恢复信号常态',
    ],
    resources: [
      { name: '执勤交警', count: 6 },
      { name: '拖车', count: 2 },
      { name: '救护车', count: 1 },
      { name: '诱导屏', count: 8 },
    ],
    duration: 25,
    expectedEffect: '平均清障时间缩短 32%，外溢排队下降约 40%',
  },
  {
    id: 'p-signal',
    name: '信号故障联动处置预案',
    category: '设施保障',
    level: '二级',
    trigger: '关键路口信号灯故障或供电异常',
    color: '#dd6b20',
    steps: [
      '自动降级为黄闪并通知检修班组',
      '现场启用人工手势指挥与临时警示',
      '切换相邻路口为全红放行策略，避免冲突',
      '修复后逐级恢复配时并复核运行状态',
    ],
    resources: [
      { name: '信号检修班组', count: 2 },
      { name: '交警手势岗', count: 3 },
      { name: '移动信号灯', count: 2 },
    ],
    duration: 40,
    expectedEffect: '路口通行能力维持 70% 以上，避免大面积瘫痪',
  },
  {
    id: 'p-construction',
    name: '施工占道管制预案',
    category: '施工管理',
    level: '三级',
    trigger: '计划性或临时性占道施工',
    color: '#4299e1',
    steps: [
      '核验施工围挡与警示标志合规性',
      '按批复时段压缩作业面，保留通行车道',
      '调整相邻路口配时，预留清空时间',
      '施工结束后验收路面并恢复标识',
    ],
    resources: [{ name: '施工协管员', count: 4 }, { name: '警示锥桶', count: 60 }, { name: '诱导屏', count: 4 }],
    duration: 180,
    expectedEffect: '施工路段断面通行效率提升 18%',
  },
  {
    id: 'p-event',
    name: '大型活动交通疏导预案',
    category: '活动保障',
    level: '二级',
    trigger: '场馆周边到达高峰或散场集中车流',
    color: '#38a169',
    steps: [
      '设定单向循环流线并开辟临停区域',
      '场馆周边路口切换为疏散优先配时',
      '公交加密班次、地铁接驳分流',
      '散场后逐步解除管制、恢复常态配时',
    ],
    resources: [{ name: '疏导交警', count: 12 }, { name: '摆渡车', count: 6 }, { name: '临时指示牌', count: 20 }],
    duration: 90,
    expectedEffect: '散场高峰持续时长缩短 35%',
  },
  {
    id: 'p-weather',
    name: '恶劣天气应急预案',
    category: '天气应对',
    level: '一级',
    trigger: '暴雨 / 大雾 / 冰雪导致能见度与附着力下降',
    color: '#805ad5',
    steps: [
      '全路网下调限速并提升警示等级',
      '低洼路段提前布控排水与警戒',
      '高架、桥隧入口实施流入控制',
      '视情封闭危险路段并组织绕行',
    ],
    resources: [{ name: '应急抢险车', count: 8 }, { name: '排水泵', count: 4 }, { name: '巡逻车', count: 10 }],
    duration: 240,
    expectedEffect: '恶劣天气事故率下降约 45%',
  },
];