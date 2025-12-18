import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Package, ChevronRight } from 'lucide-react';
import {
  OrderStatusBadge,
  EmptyState,
  ListItemSkeleton,
} from '@/components/common';
import { ordersApi } from '@/services/api';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { API_BASE_URL } from '@/utils/constants';
import type { OrderStatus } from '@/types';

const statusTabs: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Shipped', value: 'SHIPPED' },
  { label: 'Completed', value: 'COMPLETED' },
];

const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['orders', 'buyer', activeTab],
    queryFn: () =>
      ordersApi.getOrders({
        role: 'buyer',
        status: activeTab === 'all' ? undefined : activeTab,
        limit: 50,
      }),
  });

  return (
    <div className="max-w-lg mx-auto">
      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 sticky top-14 z-10">
        <div className="flex overflow-x-auto scrollbar-hide">
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

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
        ) : data?.orders && data.orders.length > 0 ? (
          <div className="space-y-3">
            {data.orders.map((order) => (
              <div
                key={order.id}
                onClick={() => navigate(`/orders/${order.id}`)}
                className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-900">
                      #{order.order_number}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                {/* Order Items Preview */}
                <div className="flex items-center gap-3">
                  {order.items && order.items.length > 0 ? (
                    <>
                      <div className="flex -space-x-2">
                        {order.items.slice(0, 3).map((item, idx) => (
                          <img
                            key={idx}
                            src={
                              item.product?.primary_image_url
                                ? `${API_BASE_URL}${item.product.primary_image_url}`
                                : '/placeholder-product.jpg'
                            }
                            alt=""
                            className="w-10 h-10 rounded-lg border-2 border-white object-cover bg-gray-100"
                          />
                        ))}
                        {order.items.length > 3 && (
                          <div className="w-10 h-10 rounded-lg border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500">
                            +{order.items.length - 3}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-600 truncate">
                          {order.items[0].product_name_snapshot}
                          {order.items.length > 1 &&
                            ` + ${order.items.length - 1} more`}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Package className="w-4 h-4" />
                      <span>Order details</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(order.total_amount)}
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            type="orders"
            actionLabel="Browse Products"
            onAction={() => navigate('/')}
          />
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
