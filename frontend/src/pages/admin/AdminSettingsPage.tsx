import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Save,
  RefreshCw,
  FileText,
  DollarSign,
  Bot,
} from 'lucide-react';
import {
  Button,
  Input,
  ListItemSkeleton,
} from '@/components/common';
import { adminApi, type SystemConfig } from '@/services/api';
import { formatDate } from '@/utils/formatters';
import { useToast } from '@/stores/uiStore';
import { getErrorMessage } from '@/services/api/client';

const getConfigIcon = (key: string) => {
  if (key.includes('AGENT')) return <Bot className="w-5 h-5 text-purple-600" />;
  if (key.includes('FEE') || key.includes('PRICE')) return <DollarSign className="w-5 h-5 text-green-600" />;
  return <FileText className="w-5 h-5 text-blue-600" />;
};

const AdminSettingsPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const { data: configs, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'config'],
    queryFn: adminApi.getSystemConfig,
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      adminApi.updateSystemConfig(key, value),
    onSuccess: () => {
      toast.success('Configuration updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'config'] });
      setEditingKey(null);
      setEditValue('');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const startEditing = (config: SystemConfig) => {
    setEditingKey(config.key);
    setEditValue(config.value);
  };

  const cancelEditing = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const saveConfig = () => {
    if (editingKey && editValue.trim()) {
      updateMutation.mutate({ key: editingKey, value: editValue });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-500">Manage platform configuration</p>
        </div>
        <Button
          variant="outline"
          leftIcon={<RefreshCw className="w-4 h-4" />}
          onClick={() => refetch()}
        >
          Refresh
        </Button>
      </div>

      {/* Config List */}
      <div className="bg-white rounded-xl border border-gray-100">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
        ) : configs && configs.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {configs.map((config) => (
              <div key={config.id} className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {getConfigIcon(config.key)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-gray-900">{config.key.replace(/_/g, ' ')}</h3>
                      <span className="text-xs text-gray-400">
                        Updated {formatDate(config.updated_at)}
                      </span>
                    </div>

                    {config.description && (
                      <p className="text-sm text-gray-500 mb-2">{config.description}</p>
                    )}

                    {editingKey === config.key ? (
                      <div className="space-y-3">
                        {config.key.includes('PROMPT') || config.key.includes('MESSAGE') ? (
                          <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm"
                            rows={6}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                          />
                        ) : (
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                          />
                        )}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={cancelEditing}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<Save className="w-4 h-4" />}
                            onClick={saveConfig}
                            isLoading={updateMutation.isPending}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => startEditing(config)}
                      >
                        <p className="text-sm text-gray-700 font-mono whitespace-pre-wrap break-all">
                          {config.value.length > 200
                            ? config.value.substring(0, 200) + '...'
                            : config.value}
                        </p>
                        <p className="text-xs text-primary mt-2">Click to edit</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Settings className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No configuration settings found</p>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <h3 className="font-medium text-blue-900 mb-2">Configuration Guide</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li><strong>AGENT SYSTEM PROMPT</strong> - Controls the AI agent's behavior and responses</li>
          <li><strong>WELCOME MESSAGE</strong> - Displayed on the homepage for all users</li>
          <li><strong>PLATFORM FEE PERCENTAGE</strong> - Commission rate charged on transactions</li>
          <li><strong>AUTO RELEASE DAYS</strong> - Days until escrow auto-releases to seller</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
