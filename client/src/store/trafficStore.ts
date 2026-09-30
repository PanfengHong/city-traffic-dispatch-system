import { create } from 'zustand';
import type { TrafficSnapshot, TrendPoint } from '../types';

interface TrafficState {
  snapshot: TrafficSnapshot | null;
  trends: TrendPoint[];
  setSnapshot: (snap: TrafficSnapshot) => void;
  setTrends: (t: TrendPoint[]) => void;
}

export const useTrafficStore = create<TrafficState>((set) => ({
  snapshot: null,
  trends: [],
  setSnapshot: (snap) => set({ snapshot: snap }),
  setTrends: (t) => set({ trends: t }),
}));
