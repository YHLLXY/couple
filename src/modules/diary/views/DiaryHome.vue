<!-- src/modules/diary/views/DiaryHome.vue -->
<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDiaryStore } from '../store';
import DiaryCard from '../components/DiaryCard.vue';
import type { DiaryEntry } from '../types';

const route = useRoute();
const router = useRouter();
const store = useDiaryStore();

// 按日期倒序分组
const dateGroups = computed(() => {
  const groups: { date: string; label: string; entries: DiaryEntry[] }[] = [];
  for (const [date, entries] of store.entriesByDate) {
    const d = new Date(date);
    groups.push({
      date,
      label: `${d.getMonth() + 1}月${d.getDate()}日`,
      entries,
    });
  }
  return groups.sort((a, b) => b.date.localeCompare(a.date));
});

// 从日历跳转的 ?date= 参数
const highlightDate = ref(route.query.date as string | undefined);

function onCardClick(entry: DiaryEntry) {
  router.push({ path: '/diary/write', query: { id: entry.id } });
}

function goWrite() {
  router.push('/diary/write');
}

// Supabase 数据加载 + Realtime 订阅
onMounted(async () => {
  if (!store.loaded) {
    await store.loadEntries();
    store.subscribeRealtime();
  }
  // 用户进入了日记页 → 标记已读（清除未读提醒）
  store.markDiarySeen();
});

// 从日历跳过来时滚动到对应日期
const dateSectionRefs = ref<Record<string, HTMLElement | null>>({});

watch(dateGroups, () => {
  if (highlightDate.value) {
    nextTick(() => {
      const el = dateSectionRefs.value[highlightDate.value!];
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      highlightDate.value = undefined;
    });
  }
});
</script>

<template>
  <div class="diary-home">
    <!-- 顶部 -->
    <div class="diary-home__header">
      <h2>📔 共同日记</h2>
      <van-button type="primary" size="small" round @click="goWrite">
        ✏️ 写日记
      </van-button>
    </div>

    <!-- 空状态 -->
    <div v-if="dateGroups.length === 0" class="empty-hint">
      <p>还没有写过日记</p>
      <van-button type="primary" size="small" round @click="goWrite">写第一篇日记</van-button>
    </div>

    <!-- 时间线 -->
    <div v-else class="timeline">
      <div
        v-for="group in dateGroups"
        :key="group.date"
        :ref="el => dateSectionRefs[group.date] = el as HTMLElement | null"
        class="timeline-section"
      >
        <div class="timeline-date">
          <span class="timeline-date__dot"></span>
          {{ group.label }}
        </div>
        <DiaryCard
          v-for="entry in group.entries"
          :key="entry.id"
          :entry="entry"
          @click="onCardClick"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.diary-home {
  padding: var(--space-base);
  padding-bottom: calc(var(--tabbar-height) + var(--safe-area-bottom) + 24px);
}

.diary-home__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-lg);
}

.diary-home__header h2 {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.timeline {
  position: relative;
}

.timeline-section {
  margin-bottom: var(--space-base);
}

.timeline-date {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-sm);
  display: flex;
  align-items: center;
  gap: 8px;
}

.timeline-date__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  flex-shrink: 0;
}

.empty-hint {
  text-align: center;
  padding: var(--space-xl);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
</style>