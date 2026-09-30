import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { login, authMiddleware, verifyToken } from './auth';
import { TrafficSimulator } from './trafficSimulator';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

// ====== REST API ======
app.post('/api/login', login);

app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ user: (req as any).user });
});

// 历史趋势（用于底部折线图/环图）
app.get('/api/trends', authMiddleware, (_req, res) => {
  const hours = [];
  for (let i = 0; i < 24; i++) {
    const base = 1.2 + Math.sin((i - 6) / 24 * Math.PI * 2) * 1.5 + Math.random() * 0.3;
    hours.push({ hour: `${i}:00`, flow: +Math.max(0.2, base).toFixed(2) });
  }
  res.json({ hours });
});

// ====== WebSocket 实时交通推送 ======
const simulator = new TrafficSimulator(220);

// 每 100ms 推进模拟
setInterval(() => {
  simulator.tick(0.1);
}, 100);

// 每 800ms 推送全量快照给所有客户端
setInterval(() => {
  io.emit('traffic:update', simulator.getSnapshot());
}, 800);

// Socket.IO 鉴权
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('未授权'));
  const user = verifyToken(token);
  if (!user) return next(new Error('token 无效'));
  (socket as any).user = user;
  next();
});

io.on('connection', (socket) => {
  const user = (socket as any).user;
  console.log(`[WS] ${user.name} 已连接 (${socket.id})`);
  // 立即推送一次当前快照
  socket.emit('traffic:update', simulator.getSnapshot());

  socket.on('disconnect', () => {
    console.log(`[WS] ${user.name} 断开连接`);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`✅ 交通调度服务已启动: http://localhost:${PORT}`);
  console.log(`   演示账号: admin / admin123  或  operator / op123456`);
});
