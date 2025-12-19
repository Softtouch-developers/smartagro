import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, MoreVertical, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import {
  Button,
  Input,
  Badge,
  EmptyState,
  ListItemSkeleton,
  Modal,
  ConfirmDialog,
} from '@/components/common';
import { productsApi } from '@/services/api';
import { useToast } from '@/stores/uiStore';
import { formatCurrency } from '@/utils/formatters';
import { API_BASE_URL } from '@/utils/constants';
import type { Product } from '@/types';

const FarmerProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['farmer', 'products', searchQuery],
    queryFn: () =>
      productsApi.getMyProducts({
        search: searchQuery || undefined,
        limit: 50,
      }),
  });

  const handleToggleAvailability = async (product: Product) => {
    try {
      await productsApi.toggleAvailability(product.id);
      toast.success(
        product.status === 'AVAILABLE'
          ? 'Product marked as unavailable'
          : 'Product marked as available'
      );
      refetch();
      setShowActions(false);
    } catch (error) {
      toast.error('Failed to update product');
    }
  };

  const handleDeleteProduct = async () => {
    if (!activeProduct) return;
    try {
      await productsApi.deleteProduct(activeProduct.id);
      toast.success('Product deleted');
      refetch();
      setShowDeleteConfirm(false);
      setShowActions(false);
      setActiveProduct(null);
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const openActions = (product: Product) => {
    setActiveProduct(product);
    setShowActions(true);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900">My Products</h1>
        <Button
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => navigate('/farmer/products/new')}
        >
          Add
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder="Search products..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        leftIcon={<Search className="w-5 h-5" />}
        className="mb-4"
      />

      {/* Products List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <ListItemSkeleton key={i} />
          ))}
        </div>
      ) : data?.products && data.products.length > 0 ? (
        <div className="space-y-3">
          {data.products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl border border-gray-100 p-4 flex gap-4"
            >
              <img
                src={
                  product.primary_image_url
                    ? `${API_BASE_URL}${product.primary_image_url}`
                    : '/placeholder-product.jpg'
                }
                alt={product.product_name}
                className="w-20 h-20 rounded-lg object-cover bg-gray-100 cursor-pointer"
                onClick={() => navigate(`/farmer/products/${product.id}`)}
              />
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => navigate(`/farmer/products/${product.id}`)}
              >
                <h3 className="font-medium text-gray-900 truncate mb-1">
                  {product.product_name}
                </h3>
                <p className="text-sm text-primary font-medium mb-1">
                  {formatCurrency(product.price_per_unit)} / {product.unit_of_measure.toLowerCase()}
                </p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={product.status === 'AVAILABLE' ? 'success' : 'default'}
                    size="sm"
                  >
                    {product.status}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {product.quantity_available} in stock
                  </span>
                </div>
              </div>
              <button
                onClick={() => openActions(product)}
                className="p-2 text-gray-400 hover:text-gray-600 self-start"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          type="products"
          title="No products yet"
          description="Add your first product to start selling"
          actionLabel="Add Product"
          onAction={() => navigate('/farmer/products/new')}
        />
      )}

      {/* Product Actions Modal */}
      <Modal
        isOpen={showActions}
        onClose={() => setShowActions(false)}
        title={activeProduct?.product_name}
        size="sm"
      >
        <div className="py-2">
          <button
            onClick={() => {
              navigate(`/farmer/products/${activeProduct?.id}/edit`);
              setShowActions(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50"
          >
            <Edit className="w-5 h-5" />
            Edit Product
          </button>
          <button
            onClick={() => activeProduct && handleToggleAvailability(activeProduct)}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50"
          >
            {activeProduct?.status === 'AVAILABLE' ? (
              <>
                <EyeOff className="w-5 h-5" />
                Mark as Unavailable
              </>
            ) : (
              <>
                <Eye className="w-5 h-5" />
                Mark as Available
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
        onConfirm={handleDeleteProduct}
        title="Delete Product"
        message={`Are you sure you want to delete "${activeProduct?.product_name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default FarmerProductsPage;
