import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Package,
  Search,
  ChevronRight,
  User,
  MapPin,
} from 'lucide-react';
import {
  Input,
  ListItemSkeleton,
  EmptyState,
} from '@/components/common';
import { ordersApi } from '@/services/api';
import { formatCurrency, formatDate } from '@/utils/formatters';
import type { OrderStatus } from '@/types';

const statusTabs: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Shipped', value: 'SHIPPED' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Disputed', value: 'DISPUTED' },
];

const getStatusColor = (status: OrderStatus): string => {
  const colors: Record<OrderStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    PAID: 'bg-blue-100 text-blue-700',
    PROCESSING: 'bg-purple-100 text-purple-700',
    SHIPPED: 'bg-indigo-100 text-indigo-700',
    DELIVERED: 'bg-teal-100 text-teal-700',
    COMPLETED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-gray-100 text-gray-700',
    REFUNDED: 'bg-orange-100 text-orange-700',
    DISPUTED: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

const AdminOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'orders', activeTab],
    queryFn: () =>
      ordersApi.getOrders({
        status: activeTab === 'all' ? undefined : activeTab,
        limit: 100,
      }),
  });

  const filteredOrders = data?.orders?.filter((order) =>
    order.order_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-20">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
        <p className="text-gray-500">View and manage all orders</p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Search by order number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-5 h-5" />}
        />
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 rounded-t-xl overflow-x-auto">
        <div className="flex">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-b-xl border border-t-0 border-gray-100">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
        ) : filteredOrders && filteredOrders.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => navigate(`/admin/orders/${order.id}`)}
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        #{order.order_number}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
                  </div>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>

                {/* Buyer & Seller Info */}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {order.buyer && (
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>Buyer: {order.buyer.full_name}</span>
                    </div>
                  )}
                  {order.delivery_address && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate max-w-[200px]">{order.delivery_address}</span>
                    </div>
                  )}
                </div>

                {/* Items Preview */}
                {order.items && order.items.length > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                    <Package className="w-4 h-4" />
                    <span>
                      {order.items.length} item{order.items.length > 1 ? 's' : ''} -{' '}
                      {order.items[0].product_name_snapshot}
                      {order.items.length > 1 && ` +${order.items.length - 1} more`}
                    </span>
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8">
            <EmptyState
              type="orders"
              title="No orders found"
              description="Orders will appear here when customers place them"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrdersPage;
