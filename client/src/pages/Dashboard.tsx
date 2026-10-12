import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useTrafficStore } from '../store/trafficStore';
import { useUIStore } from '../store/uiStore';
import { connectTrafficSocket } from '../services/socket';
import { getTrends } from '../services/api';
import { TopBar } from '../components/dashboard/TopBar';
import { LeftPanel } from '../components/dashboard/LeftPanel';
import { RightPanel } from '../components/dashboard/RightPanel';
import { BottomCards } from '../components/dashboard/BottomCards';
import { IncidentView } from '../components/dashboard/IncidentView';
import { PlanView } from '../components/dashboard/PlanView';
import { FlowView } from '../components/dashboard/FlowView';
import CityMap from '../components/dashboard/CityMap';

export default function Dashboard() {
  const { token } = useAuthStore();
  const setSnapshot = useTrafficStore((s) => s.setSnapshot);
  const setTrends = useTrafficStore((s) => s.setTrends);
  const activeTab = useUIStore((s) => s.activeTab);

  useEffect(() => {
    if (!token) return;
    const disconnect = connectTrafficSocket(token, (snap) => setSnapshot(snap));
    getTrends().then(setTrends).catch(() => {});
    return () => disconnect();
  }, [token, setSnapshot, setTrends]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#e8eef4]">
      {/* MapLibre 真实 3D 城市底图（各模块共用） */}
      <CityMap />

      {/* 顶部导航（组件内绝对定位） */}
      <TopBar />

      {/* 按功能模块渲染对应面板 */}
      {activeTab === 'overview' && (
        <>
          <LeftPanel />
          <RightPanel />
          <BottomCards />
        </>
      )}

      {activeTab === 'incident' && <IncidentView />}

      {activeTab === 'plan' && <PlanView />}

      {activeTab === 'flow' && <FlowView />}
    </div>
  );
}