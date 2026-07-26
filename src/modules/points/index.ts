// src/modules/points/index.ts
import { registerModule } from '@/core/registry';
import { pointsRoutes } from './routes';

registerModule({
  id: 'points',
  name: '积分',
  routes: pointsRoutes,
  tabBar: false,
  enabled: true,
});