import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  TrendingUp,
  Wallet,
  Clock,
  CheckCircle,
} from 'lucide-react';
import {
  Badge,
  LoadingSection,
  Skeleton,
  EmptyState,
} from '@/components/common';
import { ordersApi, paymentApi } from '@/services/api';
import { formatCurrency, formatRelativeTime } from '@/utils/formatters';
import { useAuthStore } from '@/stores/authStore';

type TimePeriod = 'week' | 'month' | 'year' | 'all';

const FarmerEarningsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [period, setPeriod] = useState<TimePeriod>('month');

  // Fetch orders for earnings calculation
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['farmer', 'orders', 'completed'],
    queryFn: () => ordersApi.getOrders({ role: 'seller', status: 'DELIVERED', limit: 100 }),
  });

  // Fetch payment history
  const { data: paymentHistory, isLoading: paymentsLoading } = useQuery({
    queryKey: ['farmer', 'payment-history'],
    queryFn: () => paymentApi.getPaymentHistory({ limit: 50 }),
  });

  // Calculate earnings stats
  const calculateStats = () => {
    const orders = ordersData?.orders || [];
    const now = new Date();

    let filtered = orders;
    if (period !== 'all') {
      const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : 365;
      const cutoff = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
      filtered = orders.filter((o) => new Date(o.created_at) >= cutoff);
    }

    const totalEarnings = filtered.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const totalOrders = filtered.length;
    const averageOrderValue = totalOrders > 0 ? totalEarnings / totalOrders : 0;

    // Calculate pending (in escrow)
    const pendingOrders = ordersData?.orders?.filter(
      (o) => o.status === 'PROCESSING' || o.status === 'SHIPPED'
    ) || [];
    const pendingAmount = pendingOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    return {
      totalEarnings,
      totalOrders,
      averageOrderValue,
      pendingAmount,
      pendingOrders: pendingOrders.length,
    };
  };

  const stats = calculateStats();

  const periodLabels: Record<TimePeriod, string> = {
    week: 'This Week',
    month: 'This Month',
    year: 'This Year',
    all: 'All Time',
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
          <h1 className="text-lg font-semibold">Earnings</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Period Filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {(['week', 'month', 'year', 'all'] as TimePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                period === p
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>

        {/* Earnings Overview Card */}
        <div className="bg-gradient-to-br from-primary to-green-600 rounded-2xl p-6 text-white mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 opacity-80" />
            <span className="text-sm opacity-80">Total Earnings</span>
          </div>
          {ordersLoading ? (
            <Skeleton className="h-10 w-40 bg-white/20" />
          ) : (
            <p className="text-4xl font-bold mb-4">
              {formatCurrency(stats.totalEarnings)}
            </p>
          )}
          <div className="flex gap-4">
            <div>
              <p className="text-2xl font-semibold">{stats.totalOrders}</p>
              <p className="text-sm opacity-80">Orders</p>
            </div>
            <div className="border-l border-white/20 pl-4">
              <p className="text-2xl font-semibold">
                {formatCurrency(stats.averageOrderValue)}
              </p>
              <p className="text-sm opacity-80">Avg. Order</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-sm text-gray-500">Pending</span>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(stats.pendingAmount)}
            </p>
            <p className="text-xs text-gray-500">
              {stats.pendingOrders} orders in escrow
            </p>
          </div>
          <div className="bg-white rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-sm text-gray-500">Released</span>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(stats.totalEarnings)}
            </p>
            <p className="text-xs text-gray-500">
              Paid to your account
            </p>
          </div>
        </div>

        {/* Recent Transactions */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Sales</h2>
          </div>

          {ordersLoading ? (
            <LoadingSection />
          ) : ordersData?.orders && ordersData.orders.length > 0 ? (
            <div className="space-y-3">
              {ordersData.orders.slice(0, 10).map((order) => (
                <div
                  key={order.id}
                  onClick={() => navigate(`/farmer/orders/${order.id}`)}
                  className="bg-white rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:shadow-sm transition-shadow"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      order.status === 'DELIVERED'
                        ? 'bg-green-100'
                        : order.status === 'SHIPPED'
                        ? 'bg-blue-100'
                        : 'bg-amber-100'
                    }`}
                  >
                    {order.status === 'DELIVERED' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : order.status === 'SHIPPED' ? (
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {order.product_name || `Order #${order.order_number}`}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatRelativeTime(order.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      +{formatCurrency(order.total_amount)}
                    </p>
                    <Badge
                      variant={
                        order.status === 'DELIVERED'
                          ? 'success'
                          : order.status === 'SHIPPED'
                          ? 'info'
                          : 'warning'
                      }
                      size="sm"
                    >
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              type="orders"
              title="No sales yet"
              description="Your sales will appear here once you start selling"
            />
          )}
        </section>
      </div>
    </div>
  );
};

export default FarmerEarningsPage;
