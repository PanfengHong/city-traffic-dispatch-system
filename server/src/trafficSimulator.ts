// 交通模拟数据引擎：生成城市路网、行驶车辆、拥堵、事件与统计指标
// 模拟数据结构对齐生产环境中真实交通数据的字段，便于后续替换为真实数据源

export interface Point {
  x: number;
  y: number;
}

export interface RoadSegment {
  id: string;
  from: Point;
  to: Point;
  length: number;
  speedLimit: number; // km/h
  congestion: number; // 0 畅通 ~ 1 严重拥堵
  vehicleCount: number;
  isMain: boolean; // 是否主干道
}

export interface Vehicle {
  id: string;
  x: number;
  y: number;
  angle: number; // 朝向角度（弧度）
  speed: number; // km/h
  roadId: string;
  type: 'car' | 'bus' | 'truck';
  color: string;
}

export interface Incident {
  id: string;
  type: 'accident' | 'construction' | 'breakdown' | 'signal_fault';
  position: Point;
  roadId: string;
  severity: 'low' | 'medium' | 'high';
  createdAt: number;
  description: string;
}

export interface TrafficStats {
  congestionPoints: number; // 拥堵点数
  currentFlow: number; // 当前在网车辆数（千辆）
  incidentCount: number; // 事件数
  safetyIndex: number; // 安全指数 0-100
  avgSpeed: number; // 平均车速 km/h
  dispatchRate: number; // 调度完成率 %
  congestionBenefit: number; // 拥堵治理收益
  fastOperation: number; // 快速运营率 %
  roadCount: number;
  peakFlow: number;
}

const CITY_SIZE = 1000; // 城市网格范围
const GRID_STEP = 100; // 路网间距

// 生成城市路网（曼哈顿网格 + 几条斜向主干道）
function buildRoadNetwork(): RoadSegment[] {
  const roads: RoadSegment[] = [];
  const lines = Math.floor(CITY_SIZE / GRID_STEP);

  // 水平道路
  for (let i = 0; i <= lines; i++) {
    const y = -CITY_SIZE / 2 + i * GRID_STEP;
    const isMain = i % 3 === 0;
    const seg: RoadSegment = {
      id: `h-${i}`,
      from: { x: -CITY_SIZE / 2, y },
      to: { x: CITY_SIZE / 2, y },
      length: CITY_SIZE,
      speedLimit: isMain ? 60 : 40,
      congestion: Math.random() * 0.3,
      vehicleCount: 0,
      isMain,
    };
    roads.push(seg);
  }
  // 垂直道路
  for (let j = 0; j <= lines; j++) {
    const x = -CITY_SIZE / 2 + j * GRID_STEP;
    const isMain = j % 3 === 0;
    const seg: RoadSegment = {
      id: `v-${j}`,
      from: { x, y: -CITY_SIZE / 2 },
      to: { x, y: CITY_SIZE / 2 },
      length: CITY_SIZE,
      speedLimit: isMain ? 60 : 40,
      congestion: Math.random() * 0.3,
      vehicleCount: 0,
      isMain,
    };
    roads.push(seg);
  }
  // 两条斜向主干道
  roads.push({
    id: 'd-1',
    from: { x: -CITY_SIZE / 2, y: -CITY_SIZE / 2 },
    to: { x: CITY_SIZE / 2, y: CITY_SIZE / 2 },
    length: CITY_SIZE * Math.SQRT2,
    speedLimit: 80,
    congestion: 0.4,
    vehicleCount: 0,
    isMain: true,
  });
  roads.push({
    id: 'd-2',
    from: { x: CITY_SIZE / 2, y: -CITY_SIZE / 2 },
    to: { x: -CITY_SIZE / 2, y: CITY_SIZE / 2 },
    length: CITY_SIZE * Math.SQRT2,
    speedLimit: 80,
    congestion: 0.4,
    vehicleCount: 0,
    isMain: true,
  });
  return roads;
}

const VEHICLE_COLORS = ['#4FC3F7', '#81C784', '#FFB74D', '#F06292', '#AED581', '#7986CB'];

function createVehicle(id: number, roads: RoadSegment[]): Vehicle {
  const road = roads[Math.floor(Math.random() * roads.length)];
  const t = Math.random();
  const x = road.from.x + (road.to.x - road.from.x) * t;
  const y = road.from.y + (road.to.y - road.from.y) * t;
  const angle = Math.atan2(road.to.y - road.from.y, road.to.x - road.from.x);
  const types: Vehicle['type'][] = ['car', 'car', 'car', 'bus', 'truck'];
  return {
    id: `v-${id}`,
    x,
    y,
    angle: Math.random() < 0.5 ? angle : angle + Math.PI, // 双向
    speed: road.speedLimit * (0.4 + Math.random() * 0.5),
    roadId: road.id,
    type: types[Math.floor(Math.random() * types.length)],
    color: VEHICLE_COLORS[Math.floor(Math.random() * VEHICLE_COLORS.length)],
  };
}

const INCIDENT_TYPES: Incident['type'][] = ['accident', 'construction', 'breakdown', 'signal_fault'];
const INCIDENT_DESC: Record<Incident['type'], string> = {
  accident: '交通事故',
  construction: '道路施工',
  breakdown: '车辆故障',
  signal_fault: '信号灯故障',
};

export class TrafficSimulator {
  private roads: RoadSegment[] = buildRoadNetwork();
  private vehicles: Vehicle[] = [];
  private incidents: Incident[] = [];
  private stats: TrafficStats;
  private vehicleSeq = 0;

  constructor(vehicleCount = 200) {
    for (let i = 0; i < vehicleCount; i++) {
      this.vehicles.push(createVehicle(this.vehicleSeq++, this.roads));
    }
    this.stats = {
      congestionPoints: 0,
      currentFlow: vehicleCount / 1000,
      incidentCount: 0,
      safetyIndex: 92,
      avgSpeed: 0,
      dispatchRate: 0.92,
      congestionBenefit: 34.6,
      fastOperation: 0.72,
      roadCount: this.roads.length,
      peakFlow: 4.42,
    };
  }

  getRoads() {
    return this.roads;
  }

  // 推进一帧模拟（dt 秒）
  tick(dt: number) {
    // 更新车辆位置
    const roadCounts = new Map<string, number>();
    for (const v of this.vehicles) {
      const dx = Math.cos(v.angle);
      const dy = Math.sin(v.angle);
      const speedMs = (v.speed / 3.6) * dt; // km/h -> m/s
      v.x += dx * speedMs;
      v.y += dy * speedMs;

      // 边界反弹（模拟车辆在城市范围内行驶）
      const half = CITY_SIZE / 2;
      if (v.x > half || v.x < -half) {
        v.angle = Math.PI - v.angle;
        v.x = Math.max(-half, Math.min(half, v.x));
      }
      if (v.y > half || v.y < -half) {
        v.angle = -v.angle;
        v.y = Math.max(-half, Math.min(half, v.y));
      }

      // 找最近路段归属
      const road = this.findNearestRoad(v.x, v.y);
      if (road) {
        v.roadId = road.id;
        // 拥堵影响车速
        const targetSpeed = road.speedLimit * (1 - road.congestion * 0.7);
        v.speed += (targetSpeed - v.speed) * 0.02;
        roadCounts.set(road.id, (roadCounts.get(road.id) || 0) + 1);
      }
    }

    // 更新路段拥堵度（基于车辆密度）
    for (const road of this.roads) {
      const count = roadCounts.get(road.id) || 0;
      road.vehicleCount = count;
      const density = count / Math.max(1, road.length / 50);
      const targetCongestion = Math.min(1, density / 8);
      road.congestion += (targetCongestion - road.congestion) * 0.05;
    }

    // 随机生成/清除事件
    if (Math.random() < 0.02 && this.incidents.length < 6) {
      const road = this.roads[Math.floor(Math.random() * this.roads.length)];
      const t = Math.random();
      const type = INCIDENT_TYPES[Math.floor(Math.random() * INCIDENT_TYPES.length)];
      const sev: Incident['severity'] = Math.random() < 0.2 ? 'high' : Math.random() < 0.5 ? 'medium' : 'low';
      this.incidents.push({
        id: `inc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type,
        position: { x: road.from.x + (road.to.x - road.from.x) * t, y: road.from.y + (road.to.y - road.from.y) * t },
        roadId: road.id,
        severity: sev,
        createdAt: Date.now(),
        description: INCIDENT_DESC[type],
      });
    }
    // 清除过期事件
    this.incidents = this.incidents.filter((i) => Date.now() - i.createdAt < 30000);

    // 更新统计
    this.updateStats();
  }

  private findNearestRoad(x: number, y: number): RoadSegment | null {
    let nearest: RoadSegment | null = null;
    let minDist = Infinity;
    for (const r of this.roads) {
      const dist = pointToSegmentDist(x, y, r.from, r.to);
      if (dist < minDist) {
        minDist = dist;
        nearest = r;
      }
    }
    return minDist < 30 ? nearest : null;
  }

  private updateStats() {
    const speeds = this.vehicles.map((v) => v.speed);
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const congestionPoints = this.roads.filter((r) => r.congestion > 0.6).length;
    const safetyIndex = Math.max(60, 100 - congestionPoints * 2 - this.incidents.length * 3);

    this.stats.avgSpeed = avgSpeed;
    this.stats.currentFlow = this.vehicles.length / 1000;
    this.stats.congestionPoints = congestionPoints;
    this.stats.incidentCount = this.incidents.length;
    this.stats.safetyIndex = safetyIndex;
    this.stats.dispatchRate = 0.85 + Math.random() * 0.12;
    this.stats.congestionBenefit = 30 + Math.random() * 12;
    this.stats.fastOperation = 0.65 + Math.random() * 0.15;
  }

  getSnapshot() {
    return {
      roads: this.roads.map((r) => ({
        id: r.id,
        from: r.from,
        to: r.to,
        congestion: r.congestion,
        speedLimit: r.speedLimit,
        isMain: r.isMain,
      })),
      vehicles: this.vehicles.map((v) => ({
        id: v.id,
        x: v.x,
        y: v.y,
        angle: v.angle,
        speed: v.speed,
        type: v.type,
        color: v.color,
      })),
      incidents: this.incidents,
      stats: this.stats,
      timestamp: Date.now(),
    };
  }
}

function pointToSegmentDist(px: number, py: number, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy || 1;
  let t = ((px - a.x) * dx + (py - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  return Math.hypot(px - cx, py - cy);
}
