import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header, BottomNav, ToastContainer } from '@/components/common';

interface MainLayoutProps {
  showHeader?: boolean;
  showBottomNav?: boolean;
  headerProps?: {
    title?: string;
    showBack?: boolean;
    showSearch?: boolean;
    showNotifications?: boolean;
    rightElement?: React.ReactNode;
  };
}

const MainLayout: React.FC<MainLayoutProps> = ({
  showHeader = true,
  showBottomNav = true,
  headerProps = {},
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {showHeader && <Header {...headerProps} />}
      <ToastContainer />
      <main className={`${showHeader ? 'pt-14' : ''} ${showBottomNav ? 'pb-20' : ''}`}>
        <Outlet />
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  );
};

export default MainLayout;
