import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {

  Send,
  Bot,
  User,
  Sparkles,
  Image as ImageIcon,
  Mic,
  Video,
  Trash2,
  Plus,
  Menu,
  X,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button, Avatar } from '@/components/common';
import { agentApi, type AgentMessage, type AgentSession } from '@/services/api';
import { useToast } from '@/stores/uiStore';
import { getErrorMessage } from '@/services/api/client';
import { formatRelativeTime } from '@/utils/formatters';

interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  mediaUrl?: string;
  mediaType?: 'image' | 'audio' | 'video';
}

interface SidebarProps {
  sessions: AgentSession[] | undefined;
  currentSessionId: string | null;
  onSelectSession: (session: AgentSession) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
  setSidebarOpen: (open: boolean) => void;
}

const SidebarContent: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  setSidebarOpen,
}) => (
  <div className="flex flex-col h-full bg-white border-r border-gray-200">
    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
      <h2 className="font-semibold text-gray-900">Chat History</h2>
      <button
        onClick={() => setSidebarOpen(false)}
        className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
      >
        <X className="w-5 h-5" />
      </button>
    </div>

    <div className="p-3">
      <button
        onClick={onNewChat}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors shadow-sm"
      >
        <Plus className="w-5 h-5" />
        New Chat
      </button>
    </div>

    <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
      {sessions?.map((session) => (
        <div
          key={session.session_id}
          className={`group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors ${currentSessionId === session.session_id
              ? 'bg-primary/5 text-primary'
              : 'hover:bg-gray-50 text-gray-700'
            }`}
          onClick={() => onSelectSession(session)}
        >
          <Sparkles className={`w-4 h-4 flex-shrink-0 ${currentSessionId === session.session_id ? 'text-primary' : 'text-gray-400'
            }`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${currentSessionId === session.session_id ? 'text-primary' : 'text-gray-900'
              }`}>
              {session.title || 'Untitled Chat'}
            </p>
            <p className="text-xs text-gray-500">
              {formatRelativeTime(session.updated_at)}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteSession(session.session_id);
            }}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
            title="Delete chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      {(!sessions || sessions.length === 0) && (
        <div className="text-center py-8 px-4">
          <p className="text-sm text-gray-500">No chat history yet</p>
        </div>
      )}
    </div>
  </div>
);

const AIAgentPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const [pendingAttachment, setPendingAttachment] = useState<{
    file: File;
    previewUrl: string;
    type: 'image' | 'audio' | 'video';
  } | null>(null);

  // ... (keep existing queries and mutations same as before) ...
  // Fetch sessions
  const { data: sessions } = useQuery({
    queryKey: ['agent-sessions'],
    queryFn: () => agentApi.getSessions(),
  });

  // Fetch suggestions
  const { data: suggestions } = useQuery({
    queryKey: ['agent-suggestions'],
    queryFn: () => agentApi.getSuggestions(),
  });

  // Load session messages
  const loadSessionMutation = useMutation({
    mutationFn: (sessionId: string) => agentApi.getSession(sessionId),
    onSuccess: (data) => {
      const loadedMessages: LocalMessage[] = data.messages.map((msg, idx) => {
        // Check for media attachments in the message
        let mediaUrl = undefined;
        let mediaType: 'image' | 'audio' | 'video' | undefined = undefined;

        if (msg.media_attachments && msg.media_attachments.length > 0) {
          const attachment = msg.media_attachments[0];
          mediaUrl = attachment.url;
          if (attachment.type === 'image') mediaType = 'image';
          else if (attachment.type === 'audio') mediaType = 'audio';
          else if (attachment.type === 'video') mediaType = 'video';
        }

        return {
          id: `${data.session.session_id}-${idx}`,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          mediaUrl,
          mediaType
        };
      });
      setMessages(loadedMessages);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // Delete session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: string) => agentApi.deleteSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-sessions'] });
      if (currentSessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
      toast.success('Chat deleted');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // Chat mutation (non-streaming fallback)
  const chatMutation = useMutation({
    mutationFn: agentApi.chat,
    onSuccess: (data) => {
      setCurrentSessionId(data.session_id);
      const assistantMessage: LocalMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      queryClient.invalidateQueries({ queryKey: ['agent-sessions'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // Upload chat mutation
  const uploadChatMutation = useMutation({
    mutationFn: ({ file, message }: { file: File; message: string }) =>
      agentApi.chatWithUpload(file, message, currentSessionId || undefined),
    onSuccess: (data) => {
      setCurrentSessionId(data.session_id);
      const assistantMessage: LocalMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      queryClient.invalidateQueries({ queryKey: ['agent-sessions'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (text?: string) => {
    const messageText = text || inputText.trim();
    if ((!messageText && !pendingAttachment) || isStreaming) return;

    // Add user message immediately
    const userMessage: LocalMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
      mediaUrl: pendingAttachment?.previewUrl,
      mediaType: pendingAttachment?.type
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setPendingAttachment(null);

    // If there's a pending attachment, use upload mutation
    if (pendingAttachment) {
      uploadChatMutation.mutate({
        file: pendingAttachment.file,
        message: messageText || `Please analyze this ${pendingAttachment.type}`,
      });
      return;
    }

    // Try streaming first, fallback to non-streaming
    try {
      setIsStreaming(true);

      // Add placeholder for assistant response
      const streamingMessageId = `assistant-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: streamingMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          isStreaming: true,
        },
      ]);

      const eventSource = agentApi.chatStream({
        message: messageText,
        session_id: currentSessionId || undefined,
      });

      let fullResponse = '';

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'chunk') {
            fullResponse += data.content;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === streamingMessageId
                  ? { ...msg, content: fullResponse }
                  : msg
              )
            );
          } else if (data.type === 'done') {
            if (data.session_id) {
              setCurrentSessionId(data.session_id);
            }
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === streamingMessageId
                  ? { ...msg, isStreaming: false }
                  : msg
              )
            );
            queryClient.invalidateQueries({ queryKey: ['agent-sessions'] });
            eventSource.close();
            setIsStreaming(false);
          } else if (data.type === 'error') {
            throw new Error(data.message);
          }
        } catch {
          // If JSON parse fails, treat as plain text chunk
          fullResponse += event.data;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === streamingMessageId
                ? { ...msg, content: fullResponse }
                : msg
            )
          );
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setIsStreaming(false);

        // If streaming failed, try non-streaming
        if (!fullResponse) {
          setMessages((prev) => prev.filter((msg) => msg.id !== streamingMessageId));
          chatMutation.mutate({
            message: messageText,
            session_id: currentSessionId || undefined,
          });
        } else {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === streamingMessageId
                ? { ...msg, isStreaming: false }
                : msg
            )
          );
        }
      };
    } catch {
      setIsStreaming(false);
      // Fallback to non-streaming
      chatMutation.mutate({
        message: messageText,
        session_id: currentSessionId || undefined,
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Determine media type
    let mediaType: 'image' | 'audio' | 'video' = 'image';
    if (file.type.startsWith('audio/')) mediaType = 'audio';
    else if (file.type.startsWith('video/')) mediaType = 'video';

    // Create preview URL
    const mediaUrl = URL.createObjectURL(file);

    setPendingAttachment({
      file,
      previewUrl: mediaUrl,
      type: mediaType
    });

    // Reset inputs
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleSelectSession = (session: AgentSession) => {
    setCurrentSessionId(session.session_id);
    loadSessionMutation.mutate(session.session_id);
    setSidebarOpen(false);
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setSidebarOpen(false);
  };

  const handleDeleteSession = (sessionId: string) => {
    if (confirm('Are you sure you want to delete this chat?')) {
      deleteSessionMutation.mutate(sessionId);
    }
  };

  const isLoading = chatMutation.isPending || uploadChatMutation.isPending || isStreaming;

  return (
    <div className="h-[calc(100vh-theme(spacing.14)-theme(spacing.16))] bg-gray-50 lg:grid lg:grid-cols-[320px,1fr]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full overflow-hidden">
        <SidebarContent
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
          setSidebarOpen={setSidebarOpen}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col h-full min-w-0">
        {/* Header */}
        <div className="bg-white px-4 py-3 border-b border-gray-100 flex items-center gap-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900">SmartAgro AI</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewChat}
            className="!p-2"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* Desktop Header (Simplified) */}
        <div className="hidden lg:flex bg-white px-6 py-4 border-b border-gray-100 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-sm">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">SmartAgro AI</h1>
              <p className="text-xs text-gray-500">Your intelligent farming assistant</p>
            </div>
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="absolute left-0 top-0 bottom-0 w-80 bg-white shadow-2xl transform transition-transform">
              <SidebarContent
                sessions={sessions}
                currentSessionId={currentSessionId}
                onSelectSession={handleSelectSession}
                onNewChat={handleNewChat}
                onDeleteSession={handleDeleteSession}
                setSidebarOpen={setSidebarOpen}
              />
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mb-6 shadow-lg shadow-green-100">
                <Bot className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                How can I help you today?
              </h2>
              <p className="text-gray-500 text-center max-w-md mb-8">
                Ask me about crop management, pest control, weather advice, or market prices.
              </p>

              {/* Suggestion Cards */}
              <div className="w-full max-w-lg grid gap-2 sm:grid-cols-2">
                {suggestions?.slice(0, 4).map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(suggestion)}
                    className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-primary/30 hover:shadow-md transition-all text-left group"
                  >
                    <Sparkles className="w-5 h-5 text-primary/70 group-hover:text-primary mt-0.5" />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900 line-clamp-2">{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full p-4 space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''
                    }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <div className="mt-1">
                      <Avatar name="You" size="sm" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] lg:max-w-[75%] rounded-2xl px-5 py-4 shadow-sm ${message.role === 'user'
                      ? 'bg-primary text-white rounded-tr-sm'
                      : 'bg-white border border-gray-100 rounded-tl-sm'
                      }`}
                  >
                    {/* Media Attachment Rendering */}
                    {message.mediaUrl && (
                      <div className="mb-3 rounded-lg overflow-hidden bg-black/5">
                        {message.mediaType === 'image' && (
                          <img
                            src={message.mediaUrl}
                            alt="Uploaded content"
                            className="max-w-full h-auto max-h-80 object-contain rounded-lg"
                          />
                        )}
                        {message.mediaType === 'audio' && (
                          <div className="p-2 bg-white/10 rounded-lg">
                            <audio controls className="w-full h-10">
                              <source src={message.mediaUrl} />
                              Your browser does not support the audio element.
                            </audio>
                          </div>
                        )}
                        {message.mediaType === 'video' && (
                          <video controls className="max-w-full h-auto max-h-80 rounded-lg">
                            <source src={message.mediaUrl} />
                            Your browser does not support the video element.
                          </video>
                        )}
                      </div>
                    )}

                    {message.content && (
                      <div className={`text-sm leading-relaxed markdown-body ${message.role === 'user' ? 'text-white' : 'text-gray-800'
                        }`}>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            // ... (keep existing components)
                            p: ({ ...props }) => (
                              <p className="mb-2 last:mb-0" {...props} />
                            ),
                            a: ({ ...props }) => (
                              <a className={`${message.role === 'user' ? 'text-white underline' : 'text-primary hover:underline'}`} target="_blank" rel="noopener noreferrer" {...props} />
                            ),
                            code: ({ inline, className, children, ...props }: any) => {
                              return !inline ? (
                                <pre className="bg-gray-800 text-gray-100 p-3 rounded-lg overflow-x-auto my-2 text-xs">
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                </pre>
                              ) : (
                                <code className={`${message.role === 'user' ? 'bg-white/20' : 'bg-gray-100'} px-1.5 py-0.5 rounded text-xs font-mono`} {...props}>
                                  {children}
                                </code>
                              )
                            }
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                    {message.isStreaming && (
                      <div className="flex items-center gap-2 mt-2 text-gray-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="text-xs">Generating response...</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-100 p-4 lg:px-8 lg:py-6">
          <div className="max-w-4xl mx-auto w-full">
            {/* Pending Attachment Preview */}
            {pendingAttachment && (
              <div className="mb-3 flex items-center gap-3 p-2 bg-gray-50 rounded-xl border border-gray-200 w-fit animate-in fade-in slide-in-from-bottom-2">
                <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden relative group">
                  {pendingAttachment.type === 'image' ? (
                    <img
                      src={pendingAttachment.previewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : pendingAttachment.type === 'video' ? (
                    <Video className="w-6 h-6 text-gray-500" />
                  ) : (
                    <Mic className="w-6 h-6 text-gray-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
                    {pendingAttachment.file.name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {pendingAttachment.type} • {(pendingAttachment.file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                <button
                  onClick={() => setPendingAttachment(null)}
                  className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-end gap-2 bg-gray-50 p-2 rounded-[24px] border border-gray-200 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5 transition-all shadow-sm"
            >
              {/* Hidden Inputs */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <input
                type="file"
                ref={audioInputRef}
                onChange={handleFileUpload}
                accept="audio/*"
                className="hidden"
              />
              <input
                type="file"
                ref={videoInputRef}
                onChange={handleFileUpload}
                accept="video/*"
                className="hidden"
              />

              {/* Media Buttons */}
              <div className="flex gap-0.5 pb-1 pl-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || !!pendingAttachment}
                  className="p-2 text-gray-400 hover:text-primary hover:bg-white rounded-full disabled:opacity-50 transition-all"
                  title="Upload Image"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  disabled={isLoading || !!pendingAttachment}
                  className="p-2 text-gray-400 hover:text-primary hover:bg-white rounded-full disabled:opacity-50 transition-all"
                  title="Upload Audio"
                >
                  <Mic className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={isLoading || !!pendingAttachment}
                  className="p-2 text-gray-400 hover:text-primary hover:bg-white rounded-full disabled:opacity-50 transition-all"
                  title="Upload Video"
                >
                  <Video className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 min-w-0 py-2">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={pendingAttachment ? "Add a message..." : "Ask anything..."}
                  className="w-full bg-transparent text-sm resize-none focus:outline-none max-h-32 placeholder:text-gray-400"
                  rows={1}
                  disabled={isLoading}
                  style={{ minHeight: '24px' }}
                />
              </div>

              <button
                type="submit"
                disabled={(!inputText.trim() && !pendingAttachment) || isLoading}
                className="p-2.5 mb-0.5 mr-0.5 bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all hover:scale-105 active:scale-95"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
            <p className="text-[10px] text-gray-400 text-center mt-3">
              AI can make mistakes. Consider checking important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAgentPage;
