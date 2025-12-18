import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  CheckCircle,
  Shield,
  User,
  Tractor,
} from 'lucide-react';
import {
  Button,
  Input,
  Badge,
  Modal,
  ListItemSkeleton,
  EmptyState,
} from '@/components/common';
import { adminApi, type AdminUser } from '@/services/api';
import { formatDate } from '@/utils/formatters';
import { useToast } from '@/stores/uiStore';
import { getErrorMessage } from '@/services/api/client';

const getUserTypeIcon = (userType: string) => {
  switch (userType) {
    case 'FARMER':
      return <Tractor className="w-4 h-4 text-green-600" />;
    case 'BUYER':
      return <User className="w-4 h-4 text-blue-600" />;
    case 'ADMIN':
      return <Shield className="w-4 h-4 text-purple-600" />;
    default:
      return <User className="w-4 h-4 text-gray-600" />;
  }
};

const getStatusBadge = (status: string, isVerified: boolean) => {
  if (status === 'SUSPENDED') {
    return <Badge variant="error">Suspended</Badge>;
  }
  if (!isVerified) {
    return <Badge variant="warning">Unverified</Badge>;
  }
  return <Badge variant="success">Active</Badge>;
};

const AdminUsersPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<'all' | 'FARMER' | 'BUYER' | 'ADMIN'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'unverified'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'suspend' | 'activate' | 'verify' | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin', 'users', filter, statusFilter],
    queryFn: () =>
      adminApi.getUsers({
        user_type: filter === 'all' ? undefined : filter,
        account_status: statusFilter === 'suspended' ? 'SUSPENDED' : statusFilter === 'active' ? 'ACTIVE' : undefined,
        is_verified: statusFilter === 'unverified' ? false : undefined,
        limit: 100,
      }),
  });

  const suspendMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: number; reason: string }) =>
      adminApi.suspendUser(userId, reason),
    onSuccess: () => {
      toast.success('User suspended successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      closeModal();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const activateMutation = useMutation({
    mutationFn: adminApi.activateUser,
    onSuccess: () => {
      toast.success('User activated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      closeModal();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const verifyMutation = useMutation({
    mutationFn: adminApi.verifyUser,
    onSuccess: () => {
      toast.success('User verified successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      closeModal();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const openActionModal = (user: AdminUser, action: 'suspend' | 'activate' | 'verify') => {
    setSelectedUser(user);
    setActionType(action);
    setShowActionModal(true);
  };

  const closeModal = () => {
    setShowActionModal(false);
    setSelectedUser(null);
    setActionType(null);
    setSuspendReason('');
  };

  const handleAction = () => {
    if (!selectedUser) return;

    switch (actionType) {
      case 'suspend':
        suspendMutation.mutate({ userId: selectedUser.id, reason: suspendReason });
        break;
      case 'activate':
        activateMutation.mutate(selectedUser.id);
        break;
      case 'verify':
        verifyMutation.mutate(selectedUser.id);
        break;
    }
  };

  const filteredUsers = users?.filter((user) =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phone_number.includes(searchQuery)
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500">Manage platform users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 mb-6 border border-gray-100 space-y-4">
        {/* Search */}
        <div className="w-full">
          <Input
            placeholder="Search users by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-5 h-5" />}
          />
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Type Filter */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              User Type
            </label>
            <div className="flex flex-wrap gap-2">
              {(['all', 'FARMER', 'BUYER', 'ADMIN'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${filter === type
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  {type === 'all' ? 'All Types' : type.charAt(0) + type.slice(1).toLowerCase() + 's'}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Account Status
            </label>
            <div className="flex flex-wrap gap-2">
              {(['all', 'active', 'suspended', 'unverified'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${statusFilter === status
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  {status === 'all' ? 'All Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
        ) : filteredUsers && filteredUsers.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filteredUsers.map((user) => (
              <div key={user.id} className="p-4 flex items-center gap-4">
                {/* User Type Icon */}
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  {getUserTypeIcon(user.user_type)}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 truncate">{user.full_name}</h3>
                    {getStatusBadge(user.account_status, user.is_verified)}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span>{user.email}</span>
                    <span>{user.phone_number}</span>
                  </div>
                  <p className="text-xs text-gray-400">Joined {formatDate(user.created_at)}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!user.is_verified && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openActionModal(user, 'verify')}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Verify
                    </Button>
                  )}
                  {user.account_status === 'SUSPENDED' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openActionModal(user, 'activate')}
                    >
                      Activate
                    </Button>
                  ) : user.user_type !== 'ADMIN' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => openActionModal(user, 'suspend')}
                    >
                      Suspend
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8">
            <EmptyState
              type="search"
              title="No users found"
              description="Try adjusting your filters"
            />
          </div>
        )}
      </div>

      {/* Action Modal */}
      <Modal
        isOpen={showActionModal}
        onClose={closeModal}
        title={
          actionType === 'suspend'
            ? 'Suspend User'
            : actionType === 'activate'
              ? 'Activate User'
              : 'Verify User'
        }
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            {actionType === 'suspend' && `Are you sure you want to suspend ${selectedUser?.full_name}?`}
            {actionType === 'activate' && `Are you sure you want to activate ${selectedUser?.full_name}?`}
            {actionType === 'verify' && `Are you sure you want to verify ${selectedUser?.full_name}?`}
          </p>

          {actionType === 'suspend' && (
            <Input
              label="Reason for suspension"
              placeholder="Enter reason..."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              required
            />
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" fullWidth onClick={closeModal}>
              Cancel
            </Button>
            <Button
              variant={actionType === 'suspend' ? 'primary' : 'primary'}
              fullWidth
              onClick={handleAction}
              isLoading={
                suspendMutation.isPending ||
                activateMutation.isPending ||
                verifyMutation.isPending
              }
              disabled={actionType === 'suspend' && !suspendReason}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminUsersPage;
