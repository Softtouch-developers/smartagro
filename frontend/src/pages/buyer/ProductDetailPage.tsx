import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Star,
  MapPin,
  Package,
  Clock,
  Leaf,
  MessageCircle,
  Minus,
  Plus,
  ShoppingCart,
} from 'lucide-react';
import {
  Button,
  Avatar,
  Badge,
  LoadingPage,
  ConfirmDialog,
} from '@/components/common';
import { productsApi } from '@/services/api';
import { useCartStore } from '@/stores/cartStore';
import { useToast } from '@/stores/uiStore';
import { formatCurrency, formatDate, formatQuantity } from '@/utils/formatters';
import { API_BASE_URL } from '@/utils/constants';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const addToCart = useCartStore((state) => state.addToCart);
  const isCartLoading = useCartStore((state) => state.isLoading);
  const clearCart = useCartStore((state) => state.clearCart);

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showClearCartDialog, setShowClearCartDialog] = useState(false);

  // Fetch product
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getProduct(Number(id)),
    enabled: !!id,
  });

  if (isLoading) {
    return <LoadingPage message="Loading product..." />;
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Product not found</h2>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const getImageUrl = (path: string | null | undefined) => {
    if (!path) return '/placeholder-product.jpg';
    if (path.startsWith('http')) return path;

    // If path starts with uploads/, append to base URL (stripping /api/v1 if present)
    const baseUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    let cleanPath = path.startsWith('/') ? path.slice(1) : path;

    // Ensure path starts with uploads/ if it's a local file
    if (!cleanPath.startsWith('uploads/')) {
      cleanPath = `uploads/${cleanPath}`;
    }

    return `${baseUrl}/${cleanPath}`;
  };

  const images = [
    product.primary_image_url,
    ...(product.additional_images || []),
  ].filter(Boolean) as string[];

  const minQty = product.minimum_order_quantity || 1;
  const maxQty = product.quantity_available;

  const handleQuantityChange = (delta: number) => {
    const newQty = quantity + delta;
    if (newQty >= minQty && newQty <= maxQty) {
      setQuantity(newQty);
    }
  };

  const handleAddToCart = async () => {
    try {
      await addToCart({
        product_id: product.id,
        quantity,
      });
      toast.success(`${product.product_name} added to cart`);
    } catch (error: any) {
      // Check for different farmer error
      if (error?.response?.data?.detail?.code === 'CART_ERROR') {
        setShowClearCartDialog(true);
      } else {
        toast.error('Failed to add to cart');
      }
    }
  };

  const handleClearAndAdd = async () => {
    try {
      await clearCart();
      setShowClearCartDialog(false);
      await handleAddToCart();
    } catch (error) {
      toast.error('Failed to clear cart and add item');
    }
  };

  const totalPrice = product.price_per_unit * quantity;

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="relative aspect-square bg-gray-100">
        <img
          src={getImageUrl(images[selectedImage])}
          alt={product.product_name}
          className="w-full h-full object-cover"
        />
        {product.is_organic && (
          <span className="absolute top-4 left-4 bg-green-100 text-green-700 text-sm font-medium px-3 py-1 rounded-full flex items-center gap-1">
            <Leaf className="w-4 h-4" />
            Organic
          </span>
        )}
      </div>

      {/* Image Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedImage(idx)}
              className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 ${selectedImage === idx ? 'border-primary' : 'border-transparent'
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

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Product Info */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {product.product_name}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {product.region || 'Ghana'}
            </span>
            {product.seller?.average_rating && (
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                {Number(product.seller.average_rating).toFixed(1)} ({product.seller.total_reviews} reviews)
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-bold text-primary">
              {formatCurrency(Number(product.price_per_unit))}
            </span>
            <span className="text-gray-500">
              per {product.unit_of_measure?.toLowerCase() || 'unit'}
            </span>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <Package className="w-5 h-5 mx-auto mb-1 text-gray-400" />
              <p className="text-sm font-medium">
                {formatQuantity(product.quantity_available, product.unit_of_measure || 'KG')}
              </p>
              <p className="text-xs text-gray-500">Available</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <Clock className="w-5 h-5 mx-auto mb-1 text-gray-400" />
              <p className="text-sm font-medium">
                {product.expected_shelf_life_days
                  ? `${product.expected_shelf_life_days} days`
                  : 'N/A'}
              </p>
              <p className="text-xs text-gray-500">Shelf Life</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <ShoppingCart className="w-5 h-5 mx-auto mb-1 text-gray-400" />
              <p className="text-sm font-medium">{product.order_count}</p>
              <p className="text-xs text-gray-500">Orders</p>
            </div>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Description</h2>
            <p className="text-gray-600">{product.description}</p>
          </div>
        )}

        {/* Harvest Info */}
        {product.harvest_date && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Harvest Information</h2>
            <p className="text-gray-600">
              Harvested on {formatDate(product.harvest_date)}
            </p>
          </div>
        )}

        {/* Seller Info */}
        {product.seller && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h2 className="text-lg font-semibold mb-3">Seller</h2>
            <div className="flex items-center gap-3">
              <Avatar
                src={product.seller.profile_image_url}
                name={product.seller.full_name}
                size="lg"
              />
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">
                  {product.seller.farm_name || product.seller.full_name}
                </h3>
                <p className="text-sm text-gray-500">
                  {product.seller.region || 'Ghana'}
                </p>
                {product.seller.average_rating ? (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span>
                      {Number(product.seller.average_rating).toFixed(1)} ({product.seller.total_reviews} reviews)
                    </span>
                  </div>
                ) : null}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/messages?seller=${product.seller_id}&product=${product.id}`)}
                leftIcon={<MessageCircle className="w-4 h-4" />}
              >
                Chat
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 z-20">
        <div className="max-w-lg mx-auto px-4 py-3">
          {product.status === 'AVAILABLE' ? (
            <div className="flex items-center gap-4">
              {/* Quantity Selector */}
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= minQty}
                  className="p-2 disabled:opacity-50"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <button
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= maxQty}
                  className="p-2 disabled:opacity-50"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Add to Cart */}
              <Button
                fullWidth
                size="lg"
                onClick={handleAddToCart}
                isLoading={isCartLoading}
                leftIcon={<ShoppingCart className="w-5 h-5" />}
              >
                Add · {formatCurrency(totalPrice)}
              </Button>
            </div>
          ) : (
            <div className="text-center py-2">
              <Badge variant="error">Out of Stock</Badge>
            </div>
          )}
        </div>
      </div>
      {/* Clear Cart Dialog */}
      <ConfirmDialog
        isOpen={showClearCartDialog}
        onClose={() => setShowClearCartDialog(false)}
        onConfirm={handleClearAndAdd}
        title="Start a new cart?"
        message="Your cart contains items from a different farmer. Adding this item will clear your current cart. Do you want to proceed?"
        confirmText="Clear and Add"
        variant="primary"
      />
    </div>
  );
};

export default ProductDetailPage;
