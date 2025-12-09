import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowNotification(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showNotification) {
    return null;
  }

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
      <div className={`px-6 py-3 rounded-full shadow-lg flex items-center gap-2 ${
        isOnline 
          ? 'bg-green-500 text-white' 
          : 'bg-orange-500 text-white'
      }`}>
        {isOnline ? (
          <>
            <Wifi className="w-5 h-5" />
            <span>Back Online</span>
          </>
        ) : (
          <>
            <WifiOff className="w-5 h-5" />
            <span>Offline Mode - Changes will sync when connected</span>
          </>
        )}
      </div>
    </div>
  );
}
