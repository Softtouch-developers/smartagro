import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Mic, Volume2 } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const predefinedResponses: Record<string, string> = {
  'tomato': 'For healthy tomato cultivation: Plant during the rainy season (April-June). Space plants 60cm apart. Apply NPK fertilizer 2 weeks after planting. Watch for blight disease - spray with fungicide if leaves turn brown. Harvest when fully red for best market price.',
  'pest': 'Common pest management tips: Use neem oil spray for aphids and whiteflies. Plant marigolds around your crops as natural pest repellent. For armyworms, apply Bt (Bacillus thuringiensis) based pesticides early morning. Always rotate crops to break pest cycles.',
  'price': 'Current market prices in Techiman: Tomatoes (GHS 4-5/kg), Onions (GHS 3-4/kg), Peppers (GHS 7-9/kg), Garden Eggs (GHS 5-6/kg). Prices are higher in Accra by 30-40%. Best selling days are Tuesday and Friday market days.',
  'storage': 'Post-harvest storage tips: Keep tomatoes in ventilated crates, not plastic bags. Store in cool, shaded area. Sort out damaged produce daily. For onions, cure them in sun for 3 days before storage. Use SmartAgro to sell quickly and reduce storage losses!',
  'fertilizer': 'Fertilizer application guide: For vegetables, apply NPK 15-15-15 at 2 bags per acre. First application: 2 weeks after planting. Second: At flowering stage. Third: During fruiting. Organic option: Mix poultry manure with soil before planting.',
  'season': 'Planting calendar for Ghana: Major season (April-July): Maize, Rice, Tomatoes. Minor season (Sept-Nov): Vegetables, Legumes. Dry season (Dec-March): Irrigated vegetables, Onions. Always check local rainfall patterns.',
};

const quickQuestions = [
  'How do I grow healthy tomatoes?',
  'What are current market prices?',
  'How to control pests naturally?',
  'Best storage practices?',
  'When should I apply fertilizer?',
  'What to plant this season?'
];

export function AdvisoryChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Akwaaba! I am your SmartAgro farming advisor. I can help you with crop cultivation, pest management, market prices, and farming best practices. How can I assist you today?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getBotResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    for (const [key, response] of Object.entries(predefinedResponses)) {
      if (lowerMessage.includes(key)) {
        return response;
      }
    }

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return 'Hello! How can I help you with your farming today?';
    }

    if (lowerMessage.includes('thank')) {
      return 'You\'re welcome! Feel free to ask me anything about farming. Good luck with your harvest! 🌱';
    }

    return 'I can help you with: crop cultivation advice, pest and disease management, current market prices, storage techniques, fertilizer application, and planting calendars. What would you like to know more about?';
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // Simulate bot response delay
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: getBotResponse(inputText),
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    }, 1000);
  };

  const handleQuickQuestion = (question: string) => {
    setInputText(question);
  };

  const handleVoiceInput = () => {
    setIsListening(!isListening);
    // In a real implementation, this would use Web Speech API
    if (!isListening) {
      setTimeout(() => setIsListening(false), 3000);
    }
  };

  const handleTextToSpeech = (text: string) => {
    // In a real implementation, this would use Web Speech API for text-to-speech
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm h-[calc(100vh-350px)] flex flex-col">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <h3>SmartAgro Farming Advisor</h3>
            <p className="text-green-100">AI-powered agricultural assistant</p>
          </div>
        </div>
      </div>

      {/* Quick Questions */}
      <div className="p-4 border-b bg-gray-50 overflow-x-auto">
        <p className="text-gray-600 mb-2">Quick questions:</p>
        <div className="flex gap-2 flex-wrap">
          {quickQuestions.map((question, index) => (
            <button
              key={index}
              onClick={() => handleQuickQuestion(question)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors whitespace-nowrap"
            >
              {question}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              message.sender === 'bot' ? 'bg-green-100' : 'bg-blue-100'
            }`}>
              {message.sender === 'bot' ? (
                <Bot className="w-5 h-5 text-green-700" />
              ) : (
                <User className="w-5 h-5 text-blue-700" />
              )}
            </div>
            <div className={`flex-1 max-w-[80%] ${message.sender === 'user' ? 'flex flex-col items-end' : ''}`}>
              <div className={`p-4 rounded-2xl ${
                message.sender === 'bot' 
                  ? 'bg-gray-100 text-gray-900' 
                  : 'bg-green-600 text-white'
              }`}>
                <p className="whitespace-pre-wrap">{message.text}</p>
              </div>
              {message.sender === 'bot' && (
                <button
                  onClick={() => handleTextToSpeech(message.text)}
                  className="mt-2 text-gray-500 hover:text-green-600 flex items-center gap-1"
                  title="Listen to message"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Listen</span>
                </button>
              )}
              <p className="text-gray-400 mt-1">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex gap-2">
          <button
            onClick={handleVoiceInput}
            className={`p-3 rounded-lg transition-all ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
            title="Voice input"
          >
            <Mic className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={isListening ? "Listening..." : "Type your question or tap mic to speak..."}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
