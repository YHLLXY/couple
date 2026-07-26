import type { RouteRecordRaw } from 'vue-router';

export const calendarRoutes: RouteRecordRaw[] = [
  {
    path: '/calendar',
    name: 'calendar',
    component: () => import('./views/CalendarHome.vue'),
    meta: { title: '甜蜜日历', module: 'calendar' },
  },
];