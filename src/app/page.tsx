'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/Providers';

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

// Function to convert URLs to clickable links and handle article titles
const convertUrlsToLinks = (text: string) => {
  // First, extract all URLs and their corresponding titles
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = text.match(urlRegex) || [];
  
  // Create a map of article numbers to URLs
  const articleMap = new Map();
  urls.forEach((url, index) => {
    articleMap.set(`[${index + 1}]`, url);
  });

  // Remove the links section (everything after "Links:")
  const contentWithoutLinks = text.split('Links:')[0].trim();

  // Remove the header section and clean up extra spaces
  const headerRegex = /Sign Up \[\d+\] \|Advertise \[\d+\]\|View Online \[\d+\]\s+TLDR\s+TOGETHER WITH \[.*?\] \[\d+\]/;
  const contentWithoutHeader = contentWithoutLinks.replace(headerRegex, '').trim();

  // Split content into sections and format them
  const sections = contentWithoutHeader.split(/\n\s*\n/).filter(section => section.trim());
  
  return sections.map((section, sectionIndex) => {
    // Check if section is all caps (likely a heading)
    if (section === section.toUpperCase() && !section.match(/\[\d+\]/)) {
      return (
        <h3 key={sectionIndex} className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
          {section}
        </h3>
      );
    }

    // Process the section content
    const parts = section.split(/(\[\d+\])/g);
    return (
      <p key={sectionIndex} className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
        {parts.map((part, i) => {
          if (articleMap.has(part)) {
            return (
              <a
                key={i}
                href={articleMap.get(part)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
              >
                {part}
              </a>
            );
          }
          return part;
        })}
      </p>
    );
  });
};

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [messages, setMessages] = useState<TLDRMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>('today');
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-100 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Today's TLDR</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {theme === 'light' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => signOut()}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Sign Out
            </button>
          </div>
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
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {categoryLabels[category]}
              </button>
            ))}
          </div>
        </div>

        {filteredMessages.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No {categoryLabels[activeCategory]} TLDR Today
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              There are no {categoryLabels[activeCategory].toLowerCase()} newsletters in your inbox for today.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredMessages.map((message) => (
              <div key={message.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{message.subject}</h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(message.date).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="prose max-w-none">
                  <div className="mt-4">
                    {convertUrlsToLinks(message.content)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3 rounded-full bg-white/10 dark:bg-gray-800/10 backdrop-blur-sm border border-gray-200/20 dark:border-gray-700/20 hover:bg-white/20 dark:hover:bg-gray-800/20 transition-all duration-200 shadow-lg"
          aria-label="Scroll to top"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-gray-700 dark:text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
