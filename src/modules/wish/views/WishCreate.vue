<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { showToast } from 'vant';
import { useWishStore } from '../store';
import { useUserStore } from '@/modules/user/store';
import type { WishCategory, WishPriority } from '../types';

const router = useRouter();
const wishStore = useWishStore();
const userStore = useUserStore();

const content = ref('');
const category = ref<WishCategory>('food');
const priority = ref<WishPriority>('normal');
const anonymous = ref(false);

const categories: { key: WishCategory; label: string }[] = [
  { key: 'food', label: '🍽️ 吃的' },
  { key: 'chore', label: '🏠 家务' },
  { key: 'romance', label: '💕 浪漫' },
  { key: 'company', label: '👫 陪伴' },
  { key: 'surprise', label: '🎉 惊喜' },
  { key: 'other', label: '📦 其他' },
];

const priorities: { key: WishPriority; label: string }[] = [
  { key: 'normal', label: '普通' },
  { key: 'urgent', label: '⚡ 小急' },
  { key: 'romantic', label: '💕 小浪漫' },
];

const templates = [
  '帮我带一杯奶茶',
  '今晚一起看电影',
  '帮我按摩五分钟',
  '今天早点睡',
  '给我唱首歌',
  '周末一起出去玩',
  '帮我做顿饭',
  '陪我去散步',
];

function useTemplate(text: string) {
  content.value = text;
}

const submitting = ref(false);

async function onSubmit() {
  if (!content.value.trim()) {
    showToast('请输入心愿内容');
    return;
  }
  if (!userStore.partner) {
    showToast('请先绑定另一半');
    return;
  }

  submitting.value = true;
  wishStore.addWish({
    fromUserId: userStore.currentUserId,
    toUserId: userStore.partner.id,
    content: content.value.trim(),
    category: category.value,
    priority: priority.value,
    anonymous: anonymous.value,
  });

  showToast({ message: '心愿已发送 ✨', icon: 'success', duration: 1500 });
  setTimeout(() => { router.replace('/wish'); }, 800);
}
</script>

<template>
  <div class="wish-create">
    <!-- Content -->
    <div class="form-group">
      <label class="form-label">告诉TA你想要什么</label>
      <textarea
        v-model="content"
        class="form-textarea"
        placeholder="比如：想吃你做的番茄炒蛋 🍳"
        maxlength="50"
        rows="3"
      />
      <span class="form-counter" :class="{ 'form-counter--warn': content.length >= 45 }">
        {{ content.length }}/50
      </span>
    </div>

    <!-- Category -->
    <div class="form-group">
      <label class="form-label">分类</label>
      <div class="chip-group">
        <span
          v-for="cat in categories" :key="cat.key"
          class="chip" :class="{ 'chip--active': category === cat.key }"
          @click="category = cat.key"
        >{{ cat.label }}</span>
      </div>
    </div>

    <!-- Priority -->
    <div class="form-group">
      <label class="form-label">优先级</label>
      <div class="chip-group">
        <span
          v-for="p in priorities" :key="p.key"
          class="chip" :class="{ 'chip--active': priority === p.key }"
          @click="priority = p.key"
        >{{ p.label }}</span>
      </div>
    </div>

    <!-- Anonymous -->
    <div class="form-group form-toggle">
      <div>
        <span class="form-toggle__title">匿名发送</span>
        <span class="form-toggle__desc">TA不知道是谁发的</span>
      </div>
      <van-switch v-model="anonymous" size="22px" />
    </div>

    <!-- Templates -->
    <div class="form-group">
      <label class="form-label">💡 快速模板（点击填入）</label>
      <div class="template-grid">
        <span
          v-for="tpl in templates" :key="tpl"
          class="template-chip" @click="useTemplate(tpl)"
        >{{ tpl }}</span>
      </div>
    </div>

    <!-- Submit -->
    <van-button
      type="primary" round block
      :loading="submitting" loading-text="发送中..."
      @click="onSubmit"
    >
      发送心愿 ✨
    </van-button>
  </div>
</template>

<style scoped>
.wish-create {
  padding: var(--space-base);
  padding-bottom: calc(var(--tabbar-height) + var(--safe-area-bottom) + 32px);
}

.form-group {
  margin-bottom: var(--space-lg);
}

.form-label {
  display: block;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-sm);
}

.form-textarea {
  width: 100%;
  min-height: 80px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  background: var(--color-surface);
  resize: none;
  font-family: inherit;
}

.form-textarea:focus {
  border-color: var(--color-primary);
  outline: none;
}

.form-counter {
  display: block;
  text-align: right;
  font-size: var(--font-size-xs);
  color: var(--color-text-hint);
  margin-top: 4px;
}

.form-counter--warn {
  color: var(--color-danger);
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  padding: 6px 16px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.chip--active {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
  font-weight: var(--font-weight-bold);
}

.form-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--color-bg);
  border-radius: var(--radius-md);
}

.form-toggle__title {
  display: block;
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-bold);
}

.form-toggle__desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-hint);
}

.template-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.template-chip {
  padding: 6px 14px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  background: var(--color-primary-light);
  cursor: pointer;
  transition: all var(--duration-fast);
}

.template-chip:active {
  background: var(--color-primary);
  color: #fff;
}
</style>