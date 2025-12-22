// User types
export type UserType = 'FARMER' | 'BUYER' | 'ADMIN';
export type UserMode = 'FARMER' | 'BUYER';
export type UserRole = 'farmer' | 'buyer' | 'admin';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION' | 'DEACTIVATED';

export interface User {
  id: number;
  email: string | null;
  phone_number: string;
  full_name: string;
  user_type: UserType;
  profile_image_url: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  is_verified: boolean;
  region: string | null;
  district: string | null;
  town_city: string | null;
  gps_address?: string;
  can_buy: boolean;
  current_mode: UserMode | null;
  roles: UserRole[];
  // Farmer specific
  farm_name: string | null;
  farm_size_acres: number | null;
  years_farming: number | null;
  average_rating: number | null;
  total_reviews: number;
  total_sales: number;
  // Buyer specific
  total_purchases: number;
  wallet_balance: number;
  // Timestamps
  created_at: string;
  last_login_at: string | null;
}

// Product types
export type ProductCategory =
  | 'VEGETABLES'
  | 'FRUITS'
  | 'GRAINS'
  | 'TUBERS'
  | 'LEGUMES'
  | 'LIVESTOCK'
  | 'DAIRY'
  | 'OTHER';

export type ProductStatus = 'AVAILABLE' | 'OUT_OF_STOCK' | 'DRAFT' | 'ARCHIVED';

export type UnitOfMeasure =
  | 'KG'
  | 'GRAM'
  | 'PIECE'
  | 'BUNCH'
  | 'CRATE'
  | 'BAG'
  | 'TUBER'
  | 'LITRE';

export interface Product {
  id: number;
  seller_id: number;
  seller_name?: string; // Added for frontend compatibility
  product_name: string;
  category: ProductCategory;
  description: string | null;
  quantity_available: number;
  unit_of_measure: UnitOfMeasure;
  price_per_unit: number;
  minimum_order_quantity: number;
  harvest_date: string | null;
  expected_shelf_life_days: number | null;
  farm_location: string | null;
  region: string | null;
  district: string | null;
  primary_image_url: string | null;
  additional_images: string[] | null;
  images?: string[]; // Added for frontend compatibility
  variety?: string; // Added for frontend compatibility
  total_sales?: number; // Added for frontend compatibility
  average_rating?: number; // Added for frontend compatibility
  is_organic: boolean;
  status: ProductStatus;
  is_featured: boolean;
  is_negotiable: boolean;
  view_count: number;
  order_count: number;
  created_at: string;
  updated_at: string;
  // Joined data
  seller?: User;
}

// Cart types
export type CartStatus = 'ACTIVE' | 'CHECKED_OUT' | 'EXPIRED' | 'CLEARED';

export interface CartItem {
  id: number;
  cart_id: number;
  product_id: number;
  quantity: number;
  unit_price_snapshot: number;
  added_at: string;
  updated_at: string;
  // Joined data
  product?: Product;
}

export interface Cart {
  id: number;
  buyer_id: number;
  farmer_id: number;
  status: CartStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
  items: CartItem[];
  // Calculated
  subtotal: number;
  platform_fee: number;
  delivery_fee: number;
  total: number;
  // Joined data
  farmer?: User;
}

// Order types
export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'DISPUTED';

export type DeliveryMethod = 'DELIVERY' | 'PICKUP';

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product_name_snapshot: string;
  unit_of_measure_snapshot: string | null;
  created_at: string;
  // Joined data
  product?: Product;
}

export interface Order {
  id: number;
  order_number: string;
  buyer_id: number;
  seller_id: number;
  product_id: number | null;
  quantity_ordered: number;
  unit_price: number;
  subtotal: number;
  platform_fee: number;
  delivery_fee: number;
  total_amount: number;
  delivery_method: DeliveryMethod;
  delivery_address: string | null;
  delivery_region: string | null;
  delivery_district: string | null;
  delivery_phone: string | null;
  delivery_notes: string | null;
  status: OrderStatus;
  carrier: string | null;
  tracking_number: string | null;
  delivery_confirmation_code: string | null;
  created_at: string;
  updated_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  // Relationships
  product_name?: string; // Added for frontend compatibility
  items?: OrderItem[];
  buyer?: User;
  seller?: User;
  product?: Product;
}

// Notification types
export type NotificationType =
  | 'ORDER_PLACED'
  | 'ORDER_PAID'
  | 'ORDER_SHIPPED'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'NEW_MESSAGE'
  | 'PAYMENT_RELEASED'
  | 'DISPUTE_OPENED'
  | 'DISPUTE_RESOLVED'
  | 'PRODUCT_LOW_STOCK'
  | 'SYSTEM';

export interface Notification {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  related_order_id: number | null;
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// Review types
export interface Review {
  id: number;
  order_id: number;
  reviewer_id: number;
  reviewed_user_id: number;
  rating: number;
  review_text: string | null;
  quality_rating: number | null;
  communication_rating: number | null;
  delivery_rating: number | null;
  response: string | null;
  response_at: string | null;
  is_verified_purchase: boolean;
  created_at: string;
  // Joined data
  reviewer?: User;
}

// Dispute types
export type DisputeStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED';
export type DisputeResolution = 'FULL_REFUND' | 'PARTIAL_REFUND' | 'NO_REFUND' | 'CANCELLED';

export interface Dispute {
  id: number;
  escrow_id: number;
  order_id: number;
  raised_by_user_id: number;
  reason: string;
  evidence_description: string | null;
  evidence_image_urls: string[] | null;
  seller_response: string | null;
  status: DisputeStatus;
  resolution: DisputeResolution | null;
  resolution_amount: number | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  // Joined data
  order?: Order;
  raised_by?: User;
}

// Message/Chat types
export interface Conversation {
  id: string;
  buyer_id: number;
  seller_id: number;
  product_id: number | null;
  order_id: number | null;
  status: string;
  unread_count: number;
  last_message_preview: string | null;
  last_message_at: string | null;
  created_at: string;
  // Joined data
  other_user?: User;
  product?: Product;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: number;
  message_type: 'TEXT' | 'IMAGE' | 'VOICE';
  text: string | null;
  attachments: string[] | null;
  is_read: boolean;
  timestamp: string;
}
