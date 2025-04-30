'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface TLDRMessage {
  id: string;
  snippet: string;
  subject: string;
  date: string;
  content: string;
  category: 'today' | 'ai' | 'web' | 'design';
}

type Category = 'today' | 'ai' | 'web' | 'design';

const categoryLabels: Record<Category, string> = {
  today: 'Today',
  ai: 'AI',
  web: 'Web Dev',
  design: 'Design'
};

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<TLDRMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>('today');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchMessages() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/messages');
        
        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }
        
        const data = await response.json();
        setMessages(data.messages);
      } catch (err) {
        setError('Failed to fetch messages. Please try again later.');
        console.error('Error fetching messages:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (status === 'authenticated') {
      fetchMessages();
    }
  }, [status]);

  const filteredMessages = messages.filter(msg => msg.category === activeCategory);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Today's TLDR</h1>
            <p className="text-gray-500 mt-1">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Sign Out
          </button>
        </div>

        <div className="mb-8">
          <div className="flex space-x-4 overflow-x-auto pb-2">
            {(Object.keys(categoryLabels) as Category[]).map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                  activeCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {categoryLabels[category]}
              </button>
            ))}
          </div>
        </div>

        {filteredMessages.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No {categoryLabels[activeCategory]} TLDR Today
            </h2>
            <p className="text-gray-500">
              There are no {categoryLabels[activeCategory].toLowerCase()} newsletters in your inbox for today.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredMessages.map((message) => (
              <div key={message.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">{message.subject}</h2>
                  <span className="text-sm text-gray-500">
                    {new Date(message.date).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="prose max-w-none">
                  <div className="mt-4 whitespace-pre-wrap text-gray-700">{message.content}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
