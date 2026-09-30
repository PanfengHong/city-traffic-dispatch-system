import { useAuthStore } from '../../store/authStore';

const TABS = ['态势总览', '事件研判', '预案调度', '流量优化'];

export function TopBar() {
  const { logout } = useAuthStore();

  return (
    <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-3">
      {/* Logo + 标题 */}
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white text-lg shadow-lg">
          <i className="fa fa-road" />
        </div>
        <div>
          <div className="font-light text-lg leading-tight">城流交通管理系统</div>
          <div className="text-[10px] text-textLight leading-tight">City Traffic Dispatch System</div>
        </div>
      </div>

      {/* 中间胶囊导航 */}
      <nav className="glass-panel rounded-full px-5 py-2 flex gap-6 text-sm">
        {TABS.map((tab, i) => (
          <span
            key={tab}
            className={`cursor-pointer transition-colors ${
              i === 0 ? 'text-textMain font-medium' : 'text-textLight font-light hover:text-textMain'
            }`}
          >
            {tab}
          </span>
        ))}
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
