import apiClient from './client';
import type {
  ProductsQuery,
  ProductsResponse,
  CreateProductRequest,
} from '@/types';
import type { Product } from '@/types';

export const productsApi = {
  /**
   * Get products with filters
   */
  getProducts: async (params?: ProductsQuery): Promise<ProductsResponse> => {
    const response = await apiClient.get<ProductsResponse>('/api/v1/products', { params });
    return response.data;
  },

  /**
   * Get single product by ID
   */
  getProduct: async (id: number): Promise<Product> => {
    const response = await apiClient.get<any>(`/api/v1/products/${id}`);
    // Backend returns { product, seller } separately, merge them
    const productData = response.data.product;
    const sellerData = response.data.seller;
    return {
      ...productData,
      seller: sellerData,
    };
  },

  /**
   * Get featured products
   */
  getFeaturedProducts: async (): Promise<Product[]> => {
    const response = await apiClient.get<ProductsResponse>('/api/v1/products', {
      params: { is_featured: true, limit: 10 },
    });
    return response.data.products;
  },

  /**
   * Get products by category
   */
  getProductsByCategory: async (category: string, params?: ProductsQuery): Promise<ProductsResponse> => {
    const response = await apiClient.get<ProductsResponse>('/api/v1/products', {
      params: { ...params, category },
    });
    return response.data;
  },

  /**
   * Search products
   */
  searchProducts: async (query: string, params?: ProductsQuery): Promise<ProductsResponse> => {
    const response = await apiClient.get<ProductsResponse>('/api/v1/products', {
      params: { ...params, search: query },
    });
    return response.data;
  },

  /**
   * Get farmer's own products
   */
  getMyProducts: async (params?: ProductsQuery): Promise<ProductsResponse> => {
    const response = await apiClient.get<ProductsResponse>('/api/v1/products/my-products', { params });
    return response.data;
  },

  /**
   * Create new product
   */
  createProduct: async (data: CreateProductRequest): Promise<Product> => {
    const response = await apiClient.post<Product>('/api/v1/products', data);
    return response.data;
  },

  /**
   * Update product
   */
  updateProduct: async (id: number, data: Partial<CreateProductRequest>): Promise<Product> => {
    const response = await apiClient.put<Product>(`/api/v1/products/${id}`, data);
    return response.data;
  },

  /**
   * Delete product
   */
  deleteProduct: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/products/${id}`);
  },

  /**
   * Upload product image
   */
  uploadProductImage: async (productId: number, file: File, isPrimary = false): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('is_primary', String(isPrimary));
    const response = await apiClient.post<{ url: string }>(
      `/api/v1/products/${productId}/images`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  /**
   * Delete product image
   */
  deleteProductImage: async (productId: number, imageUrl: string): Promise<void> => {
    await apiClient.delete(`/api/v1/products/${productId}/images`, {
      params: { image_url: imageUrl },
    });
  },

  /**
   * Toggle product availability
   */
  toggleAvailability: async (id: number): Promise<Product> => {
    const response = await apiClient.post<Product>(`/api/v1/products/${id}/toggle-availability`);
    return response.data;
  },
};
