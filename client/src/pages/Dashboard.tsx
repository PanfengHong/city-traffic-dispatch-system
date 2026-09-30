import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useTrafficStore } from '../store/trafficStore';
import { connectTrafficSocket } from '../services/socket';
import { getTrends } from '../services/api';
import { TopBar } from '../components/dashboard/TopBar';
import { LeftPanel } from '../components/dashboard/LeftPanel';
import { RightPanel } from '../components/dashboard/RightPanel';
import { BottomCards } from '../components/dashboard/BottomCards';
import CityMap from '../components/dashboard/CityMap';

export default function Dashboard() {
  const { token } = useAuthStore();
  const setSnapshot = useTrafficStore((s) => s.setSnapshot);
  const setTrends = useTrafficStore((s) => s.setTrends);

  useEffect(() => {
    if (!token) return;
    const disconnect = connectTrafficSocket(token, (snap) => setSnapshot(snap));
    getTrends().then(setTrends).catch(() => {});
    return () => disconnect();
  }, [token, setSnapshot, setTrends]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#e8eef4]">
      {/* MapLibre 真实 3D 城市底图 */}
      <CityMap />

      {/* 顶部导航（组件内绝对定位） */}
      <TopBar />

      {/* 左侧状态面板（组件内绝对定位） */}
      <LeftPanel />

      {/* 右侧 AI 推理面板（组件内绝对定位） */}
      <RightPanel />

      {/* 底部数据卡片（组件内绝对定位） */}
      <BottomCards />
    </div>
  );
}
