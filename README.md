# 🫘 小甜豆（Sweet Bean）

> 情侣心愿小程序 —「让对方知道你今天想被宠爱」

一个让情侣每天写下"希望对方为自己做的事"，并彼此响应、点亮甜蜜日常的移动端 Web 应用。

---

## 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | Vue 3.4+（Composition API + `<script setup>`） |
| 构建 | Vite 5 |
| 语言 | TypeScript 5（strict 模式） |
| UI 库 | Vant 4（自动按需引入） |
| 状态管理 | Pinia |
| 路由 | Vue Router 4（Hash 模式） |
| HTTP | Axios |
| 存储 | localStorage（`core/storage.ts` 封装） |

---

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

---

## 项目结构

```
src/
├── core/                        # 核心基础设施
│   ├── registry.ts              # 模块注册中心（零侵入增删模块）
│   ├── storage.ts               # localStorage 类型安全封装
│   ├── http.ts                  # Axios 请求封装（拦截器/错误处理）
│   └── layout/
│       ├── AppShell.vue         # 壳布局（NavBar + router-view + TabBar）
│       └── TabBar.vue            # 底部导航栏（自动从注册中心生成）
├── modules/                     # 功能模块（插件化架构）
│   ├── interact/                # 互动模块（Tab 1，默认首页）
│   ├── wish/                    # 心愿墙模块（Tab 2，核心功能）
│   ├── calendar/                # 甜蜜日历模块（Tab 3）
│   ├── user/                    # 用户模块（Tab 4 + 绑定页）
│   ├── theme/                   # 主题模块（无路由，全局主题切换）
│   └── notify/                  # 通知模块（无路由，消息管理）
├── components/                  # 全局通用组件
│   ├── HeartButton.vue          # 比心按钮（带动效）
│   └── EmptyState.vue           # 空状态占位组件
├── styles/                      # 全局样式
│   ├── tokens.css               # CSS 设计变量（3 套主题）
│   ├── reset.css                # 浏览器重置 + Vant 覆盖
│   └── animations.css           # 全局关键帧动画
├── App.vue                      # 根组件
├── main.ts                      # 入口文件
├── router.ts                    # 路由汇总
└── env.d.ts                     # 类型声明
```

---

## 架构特点

### 插件化模块架构

每个功能模块通过 `core/registry.ts` 注册中心统一挂载。**禁用某模块只需将 `enabled` 设为 `false`，不影响其他模块。**

```ts
// 模块自注册（如 src/modules/wish/index.ts）
registerModule({
  id: 'wish',
  name: '心愿',
  icon: 'like-o',
  routes: wishRoutes,
  tabBar: true,
  tabOrder: 2,
  enabled: true,  // ← 改为 false 即可禁用
});
```

TabBar 和路由由注册中心**自动生成**，无需手动维护。

### 主题系统

通过 CSS 自定义属性驱动，3 套主题随时切换：

- 🍓 **草莓粉**（默认）— `#FF7A95`
- 🫐 **蓝莓蓝** — `#7A9EFF`
- 🍋 **柠檬黄** — `#FFB84D`

切换主题只需设置 `data-theme` 属性，组件代码零改动。

---

## 开发阶段

| 阶段 | 内容 | 状态 |
|------|------|:--:|
| 阶段 1 | 骨架搭建 — 项目初始化、注册中心、TabBar、主题、占位页面 | ✅ 完成 |
| 阶段 2 | 核心 MVP — 登录绑定、心愿发布/响应、通知 | 📋 待开始 |
| 阶段 3 | 互动增强 — 贴纸、点赞、日历视图 | 📋 待开始 |
| 阶段 4 | 扩展 — 积分系统、共同日记、后端接入 | 📋 待开始 |
| 阶段 5 | 打磨 — 真机适配、PWA、性能优化 | 📋 待开始 |

---

## 更新日志

### 2026-07-26 — 阶段 1 完成

- `feat`: Vite + Vue3 + TS + Vant 4 + Pinia 项目脚手架初始化
- `feat`: CSS 设计变量（3 套主题）、全局样式重置、关键帧动画库
- `feat`: 核心基础设施 — 模块注册中心、localStorage 封装、Axios 封装
- `feat`: TabBar 底部导航（自动从注册中心生成）+ AppShell 壳布局
- `feat`: 6 个模块占位页面 — interact / wish / calendar / user / theme / notify
- `feat`: 全局组件 — HeartButton（比心按钮）、EmptyState（空状态）
- `feat`: 路由总装，Hash 模式，路由懒加载

---

## 许可证

MIT