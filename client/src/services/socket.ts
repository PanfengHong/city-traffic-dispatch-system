import { io, Socket } from 'socket.io-client';
import type { TrafficSnapshot } from '../types';

let socket: Socket | null = null;

export function connectTrafficSocket(token: string, onUpdate: (snap: TrafficSnapshot) => void): () => void {
  socket = io({
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[WS] 已连接到实时交通数据服务');
  });

  socket.on('traffic:update', (snap: TrafficSnapshot) => {
    onUpdate(snap);
  });

  socket.on('connect_error', (err) => {
    console.error('[WS] 连接失败:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[WS] 断开:', reason);
  });

  // 返回断开函数
  return () => {
    socket?.disconnect();
    socket = null;
  };
}
