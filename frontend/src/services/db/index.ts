import Dexie, { type Table } from 'dexie';
import type { Product, User, Cart, CartItem, Notification } from '@/types';

// Offline sync queue item
export interface SyncQueueItem {
  id?: number;
  type: 'CREATE_PRODUCT' | 'UPDATE_PRODUCT' | 'DELETE_PRODUCT' | 'ADD_TO_CART' | 'UPDATE_CART' | 'CHECKOUT';
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
}

// Cached product with sync status
export interface CachedProduct extends Product {
  syncStatus?: 'synced' | 'pending' | 'failed';
  localId?: string;
}

// Offline draft product (for farmers)
export interface DraftProduct {
  id?: number;
  localId: string;
  product_name: string;
  category: string;
  description?: string;
  quantity_available: number;
  unit_of_measure: string;
  price_per_unit: number;
  minimum_order_quantity: number;
  harvest_date?: string;
  expected_shelf_life_days?: number;
  is_organic: boolean;
  is_negotiable: boolean;
  images: Blob[];
  status: 'draft' | 'pending_upload' | 'uploading' | 'failed';
  createdAt: number;
  updatedAt: number;
  error?: string;
}

// Database class
class SmartAgroDB extends Dexie {
  products!: Table<CachedProduct, number>;
  draftProducts!: Table<DraftProduct, number>;
  cart!: Table<Cart, number>;
  cartItems!: Table<CartItem, number>;
  notifications!: Table<Notification, number>;
  syncQueue!: Table<SyncQueueItem, number>;
  cachedUser!: Table<User, number>;

  constructor() {
    super('SmartAgroDB');

    this.version(1).stores({
      products: '++id, seller_id, category, status, region, [category+region]',
      draftProducts: '++id, localId, status, createdAt',
      cart: '++id, buyer_id, farmer_id, status',
      cartItems: '++id, cart_id, product_id',
      notifications: '++id, user_id, is_read, type, created_at',
      syncQueue: '++id, type, status, timestamp',
      cachedUser: 'id',
    });
  }
}

// Database instance
export const db = new SmartAgroDB();

// Helper functions for offline operations
export const offlineDb = {
  // Products
  async cacheProducts(products: Product[]): Promise<void> {
    await db.products.bulkPut(products as CachedProduct[]);
  },

  async getCachedProducts(category?: string): Promise<CachedProduct[]> {
    if (category) {
      return db.products.where('category').equals(category).toArray();
    }
    return db.products.toArray();
  },

  async getCachedProduct(id: number): Promise<CachedProduct | undefined> {
    return db.products.get(id);
  },

  async clearProductCache(): Promise<void> {
    await db.products.clear();
  },

  // Draft Products (offline creation)
  async saveDraftProduct(draft: Omit<DraftProduct, 'id'>): Promise<number> {
    return db.draftProducts.add(draft as DraftProduct);
  },

  async getDraftProducts(): Promise<DraftProduct[]> {
    return db.draftProducts.toArray();
  },

  async getDraftProduct(id: number): Promise<DraftProduct | undefined> {
    return db.draftProducts.get(id);
  },

  async updateDraftProduct(id: number, updates: Partial<DraftProduct>): Promise<void> {
    await db.draftProducts.update(id, updates);
  },

  async deleteDraftProduct(id: number): Promise<void> {
    await db.draftProducts.delete(id);
  },

  async getPendingDrafts(): Promise<DraftProduct[]> {
    return db.draftProducts.where('status').equals('pending_upload').toArray();
  },

  // Sync Queue
  async addToSyncQueue(item: Omit<SyncQueueItem, 'id'>): Promise<number> {
    return db.syncQueue.add(item as SyncQueueItem);
  },

  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    return db.syncQueue.where('status').equals('pending').toArray();
  },

  async updateSyncItem(id: number, updates: Partial<SyncQueueItem>): Promise<void> {
    await db.syncQueue.update(id, updates);
  },

  async removeSyncItem(id: number): Promise<void> {
    await db.syncQueue.delete(id);
  },

  async clearSyncQueue(): Promise<void> {
    await db.syncQueue.clear();
  },

  // Notifications
  async cacheNotifications(notifications: Notification[]): Promise<void> {
    await db.notifications.bulkPut(notifications);
  },

  async getCachedNotifications(): Promise<Notification[]> {
    return db.notifications.orderBy('created_at').reverse().toArray();
  },

  async markNotificationRead(id: number): Promise<void> {
    await db.notifications.update(id, { is_read: true, read_at: new Date().toISOString() });
  },

  // User
  async cacheUser(user: User): Promise<void> {
    await db.cachedUser.put(user);
  },

  async getCachedUser(): Promise<User | undefined> {
    const users = await db.cachedUser.toArray();
    return users[0];
  },

  async clearUserCache(): Promise<void> {
    await db.cachedUser.clear();
  },

  // Cart (for offline access)
  async cacheCart(cart: Cart): Promise<void> {
    await db.cart.put(cart);
    if (cart.items) {
      await db.cartItems.bulkPut(cart.items);
    }
  },

  async getCachedCart(): Promise<Cart | undefined> {
    const carts = await db.cart.where('status').equals('ACTIVE').toArray();
    if (carts.length > 0) {
      const cart = carts[0];
      cart.items = await db.cartItems.where('cart_id').equals(cart.id).toArray();
      return cart;
    }
    return undefined;
  },

  async clearCartCache(): Promise<void> {
    await db.cart.clear();
    await db.cartItems.clear();
  },

  // Clear all data
  async clearAll(): Promise<void> {
    await Promise.all([
      db.products.clear(),
      db.draftProducts.clear(),
      db.cart.clear(),
      db.cartItems.clear(),
      db.notifications.clear(),
      db.syncQueue.clear(),
      db.cachedUser.clear(),
    ]);
  },
};

export default db;
