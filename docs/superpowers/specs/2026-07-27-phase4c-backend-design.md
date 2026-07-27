# 阶段 4c 后端接入 — 设计文档

> 从 localStorage 迁移到 Supabase PostgreSQL，实现真实数据持久化和用户间共享。

**日期：** 2026-07-27  
**当前状态：** 所有 8 个 Pinia Store 使用 `core/storage.ts` → localStorage  
**目标：** 接入 Supabase，替换持久化层，Pinia Store 接口不变

---

## 一、架构总览

```
┌─────────────────────────────────────┐
│  Vue 3 前端（不变，仍部署在 Vercel）  │
│  Pinia Stores（接口不变）             │
│  supabase-js 客户端（替换 storage.ts）│
└──────────────┬──────────────────────┘
               │ HTTPS
               ▼
┌──────────────────────────────────────┐
│  Supabase Cloud                      │
│  ┌─────────┐ ┌──────────┐ ┌───────┐ │
│  │  Auth   │ │PostgreSQL│ │Storage│ │
│  │Magic Link│ │  + RLS  │ │ 图片  │ │
│  └─────────┘ └──────────┘ └───────┘ │
│         ┌──────────────┐             │
│         │  Realtime    │             │
│         │  WebSocket   │             │
│         └──────────────┘             │
└──────────────────────────────────────┘
```

**核心原则：三层架构，只换持久化层。**

```
组件层          WishCreate.vue  →  调用 store.addWish()    ← 代码不动
Store 层       wish/store.ts   →  内部改用 supabase API   ← 集中改造
持久化层        supabase.js     →  发 HTTP 请求到 Supabase  ← 新建
```

## 二、技术选型

| 维度 | 选型 | 原因 |
|------|------|------|
| BaaS | Supabase | PostgreSQL + Auth + Realtime + Storage 一体 |
| 数据库 | PostgreSQL 15 | Supabase 托管 |
| Auth | Magic Link（邮箱链接登录） | 无需密码，手机 PWA 友好 |
| 客户端 SDK | `@supabase/supabase-js` v2 | 官方 JS SDK |
| 实时推送 | Supabase Realtime (WebSocket) | 心愿/日记变更实时同步 |

## 三、用户体系

### 3.1 登录流程

```
用户输入邮箱 → Supabase 发送 Magic Link 邮件
用户点击邮件链接 → 自动跳回 PWA → 已登录
```

Supabase 内置支持，前端调用 `supabase.auth.signInWithOtp({ email })` 即可。

### 3.2 情侣绑定

```
小兔子（先注册者）→ 进入 App → 生成 6 位绑定码
小熊注册后 → 输入小兔子的绑定码 → 两人关联到同一 couple_id
```

绑定码生成逻辑：保存在 `couples` 表的 `invite_code` 字段，6 位随机数字。用户 B 输入后，将其 `couple_id` 更新为相同值。

### 3.3 安全策略（RLS）

所有核心表启用 Row Level Security，规则：`(auth.uid() IN (SELECT id FROM users WHERE couple_id = table.couple_id))` — 只有同一对情侣的用户能读写彼此的关联数据。

## 四、数据库设计

### 所有表都包含 `couple_id` 用于数据隔离和 RLS 强制检查。
### 原 `number` 时间戳统一改为 `timestamptz`（PostgreSQL 原生类型，查询方便）。
### 主键保留 `text` 类型，与前端 ID 格式一致，组件无需修改。

```sql
-- ========== 用户与关系 ==========

CREATE TABLE couples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code text NOT NULL,           -- 6 位绑定邀请码
  created_at timestamptz DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text NOT NULL DEFAULT '',        -- 昵称（小兔子/小熊）
  avatar text NOT NULL DEFAULT '🐰',    -- 头像 emoji
  couple_id uuid REFERENCES couples(id),
  created_at timestamptz DEFAULT now()
);

-- ========== 心愿 ==========

CREATE TABLE wishes (
  id text PRIMARY KEY,
  couple_id uuid NOT NULL REFERENCES couples(id),
  from_user_id uuid NOT NULL REFERENCES users(id),
  to_user_id uuid NOT NULL REFERENCES users(id),
  content text NOT NULL,
  category text NOT NULL DEFAULT 'other',   -- food/chore/romance/company/surprise/other
  priority text NOT NULL DEFAULT 'normal',  -- normal/urgent/romantic
  status text NOT NULL DEFAULT 'pending',   -- pending/accepted/done/postponed/ignored
  image_url text,
  proof_image_url text,
  proof_note text,
  completed_at timestamptz,
  expire_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ========== 日记 ==========

CREATE TABLE diary_entries (
  id text PRIMARY KEY,
  couple_id uuid NOT NULL REFERENCES couples(id),
  author_id uuid NOT NULL REFERENCES users(id),
  content text NOT NULL,
  is_private boolean DEFAULT false,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ========== 签到 ==========

CREATE TABLE checkins (
  id text PRIMARY KEY,
  couple_id uuid NOT NULL REFERENCES couples(id),
  user_id uuid NOT NULL REFERENCES users(id),
  check_date date NOT NULL DEFAULT CURRENT_DATE,
  streak int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- ========== 贴纸 ==========

CREATE TABLE stickers (
  id text PRIMARY KEY,
  couple_id uuid NOT NULL REFERENCES couples(id),
  from_user_id uuid NOT NULL REFERENCES users(id),
  sticker_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ========== 积分 ==========

CREATE TABLE points (
  id text PRIMARY KEY,
  couple_id uuid NOT NULL REFERENCES couples(id),
  user_id uuid NOT NULL REFERENCES users(id),
  amount int NOT NULL,                 -- +20 或 -50
  reason text NOT NULL,                -- wish_done/checkin/sticker/redeem
  created_at timestamptz DEFAULT now()
);

-- ========== 奖励 ==========

CREATE TABLE rewards (
  id text PRIMARY KEY,
  couple_id uuid NOT NULL REFERENCES couples(id),
  name text NOT NULL,
  cost int NOT NULL,
  status text NOT NULL DEFAULT 'pending',  -- pending/claimed/done
  claimed_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- ========== 通知 ==========

CREATE TABLE notifications (
  id text PRIMARY KEY,
  couple_id uuid NOT NULL REFERENCES couples(id),
  user_id uuid NOT NULL REFERENCES users(id),  -- 接收者
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  related_wish_id text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

## 五、前端改造策略

### 5.1 改造范式（以 wish store 为例）

**改前：**
```typescript
function addWish(data) {
  const wish = { id: generateId(), ...data, status: 'pending', createdAt: Date.now() };
  wishes.value.unshift(wish);
  persist();  // storage.set('wishes', wishes.value)
  return wish;
}
```

**改后：**
```typescript
async function addWish(data) {
  const wish = { id: generateId(), ...data, status: 'pending', couple_id: currentCoupleId.value };
  const { error } = await supabase.from('wishes').insert(wish);
  if (!error) {
    wishes.value.unshift(wish);
    // 不再需要 persist()——数据库已同步
  }
  return wish;
}
```

### 5.2 实时订阅（新增能力）

```typescript
// 在 store 初始化时订阅
supabase.channel('wishes-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'wishes' },
    (payload) => {
      // 对方新增/修改心愿 → 本地自动更新
      handleRealtimeChange(payload);
    }
  )
  .subscribe();
```

### 5.3 localStorage 保留清单

| 数据 | 保留在 localStorage | 原因 |
|------|:--:|------|
| `sweetbean_token` | ✅ | Supabase auth token（SDK 自动管理） |
| `sweetbean_theme` | ✅ | 主题偏好，纯本地 UI 状态 |
| `sweetbean_statusFilter` | ✅ | UI 筛选状态，不需要同步 |
| `sweetbean_currentUserId` | ✅ | 当前用户身份标识 |

### 5.4 离线降级

网络不可用时静默降级：队列缓存离线操作，网络恢复后批量同步。极端情况下本地数据仍可读（但不写）。

## 六、改动范围

### 新建文件

| 文件 | 说明 |
|------|------|
| `src/lib/supabase.ts` | Supabase 客户端初始化 + 导出 |
| `src/views/Login.vue` | 邮箱登录页 |
| `src/views/BindCouple.vue` | 情侣绑定页 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `src/main.ts` | 导入 supabase 初始化 |
| `src/router.ts` | 添加登录/绑定路由 |
| `src/modules/user/store.ts` | **重写**：Auth 登录+绑定逻辑 |
| `src/modules/user/views/UserHome.vue` | 增加登录状态展示 |
| `src/modules/wish/store.ts` | `storage.set/get` → supabase CRUD + Realtime |
| `src/modules/diary/store.ts` | `storage.set/get` → supabase CRUD |
| `src/modules/points/store.ts` | `storage.set/get` → supabase CRUD |
| `src/modules/interact/store.ts` | `storage.set/get` → supabase CRUD |
| `src/modules/notify/store.ts` | `storage.set/get` → supabase CRUD |
| `src/modules/calendar/store.ts` | 跨表查询改造 |

### 不动文件

| 文件 | 说明 |
|------|------|
| `src/core/storage.ts` | 保留，用于本地 UI 状态 |
| `src/core/registry.ts` | 不变 |
| `src/core/http.ts` | 保留备用（未来可能用） |
| 所有组件 `.vue` 文件 | Store 接口不变，组件无感 |
| 所有 CSS 文件 | 不变 |

## 七、实施分批

| 批次 | 内容 | 依赖 |
|------|------|------|
| 4c-1 | Supabase 项目创建 + `supabase.ts` 客户端 + 数据库建表 | 无 |
| 4c-2 | user store 重写（Auth 登录 + 绑定页） | 4c-1 |
| 4c-3 | wish store 改造 + Realtime 实时同步 | 4c-2 |
| 4c-4 | diary store 改造 | 4c-2 |
| 4c-5 | points + interact + notify + calendar store 改造 | 4c-2 |
| 4c-6 | 种子数据清理 + 离线降级兜底 | 1-5 |

## 八、环境配置

Supabase 连接信息通过 `.env` 环境变量注入（Vite 构建时注入到前端）：

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Vercel 部署时在 Dashboard → Environment Variables 中配置同样的值。

## 九、验收标准

- [ ] 新用户输入邮箱 → 收 Magic Link → 登录成功
- [ ] 两个用户通过 6 位码绑定成功
- [ ] 发心愿 → 对方实时看到（Realtime）
- [ ] 写日记 → 双方可见
- [ ] 签到/贴纸 → 积分自动记录
- [ ] 兑换奖励 → 积分扣除
- [ ] 通知实时推送
- [ ] 离线状态下不崩溃（静默降级）
- [ ] 所有组件无需修改即可正常工作