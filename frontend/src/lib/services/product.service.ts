import apiClient from '../api-client';
import type { Product, PaginatedResponse } from '../types';

export interface ProductFilters {
  category?: string;
  region?: string;
  district?: string;
  min_price?: number;
  max_price?: number;
  is_featured?: boolean;
  seller_id?: number;
  status?: string;
  search?: string;
  sort_by?: 'created_at' | 'price_per_unit' | 'product_name' | 'quantity_available';
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export interface CreateProductData {
  product_name: string;
  description: string;
  category: string;
  quantity_available: number;
  unit_of_measure: string;
  price_per_unit: number;
  minimum_order_quantity?: number;
  harvest_date?: string;
  expected_shelf_life_days?: number;
  farm_location?: string;
  region: string;
  district: string;
  is_organic?: boolean;
  variety?: string;
}

interface ProductListResponse {
  success: boolean;
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  products: Product[];
}

interface ProductDetailResponse {
  success: boolean;
  product: Product;
  seller: any;
}

interface FileUploadResponse {
  success: boolean;
  file_url: string;
  message: string;
}

export const productService = {
  async getProducts(filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const response = await apiClient.get<ProductListResponse>(`/products?${params.toString()}`);
    // Transform backend response to frontend expected format
    return {
      items: response.products || [],
      total: response.total || 0,
      page: response.page || 1,
      page_size: response.page_size || 20,
      pages: response.total_pages || 1,
    };
  },

  async getFeaturedProducts(): Promise<Product[]> {
    const response = await apiClient.get<ProductListResponse>('/products/featured');
    return response.products || [];
  },

  async searchProducts(query: string, filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> {
    const params = new URLSearchParams({ q: query });
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const response = await apiClient.get<ProductListResponse>(`/products/search?${params.toString()}`);
    // Transform backend response to frontend expected format
    return {
      items: response.products || [],
      total: response.total || 0,
      page: response.page || 1,
      page_size: response.page_size || 20,
      pages: response.total_pages || 1,
    };
  },

  async getProduct(id: number): Promise<Product> {
    const response = await apiClient.get<ProductDetailResponse>(`/products/${id}`);
    return response.product;
  },

  async createProduct(data: CreateProductData): Promise<Product> {
    return apiClient.post<Product>('/products', data);
  },

  async updateProduct(id: number, data: Partial<CreateProductData>): Promise<Product> {
    return apiClient.put<Product>(`/products/${id}`, data);
  },

  async deleteProduct(id: number): Promise<{ message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/products/${id}`);
    return { message: response.message };
  },

  async uploadProductImage(file: File): Promise<{ url: string; filename: string }> {
    const response = await apiClient.uploadFile('/storage/upload/image', file, 'image') as FileUploadResponse;
    return {
      url: response.file_url,
      filename: response.file_url.split('/').pop() || 'image.jpg',
    };
  },

  // Alias for convenience
  create: (data: any) => productService.createProduct(data as CreateProductData),
  uploadImage: (file: File) => productService.uploadProductImage(file),
};