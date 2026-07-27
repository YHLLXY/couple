import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { DiaryEntry } from './types';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/modules/user/store';

function genId(): string {
  return `d_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useDiaryStore = defineStore('diary', () => {
  const entries = ref<DiaryEntry[]>([]);
  const loaded = ref(false);

  function currentUserId(): string {
    return useUserStore().currentUserId;
  }

  function currentCoupleId(): string | null {
    return useUserStore().coupleId;
  }

  // === 数据加载 ===
  async function loadEntries(): Promise<void> {
    const cid = currentCoupleId();
    if (!cid) return;

    const { data, error } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('couple_id', cid)
      .order('created_at', { ascending: false });

    if (!error && data) {
      entries.value = data.map(mapRowToEntry);
      loaded.value = true;
    }
  }

  function mapRowToEntry(row: Record<string, unknown>): DiaryEntry {
    return {
      id: row.id as string,
      content: row.content as string,
      images: (row.images as string[]) || [],
      authorId: row.author_id as string,
      isPrivate: (row.is_private as boolean) || false,
      createdAt: new Date(row.created_at as string).getTime(),
      updatedAt: row.updated_at ? new Date(row.updated_at as string).getTime() : undefined,
    };
  }

  // === 计算属性 ===
  const visibleEntries = computed(() =>
    entries.value
      .filter(e => !e.isPrivate || e.authorId === currentUserId())
      .sort((a, b) => b.createdAt - a.createdAt)
  );

  const entriesByDate = computed(() => {
    const map = new Map<string, DiaryEntry[]>();
    for (const e of visibleEntries.value) {
      const date = new Date(e.createdAt).toISOString().slice(0, 10);
      const list = map.get(date) ?? [];
      list.push(e);
      map.set(date, list);
    }
    return map;
  });

  const diaryDates = computed(() => {
    const dates = new Set<string>();
    for (const e of entries.value) {
      if (!e.isPrivate || e.authorId === currentUserId()) {
        dates.add(new Date(e.createdAt).toISOString().slice(0, 10));
      }
    }
    return dates;
  });

  // === 操作 ===
  async function addEntry(content: string, dateStr: string, isPrivate: boolean): Promise<DiaryEntry | null> {
    const cid = currentCoupleId();
    const uid = currentUserId();
    if (!cid || !uid) return null;

    const row = {
      id: genId(),
      couple_id: cid,
      author_id: uid,
      content,
      is_private: isPrivate,
      entry_date: dateStr,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('diary_entries').insert(row);
    if (error) {
      console.error('[Diary] Insert failed:', error.message);
      return null;
    }

    const entry = mapRowToEntry(row);
    entries.value.push(entry);
    return entry;
  }

  async function updateEntry(id: string, content: string, isPrivate: boolean, dateStr?: string): Promise<boolean> {
    const cid = currentCoupleId();
    if (!cid) return false;

    const updateData: Record<string, unknown> = { content, is_private: isPrivate, updated_at: new Date().toISOString() };
    if (dateStr) {
      updateData.entry_date = dateStr;
    }

    const { error } = await supabase
      .from('diary_entries')
      .update(updateData)
      .eq('id', id)
      .eq('couple_id', cid);

    if (error) {
      console.error('[Diary] Update failed:', error.message);
      return false;
    }

    const entry = entries.value.find(e => e.id === id);
    if (entry && entry.authorId === currentUserId()) {
      entry.content = content;
      entry.isPrivate = isPrivate;
      entry.updatedAt = Date.now();
      if (dateStr) {
        entry.createdAt = new Date(dateStr).getTime();
      }
    }

    return true;
  }

  async function deleteEntry(id: string): Promise<boolean> {
    const cid = currentCoupleId();
    if (!cid) return false;

    const { error } = await supabase
      .from('diary_entries')
      .delete()
      .eq('id', id)
      .eq('couple_id', cid);

    if (error) return false;

    entries.value = entries.value.filter(e => e.id !== id);
    return true;
  }

  function getEntryById(id: string): DiaryEntry | undefined {
    return entries.value.find(e => e.id === id);
  }

  return {
    entries, loaded, visibleEntries, entriesByDate, diaryDates,
    currentUserId,
    loadEntries,
    addEntry, updateEntry, deleteEntry, getEntryById,
  };
});