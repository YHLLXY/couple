<!-- src/modules/diary/views/DiaryWrite.vue -->
<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { showToast, showDialog } from 'vant';
import { useDiaryStore } from '../store';

const route = useRoute();
const router = useRouter();
const store = useDiaryStore();

const isEdit = computed(() => !!route.query.id);

const dateStr = ref('');
const content = ref('');
const isPrivate = ref(false);

// 常用 emoji 36个
const emojis = ['😊','😂','❤️','😍','🎉','💕','🥹','😢','😡','👍','🔥','⭐',
  '🌈','🌸','🍀','🎂','🍕','🎮','💪','🤗','😴','💤','🌙','☀️',
  '🌧️','❄️','🎵','📖','✈️','🏠','🐱','🐶','🌻','💐','🍰','☕'];

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 初始化
if (isEdit.value) {
  const entry = store.getEntryById(route.query.id as string);
  if (entry && entry.authorId === store.currentUserId()) {
    dateStr.value = formatDate(new Date(entry.createdAt));
    content.value = entry.content;
    isPrivate.value = entry.isPrivate;
  } else {
    showToast('无法编辑这条日记');
    router.back();
  }
} else {
  dateStr.value = (route.query.date as string) || formatDate(new Date());
}

// 在光标位置插入 emoji
function insertEmoji(emoji: string) {
  const textarea = document.querySelector('.diary-write__textarea') as HTMLTextAreaElement;
  if (!textarea) {
    content.value += emoji;
    return;
  }
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  content.value = content.value.slice(0, start) + emoji + content.value.slice(end);
  nextTick(() => {
    textarea.focus();
    const pos = start + emoji.length;
    textarea.setSelectionRange(pos, pos);
  });
}

async function handleSave() {
  if (!content.value.trim()) {
    showToast('写点什么吧');
    return;
  }

  if (isEdit.value) {
    await store.updateEntry(route.query.id as string, content.value.trim(), isPrivate.value, dateStr.value);
    showToast('已更新');
  } else {
    await store.addEntry(content.value.trim(), dateStr.value, isPrivate.value);
    showToast('已保存');
  }
  router.back();
}

function handleDelete() {
  if (!isEdit.value) return;
  showDialog({
    title: '删除日记',
    message: '删除后无法恢复',
  }).then(async () => {
    await store.deleteEntry(route.query.id as string);
    showToast('已删除');
    router.back();
  }).catch(() => {});
}

function onDateChange(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.value) {
    dateStr.value = input.value;
  }
}

function dateLabel(): string {
  const d = new Date(dateStr.value);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
</script>

<template>
  <div class="diary-write">
    <!-- 日期选择 — 用原生 input[type=date] 最简单可靠 -->
    <label class="diary-write__date">
      <span>📅 {{ dateLabel() }}</span>
      <input
        type="date"
        :value="dateStr"
        @change="onDateChange"
        class="diary-write__date-input"
      />
    </label>

    <!-- 编辑区 -->
    <textarea
      class="diary-write__textarea"
      v-model="content"
      placeholder="今天发生了什么有趣的事..."
      rows="8"
    ></textarea>

    <!-- Emoji 面板 -->
    <div class="emoji-panel">
      <div class="emoji-panel__label">😊 表情</div>
      <div class="emoji-panel__grid">
        <span
          v-for="emoji in emojis"
          :key="emoji"
          class="emoji-panel__item"
          @click="insertEmoji(emoji)"
        >{{ emoji }}</span>
      </div>
    </div>

    <!-- 私密开关 -->
    <div class="diary-write__options">
      <div class="option-row">
        <span>🔒 标记为私密（仅自己可见）</span>
        <van-switch v-model="isPrivate" size="22px" />
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="diary-write__actions">
      <van-button type="primary" round block @click="handleSave">
        {{ isEdit ? '保存修改' : '📝 完成' }}
      </van-button>
      <van-button
        v-if="isEdit"
        type="danger"
        round
        block
        plain
        @click="handleDelete"
        style="margin-top: 10px;"
      >
        🗑️ 删除这条日记
      </van-button>
    </div>
  </div>
</template>

<style scoped>
.diary-write {
  padding: var(--space-base);
  padding-bottom: calc(var(--tabbar-height) + var(--safe-area-bottom) + 24px);
}

.diary-write__date {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  margin-bottom: var(--space-base);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  cursor: pointer;
  position: relative;
}

.diary-write__date-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  cursor: pointer;
}

.diary-write__textarea {
  width: 100%;
  min-height: 160px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 16px; /* 防止 iOS 自动缩放 */
  line-height: 1.6;
  color: var(--color-text-primary);
  background: var(--color-surface);
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
}

.diary-write__textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.diary-write__textarea::placeholder {
  color: var(--color-text-hint);
}

/* Emoji 面板 */
.emoji-panel {
  margin-top: var(--space-base);
  padding: 10px;
  background: var(--color-surface);
  border-radius: var(--radius-md);
}

.emoji-panel__label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.emoji-panel__grid {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 6px;
}

.emoji-panel__item {
  font-size: 22px;
  text-align: center;
  padding: 4px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background var(--duration-fast);
}

.emoji-panel__item:active {
  background: var(--color-primary-light);
}

/* 选项 */
.diary-write__options {
  margin-top: var(--space-base);
}

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

/* 操作按钮 */
.diary-write__actions {
  margin-top: var(--space-xl);
}
</style>