export type ThemeName = 'default' | 'blueberry' | 'lemon';

export interface ThemeConfig {
  name: ThemeName;
  label: string;
  primaryColor: string;
}

export const THEME_LIST: ThemeConfig[] = [
  { name: 'default', label: '🍓 草莓粉', primaryColor: '#FF7A95' },
  { name: 'blueberry', label: '🫐 蓝莓蓝', primaryColor: '#7A9EFF' },
  { name: 'lemon', label: '🍋 柠檬黄', primaryColor: '#FFB84D' },
];