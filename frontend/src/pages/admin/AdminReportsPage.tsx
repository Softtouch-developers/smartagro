// @ts-nocheck
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  ShoppingBag,
  DollarSign,
  Calendar,
  Download,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Button, Select, LoadingSection, Skeleton } from '@/components/common';
import { adminApi } from '@/services/api';
import { formatCurrency } from '@/utils/formatters';

type TimePeriod = 'week' | 'month' | 'quarter' | 'year';

interface MetricCard {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const AdminReportsPage: React.FC = () => {
  const [period, setPeriod] = useState<TimePeriod>('month');

  // Fetch dashboard stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard-stats'],
    queryFn: () => adminApi.getDashboardStats(),
  });

  // Simulated period data (would come from backend in production)
  const periodStats = {
    week: { revenue: 15420, orders: 48, users: 12, products: 8, revenueChange: 12.5, ordersChange: 8.3 },
    month: { revenue: 68900, orders: 215, users: 45, products: 32, revenueChange: 18.2, ordersChange: 15.7 },
    quarter: { revenue: 195000, orders: 620, users: 128, products: 89, revenueChange: 25.4, ordersChange: 22.1 },
    year: { revenue: 750000, orders: 2450, users: 512, products: 342, revenueChange: 45.8, ordersChange: 38.5 },
  };

  const currentPeriodStats = periodStats[period];

  const metrics: MetricCard[] = [
    {
      label: 'Total Revenue',
      value: formatCurrency(currentPeriodStats.revenue),
      change: currentPeriodStats.revenueChange,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: 'Total Orders',
      value: currentPeriodStats.orders,
      change: currentPeriodStats.ordersChange,
      icon: ShoppingBag,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'New Users',
      value: currentPeriodStats.users,
      change: 8.5,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      label: 'New Products',
      value: currentPeriodStats.products,
      change: -2.3,
      icon: Package,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
  ];

  // Simulated top products data
  const topProducts = [
    { name: 'Fresh Tomatoes', sales: 156, revenue: 4680 },
    { name: 'Organic Plantains', sales: 128, revenue: 3840 },
    { name: 'Local Rice', sales: 98, revenue: 9800 },
    { name: 'Palm Oil', sales: 87, revenue: 4350 },
    { name: 'Cassava', sales: 76, revenue: 2280 },
  ];

  // Simulated top sellers data
  const topSellers = [
    { name: 'Kwame Farms', sales: 89, revenue: 12500 },
    { name: 'Ashanti Organics', sales: 76, revenue: 9800 },
    { name: 'Northern Harvest', sales: 65, revenue: 8700 },
    { name: 'Volta Produce', sales: 54, revenue: 7200 },
    { name: 'Coastal Fresh', sales: 48, revenue: 6100 },
  ];

  // Simulated category distribution
  const categoryDistribution = [
    { category: 'Vegetables', percentage: 35, color: 'bg-green-500' },
    { category: 'Fruits', percentage: 25, color: 'bg-amber-500' },
    { category: 'Grains', percentage: 20, color: 'bg-blue-500' },
    { category: 'Tubers', percentage: 12, color: 'bg-purple-500' },
    { category: 'Others', percentage: 8, color: 'bg-gray-500' },
  ];

  const periodLabels: Record<TimePeriod, string> = {
    week: 'This Week',
    month: 'This Month',
    quarter: 'This Quarter',
    year: 'This Year',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500">Platform performance insights</p>
        </div>
        <div className="flex gap-3">
          <Select
            value={period}
            onChange={(value) => setPeriod(value as TimePeriod)}
            options={[
              { value: 'week', label: 'This Week' },
              { value: 'month', label: 'This Month' },
              { value: 'quarter', label: 'This Quarter' },
              { value: 'year', label: 'This Year' },
            ]}
          />
          <Button
            variant="outline"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() => {
              // TODO: Export report
            }}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="bg-white rounded-xl p-4 border border-gray-100"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 ${metric.bgColor} rounded-lg flex items-center justify-center`}>
                <metric.icon className={`w-5 h-5 ${metric.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</p>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{metric.label}</p>
              {metric.change !== undefined && (
                <span
                  className={`flex items-center text-xs font-medium ${
                    metric.change >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {metric.change >= 0 ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  {Math.abs(metric.change)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Top Products */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Top Products</h2>
          </div>
          <div className="space-y-3">
            {topProducts.map((product, idx) => (
              <div key={product.name} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-500">{product.sales} sales</p>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {formatCurrency(product.revenue)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Sellers */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Top Sellers</h2>
          </div>
          <div className="space-y-3">
            {topSellers.map((seller, idx) => (
              <div key={seller.name} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {seller.name}
                  </p>
                  <p className="text-xs text-gray-500">{seller.sales} orders</p>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {formatCurrency(seller.revenue)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Distribution */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Sales by Category</h2>
        </div>
        <div className="space-y-3">
          {categoryDistribution.map((cat) => (
            <div key={cat.category}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-700">{cat.category}</span>
                <span className="font-medium text-gray-900">{cat.percentage}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${cat.color} rounded-full transition-all`}
                  style={{ width: `${cat.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Platform Stats Summary */}
      {stats && (
        <div className="bg-gradient-to-br from-primary to-green-600 rounded-xl p-6 text-white">
          <h2 className="text-lg font-semibold mb-4">Platform Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-3xl font-bold">{stats.total_users || 0}</p>
              <p className="text-sm opacity-80">Total Users</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{stats.total_products || 0}</p>
              <p className="text-sm opacity-80">Total Products</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{stats.total_orders || 0}</p>
              <p className="text-sm opacity-80">Total Orders</p>
            </div>
            <div>
              <p className="text-3xl font-bold">
                {formatCurrency(stats.total_revenue || 0)}
              </p>
              <p className="text-sm opacity-80">Total Revenue</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReportsPage;
