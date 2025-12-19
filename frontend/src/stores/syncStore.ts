import { create } from 'zustand';
import {
  isOnline,
  setupNetworkListeners,
  processSyncQueue,
  getPendingSyncCount,
  getFailedSyncItems,
  retrySyncItem,
} from '@/services/sync';
import type { SyncQueueItem } from '@/services/db';

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedItems: SyncQueueItem[];
  lastSyncTime: number | null;

  // Actions
  initialize: () => () => void;
  sync: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  retryFailed: (id: number) => Promise<void>;
  retryAllFailed: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  pendingCount: 0,
  failedItems: [],
  lastSyncTime: null,

  initialize: () => {
    // Set initial online status
    set({ isOnline: isOnline() });

    // Setup network listeners
    const cleanup = setupNetworkListeners(
      // On online
      async () => {
        set({ isOnline: true });
        // Auto-sync when coming online
        await get().sync();
      },
      // On offline
      () => {
        set({ isOnline: false });
      }
    );

    // Initial status refresh
    get().refreshStatus();

    return cleanup;
  },

  sync: async () => {
    if (!isOnline() || get().isSyncing) return;

    set({ isSyncing: true });
    try {
      await processSyncQueue();
      set({ lastSyncTime: Date.now() });
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      set({ isSyncing: false });
      // Refresh status after sync
      await get().refreshStatus();
    }
  },

  refreshStatus: async () => {
    const [pendingCount, failedItems] = await Promise.all([
      getPendingSyncCount(),
      getFailedSyncItems(),
    ]);
    set({ pendingCount, failedItems });
  },

  retryFailed: async (id) => {
    await retrySyncItem(id);
    await get().sync();
  },

  retryAllFailed: async () => {
    const { failedItems } = get();
    for (const item of failedItems) {
      if (item.id) {
        await retrySyncItem(item.id);
      }
    }
    await get().sync();
  },
}));

// Selector for sync status badge
export const selectSyncStatus = (state: SyncState) => {
  if (!state.isOnline) return 'offline';
  if (state.isSyncing) return 'syncing';
  if (state.failedItems.length > 0) return 'error';
  if (state.pendingCount > 0) return 'pending';
  return 'synced';
};
