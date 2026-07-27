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