import type { User, Product, Cart, Order, Notification, DeliveryMethod } from './models';

// Auth types
export interface LoginRequest {
  email?: string;
  phone_number?: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user: User;
  tokens: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  };
}

export interface SignupRequest {
  email?: string;
  phone_number: string;
  password: string;
  full_name: string;
  user_type: 'FARMER' | 'BUYER';
  region?: string;
  town_city?: string;
}

export interface SignupResponse {
  message: string;
  user_id: number;
}

export interface OTPVerifyRequest {
  user_id: number;
  otp_code: string;
  otp_type: 'PHONE_VERIFICATION' | 'EMAIL_VERIFICATION';
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface SwitchModeRequest {
  target_mode: 'FARMER' | 'BUYER';
}

// Product types
export interface ProductsQuery {
  category?: string;
  region?: string;
  search?: string;
  seller_id?: number;
  status?: string;
  is_featured?: boolean;
  min_price?: number;
  max_price?: number;
  sort_by?: 'price' | 'created_at' | 'rating';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  skip?: number;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface CreateProductRequest {
  product_name: string;
  category: string;
  description?: string;
  quantity_available: number;
  unit_of_measure: string;
  price_per_unit: number;
  minimum_order_quantity?: number;
  harvest_date?: string;
  expected_shelf_life_days?: number;
  is_organic?: boolean;
  is_negotiable?: boolean;
}

// Cart types
export interface AddToCartRequest {
  product_id: number;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface CheckoutRequest {
  delivery_method: DeliveryMethod;
  delivery_address?: string;
  delivery_region?: string;
  delivery_district?: string;
  delivery_phone?: string;
  delivery_notes?: string;
  checkout_email?: string;
}

export interface CheckoutResponse {
  order_id: number;
  order_number: string;
  total_amount: number;
  payment_url?: string;
}

export interface CartResponse extends Cart {
  time_remaining_seconds: number;
}

// Order types
export interface OrdersQuery {
  status?: string;
  role?: 'buyer' | 'seller';
  page?: number;
  limit?: number;
}

export interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
}

// Notification types
export interface NotificationsQuery {
  is_read?: boolean;
  page?: number;
  limit?: number;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
}

// Admin types
export interface AdminStatsResponse {
  total_users: number;
  total_farmers: number;
  total_buyers: number;
  total_products: number;
  total_orders: number;
  total_revenue: number;
  pending_disputes: number;
  active_carts: number;
  users_today: number;
  orders_today: number;
  revenue_today: number;
}

export interface UsersQuery {
  user_type?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

// Generic API response
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  detail: string;
  status_code?: number;
}

export interface MessageResponse {
  message: string;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
