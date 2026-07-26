import { registerModule } from '@/core/registry';
import { calendarRoutes } from './routes';
import { useCalendarStore } from './store';

registerModule({
  id: 'calendar',
  name: '日历',
  icon: 'calendar-o',
  routes: calendarRoutes,
  store: useCalendarStore,
  tabBar: true,
  tabOrder: 3,
  enabled: true,
});