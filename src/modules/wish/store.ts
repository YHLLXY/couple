import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Wish, WishStatus, WishCategory, WishPriority } from './types';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/modules/user/store';

function generateId(): string {
  return `w_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useWishStore = defineStore('wish', () => {
  const wishes = ref<Wish[]>([]);
  const statusFilter = ref<'all' | 'pending' | 'active' | 'done'>('all');
  const loaded = ref(false);

  function currentUserId(): string {
    return useUserStore().currentUserId;
  }

  function currentCoupleId(): string | null {
    return useUserStore().coupleId;
  }

  // === 数据加载（从 Supabase） ===
  async function loadWishes(): Promise<void> {
    const cid = currentCoupleId();
    if (!cid) return;

    const { data, error } = await supabase
      .from('wishes')
      .select('*')
      .eq('couple_id', cid)
      .order('created_at', { ascending: false });

    if (!error && data) {
      wishes.value = data.map(mapRowToWish);
      loaded.value = true;
    }
  }

  function mapRowToWish(row: Record<string, unknown>): Wish {
    return {
      id: row.id as string,
      fromUserId: row.from_user_id as string,
      toUserId: row.to_user_id as string,
      content: row.content as string,
      category: row.category as WishCategory,
      priority: row.priority as WishPriority,
      status: row.status as WishStatus,
      imageUrl: row.image_url as string | undefined,
      proofImageUrl: row.proof_image_url as string | undefined,
      proofNote: row.proof_note as string | undefined,
      createdAt: new Date(row.created_at as string).getTime(),
      completedAt: row.completed_at ? new Date(row.completed_at as string).getTime() : undefined,
      expireAt: row.expire_at ? new Date(row.expire_at as string).getTime() : undefined,
    };
  }

  // === Realtime 订阅 ===
  let channel: ReturnType<typeof supabase.channel> | null = null;

  function subscribeRealtime(): void {
    const cid = currentCoupleId();
    if (!cid) return;

    // 先清理旧订阅
    if (channel) {
      supabase.removeChannel(channel);
    }

    channel = supabase
      .channel('wishes-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wishes', filter: `couple_id=eq.${cid}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const wish = mapRowToWish(payload.new);
            if (!wishes.value.some(w => w.id === wish.id)) {
              wishes.value.unshift(wish);
            }
          } else if (payload.eventType === 'UPDATE') {
            const idx = wishes.value.findIndex(w => w.id === (payload.new as Record<string, unknown>).id);
            if (idx !== -1) {
              wishes.value[idx] = mapRowToWish(payload.new);
            }
          } else if (payload.eventType === 'DELETE') {
            const delId = (payload.old as Record<string, unknown>).id as string;
            wishes.value = wishes.value.filter(w => w.id !== delId);
          }
        }
      )
      .subscribe();
  }

  // === 计算属性 ===
  const filteredWishes = computed(() => {
    const uid = currentUserId();
    let list = wishes.value.filter(
      (w) => w.toUserId === uid || w.fromUserId === uid,
    );
    switch (statusFilter.value) {
      case 'pending':
        list = list.filter((w) => w.status === 'pending');
        break;
      case 'active':
        list = list.filter((w) => w.status === 'accepted' || w.status === 'postponed');
        break;
      case 'done':
        list = list.filter((w) => w.status === 'done');
        break;
    }
    return list;
  });

  const pendingCount = computed(
    () => wishes.value.filter((w) => w.toUserId === currentUserId() && w.status === 'pending').length,
  );
  const activeCount = computed(
    () =>
      wishes.value.filter(
        (w) =>
          (w.toUserId === currentUserId() || w.fromUserId === currentUserId()) &&
          (w.status === 'accepted' || w.status === 'postponed'),
      ).length,
  );
  const doneCount = computed(
    () =>
      wishes.value.filter(
        (w) =>
          (w.toUserId === currentUserId() || w.fromUserId === currentUserId()) &&
          w.status === 'done',
      ).length,
  );

  // === 操作（async + Supabase） ===
  async function addWish(data: {
    fromUserId: string;
    toUserId: string;
    content: string;
    category: WishCategory;
    priority: WishPriority;
    imageUrl?: string;
    anonymous?: boolean;
  }): Promise<Wish | null> {
    const cid = currentCoupleId();
    if (!cid) return null;

    const row = {
      id: generateId(),
      couple_id: cid,
      from_user_id: data.fromUserId,
      to_user_id: data.toUserId,
      content: data.content,
      category: data.category,
      priority: data.priority,
      status: 'pending' as string,
      image_url: data.imageUrl || null,
      created_at: new Date().toISOString(),
      expire_at: new Date(new Date().setHours(23, 59, 59, 999)).toISOString(),
    };

    const { error } = await supabase.from('wishes').insert(row);
    if (error) {
      console.error('[Wish] Insert failed:', error.message);
      return null;
    }

    const wish = mapRowToWish(row);
    wishes.value.unshift(wish);

    // 通知对方
    import('@/modules/notify/store').then(({ useNotifyStore }) => {
      useNotifyStore().addNotification(
        'wish_new',
        '收到新的心愿！',
        `TA 想要「${data.content}」`,
        wish.id,
      );
    });

    return wish;
  }

  async function updateWishStatus(
    id: string,
    status: WishStatus,
    extra?: { proofImageUrl?: string; proofNote?: string },
  ): Promise<void> {
    const cid = currentCoupleId();
    if (!cid) return;

    const updateData: Record<string, unknown> = { status };
    if (status === 'done') {
      updateData.completed_at = new Date().toISOString();
      if (extra?.proofImageUrl) updateData.proof_image_url = extra.proofImageUrl;
      if (extra?.proofNote) updateData.proof_note = extra.proofNote;
    }

    await supabase.from('wishes').update(updateData).eq('id', id).eq('couple_id', cid);

    const wish = wishes.value.find(w => w.id === id);
    if (wish) {
      wish.status = status;
      if (status === 'done') {
        wish.completedAt = Date.now();
        if (extra?.proofImageUrl) wish.proofImageUrl = extra.proofImageUrl;
        if (extra?.proofNote) wish.proofNote = extra.proofNote;
      }
    }

    // 触发通知
    if (wish) {
      import('@/modules/notify/store').then(({ useNotifyStore }) => {
        const notify = useNotifyStore();
        const fromUser = wish.fromUserId === currentUserId() ? '你' : 'TA';
        if (status === 'accepted') {
          notify.addNotification('wish_accepted', `${fromUser}接单了你的心愿`, `「${wish.content}」— 交给我吧！`, wish.id);
        } else if (status === 'done') {
          notify.addNotification('wish_done', '心愿已完成！', `「${wish.content}」${wish.proofNote ? '：' + wish.proofNote : ''}`, wish.id);
        } else if (status === 'postponed') {
          notify.addNotification('wish_accepted', `${fromUser}把心愿推迟了`, `「${wish.content}」— 改天再做`, wish.id);
        }
      });
    }

    // 加积分
    import('@/modules/points/store').then(({ usePointsStore }) => {
      if (wish) {
        usePointsStore().earnPoints(wish.toUserId, 'wish_done');
      }
    });
  }

  async function removeWish(id: string): Promise<void> {
    const cid = currentCoupleId();
    if (!cid) return;

    await supabase.from('wishes').delete().eq('id', id).eq('couple_id', cid);
    wishes.value = wishes.value.filter((w) => w.id !== id);
  }

  function getWishById(id: string): Wish | undefined {
    return wishes.value.find((w) => w.id === id);
  }

  return {
    wishes, statusFilter, loaded,
    filteredWishes, pendingCount, activeCount, doneCount,
    loadWishes, subscribeRealtime,
    addWish, updateWishStatus, removeWish, getWishById,
  };
});