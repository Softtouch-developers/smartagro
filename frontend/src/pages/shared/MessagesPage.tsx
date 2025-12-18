import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Send,
  Image as ImageIcon,
  Mic,
  MoreVertical,
  Package,
} from 'lucide-react';
import {
  Avatar,
  EmptyState,
  ListItemSkeleton,
} from '@/components/common';
import { chatApi, type Conversation, type ChatMessage } from '@/services/api';
import { formatRelativeTime } from '@/utils/formatters';
import { useToast } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { getErrorMessage } from '@/services/api/client';

// Conversations List Component
const ConversationsList: React.FC<{
  onSelectConversation: (conversation: Conversation) => void;
}> = ({ onSelectConversation }) => {
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatApi.getConversations(),
  });

  const user = useAuthStore((state) => state.user);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <ListItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          type="messages"
          title="No messages yet"
          description="Start a conversation with a farmer or buyer"
        />
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {conversations.map((conversation) => {
        const isBuyer = user?.user_type === 'BUYER';
        const otherName = isBuyer ? conversation.seller_name : conversation.buyer_name;
        const lastMessage = conversation.last_message;

        return (
          <div
            key={conversation.conversation_id}
            onClick={() => onSelectConversation(conversation)}
            className="px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <Avatar name={otherName || 'User'} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900 truncate">
                  {otherName || 'User'}
                </h3>
                {lastMessage && (
                  <span className="text-xs text-gray-400">
                    {formatRelativeTime(lastMessage.created_at)}
                  </span>
                )}
              </div>
              {conversation.product_name && (
                <div className="flex items-center gap-1 text-xs text-primary mt-0.5">
                  <Package className="w-3 h-3" />
                  <span className="truncate">{conversation.product_name}</span>
                </div>
              )}
              {lastMessage && (
                <p className="text-sm text-gray-500 truncate mt-1">
                  {lastMessage.text ||
                    (lastMessage.image_url ? 'Sent an image' : 'Sent a voice note')}
                </p>
              )}
            </div>
            {conversation.unread_count > 0 && (
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                {conversation.unread_count}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Chat View Component
const ChatView: React.FC<{
  conversation: Conversation;
  onBack: () => void;
}> = ({ conversation, onBack }) => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const isBuyer = user?.user_type === 'BUYER';
  const otherName = isBuyer ? conversation.seller_name : conversation.buyer_name;
  const otherUserId = isBuyer ? conversation.seller_id : conversation.buyer_id;

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', conversation.conversation_id],
    queryFn: () => chatApi.getMessages(conversation.conversation_id, { limit: 100 }),
    refetchInterval: 5000, // Poll for new messages every 5 seconds
  });

  const sendMessageMutation = useMutation({
    mutationFn: chatApi.sendMessage,
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['messages', conversation.conversation_id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    sendMessageMutation.mutate({
      receiver_id: otherUserId,
      text: messageText.trim(),
      related_product_id: conversation.product_id,
    });
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { image_url } = await chatApi.uploadImage(file);
      sendMessageMutation.mutate({
        receiver_id: otherUserId,
        image_url,
        related_product_id: conversation.product_id,
      });
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleMicClick = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        const audioChunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const file = new File([audioBlob], 'voice_note.webm', { type: 'audio/webm' });

          setIsUploading(true);
          try {
            const { voice_note_url } = await chatApi.uploadVoiceNote(file);
            sendMessageMutation.mutate({
              receiver_id: otherUserId,
              voice_note_url,
              related_product_id: conversation.product_id,
            });
          } catch (error) {
            toast.error('Failed to send voice note');
          } finally {
            setIsUploading(false);
            stream.getTracks().forEach(track => track.stop());
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (error) {
        console.error(error);
        toast.error('Microphone access denied');
      }
    }
  };

  const isMyMessage = (msg: ChatMessage) => msg.sender_id === user?.id;

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1 -ml-1 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Avatar name={otherName || 'User'} size="sm" />
        <div className="flex-1 min-w-0">
          <h2 className="font-medium text-gray-900 truncate">
            {otherName || 'User'}
          </h2>
          {conversation.product_name && (
            <p className="text-xs text-gray-500 truncate">
              Re: {conversation.product_name}
            </p>
          )}
        </div>
        <button className="p-2 rounded-full hover:bg-gray-100">
          <MoreVertical className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : messages && messages.length > 0 ? (
          <>
            {messages.map((message) => {
              const mine = isMyMessage(message);

              return (
                <div
                  key={message.id}
                  className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${mine
                      ? 'bg-primary text-white rounded-br-md'
                      : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                      }`}
                  >
                    {message.text && <p className="text-sm">{message.text}</p>}
                    {message.image_url && (
                      <img
                        src={message.image_url}
                        alt="Shared image"
                        className="rounded-lg max-w-full mt-1"
                      />
                    )}
                    {message.voice_note_url && (
                      <audio controls className="max-w-full mt-1">
                        <source src={message.voice_note_url} />
                      </audio>
                    )}
                    <p
                      className={`text-xs mt-1 ${mine ? 'text-white/70' : 'text-gray-400'
                        }`}
                    >
                      {formatRelativeTime(message.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-100 p-3">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={handleImageClick}
            disabled={isUploading || isRecording}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full disabled:opacity-50"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleMicClick}
            disabled={isUploading}
            className={`p-2 rounded-full transition-colors ${isRecording
                ? 'bg-red-100 text-red-600 animate-pulse'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
          >
            <Mic className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            type="submit"
            disabled={!messageText.trim() || sendMessageMutation.isPending}
            className="p-2 bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

// Main Messages Page
const MessagesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  // Check for URL params
  const conversationId = searchParams.get('conversation');
  const sellerId = searchParams.get('seller');
  const productId = searchParams.get('product');

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatApi.getConversations(),
  });

  // Handle seller param - create or get conversation
  useEffect(() => {
    const initConversation = async () => {
      if (sellerId && !conversationId) {
        try {
          // Create or get existing conversation with this seller
          const conversation = await chatApi.createConversation(
            Number(sellerId),
            productId ? Number(productId) : undefined
          );

          // Refresh conversations list to include the new/existing one
          await queryClient.invalidateQueries({ queryKey: ['conversations'] });

          // Select the conversation
          setSelectedConversation(conversation);

          // Update URL to use conversation ID instead
          setSearchParams({ conversation: conversation.conversation_id });
        } catch (error) {
          toast.error('Failed to start conversation');
        }
      }
    };

    initConversation();
  }, [sellerId, productId, conversationId, queryClient, setSearchParams, toast]);

  // Auto-select conversation from URL
  useEffect(() => {
    if (conversationId && conversations) {
      const conversation = conversations.find(
        (c) => c.conversation_id === conversationId
      );
      if (conversation) {
        setSelectedConversation(conversation);
      }
    }
  }, [conversationId, conversations]);

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setSearchParams({ conversation: conversation.conversation_id });
  };

  const handleBack = () => {
    setSelectedConversation(null);
    setSearchParams({});
  };

  // If on mobile and conversation selected, show chat view only
  if (selectedConversation) {
    return (
      <div className="h-[calc(100vh-theme(spacing.14)-theme(spacing.16))] flex flex-col">
        <ChatView conversation={selectedConversation} onBack={handleBack} />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-gray-100 sticky top-14 z-10">
        <h1 className="text-xl font-bold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-500">Chat with farmers and buyers</p>
      </div>

      <ConversationsList onSelectConversation={handleSelectConversation} />
    </div>
  );
};

export default MessagesPage;
