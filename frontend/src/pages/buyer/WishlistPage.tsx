// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Heart, Trash2, ShoppingCart } from 'lucide-react';
import {
  Button,
  ProductCard,
  EmptyState,
  LoadingSection,
} from '@/components/common';
import { productsApi, cartApi } from '@/services/api';
import { useToast } from '@/stores/uiStore';
import { getErrorMessage } from '@/services/api/client';
import type { Product } from '@/types';

const WishlistPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  // Fetch wishlist
  const { data: wishlist, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => productsApi.getWishlist(),
  });

  // Remove from wishlist mutation
  const removeMutation = useMutation({
    mutationFn: (productId: number) => productsApi.removeFromWishlist(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success('Removed from wishlist');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: number; quantity: number }) =>
      cartApi.addToCart({ product_id: productId, quantity }),
    onSuccess: () => {
      toast.success('Added to cart');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const handleAddToCart = (product: Product) => {
    addToCartMutation.mutate({
      productId: product.id,
      quantity: product.minimum_order_quantity || 1,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">My Wishlist</h1>
            {wishlist?.length > 0 && (
              <p className="text-xs text-gray-500">{wishlist.length} items</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {isLoading ? (
          <LoadingSection />
        ) : wishlist && wishlist.length > 0 ? (
          <div className="space-y-4">
            {wishlist.map((item: { product: Product }) => (
              <div
                key={item.product.id}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden"
              >
                <div
                  className="flex gap-4 p-4 cursor-pointer"
                  onClick={() => navigate(`/products/${item.product.id}`)}
                >
                  <img
                    src={item.product.primary_image_url || '/placeholder-product.jpg'}
                    alt={item.product.product_name}
                    className="w-24 h-24 rounded-lg object-cover bg-gray-100"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 mb-1">
                      {item.product.product_name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-2">
                      {item.product.seller_name}
                    </p>
                    <p className="text-primary font-semibold">
                      GH₵{item.product.price_per_unit?.toFixed(2)} / {item.product.unit_of_measure?.toLowerCase()}
                    </p>
                    {item.product.status !== 'AVAILABLE' && (
                      <span className="text-xs text-red-500">Currently unavailable</span>
                    )}
                  </div>
                </div>
                <div className="flex border-t border-gray-100">
                  <button
                    onClick={() => removeMutation.mutate(item.product.id)}
                    disabled={removeMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm">Remove</span>
                  </button>
                  <div className="w-px bg-gray-100" />
                  <button
                    onClick={() => handleAddToCart(item.product)}
                    disabled={item.product.status !== 'AVAILABLE' || addToCartMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-primary hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span className="text-sm font-medium">Add to Cart</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            type="wishlist"
            title="Your wishlist is empty"
            description="Save products you like to your wishlist"
            actionLabel="Browse Products"
            onAction={() => navigate('/search')}
          />
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
