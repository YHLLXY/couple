<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { showToast } from 'vant';
import { useInteractStore } from '../store';
import { useUserStore } from '@/modules/user/store';
import { useDiaryStore } from '@/modules/diary/store';
import type { Sticker } from '../types';

const router = useRouter();
const store = useInteractStore();
const userStore = useUserStore();
const diaryStore = useDiaryStore();

const showBean = ref(false);

onMounted(async () => {
  // 确保用户数据已加载
  if (!userStore.isLoggedIn) {
    await userStore.initAuth();
  }
  // 加载签到数据 + 从 Supabase 恢复互动动态
  await store.loadCheckins();
  await store.loadActivities();

  // 加载日记数据以检测未读
  if (!diaryStore.loaded && userStore.coupleId) {
    await diaryStore.loadEntries();
    diaryStore.subscribeRealtime();
  }
  // 如果 TA 有未读的公开日记，显示小豆子
  if (diaryStore.hasUnreadPartnerDiary) {
    // 延迟一下让入场动画更自然
    setTimeout(() => { showBean.value = true; }, 800);
  }
});

// 贴纸飘浮动效
const floatingStickers = ref<{ id: string; emoji: string; x: number; delay: number }[]>([]);
let floatId = 0;

function onStickerClick(sticker: Sticker) {
  const id = `float_${floatId++}`;
  floatingStickers.value.push({
    id,
    emoji: sticker.emoji,
    x: Math.random() * 60 + 20, // 20-80% horizontal
    delay: 0,
  });
  store.addSticker(sticker);
  setTimeout(() => {
    floatingStickers.value = floatingStickers.value.filter((f) => f.id !== id);
  }, 1000);
}

async function onCheckIn() {
  if (store.checkedInToday) {
    showToast('今天已经签到过了～');
    return;
  }
  const result = await store.doCheckIn();
  if (result.success) {
    showToast({ message: '签到成功！今天也想你 💕', icon: 'success' });
  } else {
    showToast(result.reason || '签到失败');
  }
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min}分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}小时前`;
  return `${Math.floor(hr / 24)}天前`;
}

function onBeanClick() {
  showBean.value = false;
  diaryStore.markDiarySeen();
  router.push('/diary');
}
</script>

<template>
  <div class="interact-page">
    <!-- 签到区 -->
    <div class="checkin-section">
      <button
        class="checkin-btn"
        :class="{ 'checkin-btn--done': store.checkedInToday }"
        @click="onCheckIn"
      >
        <span class="checkin-btn__icon">{{ store.checkedInToday ? '✅' : '💝' }}</span>
        <span class="checkin-btn__text">
          {{ store.checkedInToday ? '今日已签到' : '今天也想你' }}
        </span>
      </button>
      <p v-if="store.consecutiveDays > 0" class="checkin-streak">
        🔥 已连续签到 <strong>{{ store.consecutiveDays }}</strong> 天
      </p>
    </div>

    <!-- 🫘 小豆子悄悄话：TA 写了公开日记时出现 -->
    <Transition name="bean-whisper">
      <div v-if="showBean" class="bean-whisper" @click="onBeanClick">
        <div class="bean-whisper__avatar">
          <span class="bean-char">🫘</span>
          <span class="bean-sparkle s1">✨</span>
          <span class="bean-sparkle s2">💕</span>
          <span class="bean-sparkle s3">⭐</span>
        </div>
        <div class="bean-whisper__bubble">
          <p class="bubble-text">嘘... TA 今天写了日记哦</p>
          <span class="bubble-arrow" />
        </div>
      </div>
    </Transition>

    <!-- 贴纸墙 -->
    <div class="sticker-section">
      <h3 class="section-title">💌 贴纸墙</h3>
      <div class="sticker-grid">
        <button
          v-for="s in store.stickers"
          :key="s.id"
          class="sticker-item"
          @click="onStickerClick(s)"
        >
          <span class="sticker-emoji">{{ s.emoji }}</span>
          <span class="sticker-label">{{ s.label }}</span>
        </button>
      </div>
    </div>

    <!-- 互动动态 -->
    <div class="activity-section">
      <h3 class="section-title">📋 互动动态</h3>
      <div v-if="store.activityLog.length === 0" class="activity-empty">
        <p>还没有互动记录</p>
        <p class="sub">签到或发送贴纸来留下足迹吧～</p>
      </div>
      <div v-else class="activity-list">
        <div
          v-for="item in store.activityLog"
          :key="item.id"
          class="activity-item"
        >
          <span class="activity-emoji">{{ item.emoji || '💝' }}</span>
          <span class="activity-content">{{ item.content }}</span>
          <span class="activity-time">{{ formatTime(item.createdAt) }}</span>
        </div>
      </div>
    </div>

    <!-- 飘浮贴纸层 -->
    <div class="floating-layer" aria-hidden="true">
      <span
        v-for="f in floatingStickers"
        :key="f.id"
        class="floating-sticker"
        :style="{ left: f.x + '%' }"
      >
        {{ f.emoji }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.interact-page {
  padding: var(--space-base);
  padding-bottom: calc(var(--tabbar-height) + var(--safe-area-bottom) + 24px);
  position: relative;
}

/* 🫘 小豆子悄悄话 */
.bean-whisper {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  margin: 0 var(--space-base) var(--space-base);
  background: linear-gradient(135deg, #FFF5F7, #FFEEF2);
  border-radius: 16px;
  border: 1px solid rgba(255, 122, 149, 0.15);
  cursor: pointer;
  position: relative;
  overflow: visible;
  animation: beanSlideIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.bean-whisper:active {
  transform: scale(0.98);
  background: linear-gradient(135deg, #FFEEF2, #FFE5EA);
}

/* 豆子头像 + 星星 */
.bean-whisper__avatar {
  position: relative;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #FF7A95, #FF9DB5);
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(255, 122, 149, 0.35);
}
.bean-char {
  font-size: 24px;
  animation: beanWiggle 2s ease-in-out infinite;
}
.bean-sparkle {
  position: absolute;
  font-size: 10px;
  pointer-events: none;
  animation: sparkleFloat 1.5s ease-in-out infinite;
}
.bean-sparkle.s1 { top: -6px; right: -2px; animation-delay: 0s; }
.bean-sparkle.s2 { bottom: -4px; left: -4px; animation-delay: 0.5s; }
.bean-sparkle.s3 { top: -2px; left: -6px; animation-delay: 1s; }

@keyframes beanWiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(5deg); }
  75% { transform: rotate(-5deg); }
}

@keyframes sparkleFloat {
  0%, 100% { opacity: 0; transform: scale(0.5) translateY(0); }
  50% { opacity: 1; transform: scale(1.2) translateY(-4px); }
}

/* 气泡对话框 */
.bean-whisper__bubble {
  flex: 1;
  position: relative;
  background: #fff;
  border-radius: 14px;
  padding: 10px 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.bubble-text {
  font-size: 14px;
  color: #555;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  border-right: 2px solid var(--color-primary);
  animation:
    typing 2s steps(11, end),
    blink 0.6s step-end infinite;
  max-width: fit-content;
}

@keyframes typing {
  from { max-width: 0; }
  to { max-width: 100%; }
}

@keyframes blink {
  50% { border-right-color: transparent; }
}

.bubble-arrow {
  position: absolute;
  left: -6px;
  top: 14px;
  width: 0;
  height: 0;
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
  border-right: 6px solid #fff;
}

/* 豆子入场 */
@keyframes beanSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 过渡动画 */
.bean-whisper-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.bean-whisper-leave-active {
  transition: all 0.25s ease;
}
.bean-whisper-enter-from,
.bean-whisper-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

/* 签到区 */
.checkin-section {
  text-align: center;
  padding: var(--space-xl) 0 var(--space-lg);
}

.checkin-btn {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 48px;
  border-radius: var(--radius-lg);
  background: var(--gradient-primary);
  border: none;
  color: #fff;
  cursor: pointer;
  transition: all var(--duration-normal) var(--ease-out);
  box-shadow: var(--shadow-elevated);
}

.checkin-btn:active { transform: scale(0.95); }

.checkin-btn--done {
  background: var(--color-border);
  box-shadow: none;
  cursor: default;
}

.checkin-btn__icon { font-size: 40px; }
.checkin-btn__text { font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); }

.checkin-streak {
  margin-top: var(--space-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

/* 贴纸墙 */
.sticker-section { margin-bottom: var(--space-lg); }

.section-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-md);
}

.sticker-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.sticker-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 8px;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-out);
}

.sticker-item:active { transform: scale(0.9); }

.sticker-emoji { font-size: 32px; }
.sticker-label { font-size: var(--font-size-xs); color: var(--color-text-secondary); }

/* 动态 */
.activity-empty {
  text-align: center;
  padding: var(--space-xl);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.activity-empty .sub { font-size: var(--font-size-xs); color: var(--color-text-hint); margin-top: 4px; }

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--color-surface);
  border-radius: var(--radius-sm);
}

.activity-emoji { font-size: 20px; flex-shrink: 0; }
.activity-content { flex: 1; font-size: var(--font-size-sm); color: var(--color-text-primary); }
.activity-time { font-size: var(--font-size-xs); color: var(--color-text-hint); flex-shrink: 0; }

/* 飘浮贴纸 */
.floating-layer {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  z-index: 1000;
  overflow: hidden;
}

.floating-sticker {
  position: absolute;
  bottom: 80px;
  font-size: 36px;
  animation: stickerFloat 1s var(--ease-out) both;
}

@keyframes stickerFloat {
  0% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
  50% { opacity: 0.8; transform: translateY(-60px) scale(1.3) rotate(10deg); }
  100% { opacity: 0; transform: translateY(-120px) scale(0.5) rotate(-20deg); }
}
</style>