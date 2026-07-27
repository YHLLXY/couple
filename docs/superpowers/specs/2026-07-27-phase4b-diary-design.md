# 阶段 4b：共同日记 — 设计文档

> 为小甜豆（Sweet Bean）情侣小程序新增共同日记模块。遵循现有插件化架构，纯前端 localStorage 存储。

---

## 一、功能概述

情侣共享一本日记。默认所有人可见，可标记某条为「私密」仅自己可见。文字 + Emoji，暂不上图片（`images` 字段预留）。日记日期在甜蜜日历中标出。

---

## 二、模块结构

新建 `src/modules/diary/`：

```
diary/
├── index.ts              # 模块注册（无 TabBar）
├── types.ts              # DiaryEntry 类型定义
├── store.ts              # Pinia store + localStorage 持久化 + 种子数据
├── routes.ts             # 2 条路由
├── views/
│   ├── DiaryHome.vue     # 日记主页 — 时间线列表
│   └── DiaryWrite.vue    # 写/编辑日记页
└── components/
    └── DiaryCard.vue     # 时间线卡片组件
```

**改动已有文件：**

| 文件 | 改动 |
|------|------|
| `src/modules/user/views/UserHome.vue` | 菜单加「📔 共同日记」入口（`to="/diary"`） |
| `src/modules/calendar/types.ts` | `CalendarDay` 加 `hasDiary: boolean` |
| `src/modules/calendar/store.ts` | 动态 `import('@/modules/diary/store')` 读取日记日期列表 |

---

## 三、数据模型

```typescript
// src/modules/diary/types.ts

export interface DiaryEntry {
  id: string;
  content: string;           // 文字内容（含 emoji Unicode）
  images: string[];          // 预留：图片 base64，暂不使用
  authorId: string;          // 'user_a' | 'user_b'
  isPrivate: boolean;        // 🔒 私密，仅作者可见
  createdAt: number;         // 时间戳
  updatedAt?: number;
}
```

**种子数据**：3-4 条预设日记，覆盖两个作者、非私密，模拟真实使用场景。

---

## 四、Store 设计

```typescript
// useDiaryStore
{
  // 状态
  entries: DiaryEntry[]     // localStorage 持久化，key: 'diary_entries'

  // 计算属性
  visibleEntries(userId)    // 过滤掉其他人的私密条目
  entriesByDate(date)       // 按日期分组，供日历读取
  diaryDates                // Set<string>，有日记的日期集合

  // 方法
  addEntry(content, date, isPrivate)  // 新增
  updateEntry(id, content, isPrivate) // 编辑
  deleteEntry(id)                      // 删除
}
```

**日历联动**：`calendar/store.ts` 中动态 `import` diary store，读取 `diaryDates`，在计算 `CalendarDay` 时标记 `hasDiary`。

---

## 五、路由

| 路径 | 页面 | 说明 |
|------|------|------|
| `/diary` | DiaryHome | 时间线列表，支持 `?date=2026-07-27` 参数 |
| `/diary/write` | DiaryWrite | 写日记，支持 `?date=`（新建）或 `?id=`（编辑） |

路由注册在 `diary/routes.ts`，两个路由均带 `showBack: true`。

---

## 六、页面设计

### 6.1 DiaryHome（日记主页）

- 顶部：标题「共同日记」+ 右上角「写日记」按钮（跳转 `/diary/write`）
- 主体：时间线列表，按日期倒序
  - 同一天多条日记归到同一个日期头下
  - 日期头格式：「7 月 27 日」
  - 每条日记一张 DiaryCard：作者头像 + 昵称 + 文字预览（最多 3 行，超出省略）+ 时间 + 私密标记
  - 点击卡片 → `/diary/write?id=xxx`
- 空状态：EmptyState 组件「还没有写过日记」
- 支持 `?date=` 参数：从日历跳转过来时自动滚动到对应日期

### 6.2 DiaryWrite（写/编辑日记）

- 顶部：返回按钮 + 标题（「写日记」或「编辑日记」）+ 完成按钮
- 日期行：显示日期 + 修改日期按钮（Vant DatetimePicker）
  - 新建时默认今天，编辑时显示原日期
- 编辑区：`<textarea>`，无字数限制，placeholder 为「今天发生了什么有趣的事...」
- Emoji 面板：简单的 emoji 网格选择器（预设 30-50 个常用 emoji），点击插入光标位置
- 底部：`<van-switch>` ——「🔒 标记为私密」
- 编辑模式：从 store 读取已有条目预填表单
- 保存后自动 `router.back()`

### 6.3 DiaryCard（日记卡片）

```
┌──────────────────────────────────┐
│ 🐰 小兔子                    🔒 │
│ 今天一起去吃了火锅，好开心啊，  │
│ 然后又去看了电影，完美的一天... │
│ 2026-07-27 14:30                │
└──────────────────────────────────┘
```

- 点击 → `/diary/write?id=xxx`
- 私密条目在别人视角下完全不展示（store 层过滤）

---

## 七、日历联动

### calendar/types.ts

```typescript
export interface CalendarDay {
  date: string;
  hasWishes: boolean;
  bothCheckedIn: boolean;
  hasAnniversary: boolean;
  hasDiary: boolean;       // ← 新增
}
```

### calendar/store.ts

在生成日历数据时，动态读取 diary store 的 `diaryDates`：
```typescript
const diaryDates = await getDiaryDates();  // 动态 import diary store
// 遍历日期时标记 hasDiary = diaryDates.has(dateStr)
```

### CalendarHome.vue

日期详情弹窗中，若 `hasDiary` 为 true，显示「📔 查看日记」链接，点击跳转 `/diary?date=<该天日期>`。

---

## 八、入口

### UserHome.vue 菜单

在现有菜单列表中插入：

```html
<van-cell title="📔 共同日记" is-link to="/diary" />
```

放在「🪙 积分中心」下方。

---

## 九、边界情况

| 场景 | 处理 |
|------|------|
| 用户删除自己的日记 | 直接删除，`router.back()` |
| 用户尝试编辑对方的日记 | 不展示编辑入口（卡片点击后判断 authorId） |
| 私密日记切换身份 | store 的 `visibleEntries` 根据当前用户过滤 |
| 从日历跳转的日期没有日记 | 正常显示列表，只是那天没有卡片 |
| localStorage 无数据 | 种子数据自动初始化 |

---

## 十、技术约束

- 纯前端，localStorage 持久化，不涉及 HTTP
- Vue 3 + Pinia + Vant 4，遵循现有插件化架构
- `registry.ts` 中 `tabBar: false`（不占底部导航）
- 跨模块通信使用动态 `import()` 模式（避免循环依赖）