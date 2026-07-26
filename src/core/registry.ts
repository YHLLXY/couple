import type { RouteRecordRaw } from 'vue-router';

export interface ModuleManifest {
  id: string;
  name: string;
  icon?: string;
  routes: RouteRecordRaw[];
  store?: unknown;
  tabBar?: boolean;
  tabOrder?: number;
  enabled: boolean;
}

const moduleRegistry: ModuleManifest[] = [];

export function registerModule(m: ModuleManifest): void {
  // Prevent duplicate registration
  if (moduleRegistry.some((mod) => mod.id === m.id)) {
    console.warn(`[Registry] Module "${m.id}" is already registered, skipping.`);
    return;
  }
  moduleRegistry.push(m);
}

export function unregisterModule(id: string): void {
  const idx = moduleRegistry.findIndex((m) => m.id === id);
  if (idx !== -1) {
    moduleRegistry.splice(idx, 1);
  }
}

export function getEnabledModules(): ModuleManifest[] {
  return moduleRegistry.filter((m) => m.enabled);
}

export function getTabBarModules(): ModuleManifest[] {
  return getEnabledModules()
    .filter((m) => m.tabBar)
    .sort((a, b) => (a.tabOrder ?? 99) - (b.tabOrder ?? 99));
}

export function getAllRoutes(): RouteRecordRaw[] {
  return getEnabledModules().flatMap((m) => m.routes);
}

export function isModuleEnabled(id: string): boolean {
  return moduleRegistry.some((m) => m.id === id && m.enabled);
}