import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Database,
  Upload,
  Trash2,
  RefreshCw,
  FileText,
  Search,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Leaf,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import {
  Button,
  Input,
  Badge,
  ListItemSkeleton,
  EmptyState,
  ConfirmDialog,
} from '@/components/common';
import { adminApi } from '@/services/api';
import { useToast } from '@/stores/uiStore';
import { getErrorMessage } from '@/services/api/client';
import { formatDate } from '@/utils/formatters';
import type { KnowledgeDocument } from '@/services/api/admin';

const DOCUMENT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'CROP_GUIDE', label: 'Crop Guide' },
  { value: 'PEST_REFERENCE', label: 'Pest Reference' },
  { value: 'POST_HARVEST', label: 'Post Harvest' },
  { value: 'SOIL_MANAGEMENT', label: 'Soil Management' },
  { value: 'WEATHER_CLIMATE', label: 'Weather & Climate' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'MARKET_INFO', label: 'Market Info' },
  { value: 'GENERAL_GUIDE', label: 'General Guide' },
];

const getDocumentTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    CROP_GUIDE: 'bg-green-100 text-green-700',
    PEST_REFERENCE: 'bg-red-100 text-red-700',
    POST_HARVEST: 'bg-orange-100 text-orange-700',
    SOIL_MANAGEMENT: 'bg-amber-100 text-amber-700',
    WEATHER_CLIMATE: 'bg-blue-100 text-blue-700',
    EQUIPMENT: 'bg-purple-100 text-purple-700',
    MARKET_INFO: 'bg-teal-100 text-teal-700',
    GENERAL_GUIDE: 'bg-gray-100 text-gray-700',
  };
  return colors[type] || 'bg-gray-100 text-gray-700';
};

const AdminKnowledgePage: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['knowledge', 'stats'],
    queryFn: () => adminApi.getKnowledgeStats(),
  });

  // Fetch documents
  const { data: docsData, isLoading: docsLoading } = useQuery({
    queryKey: ['knowledge', 'documents', selectedType],
    queryFn: () => adminApi.getKnowledgeDocuments({
      document_type: selectedType || undefined,
      limit: 100,
    }),
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => adminApi.uploadKnowledgeDocument(file),
    onSuccess: (data) => {
      toast.success(`Document "${data.filename}" uploaded successfully!`);
      queryClient.invalidateQueries({ queryKey: ['knowledge'] });
      setIsUploading(false);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
      setIsUploading(false);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (documentId: string) => adminApi.deleteKnowledgeDocument(documentId),
    onSuccess: () => {
      toast.success('Document deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['knowledge'] });
      setDeleteDocId(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // Reindex mutation
  const reindexMutation = useMutation({
    mutationFn: (forceReindex: boolean) => adminApi.reindexKnowledge(forceReindex),
    onSuccess: (data) => {
      toast.success(`Knowledge base reindexed: ${data.stats.documents_processed} documents processed`);
      queryClient.invalidateQueries({ queryKey: ['knowledge'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      uploadMutation.mutate(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredDocs = docsData?.documents?.filter((doc) =>
    doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.document_id?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-20">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Database className="w-6 h-6" />
          Knowledge Base Management
        </h1>
        <p className="text-gray-500">Manage AI agent knowledge documents</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <FileText className="w-4 h-4" />
            <span className="text-sm">Documents</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {statsLoading ? '...' : stats?.total_documents || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <BookOpen className="w-4 h-4" />
            <span className="text-sm">Chunks</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {statsLoading ? '...' : stats?.total_chunks || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Leaf className="w-4 h-4" />
            <span className="text-sm">Avg Chunks/Doc</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {statsLoading ? '...' : stats?.avg_chunks_per_doc || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">Doc Types</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {statsLoading ? '...' : Object.keys(stats?.by_document_type || {}).length}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt,.markdown"
          onChange={handleFileUpload}
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          leftIcon={<Upload className="w-4 h-4" />}
          isLoading={isUploading}
        >
          Upload Document
        </Button>
        <Button
          variant="outline"
          onClick={() => reindexMutation.mutate(false)}
          leftIcon={<RefreshCw className="w-4 h-4" />}
          isLoading={reindexMutation.isPending}
        >
          Reindex All
        </Button>
        <Button
          variant="outline"
          onClick={() => reindexMutation.mutate(true)}
          leftIcon={<RefreshCw className="w-4 h-4" />}
          isLoading={reindexMutation.isPending}
        >
          Force Reindex
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-5 h-5" />}
          />
        </div>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
        >
          {DOCUMENT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Document Type Breakdown */}
      {stats?.by_document_type && Object.keys(stats.by_document_type).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(stats.by_document_type).map(([type, count]) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedType === type
                  ? 'bg-primary text-white'
                  : getDocumentTypeColor(type)
              }`}
            >
              {type.replace(/_/g, ' ')}: {count}
            </button>
          ))}
        </div>
      )}

      {/* Documents List */}
      <div className="bg-white rounded-xl border border-gray-100">
        {docsLoading ? (
          <div className="p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
        ) : filteredDocs.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filteredDocs.map((doc) => (
              <DocumentItem
                key={doc.document_id}
                document={doc}
                isExpanded={expandedDoc === doc.document_id}
                onToggle={() => setExpandedDoc(
                  expandedDoc === doc.document_id ? null : doc.document_id
                )}
                onDelete={() => setDeleteDocId(doc.document_id)}
              />
            ))}
          </div>
        ) : (
          <div className="p-8">
            <EmptyState
              type="products"
              title="No documents found"
              description="Upload knowledge documents to help the AI agent assist farmers"
            />
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteDocId}
        onClose={() => setDeleteDocId(null)}
        onConfirm={() => deleteDocId && deleteMutation.mutate(deleteDocId)}
        title="Delete Document"
        message="Are you sure you want to delete this document? This will remove it from the knowledge base and cannot be undone."
        confirmText="Delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

// Document Item Component
interface DocumentItemProps {
  document: KnowledgeDocument;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

const DocumentItem: React.FC<DocumentItemProps> = ({
  document,
  isExpanded,
  onToggle,
  onDelete,
}) => {
  return (
    <div className="p-4">
      <div
        className="flex items-start justify-between cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <h3 className="font-medium text-gray-900 truncate">
              {document.title || document.document_id}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDocumentTypeColor(document.document_type)}`}>
              {document.document_type?.replace(/_/g, ' ') || 'Unknown'}
            </span>
            <span className="text-xs text-gray-500">
              {document.chunk_count || 0} chunks
            </span>
            {document.created_at && (
              <span className="text-xs text-gray-500">
                {formatDate(document.created_at)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            leftIcon={<Trash2 className="w-3 h-3" />}
          >
            Delete
          </Button>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 pl-6 border-l-2 border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Document ID</p>
              <p className="font-mono text-xs text-gray-700 break-all">
                {document.document_id}
              </p>
            </div>
            {document.topics && document.topics.length > 0 && (
              <div>
                <p className="text-gray-500 mb-1">Topics</p>
                <div className="flex flex-wrap gap-1">
                  {document.topics.map((topic) => (
                    <Badge key={topic} variant="info" size="sm">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {document.crops && document.crops.length > 0 && (
              <div>
                <p className="text-gray-500 mb-1">Crops</p>
                <div className="flex flex-wrap gap-1">
                  {document.crops.map((crop) => (
                    <Badge key={crop} variant="success" size="sm">
                      {crop}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {document.regions && document.regions.length > 0 && (
              <div>
                <p className="text-gray-500 mb-1">Regions</p>
                <div className="flex flex-wrap gap-1">
                  {document.regions.map((region) => (
                    <Badge key={region} variant="warning" size="sm">
                      {region}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminKnowledgePage;
