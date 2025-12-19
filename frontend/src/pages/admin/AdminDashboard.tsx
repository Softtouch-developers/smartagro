import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  AlertCircle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  LogOut,
} from 'lucide-react';
import { LoadingPage, Button, ConfirmDialog } from '@/components/common';
import { adminApi } from '@/services/api';
import { formatCurrency } from '@/utils/formatters';
import { useAuthStore } from '@/stores/authStore';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color: string;
  link?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, color, link }) => {
  const content = (
    <div className={`bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-shadow ${link ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
          {icon}
        </div>
        {trend && (
          <span
            className={`flex items-center text-sm font-medium ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
          >
            {trend.value >= 0 ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-sm text-gray-500">{title}</p>
      {trend && <p className="text-xs text-gray-400 mt-1">{trend.label}</p>}
    </div>
  );

  if (link) {
    return <Link to={link}>{content}</Link>;
  }

  return content;
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminApi.getDashboardStats,
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (isLoading) {
    return <LoadingPage message="Loading dashboard..." />;
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Failed to load dashboard statistics</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-20">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500">Platform overview and statistics</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<LogOut className="w-4 h-4" />}
          onClick={() => setShowLogoutConfirm(true)}
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          Log Out
        </Button>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Users"
          value={stats.user_metrics.total_users.toLocaleString()}
          icon={<Users className="w-5 h-5 text-blue-600" />}
          color="bg-blue-100"
          trend={{ value: 12, label: 'vs last month' }}
          link="/admin/users"
        />
        <StatCard
          title="Active Products"
          value={stats.product_metrics.active_products.toLocaleString()}
          icon={<Package className="w-5 h-5 text-green-600" />}
          color="bg-green-100"
        />
        <StatCard
          title="Orders This Month"
          value={stats.order_metrics.orders_this_month.toLocaleString()}
          icon={<ShoppingCart className="w-5 h-5 text-purple-600" />}
          color="bg-purple-100"
          link="/admin/orders"
        />
        <StatCard
          title="Transaction Volume"
          value={formatCurrency(stats.financial_metrics.total_transaction_volume)}
          icon={<DollarSign className="w-5 h-5 text-amber-600" />}
          color="bg-amber-100"
        />
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500" />
            User Statistics
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Farmers</span>
              <span className="font-medium">{stats.user_metrics.farmers}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Buyers</span>
              <span className="font-medium">{stats.user_metrics.buyers}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Admins</span>
              <span className="font-medium">{stats.user_metrics.admins}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Verified Users</span>
              <span className="font-medium text-green-600">{stats.user_metrics.verified_users}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600">New This Week</span>
              <span className="font-medium text-blue-600">{stats.user_metrics.new_users_this_week}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-gray-500" />
            Financial Overview
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">This Month's Volume</span>
              <span className="font-medium">{formatCurrency(stats.financial_metrics.volume_this_month)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Platform Fees Collected</span>
              <span className="font-medium text-green-600">{formatCurrency(stats.financial_metrics.total_platform_fees)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Escrow Balance</span>
              <span className="font-medium">{formatCurrency(stats.financial_metrics.escrow_balance)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600">Pending Payouts</span>
              <span className="font-medium text-amber-600">{formatCurrency(stats.financial_metrics.pending_payouts)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Status & Disputes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-gray-500" />
            Orders by Status
          </h2>
          <div className="space-y-3">
            {Object.entries(stats.order_metrics.by_status).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between py-2">
                <span className="text-gray-600 capitalize">{status.toLowerCase().replace('_', ' ')}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Avg Order Value</span>
              <span className="font-medium text-primary">
                {formatCurrency(stats.order_metrics.average_order_value)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-gray-500" />
            Disputes & Engagement
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Open Disputes</span>
              <span className={`font-medium ${stats.dispute_metrics.open_disputes > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {stats.dispute_metrics.open_disputes}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Resolved Disputes</span>
              <span className="font-medium">{stats.dispute_metrics.resolved_disputes}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Avg Resolution Time</span>
              <span className="font-medium">{stats.dispute_metrics.average_resolution_days} days</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Total Chat Messages</span>
              <span className="font-medium">{stats.engagement_metrics.total_chat_messages}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600">AI Agent Conversations</span>
              <span className="font-medium">{stats.engagement_metrics.agent_conversations}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/admin/users"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Users className="w-5 h-5 text-blue-600" />
            <span className="font-medium">Manage Users</span>
          </Link>
          <Link
            to="/admin/orders"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ShoppingCart className="w-5 h-5 text-purple-600" />
            <span className="font-medium">View Orders</span>
          </Link>
          <Link
            to="/admin/disputes"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="font-medium">Disputes</span>
          </Link>
          <Link
            to="/admin/settings"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Activity className="w-5 h-5 text-green-600" />
            <span className="font-medium">Settings</span>
          </Link>
        </div>
      </div>


      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmText="Log Out"
        variant="danger"
      />
    </div >
  );
};

export default AdminDashboard;
