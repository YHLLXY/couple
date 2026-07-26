import { createRouter, createWebHashHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { getAllRoutes } from '@/core/registry';

// Root redirect — go to the first tab-bar module (interact)
const rootRoute: RouteRecordRaw = {
  path: '/',
  redirect: '/interact',
};

// Notification center page
const notifyRoute: RouteRecordRaw = {
  path: '/notify',
  name: 'notifyCenter',
  component: () => import('@/modules/notify/views/NotifyCenter.vue'),
  meta: { title: '通知', showBack: true },
};

// Settings page (global, not tied to a specific module)
const settingsRoute: RouteRecordRaw = {
  path: '/settings',
  name: 'settings',
  component: () => import('@/modules/theme/views/Settings.vue'),
  meta: { title: '设置', showBack: true },
};

// Catch-all 404
const notFoundRoute: RouteRecordRaw = {
  path: '/:pathMatch(.*)*',
  name: 'notFound',
  redirect: '/interact',
};

const router = createRouter({
  history: createWebHashHistory(),
  routes: [rootRoute, ...getAllRoutes(), notifyRoute, settingsRoute, notFoundRoute],
});

export default router;