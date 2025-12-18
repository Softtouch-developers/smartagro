import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Phone,
  MapPin,
  Edit2,
  LogOut,
  ChevronRight,
  RefreshCcw,
  Bell,
  HelpCircle,
  Shield,
  Camera,
} from 'lucide-react';
import {
  Button,
  Avatar,
  Badge,
  ConfirmDialog,
} from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/stores/uiStore';
import { authApi } from '@/services/api';
import { getErrorMessage } from '@/services/api/client';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const switchMode = useAuthStore((state) => state.switchMode);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showModeSwitch, setShowModeSwitch] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSwitchMode = async () => {
    if (!user?.can_buy && user?.current_mode === 'FARMER') {
      toast.error('You need to complete buyer registration first');
      return;
    }

    const targetMode = user?.current_mode === 'FARMER' ? 'BUYER' : 'FARMER';

    try {
      await switchMode(targetMode);

      // Manually ensure the updated user is saved to localStorage
      // This prevents race conditions with Zustand persist
      const currentState = useAuthStore.getState();
      const persistedState = {
        state: {
          user: currentState.user,
          isAuthenticated: currentState.isAuthenticated,
        },
        version: 0,
      };
      localStorage.setItem('smartagro-auth', JSON.stringify(persistedState));

      // Set a flag to skip loadUser() on next mount
      localStorage.setItem('mode-switch-pending', 'true');

      toast.success(`Switched to ${targetMode.toLowerCase()} mode`);
      setShowModeSwitch(false);

      // Small delay to show toast, then reload
      await new Promise(resolve => setTimeout(resolve, 300));

      // Force full page reload to ensure store is properly updated
      if (targetMode === 'FARMER') {
        window.location.href = '/farmer';
      } else {
        window.location.href = '/';
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await authApi.uploadProfileImage(file);
      toast.success('Profile photo updated');
      // Refresh user data
      useAuthStore.getState().loadUser();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  const menuItems = [
    {
      icon: Edit2,
      label: 'Edit Profile',
      onClick: () => navigate('/profile/edit'),
    },
    {
      icon: Bell,
      label: 'Notifications',
      onClick: () => navigate('/notifications'),
    },
    {
      icon: Shield,
      label: 'Privacy & Security',
      onClick: () => navigate('/profile/security'),
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      onClick: () => navigate('/help'),
    },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      {/* Profile Header */}
      <div className="bg-white rounded-xl p-6 mb-4 text-center">
        <div className="relative inline-block mb-4">
          <Avatar
            src={user.profile_image_url}
            name={user.full_name}
            size="xl"
            className="w-24 h-24"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-lg"
          >
            <Camera className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-1">
          {user.full_name}
        </h1>
        {user.farm_name && user.current_mode === 'FARMER' && (
          <p className="text-gray-500 mb-2">{user.farm_name}</p>
        )}

        <div className="flex items-center justify-center gap-2 mb-4">
          <Badge variant={user.current_mode === 'FARMER' ? 'success' : 'info'}>
            {user.current_mode === 'FARMER' ? 'Farmer' : 'Buyer'}
          </Badge>
          {user.is_verified && (
            <Badge variant="success">Verified</Badge>
          )}
        </div>

        {/* Mode Switch Button */}
        {user.user_type === 'FARMER' && (
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCcw className="w-4 h-4" />}
            onClick={() => setShowModeSwitch(true)}
          >
            Switch to {user.current_mode === 'FARMER' ? 'Buyer' : 'Farmer'}
          </Button>
        )}
      </div>

      {/* Contact Info */}
      <div className="bg-white rounded-xl p-4 mb-4">
        <h2 className="font-semibold text-gray-900 mb-4">Contact Information</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-gray-600">
            <Phone className="w-5 h-5 text-gray-400" />
            <span>{user.phone_number}</span>
            {user.phone_verified && (
              <Badge variant="success" size="sm">Verified</Badge>
            )}
          </div>
          {user.email && (
            <div className="flex items-center gap-3 text-gray-600">
              <Mail className="w-5 h-5 text-gray-400" />
              <span>{user.email}</span>
              {user.email_verified && (
                <Badge variant="success" size="sm">Verified</Badge>
              )}
            </div>
          )}
          {user.region && (
            <div className="flex items-center gap-3 text-gray-600">
              <MapPin className="w-5 h-5 text-gray-400" />
              <span>
                {user.town_city && `${user.town_city}, `}
                {user.region}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {user.current_mode === 'FARMER' && (
        <div className="bg-white rounded-xl p-4 mb-4">
          <h2 className="font-semibold text-gray-900 mb-4">Statistics</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {user.total_sales}
              </p>
              <p className="text-sm text-gray-500">Sales</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {user.average_rating?.toFixed(1) || '-'}
              </p>
              <p className="text-sm text-gray-500">Rating</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {user.total_reviews}
              </p>
              <p className="text-sm text-gray-500">Reviews</p>
            </div>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <div className="bg-white rounded-xl overflow-hidden mb-4">
        {menuItems.map((item, index) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className={`w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-gray-50 transition-colors ${index > 0 ? 'border-t border-gray-100' : ''
              }`}
          >
            <item.icon className="w-5 h-5 text-gray-400" />
            <span className="flex-1 text-gray-700">{item.label}</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        ))}
      </div>

      {/* Logout Button */}
      <Button
        variant="outline"
        fullWidth
        leftIcon={<LogOut className="w-5 h-5" />}
        onClick={() => setShowLogoutConfirm(true)}
        className="border-red-200 text-red-600 hover:bg-red-50"
      >
        Log Out
      </Button>

      {/* Logout Confirmation */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmText="Log Out"
        variant="danger"
      />

      {/* Mode Switch Confirmation */}
      <ConfirmDialog
        isOpen={showModeSwitch}
        onClose={() => setShowModeSwitch(false)}
        onConfirm={handleSwitchMode}
        title="Switch Mode"
        message={`Switch to ${user.current_mode === 'FARMER' ? 'buyer' : 'farmer'} mode? You can switch back anytime.`}
        confirmText="Switch"
        isLoading={isLoading}
      />
    </div>
  );
};

export default ProfilePage;
