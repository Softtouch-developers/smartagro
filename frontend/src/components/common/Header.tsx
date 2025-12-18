import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Search, Bell, WifiOff, MessageCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';
import { chatApi } from '@/services/api';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showSearch?: boolean;
  showNotifications?: boolean;
  rightElement?: React.ReactNode;
  transparent?: boolean;
  onSearchClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  showSearch = false,
  showNotifications = false,
  rightElement,
  transparent = false,
  onSearchClick,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const isOnline = useSyncStore((state) => state.isOnline);

  // Fetch unread messages count
  const { data: unreadData } = useQuery({
    queryKey: ['unread-messages'],
    queryFn: () => chatApi.getUnreadCount(),
    enabled: !!user && isOnline,
    refetchInterval: 30000, // Check every 30 seconds
  });

  const unreadCount = unreadData?.unread_count || 0;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  // Don't show header on certain pages
  const hiddenPaths = ['/login', '/signup', '/onboarding'];
  if (hiddenPaths.some((path) => location.pathname.startsWith(path))) {
    return null;
  }

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-40 safe-area-top',
        transparent ? 'bg-transparent' : 'bg-white border-b border-gray-100'
      )}
    >
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          {title ? (
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {title}
            </h1>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-primary">SmartAgro</span>
              {!isOnline && (
                <span className="flex items-center text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  <WifiOff className="w-3 h-3 mr-1" />
                  Offline
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {showSearch && (
            <button
              onClick={onSearchClick}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5 text-gray-600" />
            </button>
          )}
          {user && user.user_type !== 'ADMIN' && (
            <button
              onClick={() => navigate('/messages')}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors relative"
              aria-label="Messages"
            >
              <MessageCircle className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full border-2 border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )}
          {showNotifications && user && (
            <button
              onClick={() => navigate('/notifications')}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {/* Notification badge - would be connected to notification count */}
              {/* <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" /> */}
            </button>
          )}
          {rightElement}
        </div>
      </div>
    </header>
  );
};

export default Header;
