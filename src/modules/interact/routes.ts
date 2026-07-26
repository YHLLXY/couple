import type { RouteRecordRaw } from 'vue-router';

export const interactRoutes: RouteRecordRaw[] = [
  {
    path: '/interact',
    name: 'interact',
    component: () => import('./views/InteractHome.vue'),
    meta: { title: '互动', module: 'interact' },
  },
];