// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Package,
  Star,
  Calendar,
  Leaf,
  Tag,
  Clock,
  ShoppingBag,
} from 'lucide-react';
import {
  Button,
  Badge,
  LoadingPage,
  ConfirmDialog,
} from '@/components/common';
import { productsApi } from '@/services/api';
import { useToast } from '@/stores/uiStore';
import { getErrorMessage } from '@/services/api/client';
import { formatCurrency, formatDate, formatRelativeTime } from '@/utils/formatters';
import { getImageUrl } from '@/utils/images';

const FarmerProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Fetch product
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getProduct(Number(id)),
    enabled: !!id,
  });

  // Toggle availability mutation
  const toggleMutation = useMutation({
    mutationFn: () => productsApi.toggleAvailability(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      toast.success(
        product?.status === 'AVAILABLE'
          ? 'Product marked as unavailable'
          : 'Product marked as available'
      );
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => productsApi.deleteProduct(Number(id)),
    onSuccess: () => {
      toast.success('Product deleted');
      navigate('/farmer/products');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });



  if (isLoading) {
    return <LoadingPage message="Loading product..." />;
  }

  if (!product) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 text-center">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Product Not Found</h2>
        <p className="text-gray-500 mb-4">This product may have been deleted.</p>
        <Button onClick={() => navigate('/farmer/products')}>Back to Products</Button>
      </div>
    );
  }

  const images = [
    product.primary_image_url,
    ...(product.images || []),
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold truncate max-w-[200px]">
              {product.product_name}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/farmer/products/${id}/edit`)}
              leftIcon={<Edit className="w-4 h-4" />}
            >
              Edit
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        {/* Image Gallery */}
        <div className="relative bg-gray-100">
          <div className="aspect-square">
            <img
              src={getImageUrl(images[currentImageIndex] || '')}
              alt={product.product_name}
              className="w-full h-full object-cover"
            />
          </div>
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${idx === currentImageIndex ? 'w-6 bg-white' : 'bg-white/50'
                    }`}
                />
              ))}
            </div>
          )}
          <div className="absolute top-4 right-4">
            <Badge
              variant={product.status === 'AVAILABLE' ? 'success' : 'default'}
            >
              {product.status}
            </Badge>
          </div>
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 p-4 overflow-x-auto bg-white border-b">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentImageIndex(idx)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${idx === currentImageIndex ? 'border-primary' : 'border-transparent'
                  }`}
              >
                <img
                  src={getImageUrl(img)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Product Info */}
        <div className="px-4 py-4">
          {/* Title & Price */}
          <div className="bg-white rounded-xl p-4 mb-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {product.product_name}
                </h2>
                {product.variety && (
                  <p className="text-sm text-gray-500">{product.variety}</p>
                )}
              </div>
              {product.is_organic && (
                <Badge variant="success" className="flex items-center gap-1">
                  <Leaf className="w-3 h-3" />
                  Organic
                </Badge>
              )}
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(product.price_per_unit)}
              </span>
              <span className="text-gray-500">
                / {product.unit_of_measure?.toLowerCase() || 'unit'}
              </span>
            </div>
            {product.is_negotiable && (
              <span className="inline-flex items-center gap-1 text-sm text-amber-600">
                <Tag className="w-4 h-4" />
                Price negotiable
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white rounded-xl p-3 text-center">
              <Package className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-lg font-semibold text-gray-900">
                {product.quantity_available}
              </p>
              <p className="text-xs text-gray-500">In Stock</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center">
              <ShoppingBag className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-lg font-semibold text-gray-900">
                {product.total_sales || 0}
              </p>
              <p className="text-xs text-gray-500">Sold</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center">
              <Star className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <p className="text-lg font-semibold text-gray-900">
                {product.average_rating?.toFixed(1) || 'N/A'}
              </p>
              <p className="text-xs text-gray-500">Rating</p>
            </div>
          </div>

          {/* Details */}
          <div className="bg-white rounded-xl p-4 mb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Details</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Category</span>
                <span className="text-gray-900 capitalize">{product.category?.toLowerCase()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Min. Order</span>
                <span className="text-gray-900">
                  {product.minimum_order_quantity} {product.unit_of_measure?.toLowerCase()}
                </span>
              </div>
              {product.harvest_date && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Harvest Date
                  </span>
                  <span className="text-gray-900">{formatDate(product.harvest_date)}</span>
                </div>
              )}
              {product.expected_shelf_life_days && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Shelf Life
                  </span>
                  <span className="text-gray-900">{product.expected_shelf_life_days} days</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Listed</span>
                <span className="text-gray-900">{formatRelativeTime(product.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="bg-white rounded-xl p-4 mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-lg mx-auto flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => toggleMutation.mutate()}
            isLoading={toggleMutation.isPending}
            leftIcon={
              product.status === 'AVAILABLE' ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )
            }
          >
            {product.status === 'AVAILABLE' ? 'Hide' : 'Show'}
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => setShowDeleteConfirm(true)}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Product"
        message={`Are you sure you want to delete "${product.product_name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default FarmerProductDetailPage;
