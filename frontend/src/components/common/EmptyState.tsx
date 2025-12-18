import React from 'react';
import { Package, ShoppingCart, Search, MessageCircle, Bell, FileText, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from './Button';

type EmptyStateType =
  | 'products'
  | 'cart'
  | 'search'
  | 'messages'
  | 'notifications'
  | 'orders'
  | 'wishlist'
  | 'custom';

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const defaultConfig: Record<
  Exclude<EmptyStateType, 'custom'>,
  { icon: React.ReactNode; title: string; description: string }
> = {
  products: {
    icon: <Package className="w-12 h-12 text-gray-300" />,
    title: 'No products found',
    description: 'Try adjusting your filters or search to find what you need.',
  },
  cart: {
    icon: <ShoppingCart className="w-12 h-12 text-gray-300" />,
    title: 'Your cart is empty',
    description: 'Browse products and add items to your cart to get started.',
  },
  search: {
    icon: <Search className="w-12 h-12 text-gray-300" />,
    title: 'No results found',
    description: 'Try a different search term or check your spelling.',
  },
  messages: {
    icon: <MessageCircle className="w-12 h-12 text-gray-300" />,
    title: 'No messages yet',
    description: 'Start a conversation with a farmer or buyer.',
  },
  notifications: {
    icon: <Bell className="w-12 h-12 text-gray-300" />,
    title: 'No notifications',
    description: "You're all caught up! Check back later for updates.",
  },
  orders: {
    icon: <FileText className="w-12 h-12 text-gray-300" />,
    title: 'No orders yet',
    description: 'Your order history will appear here after your first purchase.',
  },
  wishlist: {
    icon: <Heart className="w-12 h-12 text-gray-300" />,
    title: 'Your wishlist is empty',
    description: 'Save products you like to your wishlist.',
  },
};

const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'custom',
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className,
}) => {
  const config = type !== 'custom' ? defaultConfig[type] : null;

  const displayIcon = icon || config?.icon;
  const displayTitle = title || config?.title || 'Nothing here';
  const displayDescription =
    description || config?.description || 'No items to display.';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-6 text-center',
        className
      )}
    >
      {displayIcon && <div className="mb-4">{displayIcon}</div>}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {displayTitle}
      </h3>
      <p className="text-gray-500 text-sm max-w-xs mb-6">{displayDescription}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
