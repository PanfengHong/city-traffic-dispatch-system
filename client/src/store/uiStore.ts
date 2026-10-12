import { create } from 'zustand';

// 顶部功能模块
export type TabKey = 'overview' | 'incident' | 'plan' | 'flow';

interface UIState {
  activeTab: TabKey;
  setActiveTab: (t: TabKey) => void;

  // 地图联动：当前选中的事件 / 路段
  selectedIncidentId: string | null;
  setSelectedIncidentId: (id: string | null) => void;
  focusRoadId: string | null;
  setFocusRoadId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'overview',
  setActiveTab: (t) =>
    set({ activeTab: t, selectedIncidentId: null, focusRoadId: null }),

  selectedIncidentId: null,
  setSelectedIncidentId: (id) => set({ selectedIncidentId: id }),
  focusRoadId: null,
  setFocusRoadId: (id) => set({ focusRoadId: id }),
}));