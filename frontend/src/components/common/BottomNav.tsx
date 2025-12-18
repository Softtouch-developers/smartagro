import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Search,
  ShoppingCart,
  MessageCircle,
  User,
  LayoutDashboard,
  Package,
  PlusCircle,
  Bot,
  Users,
  ShoppingBag,
  Scale,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore, selectCartItemCount } from '@/stores/cartStore';
import { NAV_ITEMS } from '@/utils/constants';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  Search,
  ShoppingCart,
  MessageCircle,
  User,
  LayoutDashboard,
  Package,
  Plus: PlusCircle,
  Bot,
  Users,
  ShoppingBag,
  Scale,
  Settings,
};

const BottomNav: React.FC = () => {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const cartItemCount = useCartStore(selectCartItemCount);

  // Determine which nav items to show based on current path and user mode
  const getNavItems = () => {
    if (location.pathname.startsWith('/admin')) {
      return NAV_ITEMS.admin;
    }
    if (location.pathname.startsWith('/farmer') || user?.current_mode === 'FARMER') {
      return NAV_ITEMS.farmer;
    }
    return NAV_ITEMS.buyer;
  };

  const navItems = getNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-50">
      <div className="max-w-lg mx-auto px-2">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
            const showBadge = item.icon === 'ShoppingCart' && cartItemCount > 0;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full relative',
                  'transition-colors duration-200',
                  isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <div className="relative">
                  <Icon className={cn('w-6 h-6', isActive && 'stroke-[2.5]')} />
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
                      {cartItemCount > 9 ? '9+' : cartItemCount}
                    </span>
                  )}
                </div>
                <span className={cn('text-[10px] mt-1', isActive && 'font-medium')}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
