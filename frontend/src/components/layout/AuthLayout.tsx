import React from 'react';
import { Outlet } from 'react-router-dom';
import { ToastContainer } from '@/components/common';

const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <ToastContainer />
      <Outlet />
    </div>
  );
};

export default AuthLayout;
