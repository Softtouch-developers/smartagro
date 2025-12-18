// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  Phone,
  MessageCircle,
  Star,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import {
  Button,
  Badge,
  LoadingPage,
  Modal,
  ConfirmDialog,
} from '@/components/common';
import { ordersApi, paymentApi } from '@/services/api';
import { useToast } from '@/stores/uiStore';
import { getErrorMessage } from '@/services/api/client';
import { formatCurrency, formatDate, formatRelativeTime } from '@/utils/formatters';
import { API_BASE_URL } from '@/utils/constants';

const orderSteps = [
  { key: 'PENDING', label: 'Order Placed', icon: Package },
  { key: 'PROCESSING', label: 'Processing', icon: Clock },
  { key: 'SHIPPED', label: 'Shipped', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle },
];

const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [showConfirmDelivery, setShowConfirmDelivery] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  // Fetch order
  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getOrder(Number(id)),
    enabled: !!id,
  });

  const order = data?.order || data;

  // Confirm delivery mutation
  const confirmDeliveryMutation = useMutation({
    mutationFn: async () => {
      // First get escrow
      const escrow = await paymentApi.getEscrowByOrder(Number(id));
      // Then release payment
      return paymentApi.releasePayment(escrow.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      toast.success('Delivery confirmed! Payment released to seller.');
      setShowConfirmDelivery(false);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // Raise dispute mutation
  const disputeMutation = useMutation({
    mutationFn: async () => {
      const escrow = await paymentApi.getEscrowByOrder(Number(id));
      return paymentApi.raiseDispute(escrow.id, {
        reason: 'Product Issue',
        description: disputeReason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      toast.success('Dispute raised. Our team will review it.');
      setShowDispute(false);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // Cancel order mutation
  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancelOrder(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      toast.success('Order cancelled');
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

  const getCurrentStepIndex = () => {
    if (!order) return 0;
    if (order.status === 'CANCELLED') return -1;
    return orderSteps.findIndex((s) => s.key === order.status);
  };

  if (isLoading) {
    return <LoadingPage message="Loading order..." />;
  }

  if (!order) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 text-center">
        <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Order Not Found</h2>
        <Button onClick={() => navigate('/orders')}>Back to Orders</Button>
      </div>
    );
  }

  const currentStep = getCurrentStepIndex();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold">Order #{order.order_number}</h1>
            <p className="text-xs text-gray-500">
              {formatDate(order.created_at)}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Order Status */}
        {order.status === 'CANCELLED' ? (
          <div className="bg-red-50 rounded-xl p-4 mb-4 flex items-center gap-3">
            <XCircle className="w-6 h-6 text-red-500" />
            <div>
              <p className="font-medium text-red-900">Order Cancelled</p>
              <p className="text-sm text-red-700">
                {order.cancelled_reason || 'This order has been cancelled'}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-4 mb-4">
            <h2 className="font-semibold text-gray-900 mb-4">Order Status</h2>
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${(currentStep / (orderSteps.length - 1)) * 100}%`,
                  }}
                />
              </div>

              {/* Steps */}
              <div className="relative flex justify-between">
                {orderSteps.map((step, idx) => {
                  const isCompleted = idx <= currentStep;
                  const isCurrent = idx === currentStep;
                  return (
                    <div key={step.key} className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center z-10 ${
                          isCompleted
                            ? 'bg-primary text-white'
                            : 'bg-gray-200 text-gray-400'
                        } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                      >
                        <step.icon className="w-5 h-5" />
                      </div>
                      <p
                        className={`text-xs mt-2 text-center ${
                          isCompleted ? 'text-primary font-medium' : 'text-gray-400'
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Estimated Delivery */}
            {order.status !== 'DELIVERED' && order.estimated_delivery_date && (
              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-500">Estimated Delivery</p>
                <p className="font-medium text-gray-900">
                  {formatDate(order.estimated_delivery_date)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Product Info */}
        <div className="bg-white rounded-xl p-4 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">Product</h2>
          <div className="flex gap-4">
            <img
              src={getImageUrl(order.product_image || '')}
              alt={order.product_name}
              className="w-20 h-20 rounded-lg object-cover bg-gray-100"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900">{order.product_name}</h3>
              <p className="text-sm text-gray-500">
                Qty: {order.quantity} {order.unit_of_measure?.toLowerCase() || 'units'}
              </p>
              <p className="text-primary font-semibold mt-1">
                {formatCurrency(order.total_amount)}
              </p>
            </div>
          </div>
        </div>

        {/* Seller Info */}
        <div className="bg-white rounded-xl p-4 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">Seller</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{order.seller_name}</p>
              {order.seller_phone && (
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {order.seller_phone}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/messages?seller=${order.seller_id}`)}
              leftIcon={<MessageCircle className="w-4 h-4" />}
            >
              Chat
            </Button>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="bg-white rounded-xl p-4 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">Delivery Address</h2>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-gray-900">{order.delivery_address}</p>
              {order.delivery_notes && (
                <p className="text-sm text-gray-500 mt-1">
                  Note: {order.delivery_notes}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-white rounded-xl p-4 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">Payment Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-900">
                {formatCurrency(order.total_amount * 0.95)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Platform Fee</span>
              <span className="text-gray-900">
                {formatCurrency(order.total_amount * 0.05)}
              </span>
            </div>
            <div className="flex justify-between font-semibold pt-2 border-t border-gray-100">
              <span className="text-gray-900">Total</span>
              <span className="text-primary">{formatCurrency(order.total_amount)}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <Badge
              variant={
                order.payment_status === 'PAID'
                  ? 'success'
                  : order.payment_status === 'PENDING'
                  ? 'warning'
                  : 'default'
              }
            >
              {order.payment_status || 'PAID'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-lg mx-auto flex gap-3">
            {order.status === 'SHIPPED' && (
              <Button
                fullWidth
                onClick={() => setShowConfirmDelivery(true)}
                leftIcon={<CheckCircle className="w-4 h-4" />}
              >
                Confirm Delivery
              </Button>
            )}
            {order.status === 'PENDING' && (
              <Button
                fullWidth
                variant="outline"
                onClick={() => cancelMutation.mutate()}
                isLoading={cancelMutation.isPending}
              >
                Cancel Order
              </Button>
            )}
            {(order.status === 'PROCESSING' || order.status === 'SHIPPED') && (
              <Button
                fullWidth
                variant="outline"
                onClick={() => setShowDispute(true)}
                leftIcon={<AlertCircle className="w-4 h-4" />}
              >
                Report Issue
              </Button>
            )}
          </div>
        </div>
      )}

      {order.status === 'DELIVERED' && !order.has_reviewed && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-lg mx-auto">
            <Button
              fullWidth
              onClick={() => setShowReview(true)}
              leftIcon={<Star className="w-4 h-4" />}
            >
              Leave a Review
            </Button>
          </div>
        </div>
      )}

      {/* Confirm Delivery Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDelivery}
        onClose={() => setShowConfirmDelivery(false)}
        onConfirm={() => confirmDeliveryMutation.mutate()}
        title="Confirm Delivery"
        message="By confirming, you acknowledge that you have received the product in good condition. The payment will be released to the seller."
        confirmText="Confirm Delivery"
      />

      {/* Dispute Modal */}
      <Modal
        isOpen={showDispute}
        onClose={() => setShowDispute(false)}
        title="Report an Issue"
      >
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-4">
            Please describe the issue with your order. Our team will review it and get back to you.
          </p>
          <textarea
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            placeholder="Describe the issue..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none h-32"
          />
          <div className="flex gap-3 mt-4">
            <Button
              fullWidth
              variant="outline"
              onClick={() => setShowDispute(false)}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              onClick={() => disputeMutation.mutate()}
              isLoading={disputeMutation.isPending}
              disabled={!disputeReason.trim()}
            >
              Submit
            </Button>
          </div>
        </div>
      </Modal>

      {/* Review Modal */}
      <Modal
        isOpen={showReview}
        onClose={() => setShowReview(false)}
        title="Leave a Review"
      >
        <div className="p-4">
          <div className="text-center mb-4">
            <p className="text-sm text-gray-600 mb-2">Rate your experience</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your experience with this product..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none h-24"
          />
          <div className="flex gap-3 mt-4">
            <Button
              fullWidth
              variant="outline"
              onClick={() => setShowReview(false)}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              onClick={() => {
                // TODO: Submit review
                toast.success('Review submitted!');
                setShowReview(false);
              }}
            >
              Submit Review
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OrderDetailPage;
