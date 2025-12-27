// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  CreditCard,
  Shield,
  Loader2,
  AlertCircle,
  ChevronRight,
  Package,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/common';
import { ordersApi, paymentApi } from '@/services/api';
import { useToast } from '@/stores/uiStore';
import { getErrorMessage } from '@/services/api/client';
import { formatCurrency } from '@/utils/formatters';

const PaymentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const orderId = searchParams.get('order_id');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch order details
  const { data: order, isLoading: orderLoading, error: orderError } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getOrder(Number(orderId)),
    enabled: !!orderId,
  });

  useEffect(() => {
    if (!orderId) {
      toast.error('No order specified');
      navigate('/orders');
    }
  }, [orderId, navigate, toast]);

  // Initialize payment mutation
  const initPaymentMutation = useMutation({
    mutationFn: paymentApi.initializePayment,
    onSuccess: (data) => {
      // Redirect to Paystack checkout
      window.location.href = data.authorization_url;
    },
    onError: (error) => {
      setIsProcessing(false);
      toast.error(getErrorMessage(error));
    },
  });

  const handlePayNow = () => {
    if (!orderId) return;

    setIsProcessing(true);
    const callbackUrl = `${window.location.origin}/payment/callback`;

    initPaymentMutation.mutate({
      order_id: Number(orderId),
      callback_url: callbackUrl,
    });
  };

  if (orderLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (orderError || !order) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-red-50 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-4">
            We couldn't find this order. It may have been deleted or the link is invalid.
          </p>
          <Button onClick={() => navigate('/orders')}>View My Orders</Button>
        </div>
      </div>
    );
  }

  const orderData = order.order;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Complete Payment</h1>
        <p className="text-gray-500">Secure payment powered by Paystack</p>
      </div>

      {/* Order Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Order Summary</h2>
          <p className="text-sm text-gray-500">Order #{orderData.id}</p>
        </div>

        <div className="p-4 space-y-4">
          {/* Product Info */}
          <div className="flex items-start gap-3">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-gray-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">
                {orderData.product_name || 'Product'}
              </h3>
              <p className="text-sm text-gray-500">
                Qty: {orderData.quantity} {orderData.unit_of_measure || 'units'}
              </p>
              <p className="text-sm text-gray-500">
                From: {orderData.seller_name || 'Seller'}
              </p>
            </div>
          </div>

          {/* Delivery Info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Truck className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Delivery Address</p>
              <p className="text-sm text-gray-500">
                {orderData.delivery_address || 'Standard delivery'}
              </p>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-900">
                {formatCurrency(orderData.total_amount * 0.95 || 0)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Platform Fee (5%)</span>
              <span className="text-gray-900">
                {formatCurrency(orderData.total_amount * 0.05 || 0)}
              </span>
            </div>
            <div className="flex justify-between font-semibold text-lg pt-2 border-t border-gray-100">
              <span className="text-gray-900">Total</span>
              <span className="text-primary">
                {formatCurrency(orderData.total_amount || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Security Info */}
      <div className="bg-green-50 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-green-900">Secure Escrow Payment</h3>
            <p className="text-sm text-green-700 mt-1">
              Your payment is held safely in escrow until you confirm delivery.
              If there's any issue, you can raise a dispute and request a refund.
            </p>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Payment Method</h2>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 p-3 border-2 border-primary rounded-lg bg-primary/5">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Paystack</p>
              <p className="text-sm text-gray-500">
                Card, Mobile Money, Bank Transfer
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-primary" />
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center">
            Supports Visa, Mastercard, MTN MoMo, Vodafone Cash & more
          </p>
        </div>
      </div>

      {/* Pay Button */}
      <Button
        fullWidth
        size="lg"
        onClick={handlePayNow}
        isLoading={isProcessing}
        disabled={isProcessing}
        className="mb-4"
      >
        {isProcessing ? 'Processing...' : `Pay ${formatCurrency(orderData.total_amount || 0)}`}
      </Button>

      <p className="text-xs text-gray-500 text-center">
        By proceeding, you agree to our Terms of Service and Refund Policy
      </p>
    </div>
  );
};

export default PaymentPage;
