<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/modules/user/store';

const router = useRouter();
const userStore = useUserStore();
const status = ref<'processing' | 'registered' | 'need_register'>('processing');

onMounted(async () => {
  // Supabase SDK 会自动从 URL hash 中解析 Magic Link 的 token
  const { data: { session }, error: authError } = await supabase.auth.getSession();

  if (authError || !session?.user) {
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
      <van-button type="primary" round block to="/register">设置身份</van-button>
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
.callback-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-base);
  width: 100%;
  max-width: 320px;
}
</style>
