// src/modules/points/routes.ts
import type { RouteRecordRaw } from 'vue-router';

export const pointsRoutes: RouteRecordRaw[] = [
  {
    path: '/points',
    name: 'points',
    component: () => import('./views/PointsHome.vue'),
    meta: { title: '积分中心', showBack: true },
  },
  {
    path: '/points/rewards',
    name: 'rewards',
    component: () => import('./views/RewardShop.vue'),
    meta: { title: '奖励商店', showBack: true },
  },
];