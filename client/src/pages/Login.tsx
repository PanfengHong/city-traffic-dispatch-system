import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const navigate = useNavigate();
  const { login, loading, error, token } = useAuthStore();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');

  useEffect(() => {
    if (token) navigate('/', { replace: true });
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate('/', { replace: true });
    } catch {
      /* 错误已由 store 记录 */
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* 浅色背景渐变 */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#e8eef4] via-[#dbe7f1] to-[#c9daea]" />
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(66,153,225,0.25), transparent 45%), radial-gradient(circle at 80% 70%, rgba(35,119,187,0.18), transparent 45%)',
        }}
      />
      {/* 网格线 */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(35,119,187,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(35,119,187,0.6) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative glass-panel rounded-2xl w-[420px] p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center shadow-lg mb-3">
            <i className="fa fa-road text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-textMain">城流交通管理系统</h1>
          <p className="text-sm text-textLight mt-1">City Traffic Dispatch Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-textLight mb-2">用户名</label>
            <input
              className="w-full bg-white/70 border border-gray-200 rounded-lg px-4 py-2.5 text-textMain outline-none focus:border-primary transition"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm text-textLight mb-2">密码</label>
            <input
              type="password"
              className="w-full bg-white/70 border border-gray-200 rounded-lg px-4 py-2.5 text-textMain outline-none focus:border-primary transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="text-sm text-danger bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-primary text-white font-semibold hover:opacity-90 disabled:opacity-50 transition shadow-md"
          >
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-200 text-xs text-textLight space-y-1">
          <p>演示账号：</p>
          <p>管理员 → admin / admin123</p>
          <p>调度员 → operator / op123456</p>
        </div>
      </div>
    </div>
  );
}
