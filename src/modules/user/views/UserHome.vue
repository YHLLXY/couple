<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../store';
import { useThemeStore } from '@/modules/theme/store';
import { THEME_LIST } from '@/modules/theme/types';
import PointsBadge from '@/modules/points/components/PointsBadge.vue';

const router = useRouter();
const userStore = useUserStore();
const themeStore = useThemeStore();

function cycleTheme() {
  const themes = THEME_LIST.map(t => t.name);
  const idx = themes.indexOf(themeStore.currentTheme);
  const next = themes[(idx + 1) % themes.length];
  themeStore.setTheme(next);
}

const currentThemeLabel = computed(() => {
  return THEME_LIST.find(t => t.name === themeStore.currentTheme)?.label || '';
});

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

<template>
  <div class="user-page">
    <!-- Profile card -->
    <div class="profile-card" @click="handleProfileClick">
      <div v-if="userStore.isLoggedIn" class="profile-avatar">{{ userStore.currentUser?.avatar }}</div>
      <div v-else class="profile-avatar">🫘</div>
      <h2 class="profile-name">{{ userStore.isLoggedIn ? userStore.currentUser?.name : '点击登录' }}</h2>
      <p v-if="userStore.isBound && userStore.inviteCode" class="profile-code">
        情侣码：<strong>{{ userStore.inviteCode }}</strong>
      </p>
      <p v-else-if="userStore.isLoggedIn && !userStore.isBound" class="profile-code profile-code--hint">
        点击绑定另一半 💕
      </p>
    </div>

    <PointsBadge />

    <!-- Partner info -->
    <div v-if="userStore.partner" class="partner-card">
      <span class="partner-label">你的另一半</span>
      <div class="partner-info">
        <span class="partner-avatar">{{ userStore.partner.avatar }}</span>
        <span class="partner-name">{{ userStore.partner.nickname }}</span>
      </div>
    </div>
    <div v-else class="partner-card partner-card--empty">
      <p>还没有绑定另一半</p>
      <van-button type="primary" round size="small" to="/bind-couple">绑定另一半 💕</van-button>
    </div>

    <!-- Menu -->
    <div class="menu-list">
      <van-cell title="🎨 主题" :value="currentThemeLabel" is-link @click="cycleTheme" />
      <van-cell title="🎨 主题切换" is-link to="/settings" />
      <van-cell title="🪙 积分中心" is-link to="/points" />
      <van-cell title="📔 共同日记" is-link to="/diary" />
      <van-cell title="📋 关于小甜豆" is-link />
    </div>
  </div>
</template>

<style scoped>
.user-page {
  padding: var(--space-base);
  padding-bottom: calc(var(--tabbar-height) + var(--safe-area-bottom) + 24px);
}

.profile-card {
  text-align: center;
  padding: var(--space-xl) var(--space-base);
  background: var(--gradient-card);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-base);
}

.profile-avatar { font-size: 64px; margin-bottom: var(--space-sm); }

.profile-name {
  font-size: var(--font-size-xl);
  color: var(--color-text-primary);
  margin-bottom: var(--space-xs);
}

.profile-code {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.partner-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-base);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-base);
  box-shadow: var(--shadow-card);
}

.partner-label { font-size: var(--font-size-sm); color: var(--color-text-secondary); }

.partner-info { display: flex; align-items: center; gap: 8px; }
.partner-avatar { font-size: 32px; }
.partner-name { font-size: var(--font-size-md); font-weight: var(--font-weight-bold); }

.partner-card--empty {
  flex-direction: column;
  gap: 12px;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  padding: var(--space-xl);
}

.menu-list {
  border-radius: var(--radius-md);
  overflow: hidden;
}

.profile-code--hint {
  color: var(--color-primary);
}
</style>