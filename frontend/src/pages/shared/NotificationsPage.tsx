import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCheck,
  Trash2,
  Package,
  ShoppingCart,
  CreditCard,
  MessageCircle,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import {
  Button,
  EmptyState,
  ListItemSkeleton,
} from '@/components/common';
import { notificationsApi, type Notification } from '@/services/api';
import { formatRelativeTime } from '@/utils/formatters';
import { useToast } from '@/stores/uiStore';
import { getErrorMessage } from '@/services/api/client';

const getNotificationIcon = (type: string) => {
  const icons: Record<string, React.ReactNode> = {
    order_placed: <ShoppingCart className="w-5 h-5 text-blue-500" />,
    order_shipped: <Package className="w-5 h-5 text-indigo-500" />,
    order_delivered: <Package className="w-5 h-5 text-green-500" />,
    payment_received: <CreditCard className="w-5 h-5 text-green-500" />,
    payment_failed: <CreditCard className="w-5 h-5 text-red-500" />,
    new_message: <MessageCircle className="w-5 h-5 text-purple-500" />,
    product_low_stock: <AlertCircle className="w-5 h-5 text-yellow-500" />,
    product_sold: <ShoppingCart className="w-5 h-5 text-green-500" />,
    review_received: <MessageCircle className="w-5 h-5 text-amber-500" />,
    dispute_opened: <AlertCircle className="w-5 h-5 text-red-500" />,
    dispute_resolved: <CheckCheck className="w-5 h-5 text-green-500" />,
  };
  return icons[type] || <Bell className="w-5 h-5 text-gray-500" />;
};

const getNotificationLink = (notification: Notification): string | null => {
  if (notification.related_order_id) {
    return `/orders/${notification.related_order_id}`;
  }
  if (notification.related_product_id) {
    return `/products/${notification.related_product_id}`;
  }
  return null;
};

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () =>
      notificationsApi.getNotifications({
        limit: 50,
        unread_only: filter === 'unread',
      }),
  });

  const markAsReadMutation = useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      toast.success('All notifications marked as read');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: notificationsApi.deleteNotification,
    onSuccess: () => {
      toast.success('Notification deleted');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate to related content if available
    const link = getNotificationLink(notification);
    if (link) {
      navigate(link);
    }
  };

  const handleDelete = (e: React.MouseEvent, notificationId: number) => {
    e.stopPropagation();
    deleteNotificationMutation.mutate(notificationId);
  };

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

  return (
    <div className="max-w-lg mx-auto pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-gray-100 sticky top-14 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500">{unreadCount} unread</p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<CheckCheck className="w-4 h-4" />}
              onClick={() => markAllAsReadMutation.mutate()}
              isLoading={markAllAsReadMutation.isPending}
            >
              Mark all read
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Unread
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="divide-y divide-gray-100">
        {isLoading ? (
          <div className="px-4 py-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
        ) : notifications && notifications.length > 0 ? (
          notifications.map((notification) => {
            const hasLink = !!getNotificationLink(notification);

            return (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`px-4 py-4 flex items-start gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                  !notification.is_read ? 'bg-blue-50/50' : ''
                }`}
              >
                {/* Icon */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    !notification.is_read ? 'bg-white shadow-sm' : 'bg-gray-100'
                  }`}
                >
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3
                        className={`text-sm ${
                          !notification.is_read
                            ? 'font-semibold text-gray-900'
                            : 'font-medium text-gray-700'
                        }`}
                      >
                        {notification.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatRelativeTime(notification.created_at)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleDelete(e, notification.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {hasLink && (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Unread Indicator */}
                {!notification.is_read && (
                  <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2" />
                )}
              </div>
            );
          })
        ) : (
          <div className="px-4 py-8">
            <EmptyState
              type="notifications"
              title="No notifications"
              description={
                filter === 'unread'
                  ? "You're all caught up!"
                  : 'Your notifications will appear here'
              }
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
