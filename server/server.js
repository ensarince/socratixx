import { config } from "dotenv";
import { OpenAI } from 'openai';
import cors from "cors";
import express from "express";

config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// STATE MANAGEMENT FOR SOCRATIC REASONING
// ============================================

let socraticState = {
    topic: null,
    userAnswers: [],
    thoughtProcess: {
        nodes: [],
        connections: []
    },
    conversationHistory: [],
    questionDepth: 0,
    currentQuestion: null,
};

// ============================================
// SYSTEM PROMPTS FOR SOCRATIC METHOD
// ============================================

const SOCRATIC_SYSTEM_PROMPT = `You are a Socratic reasoning assistant designed to foster critical thinking through guided questioning.

Your core principles:
1. NEVER provide direct answers. Always ask clarifying questions instead.
2. Guide learners to discover answers themselves through structured questioning.
3. Challenge assumptions gently and encourage deeper thinking.
4. Build on previous responses to progressively deepen understanding.
5. Adapt questioning based on comprehension level and confidence.
6. Focus on "why" and "how" rather than "what".

Questioning hierarchy:
- Level 1: Clarifying questions - "What do you mean by...?"
- Level 2: Probing questions - "Why do you think that?"
- Level 3: Connecting questions - "How does this relate to...?"
- Level 4: Challenge questions - "What if...?"
- Level 5: Assumption questions - "Are you assuming...?"

Always maintain a supportive, curious, and encouraging tone. Your goal is to help learners think deeply, not to test them.`;

const QUESTION_TYPES = {
    feynman: "Ask them to explain the concept in simple terms as if teaching a child. Test their ability to simplify.",
    edgeCase: "Present a boundary condition or extreme case. Test how they handle edge cases.",
    assumption: "Uncover hidden assumptions. Ask what they're assuming to be true.",
    doubleDown: "Ask them to synthesize - how do different concepts connect?",
    counterExemplar: "Present a specific counter-example to their reasoning.",
    reflectiveToss: "Turn their question back - what would they need to understand first?"
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function initializeSession(topic) {
    socraticState = {
        topic,
        userAnswers: [],
        thoughtProcess: {
            nodes: [],
            connections: []
        },
        conversationHistory: [],
        questionDepth: 0,
        currentQuestion: null,
    };
    return socraticState;
}

function addToThoughtProcess(answer, questionNumber) {
    const node = {
        id: `node-${questionNumber}`,
        text: answer,
        depth: socraticState.questionDepth,
        timestamp: Date.now()
    };
    socraticState.thoughtProcess.nodes.push(node);
    
    if (socraticState.thoughtProcess.nodes.length > 1) {
        const prevNode = socraticState.thoughtProcess.nodes[socraticState.thoughtProcess.nodes.length - 2];
        socraticState.thoughtProcess.connections.push({
            from: prevNode.id,
            to: node.id
        });
    }
}

function addToConversationHistory(role, content) {
    socraticState.conversationHistory.push({
        role,
        content,
        timestamp: Date.now()
    });
}

// ============================================
// ROUTES
// ============================================

app.get("/", (req, res) => {
    res.json({ 
        message: "SOCRATIX - Socratic Reasoning Server",
        version: "1.0.0",
        status: "running"
    });
});

app.post("/api/session/init", (req, res) => {
    const { topic } = req.body;
    
    if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
    }
    
    const state = initializeSession(topic);
    res.json({ 
        message: "Session initialized",
        state 
    });
});

app.get("/api/session/state", (req, res) => {
    res.json(socraticState);
});

app.post("/api/question/generate", async (req, res) => {
    const { topic } = req.body;
    
    if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
    }
    
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: SOCRATIC_SYSTEM_PROMPT
                },
                {
                    role: "user",
                    content: `Create an initial Socratic question for exploring: "${topic}"
                    
Requirements:
1. Open-ended (not yes/no)
2. Intermediate difficulty
3. Curious and welcoming tone
4. Hints at deeper complexity
5. One clear question only

Just the question, nothing else.`
                }
            ],
            max_tokens: 150,
            temperature: 0.8
        });
        
        const question = response.choices[0].message.content;
        socraticState.currentQuestion = question;
        socraticState.questionDepth = 0;
        addToConversationHistory("assistant", question);
        
        res.json({ question });
    } catch (error) {
        console.error("Error generating question:", error);
        res.status(500).json({ error: "Failed to generate question", details: error.message });
    }
});

app.post("/api/question/respond", async (req, res) => {
    const { answer } = req.body;
    
    if (!answer) {
        return res.status(400).json({ error: "Answer is required" });
    }
    
    if (!socraticState.topic) {
        return res.status(400).json({ error: "No active session. Initialize a topic first." });
    }
    
    try {
        socraticState.userAnswers.push(answer);
        socraticState.questionDepth += 1;
        addToThoughtProcess(answer, socraticState.userAnswers.length);
        addToConversationHistory("user", answer);
        
        const questionTypes = ["feynman", "edgeCase", "assumption", "doubleDown", "counterExemplar", "reflectiveToss"];
        const selectedType = questionTypes[Math.min(socraticState.questionDepth - 1, questionTypes.length - 1)];
        const typeGuidance = QUESTION_TYPES[selectedType];
        
        const conversationContext = socraticState.conversationHistory
            .slice(-6)
            .map(msg => `${msg.role === 'user' ? 'Learner' : 'AI'}: ${msg.content}`)
            .join("\n\n");
        
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: SOCRATIC_SYSTEM_PROMPT + "\n\nFor this response: " + typeGuidance
                },
                {
                    role: "user",
                    content: `Topic: "${socraticState.topic}"
Depth: Question ${socraticState.questionDepth}

Recent conversation:
${conversationContext}

Their latest response: "${answer}"

Generate the next Socratic question that:
- Builds directly on their answer
- Probes deeper into reasoning
- Is respectful and curious
- Challenges without giving answers
- Is concise (1-2 sentences)

Just the question.`
                }
            ],
            max_tokens: 150,
            temperature: 0.8
        });
        
        const nextQuestion = response.choices[0].message.content;
        socraticState.currentQuestion = nextQuestion;
        addToConversationHistory("assistant", nextQuestion);
        
        res.json({ 
            question: nextQuestion,
            depth: socraticState.questionDepth,
            questionType: selectedType,
            thoughtProcess: socraticState.thoughtProcess,
            state: socraticState
        });
    } catch (error) {
        console.error("Error processing response:", error);
        res.status(500).json({ error: "Failed to process response", details: error.message });
    }
});

app.get("/api/visualization/thought-process", (req, res) => {
    res.json(socraticState.thoughtProcess);
});

app.get("/api/conversation/history", (req, res) => {
    res.json(socraticState.conversationHistory);
});

app.post("/api/session/reset", (req, res) => {
    socraticState = {
        topic: null,
        userAnswers: [],
        thoughtProcess: {
            nodes: [],
            connections: []
        },
        conversationHistory: [],
        questionDepth: 0,
        currentQuestion: null,
    };
    res.json({ message: "Session reset successfully" });
});

// ============================================
// ERROR HANDLING & SERVER START
// ============================================

app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
});

app.listen(port, () => {
    console.log(`✓ SOCRATIX Server running on http://localhost:${port}`);
    console.log(`✓ API: http://localhost:${port}/api`);
    console.log(`✓ OpenAI Model: gpt-4o-mini`);
});
