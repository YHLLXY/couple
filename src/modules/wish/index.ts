import { registerModule } from '@/core/registry';
import { wishRoutes } from './routes';
import { useWishStore } from './store';

registerModule({
  id: 'wish',
  name: '心愿',
  icon: 'like-o',
  routes: wishRoutes,
  store: useWishStore,
  tabBar: true,
  tabOrder: 2,
  enabled: true,
});