// src/modules/diary/routes.ts
import type { RouteRecordRaw } from 'vue-router';

export const diaryRoutes: RouteRecordRaw[] = [
  {
    path: '/diary',
    name: 'diary',
    component: () => import('./views/DiaryHome.vue'),
    meta: { title: '共同日记', showBack: true },
  },
  {
    path: '/diary/write',
    name: 'diaryWrite',
    component: () => import('./views/DiaryWrite.vue'),
    meta: { title: '写日记', showBack: true },
  },
];