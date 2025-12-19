import React from 'react';
import { cn } from '@/lib/utils';
import { ORDER_STATUS_CONFIG } from '@/utils/constants';
import type { OrderStatus } from '@/types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

const variantStyles = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
};

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className,
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variantStyles[variant],
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        className
      )}
    >
      {children}
    </span>
  );
};

export default Badge;

// Status badge specifically for order status
interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({
  status,
  className,
}) => {
  const config = ORDER_STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 text-sm font-medium rounded-full',
        config.bgColor,
        config.textColor,
        className
      )}
    >
      {config.label}
    </span>
  );
};

// Category pill for product categories
interface CategoryPillProps {
  category: string;
  emoji?: string;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export const CategoryPill: React.FC<CategoryPillProps> = ({
  category,
  emoji,
  isSelected = false,
  onClick,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium',
        'transition-colors whitespace-nowrap',
        isSelected
          ? 'bg-primary text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
        className
      )}
    >
      {emoji && <span>{emoji}</span>}
      <span>{category}</span>
    </button>
  );
};
