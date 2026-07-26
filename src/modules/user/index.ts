import { registerModule } from '@/core/registry';
import { userRoutes } from './routes';
import { useUserStore } from './store';

registerModule({
  id: 'user',
  name: '我的',
  icon: 'user-o',
  routes: userRoutes,
  store: useUserStore,
  tabBar: true,
  tabOrder: 4,
  enabled: true,
});