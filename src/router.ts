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

// Auth routes（登录 + 回调 + 注册 + 绑定）
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

const registerRoute: RouteRecordRaw = {
  path: '/register',
  name: 'register',
  component: () => import('@/views/Register.vue'),
  meta: { title: '设置身份', hideTabBar: true },
};

const bindCoupleRoute: RouteRecordRaw = {
  path: '/bind-couple',
  name: 'bindCouple',
  component: () => import('@/views/BindCouple.vue'),
  meta: { title: '情侣绑定', showBack: true, hideTabBar: true },
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
  routes: [
    rootRoute,
    ...getAllRoutes(),
    notifyRoute,
    loginRoute,
    authCallbackRoute,
    registerRoute,
    bindCoupleRoute,
    settingsRoute,
    notFoundRoute,
  ],
});

export default router;