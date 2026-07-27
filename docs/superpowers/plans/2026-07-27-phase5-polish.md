# 阶段 5：打磨 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** PWA 配置（可安装 + 离线缓存）+ 移动端兼容修复（iOS textarea 缩放 + overscroll）

**Architecture:** 安装 vite-plugin-pwa → 配置 workbox precache + manifest → 生成 PNG 图标 → 补 index.html meta 标签 → 修两处移动端 CSS

**Tech Stack:** Vite 5, vite-plugin-pwa, Workbox

---

### Task 1: 安装 vite-plugin-pwa + 配置 vite.config.ts

**Files:**
- Modify: `package.json`（依赖变更）
- Modify: `vite.config.ts`

- [ ] **Step 1: 安装依赖**

```bash
cd "E:/homework/开发/Claudecode/couple" && npm install -D vite-plugin-pwa
```

- [ ] **Step 2: 修改 vite.config.ts**

在文件顶部加 import：

```typescript
import { VitePWA } from 'vite-plugin-pwa';
```

在 plugins 数组中，`vue()` 之后追加 PWA 插件：

```typescript
plugins: [
  vue(),
  AutoImport({
    resolvers: [VantResolver()],
  }),
  Components({
    resolvers: [VantResolver()],
  }),
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
  }),
],
```

- [ ] **Step 3: 验证构建**

```bash
npm run build 2>&1 | tail -5
```

Expected: 构建成功，dist 目录下出现 `manifest.webmanifest` 和 `sw.js`。

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json vite.config.ts
git commit -m "feat(pwa): add vite-plugin-pwa with workbox precache and manifest"
```

---

### Task 2: 生成 PWA 图标 + 更新 index.html

**Files:**
- Create: `public/assets/pwa-192.png`
- Create: `public/assets/pwa-512.png`
- Modify: `index.html`

- [ ] **Step 1: 生成 PNG 图标**

现有 `public/assets/app-icon.svg` 是一个 100×100 的渐变圆角矩形 + 🫘 emoji。直接用 Node.js 的 canvas 或者在线工具转换。

方案 A（推荐）：用一个简单的 HTML canvas 脚本生成 PNG。

方案 B：用在线工具（如 https://svgtopng.com）手动转换后放到 public/assets/。

**如果有 sharp 或 canvas 包可用，用以下方式：**

由于没有安装 canvas 相关包，用最简方式——打开浏览器控制台执行：

```javascript
// 在浏览器控制台执行以生成 PWA 图标
const sizes = [192, 512];
sizes.forEach(size => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  // 渐变背景
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#FF7A95');
  gradient.addColorStop(1, '#FFB17A');
  ctx.fillStyle = gradient;
  
  // 圆角矩形
  const r = size * 0.22;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.fill();
  
  // emoji 文字
  ctx.fillStyle = '#fff';
  ctx.font = `${size * 0.42}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🫘', size / 2, size * 0.63);
  
  const link = document.createElement('a');
  link.download = `pwa-${size}.png`;
  link.href = canvas.toDataURL();
  link.click();
});
```

然后把下载的两个 PNG 放到 `public/assets/pwa-192.png` 和 `public/assets/pwa-512.png`。

- [ ] **Step 2: 修改 index.html**

在 `<head>` 中，在现有 `<link rel="icon">` 之后加两行：

```html
<link rel="apple-touch-icon" href="/assets/pwa-192.png" />
<link rel="manifest" href="/manifest.webmanifest" />
```

- [ ] **Step 3: 验证**

确认 `public/assets/` 下有 4 个文件：
```
app-icon.svg  pwa-192.png  pwa-512.png
```

- [ ] **Step 4: Commit**

```bash
git add public/assets/pwa-192.png public/assets/pwa-512.png index.html
git commit -m "feat(pwa): add PWA icons and meta tags"
```

---

### Task 3: 移动端兼容修复

**Files:**
- Modify: `src/styles/reset.css`
- Modify: `src/modules/diary/views/DiaryWrite.vue`

- [ ] **Step 1: 修复 iOS textarea 缩放**

在 `DiaryWrite.vue` 的 `<style scoped>` 中，找到 `.diary-write__textarea` 的 `font-size` 行：

```css
.diary-write__textarea {
  /* ... */
  font-size: var(--font-size-base);  /* 14px — 会导致 iOS 缩放 */
```

改为：

```css
.diary-write__textarea {
  /* ... */
  font-size: 16px; /* 防止 iOS 自动缩放 */
```

- [ ] **Step 2: 加全局 overscroll 控制**

在 `reset.css` 的 `body {}` 规则中，`overflow-x: hidden;` 下方加：

```css
body {
  /* ... existing ... */
  overflow-x: hidden;
  overscroll-behavior: none;   /* ← 新增 */
}
```

- [ ] **Step 3: 验证**

```bash
npx vue-tsc --noEmit --skipLibCheck
```

Expected: 0 错误。

- [ ] **Step 4: Commit**

```bash
git add src/styles/reset.css src/modules/diary/views/DiaryWrite.vue
git commit -m "fix: iOS textarea zoom and overscroll behavior"
```

---

### Task 4: README 更新 + 最终验证

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 更新 README**

**阶段表**：阶段 5 状态改为 ✅ 完成

```
| 阶段 5 | 打磨 — 真机适配、PWA、离线缓存 | ✅ 完成 |
```

**更新日志**：在最新位置加：

```markdown
### 2026-07-27 — 阶段 5 完成

- `feat(pwa)`: PWA 配置 — vite-plugin-pwa + Workbox 预缓存 + manifest + 图标
- `fix`: iOS textarea 防缩放（font-size 16px）+ 全局 overscroll-behavior
```

- [ ] **Step 2: 最终构建验证**

```bash
npm run build 2>&1 | tail -10
```

Expected: 构建成功。确认 dist 目录包含：
- `manifest.webmanifest`
- `sw.js`（或 `workbox-*.js`）

- [ ] **Step 3: Commit + Push**

```bash
git add README.md
git commit -m "docs: update README for phase 5 polish"
git push
```

---

### 手机验证清单

完成后在手机上打开部署的 URL，逐项检查：

- [ ] 浏览器弹出"添加到主屏幕"提示
- [ ] 添加到主屏幕后，以 standalone 模式打开
- [ ] 开飞行模式，应用仍能打开
- [ ] iOS 点击 DiaryWrite textarea，页面不缩放
- [ ] 下拉不触发橡皮筋效果