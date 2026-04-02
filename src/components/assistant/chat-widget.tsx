'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { MessageCircle, X, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatWidgetProps {
  organizationId?: string;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ organizationId }) => {
  const t = useTranslations('assistant');
  const tCommon = useTranslations('common');

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const suggestions = [
    {
      key: 'taxOptimization',
      label: t('suggestions.taxOptimization'),
    },
    {
      key: 'dividendStrategy',
      label: t('suggestions.dividendStrategy'),
    },
    {
      key: 'expenseDeduction',
      label: t('suggestions.expenseDeduction'),
    },
    {
      key: 'installments',
      label: t('suggestions.installments'),
    },
  ];

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();

    if (!textToSend) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            {
              role: 'user',
              content: textToSend,
            },
          ],
          organizationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  fullContent += parsed.text;
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      ...newMessages[newMessages.length - 1],
                      content: fullContent,
                    };
                    return newMessages;
                  });
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Je suis désolé, une erreur s\'est produite. Veuillez réessayer. / Sorry, an error occurred. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 w-14 h-14 rounded-full bg-tenir-600 text-white shadow-lg',
          'hover:bg-tenir-700 transition-all duration-200 flex items-center justify-center',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-tenir-500',
          'z-40'
        )}
        aria-label={t('title')}
      >
        <MessageCircle size={24} />
      </button>

      {/* Chat Panel */}
      <div
        className={cn(
          'fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-xl shadow-2xl border border-gray-200',
          'flex flex-col transition-all duration-300 z-50',
          isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-8'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{t('title')}</h2>
          <button
            onClick={() => setIsOpen(false)}
            className={cn(
              'p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100',
              'rounded-lg transition-colors duration-200'
            )}
            aria-label={tCommon('close')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <MessageCircle size={40} className="text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm mb-4">
                {t('placeholder')}
              </p>
              <div className="w-full space-y-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.key}
                    onClick={() => handleSuggestionClick(suggestion.label)}
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm rounded-lg',
                      'bg-white border border-gray-200',
                      'hover:bg-tenir-50 hover:border-tenir-300 hover:text-tenir-700',
                      'transition-all duration-200'
                    )}
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn('flex gap-2', message.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-xs px-4 py-2 rounded-lg text-sm',
                      message.role === 'user'
                        ? 'bg-tenir-600 text-white rounded-br-none'
                        : 'bg-gray-200 text-gray-900 rounded-bl-none'
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start gap-2">
                  <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg rounded-bl-none">
                    <div className="flex gap-1">
                      <span className="inline-block w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                      <span className="inline-block w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <span className="inline-block w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 space-y-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={t('placeholder')}
              disabled={isLoading}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg border border-gray-300',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tenir-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'bg-white text-gray-900 placeholder-gray-500'
              )}
            />
            <Button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !input.trim()}
              size="sm"
              variant="primary"
              icon={<Send size={16} />}
              aria-label="Send message"
            />
          </div>
          <p className="text-xs text-gray-500 text-center">
            {t('disclaimer')}
          </p>
        </div>
      </div>
    </>
  );
};
