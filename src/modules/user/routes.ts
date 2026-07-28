import type { RouteRecordRaw } from 'vue-router';

export const userRoutes: RouteRecordRaw[] = [
  {
    path: '/mine',
    name: 'mine',
    component: () => import('./views/UserHome.vue'),
    meta: { title: '我的', module: 'user' },
  },
  {
    path: '/user/bind',
    name: 'userBind',
    component: () => import('./views/UserHome.vue'),  // placeholder — will be replaced in Phase 2
    meta: { title: '情侣绑定', module: 'user', showBack: true },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('./views/About.vue'),
    meta: { title: '关于小甜豆', showBack: true },
  },
];