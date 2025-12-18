import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Layouts
import { MainLayout, AuthLayout } from '@/components/layout';

// Auth Pages
import { LoginPage, SignupPage, VerifyOTPPage, ForgotPasswordPage } from '@/pages/auth';

// Welcome Page
import WelcomePage from '@/pages/WelcomePage';

// Buyer Pages
import {
  HomePage,
  SearchPage,
  ProductDetailPage,
  CartPage,
  CheckoutPage,
  OrdersPage,
  OrderDetailPage,
  WishlistPage,
  PaymentPage,
  PaymentCallbackPage,
} from '@/pages/buyer';

// Farmer Pages
import {
  FarmerDashboard,
  FarmerProductsPage,
  AddProductPage,
  EditProductPage,
  FarmerProductDetailPage,
  FarmerOrdersPage,
  FarmerEarningsPage,
} from '@/pages/farmer';

// Shared Pages
import { ProfilePage, EditProfilePage, NotificationsPage, MessagesPage, AIAgentPage } from '@/pages/shared';

// Admin Pages
import {
  AdminDashboard,
  AdminUsersPage,
  AdminOrdersPage,
  AdminProductsPage,
  AdminDisputesPage,
  AdminReportsPage,
  AdminSettingsPage,
} from '@/pages/admin';

// Stores
import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';
import { useCartStore } from '@/stores/cartStore';

// Components
import { LoadingPage } from '@/components/common';

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return <LoadingPage message="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Farmer-only route wrapper
const FarmerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAuthStore((state) => state.user);

  if (user?.current_mode !== 'FARMER') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Admin-only route wrapper
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAuthStore((state) => state.user);

  if (user?.user_type !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Public route wrapper - redirects unauthenticated users to welcome
const PublicHomeRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return <LoadingPage message="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/welcome" replace />;
  }

  return <>{children}</>;
};

// App initialization
const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const loadUser = useAuthStore((state) => state.loadUser);
  const loadCart = useCartStore((state) => state.loadCart);
  const initSync = useSyncStore((state) => state.initialize);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    // Check if we just switched modes - if so, skip loadUser to prevent overwriting
    const modeSwitchPending = localStorage.getItem('mode-switch-pending');
    if (modeSwitchPending) {
      localStorage.removeItem('mode-switch-pending');
      console.log('Skipping loadUser() after mode switch');
    } else {
      // Load user on app start
      loadUser();
    }

    // Initialize sync service
    const cleanupSync = initSync();

    return () => {
      cleanupSync();
    };
  }, [loadUser, initSync]);

  // Load cart when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadCart();
    }
  }, [isAuthenticated, loadCart]);

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppInitializer>
          <Routes>
            {/* Welcome Page - for unauthenticated users */}
            <Route path="/welcome" element={<WelcomePage />} />

            {/* Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/verify-otp" element={<VerifyOTPPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Route>

            {/* Buyer Routes */}
            <Route element={<MainLayout />}>
              <Route
                path="/"
                element={
                  <PublicHomeRoute>
                    <HomePage />
                  </PublicHomeRoute>
                }
              />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route
                path="/cart"
                element={
                  <ProtectedRoute>
                    <CartPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute>
                    <CheckoutPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <OrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders/:id"
                element={
                  <ProtectedRoute>
                    <OrderDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/wishlist"
                element={
                  <ProtectedRoute>
                    <WishlistPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/edit"
                element={
                  <ProtectedRoute>
                    <EditProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/messages"
                element={
                  <ProtectedRoute>
                    <MessagesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ai-assistant"
                element={
                  <ProtectedRoute>
                    <AIAgentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payment"
                element={
                  <ProtectedRoute>
                    <PaymentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payment/callback"
                element={
                  <ProtectedRoute>
                    <PaymentCallbackPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Farmer Routes */}
            <Route element={<MainLayout />}>
              <Route
                path="/farmer"
                element={
                  <ProtectedRoute>
                    <FarmerRoute>
                      <FarmerDashboard />
                    </FarmerRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farmer/products"
                element={
                  <ProtectedRoute>
                    <FarmerRoute>
                      <FarmerProductsPage />
                    </FarmerRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farmer/products/new"
                element={
                  <ProtectedRoute>
                    <FarmerRoute>
                      <AddProductPage />
                    </FarmerRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farmer/products/:id"
                element={
                  <ProtectedRoute>
                    <FarmerRoute>
                      <FarmerProductDetailPage />
                    </FarmerRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farmer/products/:id/edit"
                element={
                  <ProtectedRoute>
                    <FarmerRoute>
                      <EditProductPage />
                    </FarmerRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farmer/orders"
                element={
                  <ProtectedRoute>
                    <FarmerRoute>
                      <FarmerOrdersPage />
                    </FarmerRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farmer/earnings"
                element={
                  <ProtectedRoute>
                    <FarmerRoute>
                      <FarmerEarningsPage />
                    </FarmerRoute>
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Admin Routes */}
            <Route element={<MainLayout />}>
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute>
                    <AdminRoute>
                      <AdminUsersPage />
                    </AdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/orders"
                element={
                  <ProtectedRoute>
                    <AdminRoute>
                      <AdminOrdersPage />
                    </AdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/products"
                element={
                  <ProtectedRoute>
                    <AdminRoute>
                      <AdminProductsPage />
                    </AdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/disputes"
                element={
                  <ProtectedRoute>
                    <AdminRoute>
                      <AdminDisputesPage />
                    </AdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <ProtectedRoute>
                    <AdminRoute>
                      <AdminReportsPage />
                    </AdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute>
                    <AdminRoute>
                      <AdminSettingsPage />
                    </AdminRoute>
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppInitializer>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
