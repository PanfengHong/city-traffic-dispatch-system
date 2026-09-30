// 与后端 trafficSimulator 对齐的数据类型
export interface Point {
  x: number;
  y: number;
}

export interface RoadData {
  id: string;
  from: Point;
  to: Point;
  congestion: number;
  speedLimit: number;
  isMain: boolean;
}

export interface VehicleData {
  id: string;
  x: number;
  y: number;
  angle: number;
  speed: number;
  type: 'car' | 'bus' | 'truck';
  color: string;
}

export interface IncidentData {
  id: string;
  type: 'accident' | 'construction' | 'breakdown' | 'signal_fault';
  position: Point;
  roadId: string;
  severity: 'low' | 'medium' | 'high';
  createdAt: number;
  description: string;
}

export interface TrafficStats {
  congestionPoints: number;
  currentFlow: number;
  incidentCount: number;
  safetyIndex: number;
  avgSpeed: number;
  dispatchRate: number;
  congestionBenefit: number;
  fastOperation: number;
  roadCount: number;
  peakFlow: number;
}

export interface TrafficSnapshot {
  roads: RoadData[];
  vehicles: VehicleData[];
  incidents: IncidentData[];
  stats: TrafficStats;
  timestamp: number;
}

export interface TrendPoint {
  hour: string;
  flow: number;
}

export interface User {
  userId: string;
  username: string;
  name: string;
  role: string;
}
