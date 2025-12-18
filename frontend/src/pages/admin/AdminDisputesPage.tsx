import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Badge,
  Modal,
  Input,
  Select,
  ListItemSkeleton,
  EmptyState,
} from '@/components/common';
import { adminApi, type Dispute } from '@/services/api';
import { formatDate } from '@/utils/formatters';
import { useToast } from '@/stores/uiStore';
import { getErrorMessage } from '@/services/api/client';

const statusTabs: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'OPEN' },
  { label: 'Under Review', value: 'UNDER_REVIEW' },
  { label: 'Resolved', value: 'RESOLVED' },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'OPEN':
      return <Badge variant="error">Open</Badge>;
    case 'UNDER_REVIEW':
      return <Badge variant="warning">Under Review</Badge>;
    case 'RESOLVED':
      return <Badge variant="success">Resolved</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
};

const AdminDisputesPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('all');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolution, setResolution] = useState<'REFUND' | 'RELEASE' | 'PARTIAL_REFUND'>('REFUND');
  const [adminNotes, setAdminNotes] = useState('');
  const [partialAmount, setPartialAmount] = useState('');

  const { data: disputes, isLoading } = useQuery({
    queryKey: ['admin', 'disputes', activeTab],
    queryFn: () => adminApi.getDisputes(activeTab === 'all' ? undefined : activeTab),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ disputeId, data }: { disputeId: number; data: Parameters<typeof adminApi.resolveDispute>[1] }) =>
      adminApi.resolveDispute(disputeId, data),
    onSuccess: () => {
      toast.success('Dispute resolved successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });
      closeModal();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const openResolveModal = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setShowResolveModal(true);
  };

  const closeModal = () => {
    setShowResolveModal(false);
    setSelectedDispute(null);
    setResolution('REFUND');
    setAdminNotes('');
    setPartialAmount('');
  };

  const handleResolve = () => {
    if (!selectedDispute || !adminNotes.trim()) return;

    resolveMutation.mutate({
      disputeId: selectedDispute.id,
      data: {
        resolution,
        admin_notes: adminNotes,
        partial_refund_amount: resolution === 'PARTIAL_REFUND' ? parseFloat(partialAmount) : undefined,
      },
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-20">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dispute Management</h1>
        <p className="text-gray-500">Review and resolve customer disputes</p>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 rounded-t-xl">
        <div className="flex">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Disputes List */}
      <div className="bg-white rounded-b-xl border border-t-0 border-gray-100">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
        ) : disputes && disputes.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {disputes.map((dispute) => (
              <div key={dispute.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        Dispute #{dispute.id}
                      </span>
                      {getStatusBadge(dispute.status)}
                    </div>
                    <p className="text-sm text-gray-500">
                      Order #{dispute.order_id} | {formatDate(dispute.created_at)}
                    </p>
                  </div>
                  {dispute.status !== 'RESOLVED' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openResolveModal(dispute)}
                    >
                      Resolve
                    </Button>
                  )}
                </div>

                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-1">Reason:</p>
                  <p className="text-sm text-gray-600">{dispute.reason}</p>
                  {dispute.description && (
                    <>
                      <p className="text-sm font-medium text-gray-700 mt-2 mb-1">Description:</p>
                      <p className="text-sm text-gray-600">{dispute.description}</p>
                    </>
                  )}
                  {dispute.resolution && (
                    <>
                      <p className="text-sm font-medium text-gray-700 mt-2 mb-1">Resolution:</p>
                      <p className="text-sm text-green-600">{dispute.resolution}</p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8">
            <EmptyState
              type="messages"
              title="No disputes found"
              description={
                activeTab === 'all'
                  ? 'No disputes have been raised yet'
                  : `No ${activeTab.toLowerCase().replace('_', ' ')} disputes`
              }
            />
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      <Modal
        isOpen={showResolveModal}
        onClose={closeModal}
        title="Resolve Dispute"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              Dispute #{selectedDispute?.id} - {selectedDispute?.reason}
            </p>
          </div>

          <Select
            label="Resolution"
            value={resolution}
            onChange={(value) => setResolution(value as typeof resolution)}
            options={[
              { value: 'REFUND', label: 'Full Refund to Buyer' },
              { value: 'RELEASE', label: 'Release Funds to Seller' },
              { value: 'PARTIAL_REFUND', label: 'Partial Refund' },
            ]}
          />

          {resolution === 'PARTIAL_REFUND' && (
            <Input
              label="Refund Amount"
              type="number"
              placeholder="Enter amount to refund"
              value={partialAmount}
              onChange={(e) => setPartialAmount(e.target.value)}
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Notes *
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              rows={3}
              placeholder="Explain the resolution decision..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" fullWidth onClick={closeModal}>
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={handleResolve}
              isLoading={resolveMutation.isPending}
              disabled={!adminNotes.trim() || (resolution === 'PARTIAL_REFUND' && !partialAmount)}
            >
              Resolve Dispute
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDisputesPage;
