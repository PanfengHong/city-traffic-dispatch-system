import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'city-traffic-demo-secret';
const EXPIRES_IN = '8h';

// 演示用账号（生产环境应接入数据库 + 密码哈希）
const DEMO_USERS = [
  { username: 'admin', password: 'admin123', name: '调度管理员', role: 'admin' },
  { username: 'operator', password: 'op123456', name: '值班调度员', role: 'operator' },
];

export interface AuthPayload {
  userId: string;
  username: string;
  name: string;
  role: string;
}

export function login(req: Request, res: Response) {
  const { username, password } = req.body || {};
  const user = DEMO_USERS.find(
    (u) => u.username === username && u.password === password
  );
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  const payload: AuthPayload = {
    userId: user.username,
    username: user.username,
    name: user.name,
    role: user.role,
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: EXPIRES_IN });
  return res.json({ token, user: payload });
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权' });
  }
  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'token 无效或已过期' });
  }
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}
