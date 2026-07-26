import type { RouteRecordRaw } from 'vue-router';

export const wishRoutes: RouteRecordRaw[] = [
  {
    path: '/wish',
    name: 'wish',
    component: () => import('./views/WishHome.vue'),
    meta: { title: '心愿墙', module: 'wish' },
  },
];