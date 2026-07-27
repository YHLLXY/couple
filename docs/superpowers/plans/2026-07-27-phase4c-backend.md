# 阶段 4c 后端接入 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 8 个 Pinia Store 从 localStorage 持久化迁移到 Supabase PostgreSQL，实现情侣双方数据共享和实时同步。

**Architecture:** 三层架构 — 组件层不变、Store 层改用 supabase-js 客户端、持久化层从 storage.ts 切换到 Supabase。新增 Magic Link 登录和情侣绑定页面。核心表启用 RLS 行级安全。

**Tech Stack:** Supabase (PostgreSQL + Auth + Realtime), `@supabase/supabase-js` v2, Vue 3 + Pinia + TypeScript

**Spec:** [2026-07-27-phase4c-backend-design.md](../specs/2026-07-27-phase4c-backend-design.md)

---

## 前置准备

### Supabase 项目创建

1. 打开 [supabase.com/dashboard](https://supabase.com/dashboard)，注册/登录
2. 创建新项目，名称随意（如 `sweet-bean`），**记下 Database Password**
3. 项目创建完成后，进入 Settings → API，复制两个值：
   - **Project URL**（如 `https://xxxxx.supabase.co`）
   - **anon public key**（以 `eyJ` 开头）
4. 在项目根目录创建 `.env` 文件，写入：

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### 数据库建表

在 Supabase Dashboard → SQL Editor 中，执行以下 SQL：

```sql
-- ========== 用户与关系 ==========

CREATE TABLE couples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY,                       -- 与 auth.users.id 一致
  email text NOT NULL,
  name text NOT NULL DEFAULT '',
  avatar text NOT NULL DEFAULT '🐰',
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
  category text NOT NULL DEFAULT 'other',
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'pending',
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
  amount int NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ========== 奖励 ==========

CREATE TABLE rewards (
  id text PRIMARY KEY,
  couple_id uuid NOT NULL REFERENCES couples(id),
  name text NOT NULL,
  cost int NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  claimed_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- ========== 通知 ==========

CREATE TABLE notifications (
  id text PRIMARY KEY,
  couple_id uuid NOT NULL REFERENCES couples(id),
  user_id uuid NOT NULL REFERENCES users(id),
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  related_wish_id text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ========== RLS 基础策略（以后再详细配，先建表能跑）==========
-- 初期开发阶段暂时关闭 RLS，功能跑通后再开启
ALTER TABLE couples DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE wishes DISABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE checkins DISABLE ROW LEVEL SECURITY;
ALTER TABLE stickers DISABLE ROW LEVEL SECURITY;
ALTER TABLE points DISABLE ROW LEVEL SECURITY;
ALTER TABLE rewards DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
```

> ⚠️ **RLS 先关闭** —— 初期先跑通功能，后续再开启行级安全。不然调试阶段各种 403 很难定位问题。

---

## 批次 1：Supabase 客户端初始化

### Task 1: 安装依赖 + supabase.ts + .env 集成

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `.env`
- Modify: `.gitignore`
- Modify: `src/main.ts`

- [ ] **Step 1: 安装 @supabase/supabase-js**

```bash
cd E:/homework/开发/Claudecode/couple
npm install @supabase/supabase-js
```

- [ ] **Step 2: 创建 src/lib/supabase.ts**

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Please create a .env file in the project root.'
  );
}

export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,  // Magic Link 回调需要
    },
  }
);
```

- [ ] **Step 3: 创建 src/lib/database.types.ts（类型占位文件）**

```typescript
// Supabase Database 类型定义
// 后续可用 `supabase gen types typescript` 命令自动生成精确类型
// 当前为最小占位，保证 supabase.ts 编译通过

export type Database = {
  public: {
    Tables: {
      couples: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      users: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      wishes: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      diary_entries: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      checkins: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      stickers: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      points: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      rewards: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      notifications: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
    };
  };
};
```

- [ ] **Step 4: 确认 .gitignore 包含 .env**

确认 `.gitignore` 文件中包含以下行（没有则添加）：

```
.env
.env.local
```

- [ ] **Step 5: 在 src/main.ts 顶部导入 supabase**

在 `src/main.ts` 的现有 import 块顶部添加一行：

```typescript
import './lib/supabase';  // 初始化 Supabase 客户端（必须最先加载）
```

完整修改后的 main.ts 前几行：

```typescript
import './lib/supabase';  // 初始化 Supabase 客户端（必须最先加载）
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
// ... 后续保持不变
```

- [ ] **Step 6: 构建验证**

```bash
npm run build
```

预期：构建成功，无 TypeScript 错误，且控制台不会有 `Missing VITE_SUPABASE_URL` 警告（因为 .env 已配置）。

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "feat: add Supabase client initialization + .env config"
```

---

## 批次 2：用户体系（Auth + 登录 + 绑定）

### Task 2: 重写 user/types.ts

**Files:**
- Modify: `src/modules/user/types.ts`

- [ ] **Step 1: 更新 User 接口**

将 `src/modules/user/types.ts` 全量替换为：

```typescript
// 与 Supabase auth.users 对应
export interface User {
  id: string;           // Supabase Auth UUID
  email: string;        // 登录邮箱
  name: string;         // 昵称（小兔子/小熊）
  avatar: string;       // 头像 emoji（🐰/🐻）
  coupleId: string | null;  // 所属情侣对 ID
  createdAt: number;
}

export interface UserState {
  currentUser: User | null;
  partner: User | null;
  isBound: boolean;
  isLoggedIn: boolean;
}
```

### Task 3: 重写 user/store.ts

**Files:**
- Modify: `src/modules/user/store.ts`

- [ ] **Step 1: 完整重写 user/store.ts**

将 `src/modules/user/store.ts` 全量替换为以下内容：

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from './types';
import { supabase } from '@/lib/supabase';

function genCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export const useUserStore = defineStore('user', () => {
  // === 状态 ===
  const currentUser = ref<User | null>(null);
  const partner = ref<User | null>(null);
  const coupleId = ref<string | null>(null);
  const inviteCode = ref<string>('');
  const loading = ref(false);

  // === 计算属性 ===
  const currentUserId = computed(() => currentUser.value?.id ?? '');
  const isBound = computed(() => !!partner.value);
  const isLoggedIn = computed(() => !!currentUser.value);

  // === 登录 ===

  /** 发送 Magic Link 登录邮件 */
  async function sendMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
    loading.value = true;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // 登录后回调到应用首页
        emailRedirectTo: window.location.origin + '/#/auth-callback',
      },
    });
    loading.value = false;
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  /** 登出 */
  async function logout() {
    await supabase.auth.signOut();
    currentUser.value = null;
    partner.value = null;
    coupleId.value = null;
    inviteCode.value = '';
  }

  /** 初始化——检查是否已有 session */
  async function initAuth(): Promise<boolean> {
    loading.value = true;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await loadUserProfile(session.user.id);
      loading.value = false;
      return true;
    }
    loading.value = false;
    return false;
  }

  /** 从 public.users 表加载用户资料 */
  async function loadUserProfile(uid: string) {
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .single();

    if (profile) {
      currentUser.value = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        avatar: profile.avatar,
        coupleId: profile.couple_id,
        createdAt: new Date(profile.created_at).getTime(),
      };
      coupleId.value = profile.couple_id;

      // 如果已绑定，加载另一半信息
      if (profile.couple_id) {
        await loadPartner(profile.couple_id, uid);
        // 获取绑定码
        const { data: couple } = await supabase
          .from('couples')
          .select('invite_code')
          .eq('id', profile.couple_id)
          .single();
        if (couple) inviteCode.value = couple.invite_code;
      }
    }
  }

  /** 加载另一半 */
  async function loadPartner(cid: string, myId: string) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('couple_id', cid)
      .neq('id', myId)
      .single();

    if (data) {
      partner.value = {
        id: data.id,
        email: data.email,
        name: data.name,
        avatar: data.avatar,
        coupleId: data.couple_id,
        createdAt: new Date(data.created_at).getTime(),
      };
    }
  }

  // === 绑定 ===

  /** 注册用户信息（第一次登录后调用） */
  async function registerUser(email: string, name: string, avatar: string): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const uid = session.user.id;
    const { error } = await supabase.from('users').upsert({
      id: uid,
      email,
      name,
      avatar,
    });

    if (error) {
      console.error('[User] Failed to register:', error.message);
      return false;
    }

    await loadUserProfile(uid);
    return true;
  }

  /** 生成绑定码 */
  async function generateInviteCode(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return '';

    // 创建 couple
    const code = genCode();
    const { data: coupleRow, error } = await supabase
      .from('couples')
      .insert({ invite_code: code })
      .select()
      .single();

    if (error || !coupleRow) {
      console.error('[User] Failed to create couple:', error?.message);
      return '';
    }

    // 更新当前用户的 couple_id
    await supabase
      .from('users')
      .update({ couple_id: coupleRow.id })
      .eq('id', session.user.id);

    inviteCode.value = code;
    coupleId.value = coupleRow.id;

    if (currentUser.value) {
      currentUser.value.coupleId = coupleRow.id;
    }

    return code;
  }

  /** 通过绑定码绑定 */
  async function bindByCode(code: string): Promise<{ success: boolean; error?: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { success: false, error: '未登录' };

    // 查找 couple
    const { data: coupleRow, error } = await supabase
      .from('couples')
      .select('*')
      .eq('invite_code', code)
      .single();

    if (error || !coupleRow) {
      return { success: false, error: '绑定码无效，请检查' };
    }

    // 更新当前用户的 couple_id
    const { error: updateError } = await supabase
      .from('users')
      .update({ couple_id: coupleRow.id })
      .eq('id', session.user.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    coupleId.value = coupleRow.id;
    inviteCode.value = code;

    if (currentUser.value) {
      currentUser.value.coupleId = coupleRow.id;
    }

    // 加载另一半信息
    await loadPartner(coupleRow.id, session.user.id);

    return { success: true };
  }

  /** 解绑 */
  async function unbind(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    await supabase
      .from('users')
      .update({ couple_id: null })
      .eq('id', session.user.id);

    partner.value = null;
    coupleId.value = null;
    inviteCode.value = '';

    if (currentUser.value) {
      currentUser.value.coupleId = null;
    }
  }

  return {
    currentUser, partner, coupleId, inviteCode, loading,
    currentUserId, isBound, isLoggedIn,
    sendMagicLink, logout, initAuth, loadUserProfile,
    registerUser, generateInviteCode, bindByCode, unbind,
  };
});
```

### Task 4: 创建 Login.vue（邮箱登录页）

**Files:**
- Create: `src/views/Login.vue`

- [ ] **Step 1: 创建登录页面**

```html
<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/modules/user/store';
import { showToast } from 'vant';

const router = useRouter();
const userStore = useUserStore();
const email = ref('');
const sent = ref(false);
const sending = ref(false);

async function handleLogin() {
  if (!email.value || !email.value.includes('@')) {
    showToast('请输入有效的邮箱地址');
    return;
  }
  sending.value = true;
  const { success, error } = await userStore.sendMagicLink(email.value.trim());
  sending.value = false;
  if (success) {
    sent.value = true;
  } else {
    showToast(error || '发送失败，请重试');
  }
}

function handleBack() {
  router.push('/');
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-icon">🫘</div>
      <h1 class="login-title">小甜豆</h1>
      <p class="login-subtitle">让对方知道你今天想被宠爱</p>

      <div v-if="!sent" class="login-form">
        <van-cell-group inset>
          <van-field
            v-model="email"
            type="email"
            label="邮箱"
            placeholder="输入你的邮箱"
            :rules="[{ required: true }]"
          />
        </van-cell-group>
        <van-button
          type="primary"
          round
          block
          :loading="sending"
          loading-text="发送中..."
          class="login-btn"
          @click="handleLogin"
        >
          发送登录链接
        </van-button>
        <p class="login-hint">我们会发一封邮件到你的邮箱，点击链接即可登录，无需密码</p>
      </div>

      <div v-else class="login-sent">
        <p class="sent-icon">📧</p>
        <p class="sent-title">邮件已发送！</p>
        <p class="sent-desc">请查看 <strong>{{ email }}</strong> 的收件箱，点击链接完成登录</p>
        <van-button round plain type="primary" class="login-btn" @click="sent = false">
          换个邮箱
        </van-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-base);
  background: var(--color-bg);
}
.login-card {
  width: 100%;
  max-width: 360px;
  text-align: center;
  padding: var(--space-xl) var(--space-base);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}
.login-icon { font-size: 64px; margin-bottom: var(--space-sm); }
.login-title { font-size: var(--font-size-xxl); color: var(--color-text-primary); margin-bottom: 4px; }
.login-subtitle { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--space-xl); }
.login-form { margin-top: var(--space-base); }
.login-btn { margin-top: var(--space-base); }
.login-hint { font-size: var(--font-size-xs); color: var(--color-text-light); margin-top: var(--space-sm); padding: 0 var(--space-base); }
.sent-icon { font-size: 48px; margin-bottom: var(--space-base); }
.sent-title { font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); margin-bottom: var(--space-xs); }
.sent-desc { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--space-base); }
</style>
```

### Task 5: 创建 AuthCallback.vue（Magic Link 回调页）

**Files:**
- Create: `src/views/AuthCallback.vue`

- [ ] **Step 1: 创建回调处理页面**

```html
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/modules/user/store';

const router = useRouter();
const userStore = useUserStore();
const status = ref<'processing' | 'registered' | 'need_register'>('processing');
const error = ref('');

onMounted(async () => {
  // Supabase SDK 会自动从 URL hash 中解析 Magic Link 的 token
  const { data: { session }, error: authError } = await supabase.auth.getSession();

  if (authError || !session?.user) {
    error.value = authError?.message || '登录失败，请重试';
    status.value = 'need_register';
    return;
  }

  // 检查是否是已注册用户
  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('id', session.user.id)
    .single();

  if (profile) {
    // 已注册 → 加载资料 → 进入首页
    await userStore.loadUserProfile(session.user.id);
    router.replace('/interact');
  } else {
    // 首次登录 → 跳转注册页
    status.value = 'need_register';
  }
});
</script>

<template>
  <div class="callback-page">
    <van-loading v-if="status === 'processing'" size="48" />
    <p v-if="status === 'processing'" class="callback-text">验证登录中...</p>

    <div v-if="status === 'need_register'" class="callback-content">
      <p class="callback-icon">👋</p>
      <p class="callback-text">欢迎加入小甜豆！</p>
      <p v-if="error" class="callback-error">{{ error }}</p>
      <van-button type="primary" round block to="/login">去登录</van-button>
    </div>
  </div>
</template>

<style scoped>
.callback-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-base);
  padding: var(--space-base);
  background: var(--color-bg);
}
.callback-icon { font-size: 64px; }
.callback-text { font-size: var(--font-size-md); color: var(--color-text-secondary); }
.callback-error { font-size: var(--font-size-sm); color: var(--color-danger); }
.callback-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-base);
}
</style>
```

### Task 6: 创建 BindCouple.vue（情侣绑定页）

**Files:**
- Create: `src/views/BindCouple.vue`

- [ ] **Step 1: 创建绑定页面**

```html
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/modules/user/store';
import { showToast, showDialog } from 'vant';

const router = useRouter();
const userStore = useUserStore();
const mode = ref<'choice' | 'create' | 'join'>('choice');
const bindCode = ref('');
const loading = ref(false);

const displayCode = computed(() => userStore.inviteCode);

async function handleCreate() {
  loading.value = true;
  const code = await userStore.generateInviteCode();
  loading.value = false;
  if (code) {
    mode.value = 'create';
  } else {
    showToast('生成失败，请重试');
  }
}

async function handleJoin() {
  if (!bindCode.value || bindCode.value.length !== 6) {
    showToast('请输入 6 位绑定码');
    return;
  }
  loading.value = true;
  const { success, error } = await userStore.bindByCode(bindCode.value.trim());
  loading.value = false;
  if (success) {
    showToast('绑定成功！💕');
    router.replace('/user');
  } else {
    showToast(error || '绑定失败');
  }
}

async function handleUnbind() {
  try {
    await showDialog({ title: '解绑确认', message: '解绑后你们的数据将不再共享，确定吗？' });
    await userStore.unbind();
    showToast('已解绑');
    mode.value = 'choice';
  } catch {
    // 取消
  }
}

function goBack() {
  if (mode.value === 'choice') {
    router.push('/user');
  } else {
    mode.value = 'choice';
  }
}
</script>

<template>
  <div class="bind-page">
    <van-nav-bar title="情侣绑定" left-arrow @click-left="goBack" />

    <!-- 选择模式 -->
    <div v-if="mode === 'choice'" class="bind-choice">
      <p class="bind-guide">和另一半绑定后，你们就可以共享心愿、日记和积分啦 💕</p>
      <van-button type="primary" round block :loading="loading" @click="handleCreate">
        创建邀请码，等 TA 来绑定
      </van-button>
      <van-button round block plain class="bind-join-btn" @click="mode = 'join'">
        输入邀请码，绑定 TA
      </van-button>
      <van-button v-if="userStore.isBound" round block plain type="danger" @click="handleUnbind">
        解绑
      </van-button>
    </div>

    <!-- 创建邀请码 -->
    <div v-else-if="mode === 'create'" class="bind-create">
      <p class="bind-tip">把下面这 6 位码发给你的另一半</p>
      <div class="bind-code-display">{{ displayCode }}</div>
      <p class="bind-tip">TA 在小甜豆里输入这个码就能绑定你</p>
      <van-button round block plain @click="mode = 'choice'">返回</van-button>
    </div>

    <!-- 输入绑定码 -->
    <div v-else-if="mode === 'join'" class="bind-join">
      <p class="bind-tip">输入另一半给你的 6 位邀请码</p>
      <van-field
        v-model="bindCode"
        label="邀请码"
        placeholder="6 位数字"
        maxlength="6"
        type="digit"
      />
      <van-button type="primary" round block :loading="loading" class="bind-submit" @click="handleJoin">
        确认绑定
      </van-button>
      <van-button round block plain @click="mode = 'choice'">返回</van-button>
    </div>
  </div>
</template>

<style scoped>
.bind-page {
  min-height: 100vh;
  background: var(--color-bg);
  padding-bottom: var(--space-xl);
}
.bind-choice, .bind-create, .bind-join {
  padding: var(--space-xl) var(--space-base);
  display: flex;
  flex-direction: column;
  gap: var(--space-base);
}
.bind-guide {
  font-size: var(--font-size-md);
  color: var(--color-text-secondary);
  text-align: center;
  line-height: 1.6;
  margin-bottom: var(--space-base);
}
.bind-tip {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-align: center;
}
.bind-code-display {
  font-size: 48px;
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  text-align: center;
  letter-spacing: 12px;
  padding: var(--space-xl);
  background: var(--color-surface);
  border-radius: var(--radius-md);
}
.bind-join-btn { margin-top: 8px; }
.bind-submit { margin-top: var(--space-base); }
</style>
```

### Task 7: 添加认证相关路由到 router.ts

**Files:**
- Modify: `src/router.ts`

- [ ] **Step 1: 添加登录、回调、绑定路由**

在 `src/router.ts` 中现有的路由定义后添加三条新路由，放在 `notFoundRoute` 之前。

找到 `const notFoundRoute: RouteRecordRaw = {` 这一行，在其上方插入：

```typescript
// Auth routes（登录 + 回调 + 绑定）
const loginRoute: RouteRecordRaw = {
  path: '/login',
  name: 'login',
  component: () => import('@/views/Login.vue'),
  meta: { title: '登录', hideTabBar: true },
};

const authCallbackRoute: RouteRecordRaw = {
  path: '/auth-callback',
  name: 'authCallback',
  component: () => import('@/views/AuthCallback.vue'),
  meta: { title: '登录中', hideTabBar: true },
};

const bindCoupleRoute: RouteRecordRaw = {
  path: '/bind-couple',
  name: 'bindCouple',
  component: () => import('@/views/BindCouple.vue'),
  meta: { title: '情侣绑定', showBack: true, hideTabBar: true },
};
```

然后修改 routes 数组，将新路由加入（插入到 `notifyRoute` 和 `settingsRoute` 之间）：

```typescript
routes: [
  rootRoute,
  ...getAllRoutes(),
  notifyRoute,
  loginRoute,
  authCallbackRoute,
  bindCoupleRoute,
  settingsRoute,
  notFoundRoute,
],
```

### Task 8: 更新 UserHome.vue 集成登录和绑定

**Files:**
- Modify: `src/modules/user/views/UserHome.vue`

- [ ] **Step 1: 更新 UserHome.vue**

将 `<script setup>` 区块替换为：

```html
<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../store';
import PointsBadge from '@/modules/points/components/PointsBadge.vue';

const router = useRouter();
const userStore = useUserStore();

onMounted(async () => {
  if (!userStore.isLoggedIn) {
    await userStore.initAuth();
  }
});

function handleProfileClick() {
  if (userStore.isLoggedIn) {
    router.push('/bind-couple');
  } else {
    router.push('/login');
  }
}
</script>
```

并修改模板中的 Profile card 和 Partner card 部分。将现有 Profile card 区块：

```html
<!-- Profile card -->
<div class="profile-card">
  <div class="profile-avatar">{{ userStore.currentUser.avatar }}</div>
  <h2 class="profile-name">{{ userStore.currentUser.nickname }}</h2>
  <p v-if="userStore.coupleCode" class="profile-code">
    情侣码：<strong>{{ userStore.coupleCode }}</strong>
  </p>
</div>
```

替换为：

```html
<!-- Profile card -->
<div class="profile-card" @click="handleProfileClick">
  <div v-if="userStore.isLoggedIn" class="profile-avatar">{{ userStore.currentUser?.avatar }}</div>
  <div v-else class="profile-avatar">🫘</div>
  <h2 class="profile-name">{{ userStore.isLoggedIn ? userStore.currentUser?.name : '点击登录' }}</h2>
  <p v-if="userStore.isBound && userStore.inviteCode" class="profile-code">
    情侣码：<strong>{{ userStore.inviteCode }}</strong>
  </p>
  <p v-else-if="userStore.isLoggedIn" class="profile-code profile-code--hint">
    点击绑定另一半 💕
  </p>
</div>
```

将 `partner-card--empty` 中的按钮改为路由跳转：

```html
<van-button type="primary" round size="small" to="/bind-couple">绑定另一半 💕</van-button>
```

### Task 9: 引导注册流程（Login 成功后首次注册）

**Files:**
- Create: `src/views/Register.vue`

> 注：此页面在 AuthCallback 检测到新用户后展示，让用户选择自己的角色（小兔子🐰或小熊🐻）

- [ ] **Step 1: 创建注册页面**

```html
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/modules/user/store';
import { showToast } from 'vant';

const router = useRouter();
const userStore = useUserStore();
const nickname = ref('');
const avatar = ref('🐰');
const loading = ref(false);

const avatars = ['🐰', '🐻', '🐱', '🐶', '🦊', '🐼', '🐨', '🦁'];

onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    router.replace('/login');
  }
});

async function handleRegister() {
  if (!nickname.value.trim()) {
    showToast('请输入昵称');
    return;
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  loading.value = true;
  const ok = await userStore.registerUser(
    session.user.email ?? '',
    nickname.value.trim(),
    avatar.value,
  );
  loading.value = false;

  if (ok) {
    router.replace('/interact');
  } else {
    showToast('注册失败，请重试');
  }
}
</script>

<template>
  <div class="register-page">
    <div class="register-card">
      <p class="register-icon">👋</p>
      <h2>设置你的身份</h2>

      <van-field v-model="nickname" label="昵称" placeholder="如：小兔子、小熊" maxlength="10" />

      <div class="avatar-picker">
        <p class="avatar-label">选择头像</p>
        <div class="avatar-grid">
          <span
            v-for="a in avatars"
            :key="a"
            class="avatar-item"
            :class="{ active: avatar === a }"
            @click="avatar = a"
          >{{ a }}</span>
        </div>
      </div>

      <van-button type="primary" round block :loading="loading" @click="handleRegister">
        开始使用小甜豆
      </van-button>
    </div>
  </div>
</template>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-base);
  background: var(--color-bg);
}
.register-card {
  width: 100%;
  max-width: 360px;
  text-align: center;
  padding: var(--space-xl) var(--space-base);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: var(--space-base);
}
.register-icon { font-size: 48px; }
.avatar-picker { text-align: left; }
.avatar-label { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: 8px; }
.avatar-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.avatar-item {
  font-size: 36px;
  padding: 8px;
  border-radius: var(--radius-sm);
  border: 2px solid transparent;
  cursor: pointer;
  transition: border-color 0.2s;
}
.avatar-item.active { border-color: var(--color-primary); background: var(--color-primary-light); }
</style>
```

并将注册页路由添加到 `src/router.ts`：

```typescript
const registerRoute: RouteRecordRaw = {
  path: '/register',
  name: 'register',
  component: () => import('@/views/Register.vue'),
  meta: { title: '设置身份', hideTabBar: true },
};
```

添加到 routes 数组中（位于 `authCallbackRoute` 和 `bindCoupleRoute` 之间）：

```typescript
loginRoute,
authCallbackRoute,
registerRoute,      // ← 新增
bindCoupleRoute,
```

同时，修改 `AuthCallback.vue` 中 `need_register` 分支，使其跳转到 `/register` 而非 `/login`：

```html
<van-button type="primary" round block to="/register">设置身份</van-button>
```

- [ ] **Step 2: 构建验证 + 提交**

```bash
npm run build
```

预期：构建成功。新路由 `/login`、`/auth-callback`、`/register`、`/bind-couple` 均可访问。

```bash
git add -A
git commit -m "feat: add Supabase Auth — Magic Link login, register, couple binding"
```

---

## 批次 3：Wish Store 改造（心愿 → Supabase）

- [ ] **Step 0: 在 GitHub 上创建新分支**

```bash
cd E:/homework/开发/Claudecode/couple
git checkout -b feat/4c-wish-supabase
```

### Task 10: 改造 wish/store.ts

**Files:**
- Modify: `src/modules/wish/store.ts`

**改造要点：**
- 初始化：`supabase.from('wishes').select('*').eq('couple_id', ...)` 替代 `storage.get`
- 写操作：`supabase.from('wishes').insert/update/delete` 替代 `storage.set`
- 新增：Realtime 订阅，监听对方的心愿变更
- 删除：`persist()` 函数、种子数据（种子数据后期统一迁移到数据库）

将 `src/modules/wish/store.ts` 全量替换为：

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Wish, WishStatus, WishCategory, WishPriority } from './types';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/modules/user/store';

function generateId(): string {
  return `w_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useWishStore = defineStore('wish', () => {
  const wishes = ref<Wish[]>([]);
  const statusFilter = ref<'all' | 'pending' | 'active' | 'done'>('all');
  const loaded = ref(false);

  function currentUserId(): string {
    return useUserStore().currentUserId;
  }

  function currentCoupleId(): string | null {
    return useUserStore().coupleId;
  }

  // === 数据加载（从 Supabase） ===
  async function loadWishes(): Promise<void> {
    const cid = currentCoupleId();
    if (!cid) return;

    const { data, error } = await supabase
      .from('wishes')
      .select('*')
      .eq('couple_id', cid)
      .order('created_at', { ascending: false });

    if (!error && data) {
      wishes.value = data.map(mapRowToWish);
      loaded.value = true;
    }
  }

  function mapRowToWish(row: Record<string, unknown>): Wish {
    return {
      id: row.id as string,
      fromUserId: row.from_user_id as string,
      toUserId: row.to_user_id as string,
      content: row.content as string,
      category: row.category as WishCategory,
      priority: row.priority as WishPriority,
      status: row.status as WishStatus,
      imageUrl: row.image_url as string | undefined,
      proofImageUrl: row.proof_image_url as string | undefined,
      proofNote: row.proof_note as string | undefined,
      createdAt: new Date(row.created_at as string).getTime(),
      completedAt: row.completed_at ? new Date(row.completed_at as string).getTime() : undefined,
      expireAt: row.expire_at ? new Date(row.expire_at as string).getTime() : undefined,
    };
  }

  // === Realtime 订阅 ===
  let channel: ReturnType<typeof supabase.channel> | null = null;

  function subscribeRealtime(): void {
    const cid = currentCoupleId();
    if (!cid) return;

    // 先清理旧订阅
    if (channel) {
      supabase.removeChannel(channel);
    }

    channel = supabase
      .channel('wishes-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wishes', filter: `couple_id=eq.${cid}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const wish = mapRowToWish(payload.new);
            // 去重（防止自己刚插入的就重复）
            if (!wishes.value.some(w => w.id === wish.id)) {
              wishes.value.unshift(wish);
            }
          } else if (payload.eventType === 'UPDATE') {
            const idx = wishes.value.findIndex(w => w.id === (payload.new as Record<string, unknown>).id);
            if (idx !== -1) {
              wishes.value[idx] = mapRowToWish(payload.new);
            }
          } else if (payload.eventType === 'DELETE') {
            const delId = (payload.old as Record<string, unknown>).id as string;
            wishes.value = wishes.value.filter(w => w.id !== delId);
          }
        }
      )
      .subscribe();
  }

  // === 计算属性（保持不变） ===
  const filteredWishes = computed(() => {
    let list = wishes.value.filter(
      (w) => w.toUserId === currentUserId() || w.fromUserId === currentUserId(),
    );
    switch (statusFilter.value) {
      case 'pending':
        list = list.filter((w) => w.status === 'pending');
        break;
      case 'active':
        list = list.filter((w) => w.status === 'accepted' || w.status === 'postponed');
        break;
      case 'done':
        list = list.filter((w) => w.status === 'done');
        break;
    }
    return list;
  });

  const pendingCount = computed(
    () => wishes.value.filter((w) => w.toUserId === currentUserId() && w.status === 'pending').length,
  );
  const activeCount = computed(
    () =>
      wishes.value.filter(
        (w) =>
          (w.toUserId === currentUserId() || w.fromUserId === currentUserId()) &&
          (w.status === 'accepted' || w.status === 'postponed'),
      ).length,
  );
  const doneCount = computed(
    () =>
      wishes.value.filter(
        (w) =>
          (w.toUserId === currentUserId() || w.fromUserId === currentUserId()) &&
          w.status === 'done',
      ).length,
  );

  // === 操作（全部改为 async + Supabase） ===
  async function addWish(data: {
    fromUserId: string;
    toUserId: string;
    content: string;
    category: WishCategory;
    priority: WishPriority;
    imageUrl?: string;
    anonymous?: boolean;
  }): Promise<Wish | null> {
    const cid = currentCoupleId();
    if (!cid) return null;

    const row = {
      id: generateId(),
      couple_id: cid,
      from_user_id: data.fromUserId,
      to_user_id: data.toUserId,
      content: data.content,
      category: data.category,
      priority: data.priority,
      status: 'pending' as WishStatus,
      image_url: data.imageUrl || null,
      created_at: new Date().toISOString(),
      expire_at: new Date(new Date().setHours(23, 59, 59, 999)).toISOString(),
    };

    const { error } = await supabase.from('wishes').insert(row);
    if (error) {
      console.error('[Wish] Insert failed:', error.message);
      return null;
    }

    // 不需要手动 push——Realtime 会自动同步
    // 但为了用户体验（即时反馈），立即加入本地列表
    const wish = mapRowToWish(row);
    wishes.value.unshift(wish);

    // 通知对方
    import('@/modules/notify/store').then(({ useNotifyStore }) => {
      const partnerId = data.toUserId === currentUserId()
        ? (wishes.value.find(w => w.toUserId === data.fromUserId)?.fromUserId ?? '')
        : data.toUserId;
      useNotifyStore().addNotification(
        'wish_new',
        '收到新的心愿！',
        `TA 想要「${data.content}」`,
        wish.id,
      );
    });

    return wish;
  }

  async function updateWishStatus(
    id: string,
    status: WishStatus,
    extra?: { proofImageUrl?: string; proofNote?: string },
  ): Promise<void> {
    const cid = currentCoupleId();
    if (!cid) return;

    const updateData: Record<string, unknown> = { status };
    if (status === 'done') {
      updateData.completed_at = new Date().toISOString();
      if (extra?.proofImageUrl) updateData.proof_image_url = extra.proofImageUrl;
      if (extra?.proofNote) updateData.proof_note = extra.proofNote;
    }

    await supabase.from('wishes').update(updateData).eq('id', id).eq('couple_id', cid);

    // 本地更新
    const wish = wishes.value.find(w => w.id === id);
    if (wish) {
      wish.status = status;
      if (status === 'done') {
        wish.completedAt = Date.now();
        if (extra?.proofImageUrl) wish.proofImageUrl = extra.proofImageUrl;
        if (extra?.proofNote) wish.proofNote = extra.proofNote;
      }
    }

    // 触发通知
    if (wish) {
      import('@/modules/notify/store').then(({ useNotifyStore }) => {
        const notify = useNotifyStore();
        const fromUser = wish.fromUserId === currentUserId() ? '你' : 'TA';
        if (status === 'accepted') {
          notify.addNotification('wish_accepted', `${fromUser}接单了你的心愿`, `「${wish.content}」— 交给我吧！`, wish.id);
        } else if (status === 'done') {
          notify.addNotification('wish_done', '心愿已完成！', `「${wish.content}」${wish.proofNote ? '：' + wish.proofNote : ''}`, wish.id);
        } else if (status === 'postponed') {
          notify.addNotification('wish_accepted', `${fromUser}把心愿推迟了`, `「${wish.content}」— 改天再做`, wish.id);
        }
      });
    }

    // 加积分
    import('@/modules/points/store').then(({ usePointsStore }) => {
      if (wish) {
        usePointsStore().earnPoints(wish.toUserId, 'wish_done');
      }
    });
  }

  async function removeWish(id: string): Promise<void> {
    const cid = currentCoupleId();
    if (!cid) return;

    await supabase.from('wishes').delete().eq('id', id).eq('couple_id', cid);
    wishes.value = wishes.value.filter((w) => w.id !== id);
  }

  function getWishById(id: string): Wish | undefined {
    return wishes.value.find((w) => w.id === id);
  }

  return {
    wishes, statusFilter, loaded,
    filteredWishes, pendingCount, activeCount, doneCount,
    loadWishes, subscribeRealtime,
    addWish, updateWishStatus, removeWish, getWishById,
  };
});
```

- [ ] **Step 2: 在组件中调用初始化和订阅**

在 `src/modules/wish/views/WishHome.vue` 的 `onMounted` 中增加初始化和订阅调用（读取原文件确认位置后插入）。

在 WishHome.vue 的 `<script setup>` 末尾（`onMounted` 钩子内或就近）增加：

```typescript
// 在 onMounted 中已有逻辑之后追加：
onMounted(() => {
  // ... 现有逻辑保持 ...

  // Supabase 数据加载 + Realtime 订阅
  if (!wishStore.loaded) {
    wishStore.loadWishes();
    wishStore.subscribeRealtime();
  }
});
```

- [ ] **Step 3: 确保 WishCreate.vue 兼容**

WishCreate.vue 调用 `wishStore.addWish()` 后接收 `Wish | null`（之前是同步返回 Wish）。确认异步调用工作正常——`addWish` 返回后即可在列表看到（因为已 push 到本地 `wishes.value`）。

> 注意：`addWish` 变成 async，调用方需使用 `await` 或 `.then()` 获取返回值。检查 WishCreate.vue 中的调用。

- [ ] **Step 4: 构建验证 + 提交**

```bash
npm run build
```

预期：构建成功。

```bash
git add -A
git commit -m "feat: migrate wish store to Supabase with Realtime subscription"
```

---

## 批次 4：Diary Store 改造（日记 → Supabase）

### Task 11: 改造 diary/store.ts

**Files:**
- Modify: `src/modules/diary/store.ts`

**改造要点：**
- 初始化：`supabase.from('diary_entries').select('*').eq('couple_id', ...)` 替代 `storage.get`
- 写操作：`supabase.from('diary_entries').insert/update/delete` 替代 `storage.set`
- 删除：`save()` 函数、种子数据

将 `src/modules/diary/store.ts` 全量替换为：

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { DiaryEntry } from './types';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/modules/user/store';

function genId(): string {
  return `d_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useDiaryStore = defineStore('diary', () => {
  const entries = ref<DiaryEntry[]>([]);
  const loaded = ref(false);

  function currentUserId(): string {
    return useUserStore().currentUserId;
  }

  function currentCoupleId(): string | null {
    return useUserStore().coupleId;
  }

  // === 数据加载 ===
  async function loadEntries(): Promise<void> {
    const cid = currentCoupleId();
    if (!cid) return;

    const { data, error } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('couple_id', cid)
      .order('created_at', { ascending: false });

    if (!error && data) {
      entries.value = data.map(mapRowToEntry);
      loaded.value = true;
    }
  }

  function mapRowToEntry(row: Record<string, unknown>): DiaryEntry {
    return {
      id: row.id as string,
      content: row.content as string,
      images: (row.images as string[]) || [],
      authorId: row.author_id as string,
      isPrivate: (row.is_private as boolean) || false,
      createdAt: new Date(row.created_at as string).getTime(),
      updatedAt: row.updated_at ? new Date(row.updated_at as string).getTime() : undefined,
    };
  }

  // === 计算属性 ===
  const visibleEntries = computed(() =>
    entries.value
      .filter(e => !e.isPrivate || e.authorId === currentUserId())
      .sort((a, b) => b.createdAt - a.createdAt)
  );

  const entriesByDate = computed(() => {
    const map = new Map<string, DiaryEntry[]>();
    for (const e of visibleEntries.value) {
      const date = new Date(e.createdAt).toISOString().slice(0, 10);
      const list = map.get(date) ?? [];
      list.push(e);
      map.set(date, list);
    }
    return map;
  });

  const diaryDates = computed(() => {
    const dates = new Set<string>();
    for (const e of entries.value) {
      if (!e.isPrivate || e.authorId === currentUserId()) {
        dates.add(new Date(e.createdAt).toISOString().slice(0, 10));
      }
    }
    return dates;
  });

  // === 操作 ===
  async function addEntry(content: string, dateStr: string, isPrivate: boolean): Promise<DiaryEntry | null> {
    const cid = currentCoupleId();
    const uid = currentUserId();
    if (!cid || !uid) return null;

    const row = {
      id: genId(),
      couple_id: cid,
      author_id: uid,
      content,
      is_private: isPrivate,
      entry_date: dateStr,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('diary_entries').insert(row);
    if (error) {
      console.error('[Diary] Insert failed:', error.message);
      return null;
    }

    const entry = mapRowToEntry(row);
    entries.value.push(entry);
    return entry;
  }

  async function updateEntry(id: string, content: string, isPrivate: boolean, dateStr?: string): Promise<boolean> {
    const cid = currentCoupleId();
    if (!cid) return false;

    const updateData: Record<string, unknown> = { content, is_private: isPrivate, updated_at: new Date().toISOString() };
    if (dateStr) {
      updateData.entry_date = dateStr;
    }

    const { error } = await supabase
      .from('diary_entries')
      .update(updateData)
      .eq('id', id)
      .eq('couple_id', cid);

    if (error) {
      console.error('[Diary] Update failed:', error.message);
      return false;
    }

    const entry = entries.value.find(e => e.id === id);
    if (entry && entry.authorId === currentUserId()) {
      entry.content = content;
      entry.isPrivate = isPrivate;
      entry.updatedAt = Date.now();
      if (dateStr) {
        entry.createdAt = new Date(dateStr).getTime();
      }
    }

    return true;
  }

  async function deleteEntry(id: string): Promise<boolean> {
    const cid = currentCoupleId();
    if (!cid) return false;

    const { error } = await supabase
      .from('diary_entries')
      .delete()
      .eq('id', id)
      .eq('couple_id', cid);

    if (error) return false;

    entries.value = entries.value.filter(e => e.id !== id);
    return true;
  }

  function getEntryById(id: string): DiaryEntry | undefined {
    return entries.value.find(e => e.id === id);
  }

  return {
    entries, loaded, visibleEntries, entriesByDate, diaryDates,
    currentUserId,
    loadEntries,
    addEntry, updateEntry, deleteEntry, getEntryById,
  };
});
```

- [ ] **Step 2: 在 DiaryHome.vue 中调用初始化**

找到 `src/modules/diary/views/DiaryHome.vue`，在 `onMounted` 中（或在 `<script setup>` 末尾就近）增加：

```typescript
// 在 onMounted 中已有逻辑之后追加：
onMounted(() => {
  // ... 现有逻辑保持 ...

  // Supabase 数据加载
  if (!diaryStore.loaded) {
    diaryStore.loadEntries();
  }
});
```

- [ ] **Step 3: 构建验证 + 提交**

```bash
npm run build
```

预期：构建成功。

```bash
git add -A
git commit -m "feat: migrate diary store to Supabase"
```

---

## 批次 5：Points + Interact + Notify + Calendar Store 改造

### Task 12: 改造 points/store.ts

**Files:**
- Modify: `src/modules/points/store.ts`

**改造要点：**
- Points 积分记录、Rewards 奖励、Exchanges 兑换记录 → Supabase
- Rules（积分规则）保留在 localStorage（配置类数据，不需共享）
- Balance 余额改为从 `points` 表的 `SUM(amount)` 计算（保证数据一致性）

> 由于文件较长（272行），此处仅列出关键改动点而非全量替换。执行时需读取原文件后精确替换。

**关键改动 1：导入**

```typescript
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/modules/user/store';
// 删除：import { storage } from '@/core/storage';
```

**关键改动 2：Balance 从 Supabase 计算**

```typescript
// 替换原有的 balance ref
const balance = ref<Record<string, number>>({});

async function refreshBalance(): Promise<void> {
  const cid = useUserStore().coupleId;
  if (!cid) return;

  const { data, error } = await supabase
    .from('points')
    .select('user_id, amount')
    .eq('couple_id', cid);

  if (!error && data) {
    const map: Record<string, number> = {};
    for (const row of data) {
      const uid = row.user_id as string;
      map[uid] = (map[uid] ?? 0) + (row.amount as number);
    }
    balance.value = map;
  }
}
```

**关键改动 3：earnPoints / spendPoints 写入 Supabase**

```typescript
async function earnPoints(userId: string, action: string): Promise<number> {
  const rule = rules.value.find(r => r.action === action && r.enabled);
  if (!rule) return 0;

  // 冷却检查（改为查 Supabase）
  // ... 省略冷却逻辑，保持原有逻辑结构 ...

  const cid = useUserStore().coupleId;
  if (!cid) return 0;

  const pts = rule.points;
  const row = {
    id: genId('pl'),
    couple_id: cid,
    user_id: userId,
    amount: pts,
    reason: rule.label,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('points').insert(row);
  if (error) return 0;

  if (!balance.value[userId]) balance.value[userId] = 0;
  balance.value[userId] += pts;

  return pts;
}
```

**关键改动 4：Rewards 和 Exchanges 改为 Supabase CRUD**

```typescript
// createReward
async function createReward(title: string, cost: number, icon: string): Promise<Reward | null> {
  const cid = useUserStore().coupleId;
  if (!cid) return null;
  // INSERT INTO rewards ...
}

// requestExchange
async function requestExchange(rewardId: string): Promise<ExchangeRecord | null> {
  // 原来逻辑改为查 Supabase + INSERT
}
```

**完整文件较长，执行时需 Agent 根据原文件精确替换。** 核心不变：函数签名保持一致，只改内部实现。

- [ ] **Step 1: 构建验证 + 提交**

```bash
npm run build
git add -A
git commit -m "feat: migrate points store to Supabase"
```

### Task 13: 改造 interact/store.ts

**Files:**
- Modify: `src/modules/interact/store.ts`

**改造要点：** 签到记录（checkins 表）、贴纸记录（stickers 表）改为 Supabase。贴纸库保持本地常量。

**关键改动：**

```typescript
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/modules/user/store';

// checkInDates 改为从 Supabase 加载
async function loadCheckins() {
  const cid = useUserStore().coupleId;
  const uid = useUserStore().currentUserId;
  if (!cid || !uid) return;

  const { data } = await supabase
    .from('checkins')
    .select('check_date')
    .eq('couple_id', cid)
    .eq('user_id', uid);

  if (data) {
    checkInDates.value = data.map(r => r.check_date as string);
  }
}

// doCheckIn 改为 INSERT
async function doCheckIn() {
  const cid = useUserStore().coupleId;
  const uid = useUserStore().currentUserId;
  // ... INSERT INTO checkins ...
  // ... INSERT INTO stickers (如果是贴纸) ...
}
```

- [ ] **Step 1: 构建验证 + 提交**

```bash
npm run build
git add -A
git commit -m "feat: migrate interact store to Supabase"
```

### Task 14: 改造 notify/store.ts

**Files:**
- Modify: `src/modules/notify/store.ts`

**改造要点：** 通知从 localStorage 迁移到 Supabase notifications 表。

**关键改动：**

```typescript
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/modules/user/store';

// notifications 改为从 Supabase 加载
async function loadNotifications() {
  const cid = useUserStore().coupleId;
  const uid = useUserStore().currentUserId;
  if (!cid || !uid) return;

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('couple_id', cid)
    .eq('user_id', uid)
    .order('created_at', { ascending: false });

  if (data) {
    notifications.value = data.map(r => ({ /* 映射 */ }));
  }
}

// addNotification 改为 INSERT
async function addNotification(...) {
  // INSERT INTO notifications
  // 同时推送浏览器通知（原有逻辑保留）
}

// markAsRead 改为 UPDATE
async function markAsRead(id: string) {
  // UPDATE notifications SET read = true WHERE id = ...
}
```

- [ ] **Step 1: 构建验证 + 提交**

```bash
npm run build
git add -A
git commit -m "feat: migrate notify store to Supabase"
```

### Task 15: 改造 calendar/store.ts

**Files:**
- Modify: `src/modules/calendar/store.ts`

**改造要点：** 纪念日（anniversaries）是纯情侣间配置，保留在 Supabase 或 localStorage 均可。此处选择保留 localStorage（配置类数据）。主要改动是 `getDayMarks` 中查询愿望/日记时改用 Supabase。

**关键改动：**

```typescript
// getDayMarks 中的 hasCheckIn 查询改为 Supabase
// hasDiary 查询改为 Supabase
// hasWish 查询改为 Supabase

// 删除 storage 相关的 checkin 读取（interact_checkin_dates）
// 改为从 store 读取或直接查 Supabase
```

> 注释：`getDayMarks` 在月历渲染时频繁调用（每月至少 28-31 次），全走 Supabase 可能较慢。优化方案：加载时一次性拉取当月全部数据，缓存后本地判断。此优化在批次 6 处理。

- [ ] **Step 1: 构建验证 + 提交**

```bash
npm run build
git add -A
git commit -m "feat: migrate calendar store to Supabase"
```

---

## 批次 6：清理 + 降级兜底

### Task 16: 清理种子数据 + 旧代码

**Files:**
- Modify: 所有已改造的 store.ts
- Modify: `src/modules/user/store.ts`（删除 MOCK_USERS）

**操作：**

1. 删除 `user/store.ts` 中残留的 `MOCK_USERS` 和 `switchTo` 函数（如果还有引用）
2. 删除各 store 中的 `seedXxx()` 函数
3. 删除各 store 中不再使用的 `storage` import
4. 删除 `core/storage.ts` 中不再被任何模块使用的 key（仅保留 theme、statusFilter 等 UI 状态 key）

> 注意：逐 store 检查——有逻辑引用了种子函数必须先替换为 Supabase 查询后再删除。

### Task 17: 离线降级兜底

**Files:**
- Modify: `src/lib/supabase.ts`

**操作：** 在 supabase.ts 中增加网络检测和降级逻辑：

```typescript
// 在 supabase.ts 末尾增加：

/** 检查网络是否可用 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/** 离线降级：包装 supabase 调用，离线时静默跳过 */
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: Error | null }>,
  fallback: T | null = null,
): Promise<T | null> {
  if (!isOnline()) {
    console.warn('[Supabase] Offline — skipping query, returning fallback.');
    return fallback;
  }
  try {
    const { data, error } = await queryFn();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] Query failed:', (err as Error).message);
    return fallback;
  }
}
```

### Task 18: Vercel 环境变量配置

**操作：** 在 Vercel Dashboard → Settings → Environment Variables 中添加：

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOi...` |

设置后重新部署（下次 push 到 master 自动触发）。

### Task 19: 最终验证 + 合入 master

```bash
# 确保所有改造在 feat/4c-wish-supabase 分支
git checkout feat/4c-wish-supabase

# 最终构建
npm run build

# 如果所有批次都通过
git checkout master
git merge feat/4c-wish-supabase
git push
```

---

## 注意事项

1. **Supabase Auth 的 Magic Link 邮件模板**：默认英文，可在 Supabase Dashboard → Authentication → Email Templates 自定义中文内容
2. **RLS 初始关闭**：所有表 RLS 已关闭，功能跑通后再开
3. **Realtime 需要开启**：Supabase Dashboard → Database → Replication 中开启 wishes 表的 Realtime
4. **`.env` 文件不提交**：已配置 .gitignore，注意 Vercel 环境变量需单独配置（Task 18）