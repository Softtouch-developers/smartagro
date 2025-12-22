// Shared types for API responses and data structures

export type UserRole = 'farmer' | 'buyer' | 'admin';
export type UserMode = 'farmer' | 'buyer';
export type OrderStatus = 'pending' | 'accepted' | 'rejected' | 'shipped' | 'delivered' | 'cancelled';
export type ProductStatus = 'available' | 'sold_out' | 'unlisted';

export interface User {
  id: string | number; // Support both string and number for backend compatibility
  phone_number: string;
  full_name: string;
  email?: string;
  roles: UserRole[];
  current_mode: UserMode;
  is_verified: boolean;
  region?: string;
  district?: string;
  created_at: string;
  updated_at: string;
  // Additional backend fields
  user_type?: string;
  account_status?: string;
  profile_image_url?: string;
  email_verified?: boolean;
  phone_verified?: boolean;
  town_city?: string;
  farm_name?: string;
  farm_size_acres?: number;
  years_farming?: number;
  wallet_balance?: number;
  last_login?: string;
}

export interface Product {
  id: number;
  seller_id: number;
  seller?: User;
  product_name: string;
  name?: string;
  description?: string;
  category: string;
  quantity_available: number;
  unit_of_measure: string;
  unit?: string;
  price_per_unit: number;
  minimum_order_quantity?: number;
  primary_image_url?: string;
  additional_images?: string[];
  is_active?: boolean;
  region: string;
  district: string;
  farm_location?: string;
  is_featured: boolean;
  is_organic: boolean;
  variety?: string;
  status: string;
  harvest_date?: string;
  expected_shelf_life_days?: number;
  created_at: string;
  updated_at?: string;
  // Seller info from backend
  seller_name?: string;
  seller_region?: string;
  seller_rating?: number;
  // Statistics
  view_count?: number;
  order_count?: number;
  total_sold?: number;
  // Legacy fields for backward compatibility
  quantity_kg?: number;
  price_per_kg?: number;
  images?: string[];
  image_urls?: string[];
  quality_grade?: string;
}

export interface CartItem {
  id: number | string;
  product_id: number | string;
  product_name: string;
  product_image?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  unit_of_measure: string;
  available_quantity: number;
  // Legacy fields for backward compatibility
  cart_id?: string;
  product?: Product;
  quantity_kg?: number;
  price_per_kg?: number;
  created_at?: string;
}

export interface Cart {
  id: number | string;
  farmer_id: number;
  farmer_name: string;
  farmer_location: string;
  status: string;
  items: CartItem[];
  items_count: number;
  subtotal: number;
  platform_fee: number;
  delivery_fee: number;
  total: number;
  expires_at?: string;
  expires_in_minutes: number;
  // Legacy fields for backward compatibility
  user_id?: string;
  seller_id?: string;
  total_amount?: number;
  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product?: Product;
  quantity_kg: number;
  price_per_kg: number;
  subtotal: number;
}

export interface Order {
  id: number;
  order_number: string;
  buyer_id: number;
  seller_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
  delivery_fee: number;
  platform_fee: number;
  total_amount: number;
  status: string;
  payment_status: string;
  delivery_method: string;
  delivery_address: string;
  delivery_region: string;
  delivery_district: string;
  delivery_town_city?: string;
  delivery_gps_address?: string;
  delivery_phone: string;
  tracking_number?: string;
  carrier?: string;
  shipped_at?: string;
  delivered_at?: string;
  estimated_delivery_date?: string;
  buyer_notes?: string;
  seller_notes?: string;
  admin_notes?: string;
  // Embedded details
  product_name?: string;
  product_image?: string;
  seller_name?: string;
  seller_phone?: string;
  buyer_name?: string;
  buyer_phone?: string;
  created_at: string;
  updated_at?: string;
  // Legacy fields for backward compatibility
  product?: Product;
  buyer?: User;
  seller?: User;
  total_price?: number;
  items?: OrderItem[];
}

export interface TrackingEvent {
  id: string;
  order_id: string;
  status: OrderStatus;
  description: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  conversation_id?: string;  // Format: buyer_{id}_seller_{id}
  buyer_id: number;
  seller_id: number;
  related_product_id?: number;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  created_at: string;
  // For display purposes
  other_user_name?: string;
  other_user_type?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: number;
  receiver_id: number;
  sender_type: string;  // BUYER or FARMER
  text?: string;
  image_url?: string;
  voice_note_url?: string;
  related_product_id?: number;
  is_read: boolean;
  created_at: string;
  // Legacy fields
  content?: string;
  sender?: User;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface EscrowTransaction {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  status: 'pending' | 'held' | 'released' | 'refunded';
  payment_reference?: string;
  authorization_url?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentSession {
  session_id: string;
  user_id: string;
  created_at: string;
  last_activity: string;
}

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface CheckoutResponse {
  success: boolean;
  message: string;
  order_id: number;
  order_number: string;
  total_amount: number;
  payment_required: boolean;
  authorization_url?: string;
}
