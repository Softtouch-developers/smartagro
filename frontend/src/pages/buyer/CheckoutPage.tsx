import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Truck, Store, Phone, Mail } from 'lucide-react';
import {
  Button,
  Input,
  Select,
} from '@/components/common';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/stores/uiStore';
import { formatCurrency } from '@/utils/formatters';
import { GHANA_REGIONS, PLATFORM_CONFIG } from '@/utils/constants';
import type { DeliveryMethod } from '@/types';

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const cart = useCartStore((state) => state.cart);
  const checkout = useCartStore((state) => state.checkout);
  const isLoading = useCartStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('DELIVERY');
  const [formData, setFormData] = useState({
    delivery_address: '',
    delivery_region: user?.region || '',
    delivery_district: user?.district || '',
    delivery_phone: user?.phone_number || '',
    delivery_notes: '',
    checkout_email: user?.email || '',
  });

  if (!cart || cart.items.length === 0) {
    navigate('/cart');
    return null;
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (deliveryMethod === 'DELIVERY') {
      if (!formData.delivery_address || !formData.delivery_region || !formData.delivery_phone) {
        toast.error('Please fill in all required delivery details');
        return;
      }
    }

    try {
      const response = await checkout({
        delivery_method: deliveryMethod,
        delivery_address: deliveryMethod === 'DELIVERY' ? formData.delivery_address : undefined,
        delivery_region: deliveryMethod === 'DELIVERY' ? formData.delivery_region : undefined,
        delivery_district: deliveryMethod === 'DELIVERY' ? formData.delivery_district : undefined,
        delivery_phone: formData.delivery_phone,
        delivery_notes: formData.delivery_notes || undefined,
        checkout_email: formData.checkout_email || undefined,
      });

      toast.success('Order placed successfully!');

      // If there's a payment URL, redirect to it
      if (response.payment_url) {
        window.location.href = response.payment_url;
      } else {
        navigate(`/orders/${response.order_id}`);
      }
    } catch (error) {
      toast.error('Failed to place order. Please try again.');
    }
  };

  const deliveryFee = deliveryMethod === 'PICKUP' ? 0 : cart.delivery_fee;
  const finalTotal = cart.subtotal + cart.platform_fee + deliveryFee;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate('/cart')}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Checkout</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-4">
        {/* Delivery Method */}
        <section className="bg-white rounded-xl p-4 mb-4">
          <h2 className="font-semibold text-gray-900 mb-4">Delivery Method</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDeliveryMethod('DELIVERY')}
              className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-colors ${deliveryMethod === 'DELIVERY'
                ? 'border-primary bg-primary/5'
                : 'border-gray-200'
                }`}
            >
              <Truck
                className={`w-6 h-6 ${deliveryMethod === 'DELIVERY' ? 'text-primary' : 'text-gray-400'
                  }`}
              />
              <span
                className={`font-medium ${deliveryMethod === 'DELIVERY' ? 'text-primary' : 'text-gray-700'
                  }`}
              >
                Delivery
              </span>
            </button>
            <button
              type="button"
              onClick={() => setDeliveryMethod('PICKUP')}
              className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-colors ${deliveryMethod === 'PICKUP'
                ? 'border-primary bg-primary/5'
                : 'border-gray-200'
                }`}
            >
              <Store
                className={`w-6 h-6 ${deliveryMethod === 'PICKUP' ? 'text-primary' : 'text-gray-400'
                  }`}
              />
              <span
                className={`font-medium ${deliveryMethod === 'PICKUP' ? 'text-primary' : 'text-gray-700'
                  }`}
              >
                Pickup
              </span>
            </button>
          </div>
        </section>

        {/* Delivery Address */}
        {deliveryMethod === 'DELIVERY' && (
          <section className="bg-white rounded-xl p-4 mb-4">
            <h2 className="font-semibold text-gray-900 mb-4">Delivery Address</h2>
            <div className="space-y-4">
              <Input
                label="Street Address"
                placeholder="Enter your address"
                value={formData.delivery_address}
                onChange={(e) => handleInputChange('delivery_address', e.target.value)}
                leftIcon={<MapPin className="w-5 h-5" />}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Region"
                  placeholder="Select region"
                  value={formData.delivery_region}
                  onChange={(value) => handleInputChange('delivery_region', value)}
                  options={GHANA_REGIONS.map((r) => ({ value: r, label: r }))}
                  required
                />
                <Input
                  label="District"
                  placeholder="District"
                  value={formData.delivery_district}
                  onChange={(e) => handleInputChange('delivery_district', e.target.value)}
                />
              </div>
            </div>
          </section>
        )}

        {/* Contact Info */}
        <section className="bg-white rounded-xl p-4 mb-4">
          <h2 className="font-semibold text-gray-900 mb-4">Contact Information</h2>
          <div className="space-y-4">
            <Input
              label="Phone Number"
              type="tel"
              placeholder="Your contact number"
              value={formData.delivery_phone}
              onChange={(e) => handleInputChange('delivery_phone', e.target.value)}
              leftIcon={<Phone className="w-5 h-5" />}
              required
            />
            <Input
              label="Email (Optional)"
              type="email"
              placeholder="For order updates"
              value={formData.checkout_email}
              onChange={(e) => handleInputChange('checkout_email', e.target.value)}
              leftIcon={<Mail className="w-5 h-5" />}
              helperText="We'll send order confirmation here"
            />
          </div>
        </section>

        {/* Delivery Notes */}
        <section className="bg-white rounded-xl p-4 mb-4">
          <h2 className="font-semibold text-gray-900 mb-4">Additional Notes</h2>
          <textarea
            placeholder="Any special instructions for delivery..."
            value={formData.delivery_notes}
            onChange={(e) => handleInputChange('delivery_notes', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none h-24"
          />
        </section>

        {/* Order Summary */}
        <section className="bg-white rounded-xl p-4">
          <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal ({cart.items.length} items)</span>
              <span>{formatCurrency(cart.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Platform Fee ({PLATFORM_CONFIG.PLATFORM_FEE_PERCENTAGE}%)</span>
              <span>{formatCurrency(cart.platform_fee)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery Fee</span>
              <span>{deliveryFee === 0 ? 'Free' : formatCurrency(deliveryFee)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-900 text-base pt-3 border-t">
              <span>Total</span>
              <span>{formatCurrency(finalTotal)}</span>
            </div>
          </div>
        </section>
      </form>

      {/* Place Order Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-[60]">
        <div className="max-w-lg mx-auto px-4 py-4">
          <Button
            type="submit"
            fullWidth
            size="lg"
            isLoading={isLoading}
            onClick={handleSubmit}
          >
            Place Order · {formatCurrency(finalTotal)}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
