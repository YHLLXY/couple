# 阶段 1：骨架搭建 — 设计文档

> 文档版本：v1.0 | 日期：2026-07-26 | 项目：小甜豆（情侣心愿小程序）

---

## 一、决策记录

| 决策点 | 结论 | 备选方案 |
|--------|------|----------|
| 技术栈 | Vue 3 + Vite + Vant 4 + Pinia + TypeScript | React + Ant Design Mobile / 微信原生 |
| TabBar 顺序 | 互动 → 心愿 → 日历 → 我的 | 心愿排第一（已否决） |
| 架构模式 | 插件化模块 + 注册中心 | 传统路由集中配置 |
| 主题方案 | CSS 自定义属性（tokens.css） | CSS-in-JS / Tailwind |
| 数据层 MVP | Mock + localStorage（`core/storage.ts` 封装） | 直接操作用户提供的后端 |

---

## 二、目录结构（阶段 1 实际创建）

```
couple/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── public/
│   └── assets/                          # 静态资源
├── src/
│   ├── core/
│   │   ├── registry.ts                  # 模块注册中心
│   │   ├── storage.ts                   # localStorage 封装
│   │   ├── http.ts                      # 请求封装（axios）
│   │   └── layout/
│   │       ├── AppShell.vue             # 壳布局（顶栏 + 内容 + TabBar）
│   │       └── TabBar.vue               # 底部导航栏
│   ├── modules/
│   │   ├── user/
│   │   │   ├── index.ts                 # 模块注册信息
│   │   │   ├── routes.ts                # 路由声明
│   │   │   ├── store.ts                 # Pinia store
│   │   │   ├── types.ts                 # 类型定义
│   │   │   └── views/
│   │   │       └── UserHome.vue         # 占位页
│   │   ├── wish/
│   │   │   ├── index.ts
│   │   │   ├── routes.ts
│   │   │   ├── store.ts
│   │   │   ├── types.ts
│   │   │   └── views/
│   │   │       └── WishHome.vue         # 占位页
│   │   ├── interact/
│   │   │   ├── index.ts
│   │   │   ├── routes.ts
│   │   │   ├── store.ts
│   │   │   ├── types.ts
│   │   │   └── views/
│   │   │       └── InteractHome.vue     # 占位页（默认首页）
│   │   ├── calendar/
│   │   │   ├── index.ts
│   │   │   ├── routes.ts
│   │   │   ├── store.ts
│   │   │   ├── types.ts
│   │   │   └── views/
│   │   │       └── CalendarHome.vue     # 占位页
│   │   ├── theme/
│   │   │   ├── index.ts
│   │   │   ├── store.ts
│   │   │   └── types.ts
│   │   └── notify/
│   │       ├── index.ts
│   │       ├── store.ts
│   │       └── types.ts
│   ├── components/                      # 全局通用组件
│   │   ├── HeartButton.vue
│   │   └── EmptyState.vue
│   ├── styles/
│   │   ├── tokens.css                   # CSS 设计变量
│   │   ├── reset.css                    # 浏览器重置
│   │   └── animations.css              # 全局动效
│   ├── stores/                          # 全局 Pinia store
│   ├── utils/                           # 工具函数
│   ├── mocks/                           # Mock 数据
│   ├── App.vue
│   ├── main.ts
│   └── router.ts
└── docs/
    ├── DECISIONS.md
    ├── 实施计划.md
    └── superpowers/
        └── specs/
            └── 2026-07-26-phase1-skeleton-design.md  # 本文档
```

---

## 三、核心机制

### 3.1 模块注册中心（`core/registry.ts`）

```ts
export interface ModuleManifest {
  id: string;
  name: string;
  icon?: string;
  routes: RouteRecordRaw[];
  store?: any;
  tabBar?: boolean;
  tabOrder?: number;
  enabled: boolean;
}

const moduleRegistry: ModuleManifest[] = [];

export function registerModule(m: ModuleManifest) {
  moduleRegistry.push(m);
}

export function getEnabledModules(): ModuleManifest[] {
  return moduleRegistry.filter(m => m.enabled);
}

export function getTabBarModules(): ModuleManifest[] {
  return getEnabledModules()
    .filter(m => m.tabBar)
    .sort((a, b) => (a.tabOrder ?? 99) - (b.tabOrder ?? 99));
}
```

### 3.2 模块注册示例（以 interact 模块为例）

```ts
// src/modules/interact/index.ts
import { registerModule } from '@/core/registry';
import { interactRoutes } from './routes';

registerModule({
  id: 'interact',
  name: '互动',
  icon: 'chat-o',
  routes: interactRoutes,
  tabBar: true,
  tabOrder: 1,
  enabled: true,
});
```

### 3.3 TabBar 自动生成

`AppShell.vue` 从 `getTabBarModules()` 读取可用的 Tab 模块，自动渲染底部导航栏。增删模块无需修改 AppShell。

---

## 四、路由设计

| 路径 | 模块 | Tab | 说明 |
|------|------|-----|------|
| `/` | - | - | 重定向到 `/interact` |
| `/interact` | interact | 第 1 个 | 默认首页（占位） |
| `/wish` | wish | 第 2 个 | 心愿墙（占位） |
| `/calendar` | calendar | 第 3 个 | 甜蜜日历（占位） |
| `/mine` | user | 第 4 个 | 个人中心（占位） |
| `/user/bind` | user | 无 | 情侣绑定页 |
| `/settings` | - | 无 | 设置页 |

---

## 五、主题系统

### 5.1 设计变量（`tokens.css`）

```css
:root {
  --color-primary:        #FF7A95;
  --color-primary-light:  #FFEEF3;
  --color-secondary:      #FFB17A;
  --color-accent:         #7AE0C4;
  --color-bg:             #FFF8F2;
  --color-card:           #FFEEF3;
  --color-surface:        #FFFFFF;
  --color-text-primary:   #4A3A3A;
  --color-text-secondary: #A89A9A;
  --color-danger:         #FF5A5A;
  --color-success:        #7AE0C4;
  --radius-sm:            8px;
  --radius-md:            16px;
  --radius-full:          999px;
  --shadow-card:          0 2px 12px rgba(255,122,149,0.12);
  --shadow-elevated:      0 4px 20px rgba(255,122,149,0.18);
  --font-family:          'PingFang SC', 'HarmonyOS Sans', system-ui;
  --font-size-sm:         12px;
  --font-size-base:       14px;
  --font-size-lg:         18px;
  --font-size-xl:         22px;
  --ease-out:             cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast:        200ms;
  --duration-normal:      300ms;
}
```

### 5.2 切换主题

替换 `:root` 下对应变量即可，组件代码零改动。

---

## 六、阶段 1 交付标准

- [ ] Vite + Vue 3 + TS + Vant 4 + Pinia 项目初始化成功
- [ ] `npm run dev` 正常启动
- [ ] `core/` 模块完整：registry、storage、http、AppShell、TabBar
- [ ] 5 个模块目录 + 注册信息全部就位
- [ ] TabBar 显示 4 个标签：互动 / 心愿 / 日历 / 我的
- [ ] 每个 Tab 点击切换到对应占位页面
- [ ] 主题 tokens.css 生效，全局颜色统一走变量
- [ ] 禁用某模块的 `enabled` 后，TabBar 和路由自动跳过
- [ ] TypeScript strict 模式，无 `any` 滥用

---

## 七、不在阶段 1 范围内

- 真实登录 / 绑定功能（阶段 2）
- 心愿发布 / 响应（阶段 2）
- 互动贴纸 / 点赞（阶段 3）
- 日历视图（阶段 3）
- 积分系统（阶段 4）
- 共同日记（阶段 4）
- 真机适配 / PWA（阶段 5）
- 真实后端接入（阶段 4）