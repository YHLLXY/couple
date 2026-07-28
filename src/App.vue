<script setup lang="ts">
import { onMounted } from 'vue';
import AppShell from '@/core/layout/AppShell.vue';
import { useUserStore } from '@/modules/user/store';

// 🔴 全局 auth 初始化：确保任何页面都能拿到用户信息
// 之前 initAuth 只在 UserHome 中调用，如果用户先访问互动/心愿/日历，
// coupleId 为 null，所有数据加载都会静默失败
onMounted(async () => {
  const userStore = useUserStore();
  if (!userStore.isLoggedIn) {
    await userStore.initAuth();
  }
});
</script>

<template>
  <AppShell />
</template>