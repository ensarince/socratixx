/**
 * Socratic API Service
 * Handles all communication with the Socratic Reasoning backend server
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// API Response Types
export interface SocraticQuestion {
    question: string;
    depth?: number;
}

export interface SocraticResponse {
    question: string;
    depth: number;
    thoughtProcess: {
        nodes: Array<{
            id: string;
            text: string;
            depth: number;
            timestamp: number;
        }>;
        connections: Array<{
            from: string;
            to: string;
        }>;
    };
}

export interface SessionState {
    topic: string | null;
    userAnswers: string[];
    thoughtProcess: {
        nodes: ThoughtProcessNode[];
        connections: ThoughtProcessConnection[];
    };
    conversationHistory: ConversationMessage[];
    questionDepth: number;
    currentQuestion: string | null;
}

interface ThoughtProcessNode {
    id: string;
    text: string;
    depth: number;
    timestamp: number;
}

interface ThoughtProcessConnection {
    from: string;
    to: string;
}

export interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

// Error handling
export class SocraticAPIError extends Error {
    statusCode: number;
    details?: Record<string, unknown>;

    constructor(
        statusCode: number,
        message: string,
        details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'SocraticAPIError';
        this.statusCode = statusCode;
        this.details = details;
    }
}

// Utility function for API calls
async function apiCall<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: Record<string, unknown>
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const options: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new SocraticAPIError(
                response.status,
                error.error || `API Error: ${response.statusText}`,
                error
            );
        }

        return await response.json() as T;
    } catch (error) {
        if (error instanceof SocraticAPIError) {
            throw error;
        }
        throw new SocraticAPIError(
            0,
            `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            error as Record<string, unknown>
        );
    }
}

// API Methods
export const SocraticAPI = {
    // Session Management
    async initializeSession(topic: string): Promise<{ message: string; state: SessionState }> {
        return apiCall('/session/init', 'POST', { topic });
    },

    async getSessionState(): Promise<SessionState> {
        return apiCall('/session/state');
    },

    async resetSession(): Promise<{ message: string }> {
        return apiCall('/session/reset', 'POST');
    },

    // Question Generation
    async generateInitialQuestion(topic: string): Promise<SocraticQuestion> {
        return apiCall('/question/generate', 'POST', { topic });
    },

    async respondToQuestion(answer: string): Promise<SocraticResponse> {
        return apiCall('/question/respond', 'POST', { answer });
    },

    // Visualization Data
    async getThoughtProcess(): Promise<{ nodes: ThoughtProcessNode[]; connections: ThoughtProcessConnection[] }> {
        return apiCall('/visualization/thought-process');
    },

    async getConversationHistory(): Promise<ConversationMessage[]> {
        return apiCall('/conversation/history');
    },
};
