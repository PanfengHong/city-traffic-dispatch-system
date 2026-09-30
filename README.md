# 城流交通管理系统 · City Traffic Dispatch System

基于 **MapLibre GL JS** 真实城市 3D 地图与 **实时交通仿真引擎** 的交通调度大屏系统。使用零 Token 开源矢量瓦片渲染真实城市建筑与路网，叠加实时拥堵、车辆、事件图层，配合浅色玻璃拟态 UI 面板，实现全域交通态势感知与调度决策支持。

---

## 技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18 | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Vite | 5.x | 构建 + 开发服务器 |
| MapLibre GL JS | 6.x | 真实城市 3D 地图引擎 |
| ECharts | 6.x | 底部数据可视化（折线/环形/条形） |
| Zustand | 4.x | 轻量全局状态管理 |
| Tailwind CSS | 3.x | 原子化样式 + 玻璃拟态设计 |
| React Router | 6.x | 路由（登录 / Dashboard） |
| Socket.IO Client | 4.x | WebSocket 实时数据接收 |
| Axios | 1.x | REST API 请求 |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | ≥ 18 | 运行环境 |
| Express | 4.x | REST API 服务 |
| Socket.IO | 4.x | WebSocket 实时推送 |
| TypeScript | 5.x | 类型安全 |
| tsx | 4.x | 开发热重载 |
| JSON Web Token | 9.x | 鉴权令牌签发与验证 |

### 地图数据源（零 Token，完全开源）

| 数据源 | 用途 |
|--------|------|
| [OpenFreeMap](https://openfreemap.org/) | 矢量瓦片底图 + 3D 建筑挤出 |
| OpenStreetMap | 建筑/道路/地名等原始地理数据 |

---

## 项目结构

```
3D City Traffic/
├── client/                          # 前端（React + Vite + MapLibre）
│   ├── index.html                   # HTML 入口
│   ├── vite.config.ts               # Vite 配置（端口 5173、代理 /api 和 /socket.io）
│   ├── tailwind.config.js           # Tailwind 主题（浅色玻璃拟态配色 token）
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx                 # React 挂载入口
│       ├── App.tsx                  # 路由（/login → Login，/ → Dashboard）
│       ├── index.css                # 全局样式（.glass-panel、滚动条、动画）
│       ├── types.ts                 # 共享类型定义（RoadData / VehicleData / IncidentData / TrafficStats）
│       ├── pages/
│       │   ├── Login.tsx            # 登录页（浅色渐变 + 玻璃卡片）
│       │   └── Dashboard.tsx       # 主大屏（组合 CityMap + TopBar + LeftPanel + RightPanel + BottomCards）
│       ├── components/
│       │   └── dashboard/
│       │       ├── CityMap.tsx      # ★ MapLibre 3D 真实城市地图 + 交通图层
│       │       ├── TopBar.tsx       # 顶部胶囊导航（标题 + 功能入口 + 头像）
│       │       ├── LeftPanel.tsx    # 左侧面板（标题卡 + 告警卡 + 指标列表带涨跌）
│       │       ├── RightPanel.tsx   # 右侧面板（teal 语音识别 AI 推理步骤）
│       │       ├── BottomCards.tsx  # 底部 5 卡（ECharts 热力/折线/环形/收益/进度）
│       │       └── City3D/          # 旧版 Three.js 程序化城市（已弃用，保留备份）
│       ├── store/
│       │   ├── authStore.ts         # Zustand 认证状态（login / logout / restore）
│       │   └── trafficStore.ts       # Zustand 交通状态（snapshot / trends）
│       └── services/
│           ├── api.ts               # Axios 实例 + REST 接口（login / me / trends）
│           └── socket.ts            # Socket.IO 客户端连接 + traffic:update 监听
│
├── server/                          # 后端（Express + Socket.IO + 仿真引擎）
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                 # Express 服务入口（REST API + WebSocket 推送）
│       ├── auth.ts                  # JWT 鉴权（登录 / 中间件 / Token 验证）
│       └── trafficSimulator.ts      # ★ 交通仿真引擎（路网生成 / 车辆移动 / 拥堵计算 / 事件生成）
│
└── README.md                        # 本文件
```

---

## 核心架构

### 数据流

```
┌─────────────────────────────────────────────────────────┐
│                     后端 (localhost:4000)                  │
│                                                         │
│  TrafficSimulator          Express REST API             │
│  ┌─────────────┐           ┌──────────────┐             │
│  │ 路网生成     │           │ POST /login   │ → JWT 令牌   │
│  │ 车辆移动     │           │ GET  /me      │             │
│  │ 拥堵计算     │           │ GET  /trends  │ → 24h 趋势   │
│  │ 事件生成     │           └──────────────┘             │
│  │ 统计聚合     │                                        │
│  └──────┬──────┘           Socket.IO WebSocket           │
│         │ 100ms tick         ┌──────────────┐             │
│         ├──────────────────→ │ traffic:update │ → 全量快照  │
│         │ 800ms snapshot     └──────┬───────┘             │
│         │                          │ 800ms 间隔            │
└─────────┼──────────────────────────┼─────────────────────┘
          │                          │
          ▼                          ▼
┌─────────────────────────────────────────────────────────┐
│                     前端 (localhost:5173)                  │
│                                                         │
│  services/socket.ts         store/trafficStore.ts        │
│  ┌──────────────┐           ┌──────────────┐             │
│  │ connectTraffic │         │ snapshot     │             │
│  │ Socket(token)  │────────→│ trends       │             │
│  │ on('update')   │         └──────┬───────┘             │
│  └──────────────┘                │                      │
│                                  ▼                      │
│  components/dashboard/                                    │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐   │
│  │ CityMap  │ │ LeftPanel │ │RightPanel│ │BottomCards  │   │
│  │ (MapLibre│ │ (指标列表) │ │(AI推理)   │ │ (ECharts)  │   │
│  │  3D地图)  │ └──────────┘ └──────────┘ └────────────┘   │
│  └─────────┘                                             │
└─────────────────────────────────────────────────────────┘
```

### MapLibre 真实道路映射

交通线路不再使用模拟器网格直线，而是从矢量瓦片源 `openmaptiles` 的 `transportation` 源层中提取**真实主干道路几何**（motorway / trunk / primary / secondary / tertiary），将模拟器的拥堵值映射到真实道路坐标上：

```
openmaptiles 矢量源
  → querySourceFeatures('openmaptiles', { sourceLayer: 'transportation' })
  → 过滤 class ∈ {motorway, trunk, primary, secondary, tertiary}
  → 获取真实 LineString 几何
  → 按索引循环分配模拟器拥堵值
  → 染色绘制（绿 < 0.3 / 黄 < 0.6 / 红 ≥ 0.6）
```

车辆和事件点也通过 `pointAlongLine()` 函数吸附到真实道路沿线。

---

## 快速开始

### 环境要求

- **Node.js** ≥ 18
- **npm** ≥ 9（或 pnpm / yarn）
- 现代浏览器（Chrome / Edge / Firefox）

### 安装与运行

```bash
# 1. 克隆项目
cd "3D City Traffic"

# 2. 安装后端依赖
cd server
npm install

# 3. 安装前端依赖
cd ../client
npm install

# 4. 启动后端（终端 1，端口 4000）
cd ../server
npm run dev

# 5. 启动前端（终端 2，端口 5173）
cd ../client
npm run dev
```

打开浏览器访问 **http://localhost:5173/** 即可。

### 演示账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 调度管理员 | `admin` | `admin123` |
| 值班调度员 | `operator` | `op123456` |

---

## 功能模块

### 1. 真实城市 3D 地图（CityMap）

- **底图**：OpenFreeMap `bright` 样式矢量瓦片（道路、水系、街区、中文地名标签）
- **3D 建筑**：OSM 建筑数据 `fill-extrusion` 挤出，按高度渐变着色
- **交通拥堵图层**：沿真实道路绘制绿/黄/红线（发光层 + 主线层），800ms 刷新
- **车辆点位**：吸附到真实道路沿线，伪随机分布，白边圆点
- **事件点位**：吸附到真实道路中点，按严重级别着色（红/黄/蓝）
- **交互**：导航控件（缩放/旋转/俯仰）、比例尺、拖拽/滚轮

### 2. 顶部导航（TopBar）

- 蓝色 Logo + 系统标题
- 浅色胶囊导航条（态势总览 / 事件研判 / 预案调度 / 流量优化）
- 搜索 / 通知 / 设置图标 + 用户头像 + 退出

### 3. 左侧面板（LeftPanel）

- 标题卡（系统名称 + 描述）
- 蓝色告警卡（事件摘要 + 三个操作按钮）
- 4 行指标列表（拥堵指数 / 平均速度 / 重点事件 / 在线资源），带涨跌趋势色

### 4. 右侧面板（RightPanel）

- teal 语音识别图标 + 标题
- 推理进度条
- 左边框步骤列表（声纹输入 → 思考 → 执行），根据实时态势动态生成推理内容

### 5. 底部数据卡片（BottomCards · ECharts）

| 卡片 | 图表类型 | 数据来源 |
|------|---------|---------|
| 路网热力 | 水平条形图 | 拥堵度 Top3 路段 |
| 当前流量 | 折线 + 渐变面积图 | 24h 历史趋势 / 实时流量 |
| 今日均衡 | 环形图 + 图例 | 可调度 / 处理中 / 待命占比 |
| 调度收益 | 3 行指标 | 节省分钟 / 碳排节约 / 资源空转 |
| 恢复进度 | 环形进度图 | 100 - 路网平均拥堵度 |

### 6. 登录页（Login）

- 浅色渐变背景 + 网格线
- 玻璃拟态登录卡片
- 演示账号提示

---

## 仿真引擎说明

后端 `TrafficSimulator` 模拟一个城市路网交通系统：

- **路网**：生成约 220 条道路段（主干道 + 支路），每条含起止坐标、限速、拥堵度
- **车辆**：在道路上移动的车辆（car / bus / truck），含位置、朝向、速度、颜色
- **拥堵**：每条道路的拥堵度 0~1，随车辆密度和时间动态变化
- **事件**：随机生成事故 / 施工 / 故障 / 信号故障，含严重级别和描述
- **统计**：聚合为 `TrafficStats`（拥堵点数、当前流量、平均车速、调度率等）
- **推送节奏**：100ms 推进一次模拟 tick，800ms 推送一次全量快照

### 切换城市

修改 `client/src/components/dashboard/CityMap.tsx` 中的 `CITY_CENTER`：

```typescript
// 北京天安门（默认）
const CITY_CENTER: [number, number] = [116.397428, 39.90923];

// 上海陆家嘴
// const CITY_CENTER: [number, number] = [121.4737, 31.2304];

// 广州天河
// const CITY_CENTER: [number, number] = [113.2644, 23.1291];

// 深圳福田
// const CITY_CENTER: [number, number] = [114.0579, 22.5431];
```

---

## 开发命令

### 前端

```bash
cd client

npm run dev        # 开发服务器（热重载，端口 5173）
npm run build      # 类型检查 + 生产构建（输出到 dist/）
npm run preview    # 预览生产构建
npx tsc --noEmit   # 仅类型检查
```

### 后端

```bash
cd server

npm run dev        # 开发模式（tsx watch 热重载，端口 4000）
npm run build      # 编译 TypeScript（输出到 dist/）
npm start          # 运行编译产物
```

---

## 环境变量

| 变量 | 位置 | 默认值 | 说明 |
|------|------|--------|------|
| `PORT` | server | `4000` | 后端服务端口 |
| `JWT_SECRET` | server | `city-traffic-demo-secret` | JWT 签名密钥（生产环境务必修改） |

可通过 `.env` 文件或环境变量设置。前端通过 Vite proxy 转发 `/api` 和 `/socket.io` 到后端，无需额外配置。

---

## API 接口

### REST API

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/login` | 无 | 登录，返回 JWT 令牌 |
| GET | `/api/me` | Bearer Token | 获取当前用户信息 |
| GET | `/api/trends` | Bearer Token | 获取 24 小时流量趋势数据 |

### WebSocket

| 事件 | 方向 | 频率 | 说明 |
|------|------|------|------|
| `traffic:update` | Server → Client | 800ms | 全量交通快照（路网 + 车辆 + 事件 + 统计） |

连接时需在 `auth` 字段携带 JWT 令牌：

```typescript
io({ auth: { token: 'your-jwt-token' } })
```

---

## 浏览器兼容性

- Chrome / Edge 90+
- Firefox 88+
- Safari 14+

需支持 WebGL 2.0（MapLibre GL JS 3D 渲染要求）。

---

## License

MIT
