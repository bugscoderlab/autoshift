import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIAssistant() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I\'m your AI roster assistant. I can help you with generating schedules, explaining assignments, or answering questions about your roster. What would you like to do?' },
  ]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    setMessages([...messages, { role: 'user', content: input }]);
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I understand you want to optimize the roster. Based on the current constraints and employee preferences, I can suggest some improvements. Would you like me to proceed with generating an optimized schedule?'
      }]);
    }, 1000);
    
    setInput('');
  };

  return (
    <div className="space-y-6 h-[calc(100vh-12rem)]">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">AI Assistant</h1>
        <p className="text-white/60">Get intelligent help with roster management</p>
      </div>

      <div className="card flex flex-col h-full">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                msg.role === 'assistant' 
                  ? 'bg-gradient-to-br from-primary-500 to-accent-500' 
                  : 'bg-white/20'
              }`}>
                {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-white" />}
              </div>
              <div className={`max-w-[70%] p-4 rounded-2xl ${
                msg.role === 'assistant' 
                  ? 'bg-white/10' 
                  : 'bg-primary-600'
              }`}>
                <p className="text-white">{msg.content}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mb-4">
          {['Generate next month roster', 'Show understaffed shifts', 'Optimize workload'].map(action => (
            <button
              key={action}
              onClick={() => setInput(action)}
              className="px-3 py-1.5 bg-white/5 rounded-full text-sm text-white/70 hover:bg-white/10"
            >
              {action}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about roster, shifts, or request changes..."
            className="input-field flex-1"
          />
          <button onClick={handleSend} className="btn-primary">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

