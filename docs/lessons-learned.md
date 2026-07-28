# 经验教训

> 项目开发中踩过的坑和积累的经验。按时间倒序。

---

## 2026-07-28 — Supabase Auth 登录流程调试（续）

### 7. Supabase Site URL 必须设为线上地址

**问题：** Magic Link 邮件里的 `redirect_to` 始终是 `http://localhost:5173`，代码里写的 `emailRedirectTo` 没生效。

**根因：** Supabase Dashboard → Authentication → URL Configuration → **Site URL** 默认填了创建项目时的 `localhost:5173`。如果 `emailRedirectTo` 不在允许的 Redirect URL 列表里（或格式不匹配），Supabase 会忽略它，直接用 Site URL 作为回调地址。

**解决：** 将 Site URL 改为 `https://couple-chi-two.vercel.app`，同时确保 Redirect URLs 里包含 `https://couple-chi-two.vercel.app/#/auth-callback`。

**如何避免：** 首次配 Supabase Auth 时，Site URL 和 Redirect URLs 一起改，不要只改一个。

### 8. Hash 路由 + Supabase 回调 = 双 Hash 冲突

**问题：** 修正 Site URL 后，回调能跳转了，但 `getSession()` 拿不到登录态。AuthCallback 以为没登录 → 引导注册 → Register 也检测不到 session → 踢回登录页。

**根因：** Magic Link 回调 URL 格式为：
```
/#/auth-callback#access_token=xxx&refresh_token=xxx
```
Vue Router hash (`#/auth-callback`) 和 Supabase auth hash (`#access_token=xxx`) 混在同一个 URL 里。`detectSessionInUrl` 用 `URLSearchParams` 解析时，`#` 之后的 `access_token` 被当成路由路径的一部分，解析失败。

**解决：**
1. 关掉 `detectSessionInUrl: false`
2. 在 AuthCallback 中手动拆分 hash：
```typescript
const idx = hash.indexOf('access_token=');
const authPart = hash.substring(idx);
const params = new URLSearchParams(authPart);
await supabase.auth.setSession({
  access_token: params.get('access_token'),
  refresh_token: params.get('refresh_token'),
});
```

**如何避免：** 使用 Hash 路由的项目，`detectSessionInUrl` 默认关掉，改为手动解析。不要同时依赖两个 `#` 前缀的 URL 机制。

---

## 2026-07-28 — Vercel 部署 + Supabase Auth 调试

### 1. ESM 导入顺序决定路由表是否为空

**问题：** 生产环境 `Maximum call stack size exceeded`，本地开发正常。

**根因：** `main.ts` 中 `import router from './router'` 在第 5 行，`import './modules/interact'` 在第 15 行。ES 模块按导入顺序求值，`router.ts` 在模块注册前就调用了 `getAllRoutes()`，此时 `moduleRegistry` 为空数组。路由表里没有 `/interact`，导致 `/` → `/interact`（找不到）→ 兜底 `/:pathMatch(.*)*` → `/` → 无限重定向。

**为什么本地不报错：** Vite dev server 的 ESM 加载顺序与 Rollup 生产构建不同，dev 模式下所有导入会预解析。

**解决：** 把所有 `./modules/*` 和样式文件导入移到 `router` 导入之前。任何依赖模块自注册（side-effect registration）的架构，必须确保注册发生在调用方之前。

### 2. VITE_ 环境变量只能在 Vercel 云端构建时使用

**问题：** 部署成功但页面报 `Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL`。

**根因：** CI 中 `vercel pull → vercel build --prod → vercel deploy --prebuilt` 流程在 GitHub Actions 里本地构建，但 `VITE_SUPABASE_URL` 只配在 Vercel 上。构建时 Vite 拿不到环境变量，嵌入空字符串。

**解决：** 改用 `npx vercel deploy --prod --yes` 一步部署，让 Vercel 在自己的服务器上构建——那里才有配好的环境变量。**原则：Vercel 环境变量 ≠ GitHub Actions 环境变量，构建必须在对的机器上执行。**

### 3. .vercel/project.json 必须提交到仓库才能 CI 部署

**问题：** GitHub Actions 中 `vercel pull` 报 `Project not found`。

**根因：** `.vercel/` 整个目录在 `.gitignore` 中。CI 拉代码后没有 `project.json`，`vercel pull` 不知道连哪个项目。用 `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` 环境变量时值配错了，覆盖了也不管用。

**解决：** `.gitignore` 改为只放行 `project.json` 和 `README.txt`（`!.vercel/project.json`），其他 `.vercel/` 内容仍忽略。project.json 只含项目 ID，不含密钥，提交是安全的。

### 4. Supabase Magic Link 回调地址不能用 window.location.origin

**问题：** 手机上点 Magic Link 跳转到 `localhost:5173`，连接被拒绝。

**根因：** `sendMagicLink()` 里 `emailRedirectTo: window.location.origin + '/#/auth-callback'`，本地测试时 origin 是 `http://localhost:5173`。到了手机上 localhost 指向手机自己，不指向电脑。

**解决：** 改为固定线上地址 `https://couple-chi-two.vercel.app/#/auth-callback`，或通过 `VITE_SITE_URL` 环境变量区分环境。

### 5. Supabase Auth 验证域名在国内被墙

**问题：** 手机上点 Magic Link 出现 `ERR_CONNECTION_REFUSED`。

**根因：** Magic Link 流程是「邮箱 → Supabase 验证服务器（`xxx.supabase.co`）→ 你的网站」。Supabase 的验证域名在国内直连不通，即使网站部署在 Vercel（国内可访问）也不行。

**解决：** 两种方案：(A) 开 VPN 点验证链接，登录后不需要；(B) 给 Supabase 配自定义域名跳过墙。后续考虑方案 B。

### 6. Vercel 环境变量和 GitHub Actions Secrets 是两套独立系统

**概念澄清：**
- **Vercel Environment Variables**：配在 Vercel Dashboard → Settings → Environment Variables，仅在 Vercel 构建时可用。用于 `VITE_*` 等前端构建变量。
- **GitHub Actions Secrets**：配在 GitHub → Settings → Secrets and variables → Actions，仅在 CI 运行时可用。用于 `VERCEL_TOKEN` 等部署认证变量。
- 两者互不相通，也不能互相替代。

---

## 2026-07-27 — 阶段 4c 后端接入（Supabase）

### 1. Store 接口不变，只换持久化层

迁移 localStorage → Supabase 的核心原则：**组件层完全不动，Pinia Store 暴露的方法和计算属性签名不变，只改内部实现**。`storage.get()` → `supabase.from().select()`、`storage.set()` → `supabase.from().insert/update/delete()`，机械替换即可。一旦模式建立，8 个 Store 的改造大同小异。

### 2. Supabase Realtime 需要手动 ALTER PUBLICATION

建表后 Realtime 页面不会自动显示新表，必须在 SQL Editor 中执行 `ALTER PUBLICATION supabase_realtime ADD TABLE wishes;` 才能开启实时订阅。这是一个非常不明显的步骤，Supabase 文档也没强调。

### 3. RLS 先关后开

Row Level Security 默认行为取决于创建表时的 Supabase 版本。如果启用 RLS 但没有配置策略，所有查询静默返回空数据（不报错），调了半天才发现是权限问题。**开发阶段全部 DISABLE，功能跑通后再统一配策略。**

### 4. Magic Link 回调需要处理 Hash 路由

小甜豆用 `createWebHashHistory`（`/#/xxx`），Supabase 的 `emailRedirectTo` 必须写成 `window.location.origin + '/#/auth-callback'`。同时 Supabase client 必须配置 `detectSessionInUrl: true`，否则 SDK 不会解析 URL hash 中的 token。

### 5. Supabase client 必须比 app 先初始化

`src/main.ts` 中 `import './lib/supabase'` 必须放在最前面，早于 `createApp()`。否则 Store 在初始化时调用 supabase 会拿到未初始化的实例。**这是依赖顺序问题，不能用懒加载规避。**

### 6. Type 变更的级联修复按依赖顺序来

改了 `User` 接口（`nickname` → `name`、删除 `partnerId` 等）后，所有引用的文件都报 TS 错误。修复顺序：types → store → views → components。跳级修复会导致反复报错。

### 7. 并行 Subagent 可能互相覆盖

同时派 4 个 agent 迁移 4 个 Store 时，有的 agent 顺手修复了不在自己任务范围内的文件，导致后来者发现"工作已被完成"。**多 agent 并行改造相邻文件时，需要明确划分文件边界，或干脆串行。**

### 8. Supabase URL 取 Project URL 而非 REST URL

Settings → API 页面有两个 URL：Project URL（`https://xxxxx.supabase.co`）和 REST API URL（`https://xxxxx.supabase.co/rest/v1/`）。`createClient()` 要的是 Project URL，不要带 `/rest/v1/` 后缀。

### 9. Vite 环境变量必须有 VITE_ 前缀

`import.meta.env.VITE_SUPABASE_URL` 能读到，但 `import.meta.env.SUPABASE_URL`（无前缀）是 `undefined`。Vite 只把 `VITE_` 开头的变量暴露给客户端。

### 10. timestamptz ↔ number 的双向映射

JS 用 `Date.now()`（毫秒数），PostgreSQL 用 `timestamptz`。Store 中需要 `mapRowToXxx()` 函数做双向转换：`new Date(row.created_at).getTime()`（DB→JS）和 `new Date().toISOString()`（JS→DB）。不能混用。

---

## 2026-07-27 — 阶段 5 打磨

### 1. vite-plugin-pwa 比手写 Service Worker 省心得多

Workbox 的 `precacheAndRoute` 自动扫描构建产物生成缓存清单，49 个文件无需手动维护。`registerType: 'autoUpdate'` 自动处理版本更新。**PWA 需求优先用 vite-plugin-pwa，不要手写 sw.js。**

### 2. iOS Safari 的 textarea 字体 < 16px 会触发页面缩放

即使全局设了 `-webkit-text-size-adjust: 100%`，iOS Safari 仍会在 input/textarea 字体 < 16px 时自动放大。解决方案就是硬设 `font-size: 16px`，不依赖 CSS 变量。

### 3. sharp 生成 PWA 图标很方便

从 SVG 一键转 192+512 PNG，用完就卸。比手动找在线工具快，也不需要在项目里持久保留这个依赖。

### 4. overscroll-behavior: none 防止 iOS 橡皮筋

iOS Safari 的弹性滚动（rubberband）会和 Vant 的下拉刷新组件（pull-refresh）冲突，造成双重视觉反馈。全局设 `overscroll-behavior: none` 即可消除。

---

## 2026-07-27 — 阶段 4b 共同日记

### 1. 移动端日期选择：原生 input[type=date] 比 Vant DatePicker 更简单

Vant 4 的 DatePicker 用 `v-model` 绑定 Date 对象，API 比较绕。`<input type="date">` 在移动端浏览器上会唤起系统原生日期选择器，体验一致且零配置。**遇到表单类输入，优先评估原生 HTML 是否能满足需求，不要一上来就用 Vant 组件。**

### 2. 日历跨模块读取日记数据，直接用 localStorage 而非 import store

同阶段 4a 的经验 4。calendar store 通过 `storage.get('diary_entries')` 直接读取日记数据，动态构建 `diaryDateCache`。避免了 calendar → diary 的双向依赖。**跨模块数据消费时，如果只需要"读"不需要"写"，直接用 localStorage 比 import store 更安全。**

### 3. Vue 3 模板支持 Map 遍历

`entriesByDate` 是 `computed(() => Map<string, DiaryEntry[]>)`，模板中可以直接 `v-for="[date, entries] in entriesByDate"`。不需要转成数组再遍历。

---

## 2026-07-27 — 阶段 4a 积分系统

### 1. 计划中的公式要验证真实数据

PointsHome 的"距离下一级"公式写了 `level * 150`，但等级阈值不是等差的（50→150→300→600）。**写计划时优先引用数据源（如 LEVEL_CONFIG），别脑补。**

### 2. Vant 4 的 ActionSheet 只是组件

`showActionSheet()` 函数式调用在 Vant 4 中不存在，只能用 `<van-action-sheet>` 组件 + 响应式状态。

### 3. 新增通知类型时同步更新类型定义

points store 用了新通知类型 `'exchange_request'` / `'exchange_done'`，但 notify/types.ts 的 NotificationType 联合类型没包含，导致类型报错。

### 4. currentUserId 从 localStorage 读，不依赖 user store

跨模块读取当前用户身份时，直接从 `storage.get('currentUserId')` 获取，避免 points → user 的循环依赖。

---

## 2026-07-27 — 阶段 3 互动+日历+主题

### 1. 100dvh 只在壳布局和全屏容器上需要

日历使用正常流布局不依赖视口高度，dvh 修复不是全局必需的。

### 2. 月历自绘比引入第三方库更可控

~20行 JS + ~50 行 CSS 实现完整月历，CSS Grid `repeat(7, 1fr)` + `aspect-ratio: 1`。

### 3. Vue 3 script setup 不支持双 script 块

`<script>` 和 `<script setup>` 混用时，前者的变量不会暴露给模板。工具函数放进 setup 内或提取到 utils/。

### 4. Vite ESM 没有 require()

`type: "module"` 项目只能用 `import()` 做动态加载，`require()` 不可用。

---

## 2026-07-27 — 阶段 2 核心 MVP

### 1. Pinia Store 跨模块通信三方案

| 方案 | 适用场景 |
|------|----------|
| 动态 `import()` | 单向依赖（wish → notify） |
| CustomEvent | 发布/订阅（身份切换 → 多模块刷新） |
| localStorage 读取 | 避免依赖链（points → user） |

### 2. 先 Store 后 UI 的开发顺序

数据层（types + store）先就位，UI 组件开发时有稳定 API + 完整类型提示。

### 3. Mock 种子数据 + localStorage 持久化

首次加载有预设数据，用户操作后不丢失，清缓存即可重置。

---

## 2026-07-26 — 阶段 1 骨架搭建

### 1. Windows 中文路径导致 npm 失败

`TAR_ENTRY_ERROR` / `ENOTEMPTY`。项目路径必须纯英文。

### 2. 移动端必须移除 `user-scalable=no`

影响无障碍体验，违反 WCAG 标准。

### 3. `100vh` 在移动端不准确

浏览器地址栏收缩/展开时 100vh 会跳变，用 `100dvh` 兜底。