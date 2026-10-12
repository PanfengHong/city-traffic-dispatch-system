import { useAuthStore } from '../../store/authStore';
import { useUIStore, type TabKey } from '../../store/uiStore';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: '态势总览' },
  { key: 'incident', label: '事件研判' },
  { key: 'plan', label: '预案调度' },
  { key: 'flow', label: '流量优化' },
];

export function TopBar() {
  const { logout } = useAuthStore();
  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);

  return (
    <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-3">
      {/* Logo + 标题 */}
      <div className="glass-panel rounded-xl px-3.5 py-2 flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white text-xl shadow-md">
          <i className="fa fa-road" />
        </div>
        <div>
          <div className="font-medium text-base text-textMain leading-tight tracking-wide">
            城流交通管理系统
          </div>
          <div className="text-[10px] text-textLight leading-tight tracking-wide">
            City Traffic Dispatch System
          </div>
        </div>
      </div>

      {/* 中间胶囊导航 */}
      <nav className="glass-panel rounded-full px-2 py-1.5 flex gap-1 text-sm">
        {TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-full transition-all ${
                active
                  ? 'bg-primary text-white font-medium shadow'
                  : 'text-textLight font-light hover:text-textMain hover:bg-white/50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* 右侧工具 + 头像 */}
      <div className="flex items-center gap-4 text-textLight text-lg">
        <i className="fa fa-search cursor-pointer hover:text-primary transition-colors" />
        <i className="fa fa-bell-o cursor-pointer hover:text-primary transition-colors" />
        <i className="fa fa-cog cursor-pointer hover:text-primary transition-colors" />
        <button
          onClick={logout}
          className="px-3 py-1 rounded-md text-xs text-textLight hover:text-danger transition-colors"
          title="退出登录"
        >
          <i className="fa fa-sign-out mr-1" />
          退出
        </button>
        <div className="w-8 h-8 rounded-full bg-amber-700 text-white flex items-center justify-center text-sm shadow">
          智
        </div>
      </div>
    </header>
  );
}