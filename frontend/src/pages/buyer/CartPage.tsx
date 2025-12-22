import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, Clock, AlertCircle } from 'lucide-react';
import {
  Button,
  Avatar,
  EmptyState,
  LoadingSection,
  ConfirmDialog,
} from '@/components/common';
import { useCartStore } from '@/stores/cartStore';
import { useToast } from '@/stores/uiStore';
import { formatCurrency, formatCountdown } from '@/utils/formatters';
import { PLATFORM_CONFIG, API_BASE_URL } from '@/utils/constants';

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const cart = useCartStore((state) => state.cart);
  const isLoading = useCartStore((state) => state.isLoading);
  const timeRemaining = useCartStore((state) => state.timeRemaining);
  const setTimeRemaining = useCartStore((state) => state.setTimeRemaining);
  const loadCart = useCartStore((state) => state.loadCart);
  const updateItem = useCartStore((state) => state.updateItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<number | null>(null);

  // Load cart on mount
  useEffect(() => {
    loadCart();
  }, [loadCart]);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining, setTimeRemaining]);

  const handleQuantityChange = async (itemId: number, quantity: number) => {
    try {
      await updateItem(itemId, quantity);
    } catch (error: any) {
      // Extract specific error message
      const message = error?.response?.data?.detail?.message || error?.message || 'Failed to update quantity';
      toast.error(message);
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    try {
      await removeItem(itemId);
      toast.success('Item removed from cart');
      setItemToRemove(null);
    } catch (error) {
      toast.error('Failed to remove item');
    }
  };

  const handleClearCart = async () => {
    try {
      await clearCart();
      toast.success('Cart cleared');
      setShowClearConfirm(false);
    } catch (error) {
      toast.error('Failed to clear cart');
    }
  };

  if (isLoading && !cart) {
    return <LoadingSection />;
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <EmptyState
          type="cart"
          actionLabel="Browse Products"
          onAction={() => navigate('/')}
        />
      </div>
    );
  }

  // Construct image URL
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

  const isExpiringSoon = timeRemaining < 30 * 60; // Less than 30 minutes

  return (
    <div className="max-w-lg mx-auto px-4 py-4 pb-80">
      {/* Timer Warning */}
      <div
        className={`flex items-center gap-2 px-4 py-3 rounded-lg mb-4 ${isExpiringSoon ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-600'
          }`}
      >
        <Clock className="w-5 h-5" />
        <span className="text-sm">
          Cart expires in <strong>{formatCountdown(timeRemaining)}</strong>
        </span>
        {isExpiringSoon && <AlertCircle className="w-4 h-4 ml-auto" />}
      </div>

      {/* Farmer Info */}
      {cart.farmer && (
        <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 mb-4">
          <Avatar
            src={cart.farmer.profile_image_url}
            name={cart.farmer.full_name}
            size="md"
          />
          <div>
            <p className="font-medium text-gray-900">
              {cart.farmer.farm_name || cart.farmer.full_name}
            </p>
            <p className="text-sm text-gray-500">{cart.farmer.region}</p>
          </div>
        </div>
      )}

      {/* Cart Items */}
      <div className="space-y-3 mb-6">
        {cart.items.map((item) => (
          <div
            key={item.id}
            className="flex gap-4 p-4 bg-white rounded-xl border border-gray-100"
          >
            <img
              src={getImageUrl(item.product?.primary_image_url)}
              alt={item.product?.product_name}
              className="w-20 h-20 rounded-lg object-cover bg-gray-100"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">
                {item.product?.product_name}
              </h3>
              <p className="text-sm text-gray-500">
                {formatCurrency(item.unit_price_snapshot)} / {item.product?.unit_of_measure.toLowerCase()}
              </p>

              <div className="flex items-center justify-between mt-2">
                {/* Quantity Controls */}
                <div className="flex items-center border border-gray-200 rounded-lg">
                  <button
                    onClick={() =>
                      handleQuantityChange(item.id, item.quantity - 1)
                    }
                    disabled={item.quantity <= (item.product?.minimum_order_quantity || 1)}
                    className="p-1.5 disabled:opacity-50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-medium">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      handleQuantityChange(item.id, item.quantity + 1)
                    }
                    disabled={
                      item.quantity >= (item.product?.quantity_available || 0)
                    }
                    className="p-1.5 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Item Total */}
                <span className="font-semibold text-gray-900">
                  {formatCurrency(item.unit_price_snapshot * item.quantity)}
                </span>
              </div>
            </div>

            {/* Remove Button */}
            <button
              onClick={() => setItemToRemove(item.id)}
              className="p-2 text-gray-400 hover:text-red-500 self-start"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>

      {/* Clear Cart */}
      <button
        onClick={() => setShowClearConfirm(true)}
        className="text-sm text-red-500 font-medium mb-6"
      >
        Clear Cart
      </button>

      {/* Order Summary - Fixed at Bottom */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-20">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(cart.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Platform Fee ({PLATFORM_CONFIG.PLATFORM_FEE_PERCENTAGE}%)</span>
              <span>{formatCurrency(cart.platform_fee)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery Fee</span>
              <span>{formatCurrency(cart.delivery_fee)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-900 text-lg pt-2 border-t">
              <span>Total</span>
              <span>{formatCurrency(cart.total)}</span>
            </div>
          </div>

          <Button
            fullWidth
            size="lg"
            onClick={() => navigate('/checkout')}
          >
            Proceed to Checkout
          </Button>
        </div>
      </div>

      {/* Clear Cart Confirmation */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearCart}
        title="Clear Cart"
        message="Are you sure you want to remove all items from your cart?"
        confirmText="Clear Cart"
        variant="danger"
        isLoading={isLoading}
      />

      {/* Remove Item Confirmation */}
      <ConfirmDialog
        isOpen={itemToRemove !== null}
        onClose={() => setItemToRemove(null)}
        onConfirm={() => itemToRemove && handleRemoveItem(itemToRemove)}
        title="Remove Item"
        message="Are you sure you want to remove this item from your cart?"
        confirmText="Remove"
        variant="danger"
        isLoading={isLoading}
      />
    </div>
  );
};

export default CartPage;
