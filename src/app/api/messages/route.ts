import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

interface GmailMessagePart {
  mimeType: string;
  body: {
    data: string;
  };
}

interface GmailMessageHeader {
  name: string;
  value: string;
}

interface GmailMessagePayload {
  headers: GmailMessageHeader[];
  parts?: GmailMessagePart[];
  body?: {
    data: string;
  };
}

interface GmailMessage {
  id: string;
  snippet: string;
  payload: GmailMessagePayload;
}

function categorizeMessage(content: string): 'today' | 'ai' | 'web' | 'design' {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('tldr ai')) {
    return 'ai';
  } else if (lowerContent.includes('tldr web')) {
    return 'web';
  } else if (lowerContent.includes('tldr design')) {
    return 'design';
  } else {
    return 'today';
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const oauth2Client = new OAuth2Client();
    oauth2Client.setCredentials({ access_token: session.accessToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Get today's date range for Gmail search
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Format dates for Gmail search (YYYY/MM/DD)
    const todayStr = today.toISOString().split('T')[0].replace(/-/g, '/');
    const yesterdayStr = yesterday.toISOString().split('T')[0].replace(/-/g, '/');

    // Search for messages from TLDR today
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: `from:dan@tldrnewsletter.com after:${yesterdayStr} before:${todayStr}`,
      maxResults: 10,
    });

    if (!response.data.messages) {
      return NextResponse.json({ messages: [] });
    }

    // Fetch full message details for each message
    const messagePromises = response.data.messages.map(async (message) => {
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
        format: 'full',
      });

      const getMessageContent = (message: GmailMessage): string => {
        if (!message.payload) return '';
        
        if (message.payload.parts) {
          const textPart = message.payload.parts.find(
            (part) => part.mimeType === 'text/plain'
          );
          
          if (textPart) {
            return Buffer.from(textPart.body.data, 'base64').toString('utf-8');
          }
        }
        
        if (message.payload.body && message.payload.body.data) {
          return Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
        }
        
        return '';
      };

      const getMessageSubject = (message: GmailMessage): string => {
        const headers = message.payload?.headers || [];
        const subjectHeader = headers.find((header) => header.name === 'Subject');
        return subjectHeader?.value || 'No Subject';
      };

      const getMessageDate = (message: GmailMessage): string => {
        const headers = message.payload?.headers || [];
        const dateHeader = headers.find((header) => header.name === 'Date');
        return dateHeader?.value || '';
      };

      const content = getMessageContent(fullMessage.data as GmailMessage);
      const category = categorizeMessage(content);

      return {
        id: message.id!,
        snippet: fullMessage.data.snippet || '',
        subject: getMessageSubject(fullMessage.data as GmailMessage),
        date: getMessageDate(fullMessage.data as GmailMessage),
        content,
        category,
      };
    });

    const messages = await Promise.all(messagePromises);

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
} 