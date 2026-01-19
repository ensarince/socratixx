/**
 * Socratic API Service
 * Handles all communication with the Socratic Reasoning backend server
 * Implements principles from arXiv:2409.05511 and MAIKE research
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// ============================================
// API RESPONSE TYPES & INTERFACES
// ============================================

export interface SocraticQuestion {
    question: string;
    depth?: number;
}

export interface QuestionResponseData {
    question: string;
    depth: number;
    questionType: string;
    confidence?: number;
    consistencyScore?: number;
    assertionCount?: number;
    contradictionDetected?: boolean;
    loopWarning?: string | null;
    readyForSynthesis?: boolean;
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

export interface SocraticResponse extends QuestionResponseData {}

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
    sessionPhase: 'calibration' | 'progressive' | 'synthesis' | 'conclusion';
    consistencyScore: number;
    assertions: Array<{
        id: string;
        statement: string;
        nodeId: string;
        confidence: number;
        timestamp: number;
        foundational: boolean;
    }>;
    misconceptions: Array<{
        id: string;
        type: 'calculation' | 'logic' | 'fundamental';
        severity: string;
        resolved: boolean;
    }>;
    baselineKnowledgeLevel: 'beginner' | 'intermediate' | 'advanced' | null;
    currentPathStep: number;
    solutionPath: Array<{
        step: number;
        name: string;
        description: string;
    }>;
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

export interface CalibrationData {
    baselineLevel: 'beginner' | 'intermediate' | 'advanced';
    firstQuestion: string;
    nextPhase: string;
    sessionPhase: string;
}

export interface SynthesisData {
    phase: string;
    message: string;
    knowledgeGapMap: Array<{
        step: string;
        status: 'mastered' | 'current' | 'locked';
        confidence: number;
    }>;
    sessionStats: {
        totalQuestions: number;
        consistencyScore: number;
        assertionCount: number;
        misconceptionsDetected: number;
        pathProgressPercentage: number;
    };
}

// ============================================
// ERROR HANDLING
// ============================================

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

// ============================================
// UTILITY FUNCTIONS
// ============================================

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

// ============================================
// API METHODS
// ============================================

export const SocraticAPI = {
    // ========== SESSION MANAGEMENT ==========
    
    async initializeSession(topic: string): Promise<{ 
        message: string; 
        state: SessionState;
        calibrationQuestions: string[];
        sessionPhase: string;
    }> {
        return apiCall('/session/init', 'POST', { topic });
    },

    async calibrateSession(calibrationResponses: string[]): Promise<CalibrationData> {
        return apiCall('/session/calibrate', 'POST', { calibrationResponses });
    },

    async getSessionState(): Promise<SessionState & { sessionSummary: {
        topic: string;
        phase: string;
        questionDepth: number;
        consistencyScore: number;
        assertionCount: number;
        misconceptionCount: number;
        baselineLevel: string;
        currentPathStep: number;
        totalPathSteps: number;
    }}> {
        return apiCall('/session/state');
    },

    async resetSession(): Promise<{ message: string }> {
        return apiCall('/session/reset', 'POST');
    },

    // ========== QUESTIONING & INTERACTION ==========

    async generateInitialQuestion(topic: string): Promise<SocraticQuestion> {
        return apiCall('/question/generate', 'POST', { topic });
    },

    async respondToQuestion(answer: string, confidence: number = 50): Promise<SocraticResponse> {
        return apiCall('/question/respond', 'POST', { answer, confidence });
    },

    // ========== SCAFFOLDING SUPPORT ==========

    async requestScaffold(currentQuestion: string): Promise<{
        level: string;
        levelIndex: number;
        scaffold: string;
        message: string;
    }> {
        return apiCall('/scaffold/request', 'POST', { currentQuestion });
    },

    // ========== SYNTHESIS & CONCLUSION ==========

    async generateSynthesisPrompt(): Promise<{
        phase: string;
        message: string;
        synthesisQuestion: string;
        provenAssertions: Array<{
            id: string;
            statement: string;
            confidence: number;
        }>;
    }> {
        return apiCall('/session/synthesize', 'POST');
    },

    async evaluateSynthesis(synthesisMemo: string): Promise<SynthesisData> {
        return apiCall('/session/evaluate-synthesis', 'POST', { synthesisMemo });
    },

    async generateConfusedQuestions(): Promise<{
        questions: string[];
        count: number;
        sessionContext: {
            topic: string;
            assertionCount: number;
            knowledgeLevel: 'beginner' | 'intermediate' | 'advanced' | null;
        };
    }> {
        return apiCall('/session/generate-confused-questions', 'POST');
    },

    // ========== VISUALIZATION & DATA ==========

    async getThoughtProcess(): Promise<{
        nodes: ThoughtProcessNode[];
        connections: ThoughtProcessConnection[];
        metadata: {
            totalNodes: number;
            totalConnections: number;
            depth: number;
        };
    }> {
        return apiCall('/visualization/thought-process');
    },

    async getKnowledgeGraph(): Promise<{
        nodes: Array<{
            id: string;
            label: string;
            description: string;
            status: 'mastered' | 'current' | 'locked';
            order: number;
        }>;
        provenConcepts: Array<{
            id: string;
            label: string;
            confidence: number;
        }>;
    }> {
        return apiCall('/visualization/knowledge-graph');
    },

    async getConsistencyScore(): Promise<{
        score: number;
        contradictions: number;
        resolved_contradictions: number;
        assertions: number;
        metadata: {
            maxScore: number;
            currentPhase: string;
        };
    }> {
        return apiCall('/visualization/consistency-score');
    },

    async getAssertionLog(): Promise<{
        assertions: Array<{
            id: string;
            statement: string;
            confidence: number;
            foundational: boolean;
        }>;
        total: number;
        highConfidence: number;
        foundational: number;
    }> {
        return apiCall('/assertions/log');
    },

    async getMisconceptions(): Promise<{
        misconceptions: Array<{
            id: string;
            type: 'calculation' | 'logic' | 'fundamental';
            severity: string;
            detected_at_depth: number;
            resolved: boolean;
        }>;
        totalDetected: number;
        byType: {
            calculation: number;
            logic: number;
            fundamental: number;
        };
    }> {
        return apiCall('/misconceptions/detected');
    },

    async getConversationHistory(): Promise<{
        history: ConversationMessage[];
        total: number;
        phase: string;
    }> {
        return apiCall('/conversation/history');
    },

    async getKnowledgeGapMap(): Promise<{
        map: Array<{
            step: string;
            status: 'mastered' | 'current' | 'locked';
            confidence: number;
        }>;
        summary: {
            areas_mastered: number;
            areas_in_progress: number;
            areas_locked: number;
        };
    }> {
        return apiCall('/knowledge-gap-map');
    },
};
