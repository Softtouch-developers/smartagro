import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  ChevronRight,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  User,
  Phone,
  MapPin,
} from 'lucide-react';
import {
  Button,
  EmptyState,
  ListItemSkeleton,
  Modal,
  Input,
} from '@/components/common';
import { ordersApi } from '@/services/api';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { useToast } from '@/stores/uiStore';
import { getErrorMessage } from '@/services/api/client';
import type { Order, OrderStatus } from '@/types';

const statusTabs: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'New', value: 'PAID' },
  { label: 'Processing', value: 'CONFIRMED' },
  { label: 'Shipped', value: 'SHIPPED' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const getStatusConfig = (status: OrderStatus) => {
  const configs: Record<OrderStatus, { color: string; icon: React.ReactNode; label: string }> = {
    PENDING: { color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-4 h-4" />, label: 'Pending Payment' },
    PAID: { color: 'bg-blue-100 text-blue-700', icon: <AlertCircle className="w-4 h-4" />, label: 'New Order' },
    CONFIRMED: { color: 'bg-purple-100 text-purple-700', icon: <Package className="w-4 h-4" />, label: 'Confirmed' },
    SHIPPED: { color: 'bg-indigo-100 text-indigo-700', icon: <Truck className="w-4 h-4" />, label: 'Shipped' },
    DELIVERED: { color: 'bg-teal-100 text-teal-700', icon: <CheckCircle className="w-4 h-4" />, label: 'Delivered' },
    COMPLETED: { color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-4 h-4" />, label: 'Completed' },
    CANCELLED: { color: 'bg-gray-100 text-gray-700', icon: <XCircle className="w-4 h-4" />, label: 'Cancelled' },
    REFUNDED: { color: 'bg-orange-100 text-orange-700', icon: <AlertCircle className="w-4 h-4" />, label: 'Refunded' },
    DISPUTED: { color: 'bg-red-100 text-red-700', icon: <AlertCircle className="w-4 h-4" />, label: 'Disputed' },
  };
  return configs[status] || configs.PENDING;
};

const FarmerOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showShipModal, setShowShipModal] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['orders', 'farmer', activeTab],
    queryFn: () =>
      ordersApi.getOrders({
        role: 'seller',
        status: activeTab === 'all' ? undefined : activeTab,
        limit: 50,
      }),
  });

  const shipMutation = useMutation({
    mutationFn: (orderId: number) =>
      ordersApi.shipOrder(orderId, {
        carrier: carrier || undefined,
        tracking_number: trackingNumber || undefined,
      }),
    onSuccess: () => {
      toast.success('Order marked as shipped!');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setShowShipModal(false);
      setSelectedOrder(null);
      setTrackingNumber('');
      setCarrier('');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const processOrderMutation = useMutation({
    mutationFn: (orderId: number) =>
      ordersApi.updateOrderStatus(orderId, 'CONFIRMED'),
    onSuccess: () => {
      toast.success('Order is now being processed!');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const handleShipOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowShipModal(true);
  };

  const handleProcessOrder = (order: Order) => {
    processOrderMutation.mutate(order.id);
  };

  const confirmShip = () => {
    if (selectedOrder) {
      shipMutation.mutate(selectedOrder.id);
    }
  };

  return (
    <div className="max-w-lg mx-auto pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500">Manage your customer orders</p>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 sticky top-14 z-10">
        <div className="flex overflow-x-auto scrollbar-hide">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
        ) : data?.orders && data.orders.length > 0 ? (
          <div className="space-y-4">
            {data.orders.map((order) => {
              const statusConfig = getStatusConfig(order.status);
              const isPaid = order.status === 'PAID';
              const isProcessing = order.status === 'CONFIRMED';

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl border border-gray-100 overflow-hidden"
                >
                  {/* Order Header */}
                  <div className="p-4 border-b border-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          #{order.order_number}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDateTime(order.created_at)}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}
                      >
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                    </div>

                    {/* Buyer Info */}
                    {order.buyer && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-4 h-4" />
                        <span>{order.buyer.full_name}</span>
                        {order.buyer.phone_number && (
                          <>
                            <Phone className="w-4 h-4 ml-2" />
                            <span>{order.buyer.phone_number}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Order Items */}
                  <div className="p-4">
                    {order.items && order.items.length > 0 ? (
                      <div className="space-y-2">
                        {order.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-gray-700">
                              {item.quantity}x {item.product_name_snapshot}
                            </span>
                            <span className="font-medium">
                              {formatCurrency(item.subtotal)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Order details</p>
                    )}

                    {/* Delivery Info */}
                    {order.delivery_address && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{order.delivery_address}</span>
                        </div>
                      </div>
                    )}

                    {/* Total */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <span className="text-gray-600">Total</span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(order.total_amount)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {(isPaid || isProcessing) && (
                    <div className="px-4 pb-4 flex gap-2">
                      {isPaid && (
                        <Button
                          variant="outline"
                          size="sm"
                          fullWidth
                          onClick={() => handleProcessOrder(order)}
                          isLoading={processOrderMutation.isPending}
                        >
                          Start Processing
                        </Button>
                      )}
                      {isProcessing && (
                        <Button
                          variant="primary"
                          size="sm"
                          fullWidth
                          leftIcon={<Truck className="w-4 h-4" />}
                          onClick={() => handleShipOrder(order)}
                        >
                          Mark as Shipped
                        </Button>
                      )}
                    </div>
                  )}

                  {/* View Details */}
                  <button
                    onClick={() => navigate(`/farmer/orders/${order.id}`)}
                    className="w-full px-4 py-3 flex items-center justify-center gap-2 text-sm text-primary border-t border-gray-100 hover:bg-gray-50"
                  >
                    View Details
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            type="orders"
            title="No orders yet"
            description="When customers place orders, they'll appear here"
          />
        )}
      </div>

      {/* Ship Order Modal */}
      <Modal
        isOpen={showShipModal}
        onClose={() => setShowShipModal(false)}
        title="Ship Order"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Add shipping details for order #{selectedOrder?.order_number}
          </p>

          <Input
            label="Carrier (Optional)"
            placeholder="e.g., GIG Logistics, DHL"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
          />

          <Input
            label="Tracking Number (Optional)"
            placeholder="Enter tracking number"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
          />

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setShowShipModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={confirmShip}
              isLoading={shipMutation.isPending}
            >
              Confirm Shipment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FarmerOrdersPage;
