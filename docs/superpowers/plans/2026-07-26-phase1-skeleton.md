# 阶段 1：骨架搭建 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建小甜豆 App 完整骨架——Vite + Vue3 + TS + Vant4 + Pinia 项目，模块注册中心，TabBar 框架，主题系统，所有模块占位路由。

**Architecture:** 插件化模块架构，每个功能模块通过 `core/registry.ts` 注册中心统一管理。TabBar 和路由由注册中心自动生成，禁用一个模块不影响其他模块。主题通过 CSS 自定义属性驱动，切换主题无需改动组件代码。

**Tech Stack:** Vue 3.4+ (Composition API + `<script setup>`) / Vite 5 / TypeScript 5 (strict) / Vant 4 / Pinia / Vue Router 4 / Axios

**Project Root:** `E:/homework/开发/Claudecode/couple`

---

## 文件结构（本阶段将创建）

```
src/
├── core/
│   ├── registry.ts          # 模块注册中心
│   ├── storage.ts           # localStorage 封装
│   ├── http.ts              # Axios 封装
│   └── layout/
│       ├── AppShell.vue     # 壳布局（顶栏 + router-view + TabBar）
│       └── TabBar.vue       # 底部导航栏组件
├── modules/
│   ├── interact/            # 互动模块（P1，默认首页 Tab1）
│   │   ├── index.ts
│   │   ├── routes.ts
│   │   ├── store.ts
│   │   ├── types.ts
│   │   └── views/InteractHome.vue
│   ├── wish/                # 心愿墙模块（P0 核心，Tab2）
│   │   ├── index.ts
│   │   ├── routes.ts
│   │   ├── store.ts
│   │   ├── types.ts
│   │   └── views/WishHome.vue
│   ├── calendar/            # 甜蜜日历模块（P1，Tab3）
│   │   ├── index.ts
│   │   ├── routes.ts
│   │   ├── store.ts
│   │   ├── types.ts
│   │   └── views/CalendarHome.vue
│   ├── user/                # 用户模块（P0，Tab4 + 非Tab页）
│   │   ├── index.ts
│   │   ├── routes.ts
│   │   ├── store.ts
│   │   ├── types.ts
│   │   └── views/UserHome.vue
│   ├── theme/               # 主题模块（无路由，仅 store）
│   │   ├── index.ts
│   │   ├── store.ts
│   │   └── types.ts
│   └── notify/              # 通知模块（无路由，仅 store）
│       ├── index.ts
│       ├── store.ts
│       └── types.ts
├── components/
│   ├── HeartButton.vue      # 通用比心按钮
│   └── EmptyState.vue       # 通用空状态组件
├── styles/
│   ├── tokens.css           # CSS 设计变量
│   ├── reset.css            # 浏览器重置
│   └── animations.css       # 全局动效
├── stores/
│   └── app.ts               # 全局应用 Store
├── utils/
│   └── index.ts             # 工具函数
├── mocks/
│   └── index.ts             # Mock 数据
├── App.vue                  # 根组件
├── main.ts                  # 入口文件
├── router.ts                # 路由汇总
└── env.d.ts                 # 类型声明
```

---

### Task 1: 脚手架初始化

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `src/env.d.ts`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "sweet-bean",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.3.0",
    "pinia": "^2.1.0",
    "vant": "^4.8.0",
    "axios": "^1.7.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "typescript": "^5.4.0",
    "vite": "^5.4.0",
    "vue-tsc": "^2.0.0",
    "@vant/auto-import-resolver": "^1.2.0",
    "unplugin-vue-components": "^0.27.0",
    "unplugin-auto-import": "^0.18.0"
  }
}
```

- [ ] **Step 2: 安装依赖**

```bash
cd "E:/homework/开发/Claudecode/couple"
npm install
```

- [ ] **Step 3: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta name="theme-color" content="#FF7A95" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <title>小甜豆</title>
    <link rel="icon" type="image/svg+xml" href="/assets/app-icon.svg" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 4: 创建 vite.config.ts**

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { VantResolver } from '@vant/auto-import-resolver';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [VantResolver()],
    }),
    Components({
      resolvers: [VantResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
```

- [ ] **Step 5: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    },
    "types": ["vite/client"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue", "src/env.d.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 6: 创建 tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 7: 创建 src/env.d.ts**

```ts
/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}
```

- [ ] **Step 8: 验证脚手架能启动**

```bash
npm run dev
```

Expected: Dev server starts on http://localhost:5173 (blank page, no App.vue yet).

- [ ] **Step 9: 提交**

```bash
git add -A
git commit -m "feat: scaffold Vite + Vue3 + TS + Vant project skeleton"
```

---

> **剩余 Task 2-10 的完整代码与上方从旧路径读取的计划一致，仅将项目根路径从 `情侣心愿小程序` 替换为 `couple`。子代理执行时会提供完整任务文本。**
>
> 完整计划参考：`docs/superpowers/plans/2026-07-26-phase1-skeleton.md`

---

## 完成标准

- [ ] `npm run dev` 启动无报错
- [ ] 底部 4 个 Tab（互动/心愿/日历/我的）正常切换
- [ ] 顶栏标题随路由变化
- [ ] 禁用某模块后 TabBar 自动跳过，路由不注册
- [ ] 主题变量通过 CSS 自定义属性全局生效
- [ ] `vue-tsc --noEmit` 无类型错误
- [ ] `vite build` 构建成功