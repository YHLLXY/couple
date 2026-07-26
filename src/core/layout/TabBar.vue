<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { getTabBarModules } from '@/core/registry';
import type { ModuleManifest } from '@/core/registry';

const router = useRouter();
const route = useRoute();

interface TabItem {
  id: string;
  name: string;
  icon: string;
  path: string;
}

const tabs = computed<TabItem[]>(() => {
  return getTabBarModules().map((m: ModuleManifest) => ({
    id: m.id,
    name: m.name,
    icon: m.icon || 'circle',
    path: m.routes[0]?.path || `/${m.id}`,
  }));
});

const active = computed(() => {
  const current = tabs.value.find((t) => route.path.startsWith(t.path));
  return current?.id ?? tabs.value[0]?.id ?? '';
});

function onTabClick(tab: TabItem) {
  if (tab.path !== route.path) {
    router.replace(tab.path);
  }
}
</script>

<template>
  <van-tabbar
    :model-value="active"
    :fixed="true"
    :placeholder="true"
    :safe-area-inset-bottom="true"
    :z-index="100"
    active-color="var(--color-primary)"
    inactive-color="var(--color-text-secondary)"
    @change="(id: string) => {
      const tab = tabs.find(t => t.id === id);
      if (tab) onTabClick(tab);
    }"
  >
    <van-tabbar-item
      v-for="tab in tabs"
      :key="tab.id"
      :name="tab.id"
      :icon="tab.icon"
    >
      {{ tab.name }}
    </van-tabbar-item>
  </van-tabbar>
</template>

<style scoped>
:deep(.van-tabbar) {
  background-color: var(--color-surface) !important;
  border-top: 1px solid var(--color-border);
}
</style>