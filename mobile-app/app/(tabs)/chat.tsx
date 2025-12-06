import { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const initialMessages: Message[] = [
  {
    id: '1',
    text: "Hi! I'm your AutoShift AI assistant. I can help you with:\n\n• Checking your schedule\n• Leave balance inquiries\n• Shift swap suggestions\n• General questions\n\nHow can I help you today?",
    isUser: false,
    timestamp: new Date(),
  },
];

export default function ChatScreen() {
  const { colors } = useThemeStore();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const quickQuestions = [
    { text: "Next shift?", icon: "calendar" },
    { text: "Leave balance", icon: "airplane" },
    { text: "Who to swap?", icon: "swap-horizontal" },
    // { text: "This week", icon: "time" },
  ];

  const getAIResponse = (question: string): string => {
    const lowerQ = question.toLowerCase();
    
    if (lowerQ.includes('next shift') || lowerQ.includes('when') || lowerQ.includes('next')) {
      return "Your next shift is tomorrow (Monday, Jan 15) from 07:00 to 15:00 at the Emergency Department. It's a Morning shift. Would you like me to set a reminder?";
    }
    if (lowerQ.includes('leave') || lowerQ.includes('days left') || lowerQ.includes('balance')) {
      return "You have 9 annual leave days remaining for this year. You've used 6 days so far. Would you like to request some leave?";
    }
    if (lowerQ.includes('swap') || lowerQ.includes('who')) {
      return "Based on your upcoming shifts, here are some swap options:\n\n• Jane Smith - Tue Jan 16, Morning (Ward B)\n• Bob Johnson - Thu Jan 18, Evening (ICU)\n\nWould you like me to initiate a swap request?";
    }
    if (lowerQ.includes('schedule') || lowerQ.includes('this week') || lowerQ.includes('week')) {
      return "Here's your schedule for this week:\n\n• Mon 15 - Morning (07:00-15:00) Emergency\n• Wed 17 - Evening (15:00-23:00) Ward A\n• Fri 19 - Morning (07:00-15:00) ICU\n\nYou're working 24 hours this week.";
    }
    
    return "I understand you're asking about \"" + question + "\". Let me look into that for you. Is there anything specific about your shifts, leave, or schedule I can help with?";
  };

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: getAIResponse(text),
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 1000);

    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageBubble,
              message.isUser 
                ? [styles.userBubble, { backgroundColor: colors.primary }]
                : [styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border }],
            ]}
          >
            {!message.isUser && (
              <View style={[styles.aiAvatar, { backgroundColor: colors.primary + '30' }]}>
                <Ionicons name="sparkles" size={16} color={colors.primary} />
              </View>
            )}
            <Text style={[
              styles.messageText,
              { color: message.isUser ? '#fff' : colors.text }
            ]}>
              {message.text}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Quick Questions */}
      <View style={[styles.quickQuestionsContainer, { borderTopColor: colors.border }]}>
        {/* <Text style={[styles.quickTitle, { color: colors.textSecondary }]}>Quick Questions</Text> */}
        <View style={styles.quickQuestionsRow}>
          {quickQuestions.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.quickQuestion, { backgroundColor: colors.card, borderColor: colors.primary }]}
              onPress={() => sendMessage(item.text)}
            >
              {/* <Ionicons name={item.icon as any} size={16} color={colors.primary} /> */}
              <Text style={[styles.quickQuestionText, { color: colors.text }]}>{item.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Input */}
      <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Ask me anything..."
          placeholderTextColor={colors.textSecondary}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => sendMessage(inputText)}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: colors.primary }]}
          onPress={() => sendMessage(inputText)}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  quickQuestionsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    // borderTopWidth: 1,
  },
  quickTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 10,
  },
  quickQuestionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickQuestion: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  quickQuestionText: {
    fontSize: 11,
    fontWeight: '400',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
