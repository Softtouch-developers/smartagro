import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Filter,
  MoreVertical,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
  Package,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Input,
  Select,
  Badge,
  Modal,
  ConfirmDialog,
  LoadingSection,
  EmptyState,
} from '@/components/common';
import { productsApi, adminApi } from '@/services/api';
import { useToast } from '@/stores/uiStore';
import { getErrorMessage } from '@/services/api/client';
import { formatCurrency, formatRelativeTime } from '@/utils/formatters';
import { API_BASE_URL, PRODUCT_CATEGORIES } from '@/utils/constants';
import type { Product } from '@/types';

const AdminProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const limit = 20;

  // Fetch products
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'products', searchQuery, categoryFilter, statusFilter, page],
    queryFn: () =>
      productsApi.getProducts({
        search: searchQuery || undefined,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
        skip: (page - 1) * limit,
        limit,
      }),
  });

  // Toggle availability mutation
  const toggleMutation = useMutation({
    mutationFn: (productId: number) => productsApi.toggleAvailability(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      toast.success('Product status updated');
      setShowActions(false);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (productId: number) => productsApi.deleteProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      toast.success('Product deleted');
      setShowDeleteConfirm(false);
      setShowActions(false);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const getImageUrl = (url: string) => {
    if (!url) return '/placeholder-product.jpg';
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url}`;
  };

  const openActions = (product: Product) => {
    setActiveProduct(product);
    setShowActions(true);
  };

  const totalPages = Math.ceil((data?.total || 0) / limit);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <p className="text-gray-500">Manage and moderate marketplace products</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 mb-6 space-y-4">
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          leftIcon={<Search className="w-5 h-5" />}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            placeholder="All Categories"
            value={categoryFilter}
            onChange={(value) => {
              setCategoryFilter(value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Categories' },
              ...PRODUCT_CATEGORIES.map((c) => ({
                value: c.value,
                label: c.label,
              })),
            ]}
          />
          <Select
            placeholder="All Status"
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Status' },
              { value: 'AVAILABLE', label: 'Available' },
              { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
              { value: 'HIDDEN', label: 'Hidden' },
            ]}
          />
        </div>
      </div>

      {/* Products List */}
      {isLoading ? (
        <LoadingSection />
      ) : data?.products && data.products.length > 0 ? (
        <>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Seller
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Price
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Listed
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.products.map((product: Product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={getImageUrl(product.primary_image_url || '')}
                            alt={product.product_name}
                            className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                          />
                          <div>
                            <p className="font-medium text-gray-900">
                              {product.product_name}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">
                              {product.category?.toLowerCase()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">{product.seller_name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(product.price_per_unit)}
                        </p>
                        <p className="text-xs text-gray-500">
                          / {product.unit_of_measure?.toLowerCase()}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            product.status === 'AVAILABLE'
                              ? 'success'
                              : product.status === 'OUT_OF_STOCK'
                              ? 'warning'
                              : 'default'
                          }
                          size="sm"
                        >
                          {product.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-500">
                          {formatRelativeTime(product.created_at)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openActions(product)}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * limit + 1}-
                {Math.min(page * limit, data.total)} of {data.total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          type="products"
          title="No products found"
          description="Try adjusting your filters"
        />
      )}

      {/* Actions Modal */}
      <Modal
        isOpen={showActions}
        onClose={() => setShowActions(false)}
        title={activeProduct?.product_name}
        size="sm"
      >
        <div className="py-2">
          <button
            onClick={() => {
              navigate(`/products/${activeProduct?.id}`);
              setShowActions(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50"
          >
            <Eye className="w-5 h-5" />
            View Product
          </button>
          <button
            onClick={() => activeProduct && toggleMutation.mutate(activeProduct.id)}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50"
          >
            {activeProduct?.status === 'AVAILABLE' ? (
              <>
                <EyeOff className="w-5 h-5" />
                Hide Product
              </>
            ) : (
              <>
                <Eye className="w-5 h-5" />
                Show Product
              </>
            )}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-5 h-5" />
            Delete Product
          </button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => activeProduct && deleteMutation.mutate(activeProduct.id)}
        title="Delete Product"
        message={`Are you sure you want to delete "${activeProduct?.product_name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default AdminProductsPage;
