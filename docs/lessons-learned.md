# 经验教训

> 项目开发中踩过的坑和积累的经验。按时间倒序。

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