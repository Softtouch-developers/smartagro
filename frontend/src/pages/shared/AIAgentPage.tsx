import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Image as ImageIcon,
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
}

const AIAgentPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

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
      const loadedMessages: LocalMessage[] = data.messages.map((msg, idx) => ({
        id: `${data.session.session_id}-${idx}`,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      }));
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
    if (!messageText || isStreaming) return;

    // Add user message immediately
    const userMessage: LocalMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');

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

    const userMessage: LocalMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: `[Uploaded: ${file.name}]\n${inputText || 'Please analyze this image'}`,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    uploadChatMutation.mutate({
      file,
      message: inputText || 'Please analyze this image and provide insights',
    });

    setInputText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

  const isLoading = chatMutation.isPending || uploadChatMutation.isPending || isStreaming;

  return (
    <div className="h-[calc(100vh-theme(spacing.14)-theme(spacing.16))] flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="font-semibold text-gray-900">SmartAgro AI</h1>
          <p className="text-xs text-gray-500">Your farming assistant</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNewChat}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          New Chat
        </Button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-80 bg-white shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold">Chat History</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2">
              <button
                onClick={handleNewChat}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-lg bg-primary/10 text-primary font-medium"
              >
                <Plus className="w-5 h-5" />
                New Chat
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(100vh-120px)]">
              {sessions?.map((session) => (
                <div
                  key={session.session_id}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer ${currentSessionId === session.session_id ? 'bg-gray-100' : ''
                    }`}
                  onClick={() => handleSelectSession(session)}
                >
                  <Sparkles className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {session.title || 'Untitled Chat'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatRelativeTime(session.updated_at)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSessionMutation.mutate(session.session_id);
                    }}
                    className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mb-4">
              <Bot className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Welcome to SmartAgro AI
            </h2>
            <p className="text-gray-500 text-center max-w-md mb-6">
              Your intelligent farming assistant. Ask me about crop management, pest control, weather advice, and more!
            </p>

            {/* Suggestion Cards */}
            <div className="w-full max-w-lg space-y-2">
              <p className="text-sm font-medium text-gray-700 mb-3">Try asking:</p>
              {suggestions?.slice(0, 4).map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(suggestion)}
                  className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-gray-700 flex-1">{suggestion}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
              >
                {message.role === 'assistant' ? (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <Avatar name="You" size="sm" />
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === 'user'
                    ? 'bg-primary text-white rounded-tr-md'
                    : 'bg-white shadow-sm border border-gray-100 rounded-tl-md'
                    }`}
                >
                  <div className="text-sm markdown-body">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ ...props }) => (
                          <div className="overflow-x-auto my-2">
                            <table className="min-w-full divide-y divide-gray-200 border border-gray-200" {...props} />
                          </div>
                        ),
                        thead: ({ ...props }) => (
                          <thead className="bg-gray-50" {...props} />
                        ),
                        th: ({ ...props }) => (
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 last:border-r-0" {...props} />
                        ),
                        td: ({ ...props }) => (
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200 last:border-r-0 border-t" {...props} />
                        ),
                        ul: ({ ...props }) => (
                          <ul className="list-disc list-inside my-2" {...props} />
                        ),
                        ol: ({ ...props }) => (
                          <ol className="list-decimal list-inside my-2" {...props} />
                        ),
                        p: ({ ...props }) => (
                          <p className="mb-2 last:mb-0" {...props} />
                        ),
                        a: ({ ...props }) => (
                          <a className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                  {message.isStreaming && (
                    <div className="flex items-center gap-1 mt-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="text-xs opacity-70">Thinking...</span>
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
      <div className="bg-white border-t border-gray-100 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-2"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full disabled:opacity-50"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask about farming, crops, weather..."
              className="w-full px-4 py-3 bg-gray-100 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 max-h-32"
              rows={1}
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-3 bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
        <p className="text-xs text-gray-400 text-center mt-2">
          AI may make mistakes. Verify important farming decisions with local experts.
        </p>
      </div>
    </div>
  );
};

export default AIAgentPage;
