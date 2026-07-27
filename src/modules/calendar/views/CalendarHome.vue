<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCalendarStore } from '../store';

const store = useCalendarStore();

const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
const grid = computed(() => store.getMonthGrid());
const monthLabel = computed(() => `${store.selectedMonth.year}年 ${store.selectedMonth.month}月`);

// Day detail popup
const showDayDetail = ref(false);
const detailDay = ref<number | null>(null);
const dayMarks = ref({ hasWish: false, hasCheckIn: false, hasAnniversary: false, hasDiary: false });

function onDayClick(day: number) {
  detailDay.value = day;
  const dateStr = store.getDateStr(day);
  dayMarks.value = store.getDayMarks(dateStr);
  store.selectedDate = dateStr;
  showDayDetail.value = true;
}

function isToday(day: number): boolean {
  const now = new Date();
  const d = store.getDateStr(day);
  return d === now.toISOString().slice(0, 10);
}
</script>

<template>
  <div class="calendar-page">
    <!-- 纪念日倒计时 -->
    <div v-if="store.upcomingAnniversaries.length > 0" class="countdown-section">
      <div
        v-for="a in store.upcomingAnniversaries"
        :key="a.id"
        class="countdown-card"
      >
        <span class="countdown-icon">{{ a.icon || '📅' }}</span>
        <div class="countdown-body">
          <span class="countdown-title">{{ a.title }}</span>
          <span class="countdown-days">
            还有 <strong>{{ a.daysLeft === 0 ? '今天' : a.daysLeft + ' 天' }}</strong>
          </span>
        </div>
      </div>
    </div>

    <!-- 月历 -->
    <div class="calendar-card">
      <div class="calendar-header">
        <button class="month-btn" @click="store.prevMonth()">&lsaquo;</button>
        <span class="month-label">{{ monthLabel }}</span>
        <button class="month-btn" @click="store.nextMonth()">&rsaquo;</button>
      </div>

      <!-- 星期表头 -->
      <div class="weekday-row">
        <span v-for="wd in weekDays" :key="wd" class="weekday-cell">{{ wd }}</span>
      </div>

      <!-- 日期网格 -->
      <div class="day-grid">
        <div
          v-for="(day, idx) in grid"
          :key="idx"
          class="day-cell"
          :class="{
            'day-cell--empty': day === null,
            'day-cell--today': day !== null && isToday(day!),
          }"
          @click="day !== null && onDayClick(day)"
        >
          <template v-if="day !== null">
            <span class="day-num">{{ day }}</span>
            <span class="day-dots">
              <span v-if="store.getDayMarks(store.getDateStr(day)).hasCheckIn" class="dot dot--green" />
              <span v-if="store.getDayMarks(store.getDateStr(day)).hasWish" class="dot dot--pink" />
              <span v-if="store.getDayMarks(store.getDateStr(day)).hasAnniversary" class="dot dot--yellow" />
              <span v-if="store.getDayMarks(store.getDateStr(day)).hasDiary" class="dot dot--purple" />
            </span>
          </template>
        </div>
      </div>

      <!-- 图例 -->
      <div class="legend">
        <span class="legend-item"><span class="dot dot--green" /> 已签到</span>
        <span class="legend-item"><span class="dot dot--pink" /> 有心愿</span>
        <span class="legend-item"><span class="dot dot--yellow" /> 纪念日</span>
        <span class="legend-item"><span class="dot dot--purple" /> 有日记</span>
      </div>
    </div>

    <!-- 日详情弹窗 -->
    <van-popup v-model:show="showDayDetail" position="bottom" round :safe-area-inset-bottom="true">
      <div class="day-detail" v-if="detailDay !== null">
        <h3 class="day-detail__title">{{ store.selectedMonth.year }}/{{ store.selectedMonth.month }}/{{ detailDay }}</h3>
        <div class="day-detail__marks">
          <p v-if="dayMarks.hasCheckIn">✅ 已签到</p>
          <p v-if="dayMarks.hasWish">💝 当天有心愿记录</p>
          <p v-if="dayMarks.hasAnniversary">🎂 纪念日</p>
          <p v-if="dayMarks.hasDiary">
            📔 <a :href="'#/diary?date=' + store.selectedDate" style="color: var(--color-primary);">查看日记</a>
          </p>
          <p v-if="!dayMarks.hasCheckIn && !dayMarks.hasWish && !dayMarks.hasAnniversary && !dayMarks.hasDiary" class="no-data">
            这一天还没有记录
          </p>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.calendar-page {
  padding: var(--space-base);
  padding-bottom: calc(var(--tabbar-height) + var(--safe-area-bottom) + 24px);
}

/* 倒计时 */
.countdown-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: var(--space-base);
}

.countdown-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: var(--gradient-card);
  border-radius: var(--radius-md);
}

.countdown-icon { font-size: 28px; }

.countdown-body { display: flex; flex-direction: column; }
.countdown-title { font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); color: var(--color-text-primary); }
.countdown-days { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.countdown-days strong { color: var(--color-primary); font-size: var(--font-size-md); }

/* 月历卡片 */
.calendar-card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--space-base);
  box-shadow: var(--shadow-card);
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-md);
}

.month-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  font-size: 18px;
  color: var(--color-text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.month-label {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
}

.weekday-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 4px;
}

.weekday-cell {
  text-align: center;
  font-size: var(--font-size-xs);
  color: var(--color-text-hint);
  padding: 4px 0;
}

.day-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.day-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
  position: relative;
  transition: background var(--duration-fast);
}

.day-cell--empty { cursor: default; }

.day-cell:not(.day-cell--empty):active {
  background: var(--color-primary-light);
}

.day-cell--today {
  background: var(--color-primary-light);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}

.day-num { line-height: 1; }

.day-dots {
  display: flex;
  gap: 2px;
  margin-top: 2px;
}

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  display: inline-block;
}

.dot--green { background: var(--color-accent); }
.dot--pink { background: var(--color-primary); }
.dot--yellow { background: var(--color-warning); }
.dot--purple { background: #9c27b0; }

.legend {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: var(--space-md);
  padding-top: var(--space-sm);
  border-top: 1px solid var(--color-border);
}

.legend-item {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 日详情弹窗 */
.day-detail {
  padding: var(--space-lg);
  min-height: 160px;
}

.day-detail__title {
  font-size: var(--font-size-lg);
  text-align: center;
  margin-bottom: var(--space-lg);
}

.day-detail__marks p {
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
}

.no-data {
  color: var(--color-text-hint);
  text-align: center;
  padding: var(--space-xl);
}
</style>