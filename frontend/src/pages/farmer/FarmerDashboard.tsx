import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Package,
  ShoppingBag,
  TrendingUp,
  Star,
  Plus,
  ChevronRight,
  Clock,
  MessageCircle,
} from 'lucide-react';
import {
  Button,
  OrderStatusBadge,
  LoadingSection,
  Skeleton,
} from '@/components/common';
import { productsApi, ordersApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency, formatRelativeTime } from '@/utils/formatters';
import { getImageUrl } from '@/utils/images';

const FarmerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  // Fetch farmer's products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['farmer', 'products'],
    queryFn: () => productsApi.getMyProducts({ limit: 5 }),
  });

  // Fetch farmer's orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['farmer', 'orders'],
    queryFn: () => ordersApi.getOrders({ role: 'seller', limit: 5 }),
  });

  const stats = [
    {
      label: 'Total Products',
      value: productsData?.total || 0,
      icon: Package,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Total Sales',
      value: user?.total_sales || 0,
      icon: ShoppingBag,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Rating',
      value: user?.average_rating?.toFixed(1) || 'N/A',
      icon: Star,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Total Orders',
      value: ordersData?.total || 0,
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {user?.full_name?.split(' ')[0]}!
        </h1>
        <p className="text-gray-500">
          {user?.farm_name || 'Your farm dashboard'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-100 p-4"
          >
            <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      {/* Quick Actions */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <Button
          fullWidth
          size="lg"
          leftIcon={<Plus className="w-5 h-5" />}
          onClick={() => navigate('/farmer/products/new')}
        >
          Add Product
        </Button>
        <Button
          fullWidth
          variant="outline"
          size="lg"
          leftIcon={<MessageCircle className="w-5 h-5" />}
          onClick={() => navigate('/messages')}
        >
          Messages
        </Button>
      </div>

      {/* Recent Orders */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
          <button
            onClick={() => navigate('/farmer/orders')}
            className="text-sm text-primary font-medium flex items-center"
          >
            View all
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {ordersLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        ) : ordersData?.orders && ordersData.orders.length > 0 ? (
          <div className="space-y-3">
            {ordersData.orders.map((order) => (
              <div
                key={order.id}
                onClick={() => navigate(`/farmer/orders/${order.id}`)}
                className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">
                    #{order.order_number}
                  </span>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatRelativeTime(order.created_at)}
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-6 text-center">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No orders yet</p>
          </div>
        )}
      </section>

      {/* Products Overview */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Your Products</h2>
          <button
            onClick={() => navigate('/farmer/products')}
            className="text-sm text-primary font-medium flex items-center"
          >
            View all
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {productsLoading ? (
          <LoadingSection />
        ) : productsData?.products && productsData.products.length > 0 ? (
          <div className="space-y-3">
            {productsData.products.map((product) => (
              <div
                key={product.id}
                onClick={() => navigate(`/farmer/products/${product.id}`)}
                className="bg-white rounded-xl border border-gray-100 p-4 flex gap-4 cursor-pointer hover:shadow-sm transition-shadow"
              >
                <img
                  src={getImageUrl(product.primary_image_url)}
                  alt={product.product_name}
                  className="w-16 h-16 rounded-lg object-cover bg-gray-100"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {product.product_name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatCurrency(product.price_per_unit)} / {product.unit_of_measure.toLowerCase()}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span
                      className={`${product.status === 'AVAILABLE'
                        ? 'text-green-600'
                        : 'text-gray-500'
                        }`}
                    >
                      {product.status}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500">
                      {product.quantity_available} in stock
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 self-center" />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-6 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 mb-4">No products yet</p>
            <Button onClick={() => navigate('/farmer/products/new')}>
              Add Your First Product
            </Button>
          </div>
        )}
      </section>
    </div>
  );
};

export default FarmerDashboard;
