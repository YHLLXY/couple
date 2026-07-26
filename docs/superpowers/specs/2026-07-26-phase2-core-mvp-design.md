# 阶段 2：核心 MVP — 设计文档

> 文档版本：v1.0 | 日期：2026-07-26 | 项目：小甜豆（情侣心愿小程序）

---

## 一、目标

跑通完整核心流程「小 A 发心愿 → 小 B 接单 → 小 A 确认完成」。

**MVP 交付标准**：一台手机上通过身份切换，演示完整双人心愿交互闭环。

---

## 二、设计决策

| 决策点 | 结论 | 说明 |
|--------|------|------|
| 身份模式 | 临时身份切换器（MVP），数据模型预留 fromUserId/toUserId（后期接真实登录） | 底层数据结构不用改，后期只换 UI 层 |
| 心愿墙布局 | 双列卡片瀑布流 | 按状态分色标，已完成卡片盖章效果 |
| 发心愿 | 完整模式：文字 + 分类 + 优先级 + 配图 + 匿名 | 50 字限制，6 个分类标签，3 档优先级 |
| 通知 | App 内通知中心 + 浏览器推送（可选增强） | 通知保留 30 天自动清理 |

---

## 三、模块改动清单

### 3.1 wish 模块（重点重写）

**新增/改动文件**：

| 文件 | 操作 | 说明 |
|------|:--:|------|
| `types.ts` | 保留 | 阶段 1 已定义 Wish/WishStatus/等类型，无需改动 |
| `store.ts` | 重写 | 新增 Mock 心愿数据、完整 CRUD、状态流转逻辑 |
| `routes.ts` | 改动 | 新增 `/wish/create` 发心愿路由 |
| `index.ts` | 不改 | 注册信息无变化 |
| `views/WishHome.vue` | 重写 | 占位页 → 完整卡片墙 |
| `views/WishCreate.vue` | 新建 | 发心愿表单页 |
| `components/WishCard.vue` | 新建 | 单张心愿卡片组件 |
| `components/WishActionSheet.vue` | 新建 | 心愿操作面板（接单/留言/延期/完成） |

**心愿状态机**（不变，沿用阶段 1 设计）：
```
pending → accepted → done
pending → postponed → pending（回到待响应）
pending → ignored（结束）
accepted → done
```

**响应操作矩阵**：

| 状态 | 接单 | 留言 | 延期 | 完成 | 删除 |
|------|:--:|:--:|:--:|:--:|:--:|
| 待响应 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 已接单 | — | ✅ | ✅ | ✅ | — |
| 已完成 | — | ✅ | — | — | ✅ |

### 3.2 user 模块

| 文件 | 操作 | 说明 |
|------|:--:|------|
| `types.ts` | 保留 | 已有 User 类型 |
| `store.ts` | 增强 | 新增 Mock 用户数据（小兔子/小熊）、身份切换逻辑、localStorage 持久化当前身份 |
| `routes.ts` | 不改 | 路由无变化 |
| `views/UserHome.vue` | 重写 | 展示当前用户信息 + 情侣绑定状态 |
| `components/IdentitySwitcher.vue` | 新建 | 底部弹出身份切换面板 |

### 3.3 notify 模块

| 文件 | 操作 | 说明 |
|------|:--:|------|
| `types.ts` | 保留 | 已有 AppNotification 类型 |
| `store.ts` | 增强 | 新增自动生成通知逻辑（心愿状态变更时触发）、浏览器推送封装 |
| `routes.ts` | 不改 | 无路由 |
| `views/NotifyCenter.vue` | 新建 | 通知列表页面（AppShell 顶栏铃铛入口） |

### 3.4 全局改动

| 文件 | 操作 | 说明 |
|------|:--:|------|
| `router.ts` | 改动 | 新增 `/wish/create`、`/notify` 路由 |
| `AppShell.vue` | 改动 | 顶栏右侧加通知铃铛（含未读数字） |
| `modules/interact/` | 不改 | 阶段 3 才改 |
| `modules/calendar/` | 不改 | 阶段 3 才改 |
| `modules/theme/` | 不改 | 正常工作即可 |
| `core/` | **完全不改** | 注册中心、存储、HTTP 无任何变动 |

---

## 四、页面与交互设计

### 4.1 心愿卡片墙（WishHome）

- **布局**：双列 CSS Grid 瀑布流，Vant PullRefresh 下拉刷新
- **顶部筛选栏**：全部 / 待响应 / 进行中 / 已完成 四个标签
- **卡片内容**：分类标签（彩色）+ 状态徽章（右上角）+ 文字内容 + 发心人（头像+时间）+ 优先级图标
- **已完成卡片**：背景渐变淡化、文字删除线、右上角盖章效果
- **右下角**：「+ 发心愿」悬浮按钮（Vant FloatingBubble）
- **空状态**：已有 EmptyState 组件直接复用

### 4.2 发心愿页（WishCreate）

- **入口**：卡片墙右下角悬浮按钮
- **表单字段**：
  - 文字输入（textarea，50 字限制，实时计数）
  - 分类选择（6 个圆角标签，多选一，必填）
  - 优先级（3 档：普通/小急/小浪漫，默认普通）
  - 配图（可选，最多 1 张，Vant Uploader）
  - 匿名开关（Vant Switch）
- **模板区**：内置 5-8 个模板，点击一键填入文字
- **提交后**：Toast 成功提示 → 自动返回卡片墙 → 新卡片出现在顶部

### 4.3 心愿操作面板（WishActionSheet）

- **触发**：点击卡片
- **形式**：Vant ActionSheet 底部弹出
- **顶部**：显示选中的心愿摘要
- **菜单项**（按状态动态显示/隐藏）：
  - 🤗 我来完成（接单）
  - 💬 留言聊聊
  - ⏰ 改天再做（延期）
  - 💕 小惊喜！已完成（直接完成 + 可附照片/一句话证明）
- **「小惊喜」**选项特殊样式（渐变粉色背景），是核心甜蜜体验的亮点

### 4.4 身份切换器（IdentitySwitcher）

- **位置**：NavBar 左侧 logo 旁边显示当前身份头像 + 名称
- **触发**：点击当前身份区域 → 底部弹出切换面板
- **面板内容**：
  - 两个预设身份：小兔子（我）+ 小熊（TA）
  - 当前身份打勾标识
  - 「+ 添加新身份」预留入口
- **切换后自动**：卡片墙刷新、通知刷新、「我的」页面刷新
- **切换动效**：300ms 淡入淡出

### 4.5 通知中心（NotifyCenter）

- **入口**：NavBar 右侧铃铛图标 + 未读数字红点
- **页面布局**：列表形式，每条通知左色标（按类型区分）
- **通知类型**：
  - 粉色：新心愿 / 接单
  - 绿色：已完成
  - 灰色（已读）：留言
- **交互**：
  - 点击通知 → 跳转到对应心愿卡片（滚动定位）
  - 「全部已读」按钮
  - 未读通知有蓝色小圆点
- **浏览器推送**（可选增强）：
  - 使用 Web Notification API
  - 首次使用时请求权限
  - 不支持时静默降级（不崩溃）
  - 用户可在设置中关闭

---

## 五、Mock 数据设计

### 5.1 预设用户

```ts
const USERS = {
  a: { id: 'user_a', nickname: '小兔子', avatar: '🐰', partnerId: 'user_b', coupleCode: 'SWEET99', createdAt: Date.now() },
  b: { id: 'user_b', nickname: '小熊',   avatar: '🐻', partnerId: 'user_a', coupleCode: 'SWEET99', createdAt: Date.now() },
};
```

### 5.2 预设心愿

至少 4 条（覆盖各状态）：1 条待响应 / 1 条已接单 / 1 条已完成 / 1 条已延期。附完整的 fromUserId、toUserId、分类、优先级。

### 5.3 存储策略

- 心愿数据：`localStorage`（`sweetbean_wishes`），初始化时写入预设数据
- 当前身份：`localStorage`（`sweetbean_current_user`）
- 通知数据：`localStorage`（`sweetbean_notifications`）
- 30 天后自动清理已读通知（每次写入时检查）

---

## 六、不在阶段 2 范围内

- ❌ 真实登录 / OAuth / 微信授权
- ❌ 留言功能（按钮占位，不实现对话框）
- ❌ 图片实际上传（仅 UI 展示，存储 base64 或占位 URL）
- ❌ 日历视图
- ❌ 互动贴纸 / 比心
- ❌ 积分系统
- ❌ 后端接入

---

## 七、完成标准

- [ ] `npm run dev` 正常启动
- [ ] 卡片墙展示所有心愿，状态筛选正常工作
- [ ] 发心愿表单完整可用，提交后卡片墙更新
- [ ] 身份切换器正常工作，切换后卡片墙区分"我发的"和"TA 发的"
- [ ] 点击卡片弹出操作面板，接单 → 完成流程通畅
- [ ] 通知中心实时更新，点击跳转对应心愿
- [ ] 浏览器推送功能可用（或在不可用时静默降级）
- [ ] `vue-tsc --noEmit` 零错误
- [ ] `vite build` 成功

---

## 八、文件结构（阶段 2 完成后）

```
src/
├── modules/
│   ├── wish/
│   │   ├── index.ts              # 不改
│   │   ├── routes.ts             # 改动 +/wish/create
│   │   ├── store.ts              # 重写
│   │   ├── types.ts              # 不改
│   │   ├── views/
│   │   │   ├── WishHome.vue      # 重写（卡片墙）
│   │   │   └── WishCreate.vue    # 新建
│   │   └── components/
│   │       ├── WishCard.vue      # 新建
│   │       └── WishActionSheet.vue # 新建
│   ├── user/
│   │   ├── store.ts              # 增强
│   │   ├── views/
│   │   │   └── UserHome.vue      # 重写
│   │   └── components/
│   │       └── IdentitySwitcher.vue # 新建
│   ├── notify/
│   │   ├── store.ts              # 增强
│   │   └── views/
│   │       └── NotifyCenter.vue  # 新建
│   └── (interact/calendar/theme 不改)
├── core/                         # 完全不改
├── router.ts                     # 改动（新增路由）
└── core/layout/AppShell.vue      # 改动（通知铃铛）
```

**设计文档结束。**