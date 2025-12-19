import { offlineDb, type SyncQueueItem, type DraftProduct } from '../db';
import { productsApi } from '../api/products';
import type { CreateProductRequest } from '@/types';

// Online status detection
export function isOnline(): boolean {
  return navigator.onLine;
}

// Listen for online/offline events
export function setupNetworkListeners(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

// Process sync queue when online
export async function processSyncQueue(): Promise<void> {
  if (!isOnline()) return;

  const pendingItems = await offlineDb.getPendingSyncItems();

  for (const item of pendingItems) {
    try {
      await offlineDb.updateSyncItem(item.id!, { status: 'syncing' });
      await syncItem(item);
      await offlineDb.removeSyncItem(item.id!);
    } catch (error) {
      const retries = item.retries + 1;
      if (retries >= 3) {
        await offlineDb.updateSyncItem(item.id!, {
          status: 'failed',
          retries,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      } else {
        await offlineDb.updateSyncItem(item.id!, {
          status: 'pending',
          retries,
        });
      }
    }
  }
}

// Sync individual item
async function syncItem(item: SyncQueueItem): Promise<void> {
  switch (item.type) {
    case 'CREATE_PRODUCT':
      await syncCreateProduct(item.data as unknown as CreateProductRequest & { localId: string });
      break;
    case 'UPDATE_PRODUCT':
      await productsApi.updateProduct(
        item.data.id as number,
        item.data as Partial<CreateProductRequest>
      );
      break;
    case 'DELETE_PRODUCT':
      await productsApi.deleteProduct(item.data.id as number);
      break;
    default:
      console.warn('Unknown sync type:', item.type);
  }
}

// Sync draft product creation
async function syncCreateProduct(
  data: CreateProductRequest & { localId: string }
): Promise<void> {
  const { localId, ...productData } = data;

  // Create product on server
  const product = await productsApi.createProduct(productData);

  // Get draft to upload images
  const drafts = await offlineDb.getDraftProducts();
  const draft = drafts.find((d) => d.localId === localId);

  if (draft && draft.images.length > 0) {
    // Upload images
    for (let i = 0; i < draft.images.length; i++) {
      const blob = draft.images[i];
      const file = new File([blob], `product-image-${i}.jpg`, { type: 'image/jpeg' });
      await productsApi.uploadProductImage(product.id, file, i === 0);
    }
  }

  // Remove draft
  if (draft?.id) {
    await offlineDb.deleteDraftProduct(draft.id);
  }
}

// Save product for offline sync
export async function saveProductOffline(
  product: Omit<DraftProduct, 'id' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<number> {
  const draftId = await offlineDb.saveDraftProduct({
    ...product,
    status: 'pending_upload',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Add to sync queue
  await offlineDb.addToSyncQueue({
    type: 'CREATE_PRODUCT',
    data: {
      localId: product.localId,
      product_name: product.product_name,
      category: product.category,
      description: product.description,
      quantity_available: product.quantity_available,
      unit_of_measure: product.unit_of_measure,
      price_per_unit: product.price_per_unit,
      minimum_order_quantity: product.minimum_order_quantity,
      harvest_date: product.harvest_date,
      expected_shelf_life_days: product.expected_shelf_life_days,
      is_organic: product.is_organic,
      is_negotiable: product.is_negotiable,
    },
    timestamp: Date.now(),
    retries: 0,
    status: 'pending',
  });

  // Try to sync immediately if online
  if (isOnline()) {
    processSyncQueue().catch(console.error);
  }

  return draftId;
}

// Get pending sync count
export async function getPendingSyncCount(): Promise<number> {
  const items = await offlineDb.getPendingSyncItems();
  return items.length;
}

// Get failed sync items
export async function getFailedSyncItems(): Promise<SyncQueueItem[]> {
  const items = await offlineDb.getPendingSyncItems();
  return items.filter((i) => i.status === 'failed');
}

// Retry failed sync item
export async function retrySyncItem(id: number): Promise<void> {
  await offlineDb.updateSyncItem(id, {
    status: 'pending',
    retries: 0,
    error: undefined,
  });
  processSyncQueue().catch(console.error);
}
