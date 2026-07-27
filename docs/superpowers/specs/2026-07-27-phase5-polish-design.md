# 阶段 5：打磨 — 设计文档

> PWA 配置、移动端兼容修复。性能优化延后。

---

## 一、PWA 配置

### 1.1 安装 vite-plugin-pwa

```bash
npm install -D vite-plugin-pwa
```

### 1.2 vite.config.ts 配置

```typescript
import { VitePWA } from 'vite-plugin-pwa';

// 在 plugins 数组中追加：
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png}'],
  },
  manifest: {
    name: '小甜豆 — 情侣心愿',
    short_name: '小甜豆',
    description: '让对方知道你今天想被宠爱',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFF5F7',
    theme_color: '#FF7A95',
    icons: [
      { src: '/assets/pwa-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/assets/pwa-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
})
```

### 1.3 图标

从现有 `public/assets/app-icon.svg` 生成 PNG：

| 尺寸 | 文件 | 用途 |
|------|------|------|
| 192×192 | `public/assets/pwa-192.png` | PWA 图标 + apple-touch-icon |
| 512×512 | `public/assets/pwa-512.png` | PWA 大图标 |

转换方式：用任意在线工具（如 svgtopng.com）或本地 `sharp` / `sips` 命令将 SVG 转 PNG。

### 1.4 index.html 补充

```html
<link rel="apple-touch-icon" href="/assets/pwa-192.png" />
<link rel="manifest" href="/manifest.webmanifest" />
```

> `manifest.webmanifest` 由 vite-plugin-pwa 在构建时自动生成，不需要手动创建。

---

## 二、移动端兼容修复

### 2.1 iOS textarea 防缩放

`DiaryWrite.vue` 中 textarea 的 `font-size` 改为固定 `16px`：

```css
.diary-write__textarea {
  font-size: 16px; /* 防止 iOS 自动缩放（<16px 会触发） */
}
```

原因：iOS Safari 在 input/textarea 字体 < 16px 时会自动放大页面。`--font-size-base` 是 14px，需要覆盖。

### 2.2 全局 overscroll 控制

`reset.css` body 加一行：

```css
body {
  overscroll-behavior: none;
}
```

原因：防止 iOS Safari 下拉触发橡皮筋效果，和 Vant 的下拉刷新（pull-refresh）冲突。

---

## 三、性能优化（延后）

### 当前状态

| 已到位 | 说明 |
|------|------|
| 路由懒加载 | 所有页面 `() => import(...)` |
| Vant tree-shake | `unplugin-vue-components` 自动按需引入 |
| 系统字体 | 零加载时间 |
| CSS 变量 | 无运行时编译 |

### 待后续评估

| 方向 | 触发条件 | 方案 |
|------|------|------|
| Vant 分包 | vendor chunk > 200KB | 按功能模块 split Vant 组件到独立 chunk |
| 图片优化 | 日记图片功能上线 | 上传前压缩 + WebP 格式 + 懒加载 |
| 关键 CSS 内联 | 首次渲染慢 | 提取首屏关键 CSS 内联到 index.html |
| HTTP/2 推送 | 接后端后 | 服务器配置推送关键资源 |
| 字体子集化 | 引入 Web 字体时 | 按中文常用字裁剪 |

> **触发时机**：接后端（阶段 4c）后，用 Lighthouse 跑一次审计，按报告针对性优化。现在优化属于过早优化。

---

## 四、改动文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 安装 | `package.json` | `vite-plugin-pwa` |
| 修改 | `vite.config.ts` | 加 VitePWA 插件配置 |
| 新建 | `public/assets/pwa-192.png` | PWA 图标 |
| 新建 | `public/assets/pwa-512.png` | PWA 图标 |
| 修改 | `index.html` | 加 apple-touch-icon + manifest link |
| 修改 | `src/styles/reset.css` | 加 `overscroll-behavior: none` |
| 修改 | `src/modules/diary/views/DiaryWrite.vue` | textarea font-size 改 16px |

---

## 五、验证清单

- [ ] `npm run build` 构建成功，dist 包含 `manifest.webmanifest` + `sw.js`
- [ ] 手机浏览器打开 → 弹出"添加到主屏幕"提示
- [ ] 添加到主屏幕后 → 以 standalone 模式打开（无浏览器地址栏）
- [ ] 开飞行模式 → 应用仍能打开
- [ ] iOS 点击 DiaryWrite 的 textarea → 页面不缩放