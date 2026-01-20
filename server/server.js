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

    // KNOWLEDGE ROADMAP & CURRICULUM
    solutionPath: [], // 5-6 progressive steps to mastery
    currentPathStep: 0,
    prerequisites: [],
    pathGatekeepers: {}, // Validates mastery before moving to next step

    // ERROR TAXONOMY
    misconceptions: [], // Array of detected misconceptions with categorization
    errorLog: [], // Track all errors with types

    // ZPD & CALIBRATION
    calibrationQuestions: [],
    baselineKnowledgeLevel: null, // "beginner" | "intermediate" | "advanced"
    currentZPDLevel: "optimal", // "too-easy" | "optimal" | "too-hard"

    // SCAFFOLDING SYSTEM
    scaffoldingLevels: [], // nudge, hint, partial-explanation progression
    currentScaffoldLevel: 0,

    // ASSERTIONS & KNOWLEDGE TRACKING
    assertions: [], // User-proven facts
    provenNodes: new Set(),

    // CONSISTENCY & SYNTHESIS
    consistencyScore: 0,
    contradictions: [],
    synthesisMemo: null, // Final synthesis attempt

    // SESSION PROGRESSION
    progressTracker: {
        questionDiversity: [],
        loopDetectionThreshold: 5,
        questionSequence: [],
    },
    sessionPhase: "calibration", // "calibration" | "progressive" | "synthesis" | "conclusion"
    knowledgeGapMap: null,
};

// ============================================
// SYSTEM PROMPTS FOR SOCRATIC METHOD
// ============================================

const SOCRATIC_SYSTEM_PROMPT =
    `You are a Socratic reasoning assistant designed to foster critical thinking through guided questioning.

CORE PRINCIPLES:
1. NEVER provide direct answers. Always ask clarifying questions instead.
2. Guide learners to discover answers themselves through structured questioning.
3. Challenge assumptions gently and encourage deeper thinking.
4. Build on previous responses to progressively deepen understanding.
5. Adapt questioning based on comprehension level and confidence.
6. Focus on "why" and "how" rather than "what".

KNOWLEDGE ROADMAP STRATEGY:
- Know the 5-6 progressive steps needed to master this topic
- Act as a gatekeeper: users cannot skip steps
- Use scaffolding to bridge knowledge gaps
- Progressive disclosure: only reveal next level when ready

ERROR TAXONOMY APPROACH:
- Categorize errors: calculation, logic, or fundamental misconception
- Don't just say "wrong" - probe what's causing the error
- Pivot to foundation-building if needed before returning to main topic

ZONE OF PROXIMAL DEVELOPMENT (ZPD):
- Start with minimal intervention (nudge, not explanation)
- Progress through: nudge → hint → partial explanation
- Keep questions in the Goldilocks zone (not too easy, not too hard)

TONE REQUIREMENTS:
- Curious and firm (not annoying or condescending)
- Welcoming and encouraging
- Respect the learner's autonomy
- Build confidence through scaffolding

QUESTIONING HIERARCHY:
- Level 1: Clarifying questions - "What do you mean by...?"
- Level 2: Probing questions - "Why do you think that?"
- Level 3: Connecting questions - "How does this relate to...?"
- Level 4: Challenge questions - "What if...?"
- Level 5: Assumption questions - "Are you assuming...?"`;

const QUESTION_TYPES = {
    feynman: {
        name: "Feynman Simplification",
        description: "Ask them to explain the concept in simple terms as if teaching a child.",
        scoreWeight: 0.9
    },
    edgeCase: {
        name: "Edge Case Probing",
        description: "Present a boundary condition or extreme case to test their understanding.",
        scoreWeight: 0.85
    },
    assumption: {
        name: "Assumption Hunter",
        description: "Uncover hidden assumptions that are prerequisites for the next curriculum level.",
        scoreWeight: 0.8
    },
    doubleDown: {
        name: "Consistency Checker",
        description: "Ask them to synthesize - how do different concepts connect together logically?",
        scoreWeight: 0.95
    },
    counterExemplar: {
        name: "Counter-Exemplar",
        description: "Present a specific counter-example to their reasoning to probe for contradictions.",
        scoreWeight: 0.75
    },
    reflectiveToss: {
        name: "Reflective Toss",
        description: "Turn their question back - what would they need to understand first?",
        scoreWeight: 0.7
    }
};

// PRE-BUILT SOLUTION PATHS (Knowledge Roadmap)
const SOLUTION_PATHS = {
    default: [
        { step: 1, name: "Foundation", description: "Understanding basic definitions and core concepts" },
        { step: 2, name: "Building Blocks", description: "Connecting components and relationships" },
        { step: 3, name: "Application", description: "Applying concepts to real scenarios" },
        { step: 4, name: "Edge Cases", description: "Handling boundary conditions and exceptions" },
        { step: 5, name: "Synthesis", description: "Integrating knowledge into a coherent model" },
        { step: 6, name: "Mastery", description: "Teaching the concept to others without scaffolding" }
    ]
};

// ERROR CATEGORIZATION TAXONOMY
const ERROR_TYPES = {
    CALCULATION: "calculation",
    LOGIC: "logic",
    FUNDAMENTAL: "fundamental"
};

// ============================================
// CALIBRATION QUESTION TEMPLATES
// ============================================

const CALIBRATION_TEMPLATES = {
    beginner: [
        "What do you already know about {topic}?",
        "Have you encountered {topic} before? If so, where?"
    ],
    intermediate: [
        "What's your understanding of how {topic} works?",
        "Can you think of a real-world example where {topic} applies?"
    ],
    advanced: [
        "How would you explain the nuances of {topic} to someone learning it for the first time?",
        "What do you think are the common misconceptions about {topic}?"
    ]
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function initializeSession(topic) {
    // Generate solution path for this topic
    const solutionPath = SOLUTION_PATHS.default;

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

        // Knowledge Roadmap
        solutionPath,
        currentPathStep: 0,
        prerequisites: [],
        pathGatekeepers: {},

        // Error Taxonomy
        misconceptions: [],
        errorLog: [],

        // ZPD & Calibration
        calibrationQuestions: [],
        baselineKnowledgeLevel: null,
        currentZPDLevel: "optimal",

        // Scaffolding
        scaffoldingLevels: [],
        currentScaffoldLevel: 0,

        // Assertions
        assertions: [],
        provenNodes: new Set(),

        // Consistency
        consistencyScore: 0,
        contradictions: [],
        synthesisMemo: null,

        // Progress
        progressTracker: {
            questionDiversity: [],
            loopDetectionThreshold: 5,
            questionSequence: [],
        },
        sessionPhase: "calibration",
        knowledgeGapMap: null,
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
// KNOWLEDGE ROADMAP & PROGRESSIVE DISCLOSURE
// ============================================

function buildSolutionPath(topic) {
    // Pre-computed curriculum steps based on topic
    // In production, this would query a knowledge database
    return SOLUTION_PATHS.default;
}

function canProgressToNextStep(currentStep) {
    // Gatekeeper: Validate that prerequisites are met
    if (currentStep === 0) return true; // First step always accessible

    const currentStepGatekeepers = socraticState.pathGatekeepers[`step-${currentStep}`];
    if (!currentStepGatekeepers) return true; // No gatekeepers defined

    // Check if all gatekeeper conditions are met
    return currentStepGatekeepers.every(condition => condition.isMet);
}

function progressToNextStep() {
    if (canProgressToNextStep(socraticState.currentPathStep + 1)) {
        socraticState.currentPathStep += 1;
        socraticState.sessionPhase = "progressive";
        return { success: true, nextStep: socraticState.solutionPath[socraticState.currentPathStep] };
    }
    return { success: false, reason: "Prerequisites not met" };
}

// ============================================
// ERROR TAXONOMY & MISCONCEPTION DETECTION
// ============================================

function categorizeError(answer, expectedDirection) {
    // Heuristic-based error categorization
    // In production, would use LLM to properly categorize

    if (answer.includes("forgot") || answer.includes("miscalculated")) {
        return ERROR_TYPES.CALCULATION;
    }
    if (answer.includes("but") && answer.includes("instead")) {
        return ERROR_TYPES.LOGIC;
    }
    return ERROR_TYPES.FUNDAMENTAL;
}

function detectMisconception(userAnswer, previousContext) {
    const misconception = {
        id: `misc-${Date.now()}`,
        answer: userAnswer,
        context: previousContext,
        type: categorizeError(userAnswer, previousContext),
        severity: "unknown", // "low" | "medium" | "high"
        detected_at: socraticState.questionDepth,
        resolved: false
    };

    socraticState.misconceptions.push(misconception);
    return misconception;
}

function dynamicAdaptation(misconceptionType) {
    // Pivot the brainstorming to a sub-node to fix foundation
    if (misconceptionType === ERROR_TYPES.FUNDAMENTAL) {
        // Move back to earlier steps in curriculum
        const targetStep = Math.max(0, socraticState.currentPathStep - 2);
        socraticState.currentPathStep = targetStep;
        return {
            action: "pivot_to_foundation",
            targetStep: socraticState.solutionPath[targetStep],
            message: "Let's solidify the foundation before moving forward."
        };
    }
    return { action: "continue", message: "Let's probe this further." };
}

// ============================================
// ZPD & CALIBRATION
// ============================================

function generateCalibrationQuestions(topic) {
    const questions = [
        `What's your first impression when you hear about "${topic}"?`,
        `Have you worked with ${topic} before? In what context?`
    ];
    socraticState.calibrationQuestions = questions;
    return questions;
}

function assessBaselineKnowledge(calibrationResponses) {
    // Simple heuristic: count complexity indicators
    const complexity = calibrationResponses.reduce((sum, resp) => {
        if (resp.length < 20) return sum + 1;
        if (resp.length < 100) return sum + 2;
        return sum + 3;
    }, 0);

    if (complexity <= 2) {
        socraticState.baselineKnowledgeLevel = "beginner";
    } else if (complexity <= 4) {
        socraticState.baselineKnowledgeLevel = "intermediate";
    } else {
        socraticState.baselineKnowledgeLevel = "advanced";
    }

    return socraticState.baselineKnowledgeLevel;
}

// ============================================
// SCAFFOLDING SYSTEM
// ============================================

const SCAFFOLD_LEVELS = {
    0: { name: "nudge", description: "A gentle prompt or question hint" },
    1: { name: "hint", description: "A more direct hint or pointer" },
    2: { name: "partial_explanation", description: "A partial explanation to guide thinking" }
};

function requestScaffold() {
    if (socraticState.currentScaffoldLevel < 2) {
        socraticState.currentScaffoldLevel += 1;
        return {
            level: socraticState.currentScaffoldLevel,
            levelName: SCAFFOLD_LEVELS[socraticState.currentScaffoldLevel].name,
            message: `Providing ${SCAFFOLD_LEVELS[socraticState.currentScaffoldLevel].name} level support...`
        };
    }
    return { message: "Maximum scaffolding level reached. Please share your thinking." };
}

// ============================================
// ASSERTIONS & KNOWLEDGE TRACKING
// ============================================

function recordAssertion(statement, nodeId, confidence) {
    if (confidence > 70) { // Only record high-confidence assertions
        const assertion = {
            id: `assert-${Date.now()}`,
            statement,
            nodeId,
            confidence,
            timestamp: Date.now(),
            foundational: socraticState.currentPathStep <= 1 // Track if foundational
        };
        socraticState.assertions.push(assertion);
        socraticState.provenNodes.add(nodeId);
        return assertion;
    }
    return null;
}

// ============================================
// CONSISTENCY & CONTRADICTION DETECTION
// ============================================

function detectContradiction(newStatement, previousStatements) {
    // Heuristic contradiction detection
    const hasNegation = newStatement.toLowerCase().includes("not") ||
        newStatement.toLowerCase().includes("no") ||
        newStatement.toLowerCase().includes("never");

    const contradictions = previousStatements.filter(prev => {
        if (hasNegation && !prev.toLowerCase().includes("not")) {
            return prev.toLowerCase().split(/\s+/).some(word =>
                newStatement.toLowerCase().includes(word));
        }
        return false;
    });

    if (contradictions.length > 0) {
        socraticState.contradictions.push({
            id: `contradiction-${Date.now()}`,
            new: newStatement,
            conflictsWith: contradictions,
            detected_at: socraticState.questionDepth
        });
        return true;
    }
    return false;
}

function updateConsistencyScore(resolvedContradiction = false) {
    if (resolvedContradiction) {
        socraticState.consistencyScore = Math.min(100, socraticState.consistencyScore + 10);
    } else {
        socraticState.consistencyScore = Math.max(0, socraticState.consistencyScore - 5);
    }
    return socraticState.consistencyScore;
}

// ============================================
// PROGRESS TRACKING & LOOP DETECTION
// ============================================

function trackQuestionDiversity(questionType) {
    socraticState.progressTracker.questionSequence.push(questionType);

    // Check for repetition
    const recentQuestions = socraticState.progressTracker.questionSequence.slice(-5);
    const uniqueTypes = new Set(recentQuestions).size;

    if (uniqueTypes === 1 && recentQuestions.length >= 3) {
        return { warning: "Question type repetition detected", action: "vary_questions" };
    }
    return { status: "normal" };
}

// ============================================
// SYNTHESIS & ENDING LOGIC
// ============================================

function generateSynthesisPrompt() {
    const provenAssertions = socraticState.assertions
        .slice(0, 5)
        .map(a => a.statement)
        .join("; ");

    return `Based on what we've discussed (${provenAssertions}), can you write a 2-3 sentence summary explaining ${socraticState.topic} in your own words?`;
}

function evaluateSynthesis(synthesisMemo) {
    socraticState.synthesisMemo = synthesisMemo;
    socraticState.sessionPhase = "synthesis";

    return {
        phase: "synthesis_evaluation",
        message: "Great! Now let me ask some questions to ensure we've covered everything..."
    };
}

function generateKnowledgeGapMap() {
    const totalSteps = socraticState.solutionPath.length;
    const masteredSteps = socraticState.currentPathStep;

    const gapMap = socraticState.solutionPath.map((step, idx) => ({
        step: step.name,
        status: idx < masteredSteps ? "mastered" : idx === masteredSteps ? "current" : "locked",
        confidence: idx < masteredSteps ? 100 : idx === masteredSteps ? socraticState.consistencyScore : 0
    }));

    socraticState.knowledgeGapMap = gapMap;
    return gapMap;
}

// ============================================
// ROUTES
// ============================================

app.get("/", (req, res) => {
    res.json({
        message: "SOCRATIX - Socratic Reasoning Server",
        version: "2.0.0",
        status: "running",
        features: ["Knowledge Roadmap", "Error Taxonomy", "ZPD Calibration", "Scaffolding", "Assertion Tracking", "Consistency Scoring"]
    });
});

// ============================================
// SESSION INITIALIZATION & CALIBRATION
// ============================================

app.post("/api/session/init", (req, res) => {
    const { topic } = req.body;

    if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
    }

    const state = initializeSession(topic);
    const calibrationQuestions = generateCalibrationQuestions(topic);

    res.json({
        message: "Session initialized - Starting calibration phase",
        state,
        calibrationQuestions,
        sessionPhase: "calibration"
    });
});

app.post("/api/session/calibrate", async (req, res) => {
    const { calibrationResponses } = req.body;

    if (!calibrationResponses || calibrationResponses.length === 0) {
        return res.status(400).json({ error: "Calibration responses required" });
    }

    try {
        const baselineLevel = assessBaselineKnowledge(calibrationResponses);
        socraticState.baselineKnowledgeLevel = baselineLevel;

        // Generate first question based on baseline
        const firstQuestionPrompt = `Topic: "${socraticState.topic}"
Learner Level: ${baselineLevel}
Previous Context: ${calibrationResponses.join("; ")}

Create an opening Socratic question appropriate for a ${baselineLevel} learner exploring "${socraticState.topic}". The question should:
- Match their knowledge level
- Be open-ended and thought-provoking
- Reference something from their calibration responses if relevant
- Invite them to share their current thinking
- Be encouraging and welcoming

Just the question, nothing else.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: SOCRATIC_SYSTEM_PROMPT
                },
                {
                    role: "user",
                    content: firstQuestionPrompt
                }
            ],
            max_tokens: 200,
            temperature: 0.8
        });

        const firstQuestion = response.choices[0].message.content;
        socraticState.currentQuestion = firstQuestion;
        socraticState.sessionPhase = "progressive";
        addToConversationHistory("assistant", firstQuestion);

        res.json({
            message: "Calibration complete",
            baselineLevel,
            firstQuestion,
            nextPhase: "progressive_questioning",
            sessionPhase: socraticState.sessionPhase
        });
    } catch (error) {
        console.error("Error during calibration:", error);
        res.status(500).json({ error: "Failed to calibrate session", details: error.message });
    }
});

app.get("/api/session/state", (req, res) => {
    res.json({
        ...socraticState,
        sessionSummary: {
            topic: socraticState.topic,
            phase: socraticState.sessionPhase,
            questionDepth: socraticState.questionDepth,
            consistencyScore: socraticState.consistencyScore,
            assertionCount: socraticState.assertions.length,
            misconceptionCount: socraticState.misconceptions.length,
            baselineLevel: socraticState.baselineKnowledgeLevel,
            currentPathStep: socraticState.currentPathStep,
            totalPathSteps: socraticState.solutionPath.length
        }
    });
});

// ============================================
// PROGRESSIVE QUESTIONING & SCAFFOLDING
// ============================================

app.post("/api/question/generate", async (req, res) => {
    const { topic } = req.body;

    if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
    }

    try {
        const prompt = `Create an initial Socratic question for exploring: "${topic}"
                    
Requirements:
1. Open-ended (not yes/no)
2. Intermediate difficulty
3. Curious and welcoming tone
4. Hints at deeper complexity
5. One clear question only

Just the question, nothing else.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: SOCRATIC_SYSTEM_PROMPT
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 150,
            temperature: 0.8
        });

        const question = response.choices[0].message.content;
        socraticState.currentQuestion = question;
        socraticState.questionDepth = 0;
        addToConversationHistory("assistant", question);

        res.json({ question, depth: 0 });
    } catch (error) {
        console.error("Error generating question:", error);
        res.status(500).json({ error: "Failed to generate question", details: error.message });
    }
});

app.post("/api/question/respond", async (req, res) => {
    const { answer, confidence = 50 } = req.body;

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

        // Track question diversity
        const questionTypes = ["feynman", "edgeCase", "assumption", "doubleDown", "counterExemplar", "reflectiveToss"];
        const selectedType = questionTypes[Math.min(socraticState.questionDepth - 1, questionTypes.length - 1)];
        const typeInfo = QUESTION_TYPES[selectedType];

        const loopCheck = trackQuestionDiversity(selectedType);

        // Check for contradictions
        const previousAnswers = socraticState.userAnswers.slice(0, -1);
        const hasContradiction = detectContradiction(answer, previousAnswers);

        // Record assertions if confidence is high
        if (confidence > 70) {
            recordAssertion(answer, `node-${socraticState.userAnswers.length}`, confidence);
        }

        // Detect misconceptions for low confidence + high uncertainty
        if (confidence > 85 && socraticState.questionDepth > 2) {
            // High confidence answers need edge case testing
            const misconception = detectMisconception(answer, socraticState.conversationHistory);
        }

        // Update consistency score
        updateConsistencyScore(hasContradiction === false);

        const conversationContext = socraticState.conversationHistory
            .slice(-6)
            .map(msg => `${msg.role === 'user' ? 'Learner' : 'AI'}: ${msg.content}`)
            .join("\n\n");

        // Determine scaffold level based on confidence
        let scaffoldGuidance = "";
        if (confidence < 40 && socraticState.currentScaffoldLevel < 2) {
            const scaffoldRequest = requestScaffold();
            scaffoldGuidance = `\n\nProvide ${scaffoldRequest.levelName} support - don't explain directly, just guide their thinking.`;
        }

        const nextQuestionPrompt = `Topic: "${socraticState.topic}"
Learner Level: ${socraticState.baselineKnowledgeLevel}
Current Path Step: ${socraticState.currentPathStep}/${socraticState.solutionPath.length}
Question Depth: ${socraticState.questionDepth}
Question Type: ${typeInfo.name}
Learner Confidence: ${confidence}%

Recent conversation:
${conversationContext}

Their latest response: "${answer}"

${loopCheck.warning ? `WARNING: Detected repetitive questioning - vary your approach.` : ""}
${hasContradiction ? `NOTE: This contradicts their earlier statement. Address this gently.` : ""}

Next question (${typeInfo.name}):
${typeInfo.description}${scaffoldGuidance}

Generate the next Socratic question that:
- Builds on their answer
- Is appropriate for their confidence level (${confidence}%)
- Continues the ${typeInfo.name} strategy
- Is concise (1-2 sentences)
- Uses curious, firm, and encouraging tone

Just the question.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: SOCRATIC_SYSTEM_PROMPT
                },
                {
                    role: "user",
                    content: nextQuestionPrompt
                }
            ],
            max_tokens: 180,
            temperature: 0.8
        });

        const nextQuestion = response.choices[0].message.content;
        socraticState.currentQuestion = nextQuestion;
        addToConversationHistory("assistant", nextQuestion);

        // Check if ready for synthesis
        const readyForSynthesis = socraticState.questionDepth >= 5 &&
            socraticState.consistencyScore > 60 &&
            socraticState.assertions.length > 2;

        res.json({
            question: nextQuestion,
            depth: socraticState.questionDepth,
            questionType: selectedType,
            confidence,
            consistencyScore: socraticState.consistencyScore,
            assertionCount: socraticState.assertions.length,
            contradictionDetected: hasContradiction,
            loopWarning: loopCheck.warning || null,
            readyForSynthesis,
            thoughtProcess: socraticState.thoughtProcess,
            state: socraticState
        });
    } catch (error) {
        console.error("Error processing response:", error);
        res.status(500).json({ error: "Failed to process response", details: error.message });
    }
});

// ============================================
// SCAFFOLDING & SUPPORT
// ============================================

app.post("/api/scaffold/request", async (req, res) => {
    const { currentQuestion } = req.body;

    if (!socraticState.topic) {
        return res.status(400).json({ error: "No active session" });
    }

    try {
        const scaffoldInfo = requestScaffold();

        const scaffoldPrompt = `Question: "${currentQuestion}"
Topic: "${socraticState.topic}"
Scaffold Level: ${scaffoldInfo.levelName}
Recent Context: ${socraticState.conversationHistory.slice(-2).map(m => m.content).join(" ")}

Provide a ${scaffoldInfo.levelName} level hint:
- Nudge: A gentle prompt or guiding question
- Hint: A more direct pointer
- Partial Explanation: A partial explanation to guide thinking

Be encouraging and maintain curiosity.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: SOCRATIC_SYSTEM_PROMPT
                },
                {
                    role: "user",
                    content: scaffoldPrompt
                }
            ],
            max_tokens: 150,
            temperature: 0.8
        });

        const scaffold = response.choices[0].message.content;
        addToConversationHistory("assistant", `[${scaffoldInfo.levelName}] ${scaffold}`);

        res.json({
            level: scaffoldInfo.levelName,
            levelIndex: socraticState.currentScaffoldLevel,
            scaffold,
            message: scaffoldInfo.message
        });
    } catch (error) {
        console.error("Error providing scaffold:", error);
        res.status(500).json({ error: "Failed to provide scaffold", details: error.message });
    }
});

// ============================================
// SYNTHESIS & CONCLUSION
// ============================================

app.post("/api/session/synthesize", async (req, res) => {
    try {
        const synthesisQuestion = generateSynthesisPrompt();
        socraticState.sessionPhase = "synthesis";

        res.json({
            phase: "synthesis",
            message: "Now let's bring everything together. Can you synthesize your understanding?",
            synthesisQuestion,
            provenAssertions: socraticState.assertions.slice(0, 5)
        });
    } catch (error) {
        console.error("Error generating synthesis prompt:", error);
        res.status(500).json({ error: "Failed to generate synthesis prompt", details: error.message });
    }
});

app.post("/api/session/evaluate-synthesis", async (req, res) => {
    const { synthesisMemo } = req.body;

    if (!synthesisMemo) {
        return res.status(400).json({ error: "Synthesis memo required" });
    }

    try {
        evaluateSynthesis(synthesisMemo);
        socraticState.sessionPhase = "conclusion";

        // Generate knowledge gap map
        const gapMap = generateKnowledgeGapMap();

        // AI plays confused student
        const evaluationPrompt = `The learner just synthesized their understanding of "${socraticState.topic}":

"${synthesisMemo}"

Your role now is to play a confused student asking them clarifying questions about one aspect they mentioned. Ask 1 pointed, thoughtful question to test their mastery - not to be condescending, but to ensure they really understand.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: SOCRATIC_SYSTEM_PROMPT
                },
                {
                    role: "user",
                    content: evaluationPrompt
                }
            ],
            max_tokens: 150,
            temperature: 0.8
        });

        const finalQuestion = response.choices[0].message.content;
        addToConversationHistory("assistant", finalQuestion);

        res.json({
            phase: "final_validation",
            message: "One more question to test your mastery...",
            finalQuestion,
            knowledgeGapMap: gapMap,
            sessionStats: {
                totalQuestions: socraticState.questionDepth,
                consistencyScore: socraticState.consistencyScore,
                assertionCount: socraticState.assertions.length,
                misconceptionsDetected: socraticState.misconceptions.length,
                pathProgressPercentage: (socraticState.currentPathStep / socraticState.solutionPath.length) * 100
            }
        });
    } catch (error) {
        console.error("Error evaluating synthesis:", error);
        res.status(500).json({ error: "Failed to evaluate synthesis", details: error.message });
    }
});

app.post("/api/session/generate-confused-questions", async (req, res) => {
    try {
        console.log("[FLIP-MODE] Generating confused questions. Session topic:", socraticState.topic);
        console.log("[FLIP-MODE] Conversation history length:", socraticState.conversationHistory?.length || 0);
        console.log("[FLIP-MODE] Assertions count:", socraticState.assertions?.length || 0);

        if (!socraticState.topic) {
            console.log("[FLIP-MODE] No active session, returning error");
            return res.status(400).json({ error: "No active session" });
        }

        const recentConversation = socraticState.conversationHistory
            .slice(-8)
            .map(msg => `${msg.role === 'user' ? 'Learner' : 'AI'}: ${msg.content}`)
            .join("\n\n");

        const assertionsSummary = socraticState.assertions
            .slice(0, 5)
            .map(a => `- ${a.statement}`)
            .join("\n");

        // If no conversation history, generate basic questions
        if (!recentConversation || recentConversation.trim().length === 0) {
            console.log("[FLIP-MODE] No conversation history, returning basic fallback questions");
            return res.json({
                questions: [
                    `What is the most important concept about ${socraticState.topic}?`,
                    `Why is understanding ${socraticState.topic} useful in real life?`,
                    `Can you explain ${socraticState.topic} step by step?`,
                    `What are common misconceptions about ${socraticState.topic}?`
                ],
                count: 4,
                sessionContext: {
                    topic: socraticState.topic,
                    assertionCount: socraticState.assertions.length,
                    knowledgeLevel: socraticState.baselineKnowledgeLevel
                }
            });
        }

        console.log("[FLIP-MODE] Calling OpenAI to generate specific questions");
        const prompt = `Based on this learning session, generate 4-5 REAL, SPECIFIC confused student questions (not generic ones).

Topic: "${socraticState.topic}"
Learner's Level: ${socraticState.baselineKnowledgeLevel}

What they've established:
${assertionsSummary || "- No assertions recorded yet"}

Recent conversation:
${recentConversation}

Generate 4-5 specific questions a confused student would ask to test if the learner truly understands ${socraticState.topic}. 
Questions should:
1. Be specific to what they discussed (not generic)
2. Challenge their understanding deeply
3. Ask "why" or "how" not just "what"
4. Test edge cases or applications
5. Build on their proven assertions

Format: Return ONLY a JSON array of question strings, like:
["Question 1?", "Question 2?", ...]

Each question must be a complete, real question.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are generating specific test questions. Return ONLY valid JSON array of strings. Must be valid JSON."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 400,
            temperature: 0.7
        });

        const responseText = response.choices[0].message.content || "";
        let confusedQuestions = [];

        // Clean up response text - remove markdown code blocks if present
        let cleanedResponse = responseText.trim();
        if (cleanedResponse.startsWith("```json")) {
            cleanedResponse = cleanedResponse.replace(/^```json\n?/, "").replace(/\n?```$/, "");
        } else if (cleanedResponse.startsWith("```")) {
            cleanedResponse = cleanedResponse.replace(/^```\n?/, "").replace(/\n?```$/, "");
        }

        try {
            confusedQuestions = JSON.parse(cleanedResponse);
            if (!Array.isArray(confusedQuestions)) {
                throw new Error("Response is not an array");
            }
            if (confusedQuestions.length === 0) {
                throw new Error("Empty array returned");
            }
            console.log("[FLIP-MODE] Successfully generated", confusedQuestions.length, "questions");
        } catch (parseError) {
            console.error("[FLIP-MODE] Failed to parse confused questions JSON:", responseText, parseError);
            // Return fallback questions instead of error
            confusedQuestions = [
                `What is the most important concept about ${socraticState.topic}?`,
                `Why is understanding ${socraticState.topic} useful?`,
                `Can you explain ${socraticState.topic} with a real example?`,
                `What are the key principles you need to know about ${socraticState.topic}?`
            ];
        }

        res.json({
            questions: confusedQuestions,
            count: confusedQuestions.length,
            sessionContext: {
                topic: socraticState.topic,
                assertionCount: socraticState.assertions.length,
                knowledgeLevel: socraticState.baselineKnowledgeLevel
            }
        });
    } catch (error) {
        console.error("[FLIP-MODE] Unexpected error:", error);
        // Return fallback questions instead of error
        res.json({
            questions: [
                `What is the most important concept about ${socraticState.topic}?`,
                `Why is understanding ${socraticState.topic} useful?`,
                `Can you explain ${socraticState.topic} with a real example?`,
                `What are the key principles about ${socraticState.topic}?`
            ],
            count: 4,
            sessionContext: {
                topic: socraticState.topic,
                assertionCount: socraticState.assertions?.length || 0,
                knowledgeLevel: socraticState.baselineKnowledgeLevel
            }
        });
    }
});

app.post("/api/session/conclude", async (req, res) => {
    try {
        const gapMap = generateKnowledgeGapMap();

        const finalSummary = {
            topic: socraticState.topic,
            totalInteractions: socraticState.questionDepth,
            consistency_score: socraticState.consistencyScore,
            assertions_proven: socraticState.assertions.length,
            misconceptions_detected: socraticState.misconceptions.length,
            path_progress: {
                current_step: socraticState.currentPathStep,
                total_steps: socraticState.solutionPath.length,
                percentage: (socraticState.currentPathStep / socraticState.solutionPath.length) * 100
            },
            knowledge_gap_map: gapMap,
            synthesis_memo: socraticState.synthesisMemo,
            phase: "concluded"
        };

        socraticState.sessionPhase = "concluded";

        res.json({
            message: "Session concluded successfully",
            summary: finalSummary,
            nextSteps: "Great learning session! You can start a new topic or continue exploring this one deeper."
        });
    } catch (error) {
        console.error("Error concluding session:", error);
        res.status(500).json({ error: "Failed to conclude session", details: error.message });
    }
});

// ============================================
// VISUALIZATION & DATA ENDPOINTS
// ============================================

app.get("/api/visualization/thought-process", (req, res) => {
    res.json({
        ...socraticState.thoughtProcess,
        metadata: {
            totalNodes: socraticState.thoughtProcess.nodes.length,
            totalConnections: socraticState.thoughtProcess.connections.length,
            depth: socraticState.questionDepth
        }
    });
});

app.get("/api/visualization/knowledge-graph", (req, res) => {
    const graph = {
        nodes: socraticState.solutionPath.map((step, idx) => ({
            id: `step-${idx}`,
            label: step.name,
            description: step.description,
            status: idx < socraticState.currentPathStep ? "mastered" :
                idx === socraticState.currentPathStep ? "current" : "locked",
            order: idx
        })),
        provenConcepts: socraticState.assertions.map(a => ({
            id: a.id,
            label: a.statement.substring(0, 50),
            confidence: a.confidence
        }))
    };
    res.json(graph);
});

app.get("/api/visualization/consistency-score", (req, res) => {
    res.json({
        score: socraticState.consistencyScore,
        contradictions: socraticState.contradictions.length,
        resolved_contradictions: socraticState.contradictions.filter(c => c.resolved).length,
        assertions: socraticState.assertions.length,
        metadata: {
            maxScore: 100,
            currentPhase: socraticState.sessionPhase
        }
    });
});

app.get("/api/assertions/log", (req, res) => {
    res.json({
        assertions: socraticState.assertions,
        total: socraticState.assertions.length,
        highConfidence: socraticState.assertions.filter(a => a.confidence > 85).length,
        foundational: socraticState.assertions.filter(a => a.foundational).length
    });
});

app.get("/api/misconceptions/detected", (req, res) => {
    res.json({
        misconceptions: socraticState.misconceptions.map(m => ({
            id: m.id,
            type: m.type,
            severity: m.severity,
            detected_at_depth: m.detected_at,
            resolved: m.resolved
        })),
        totalDetected: socraticState.misconceptions.length,
        byType: {
            calculation: socraticState.misconceptions.filter(m => m.type === ERROR_TYPES.CALCULATION).length,
            logic: socraticState.misconceptions.filter(m => m.type === ERROR_TYPES.LOGIC).length,
            fundamental: socraticState.misconceptions.filter(m => m.type === ERROR_TYPES.FUNDAMENTAL).length
        }
    });
});

app.get("/api/conversation/history", (req, res) => {
    res.json({
        history: socraticState.conversationHistory,
        total: socraticState.conversationHistory.length,
        phase: socraticState.sessionPhase
    });
});

app.get("/api/knowledge-gap-map", (req, res) => {
    const gapMap = generateKnowledgeGapMap();
    res.json({
        map: gapMap,
        summary: {
            areas_mastered: gapMap.filter(s => s.status === "mastered").length,
            areas_in_progress: gapMap.filter(s => s.status === "current").length,
            areas_locked: gapMap.filter(s => s.status === "locked").length
        }
    });
});

// ============================================
// TOPIC VALIDATION
// ============================================

app.post("/api/question/validate-topic", async (req, res) => {
    const { answer, topic } = req.body;

    if (!answer || !topic) {
        return res.status(400).json({ error: "Answer and topic are required" });
    }

    try {
        const validationPrompt = `You are a STRICT topic validation expert. Your job is to determine if the user's answer is ACTUALLY relevant to the given topic.

Topic: "${topic}"
User's Answer: "${answer}"

Be VERY strict. Do not give credit for:
- Random words or gibberish
- Completely off-topic statements
- Answers that don't address the topic at all
- Nonsensical text

Only mark as on-topic if the answer is CLEARLY related to "${topic}".

Respond with ONLY valid JSON (no other text):
{
  "isOnTopic": boolean,
  "confidence": number between 0-1,
  "reason": "brief explanation why this is or isn't on-topic",
  "suggestion": "if off-topic, suggest how to refocus on ${topic}"
}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a STRICT topic validation expert. Be very selective. Respond ONLY with valid JSON." },
                { role: "user", content: validationPrompt }
            ],
            temperature: 0.1,  // Lower temperature for stricter validation
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.choices[0].message.content);
        console.log(`[Topic Validation] Topic: "${topic}", OnTopic: ${result.isOnTopic}, Confidence: ${result.confidence}`);
        res.json(result);
    } catch (error) {
        console.error("Topic validation error:", error);
        res.status(500).json({ error: "Failed to validate topic", details: error.message });
    }
});

app.post("/api/topic/validate", async (req, res) => {
    const { userInput, topic } = req.body;

    if (!userInput || !topic) {
        return res.status(400).json({ error: "User input and topic are required" });
    }

    try {
        const validationPrompt = `You are a strict topic moderator. Determine if the user's input is relevant to the topic.

Topic: "${topic}"
User Input: "${userInput}"

Be strict but fair. Even if tangentially related, it might still be on-topic if it helps explore the main concept.

Respond with ONLY valid JSON (no other text):
{
  "isOnTopic": boolean,
  "reason": "brief explanation of why it is or isn't on-topic"
}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a topic validation expert. Respond ONLY with valid JSON, no markdown, no code blocks." },
                { role: "user", content: validationPrompt }
            ],
            temperature: 0.2,
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.choices[0].message.content);
        res.json(result);
    } catch (error) {
        console.error("Topic validation error:", error);
        res.status(500).json({ error: "Failed to validate topic", details: error.message });
    }
});

// ============================================
// ANSWER QUALITY ANALYSIS
// ============================================

app.post("/api/answer/analyze-quality", async (req, res) => {
    const { answer, topic, confidence } = req.body;

    if (!answer) {
        return res.status(400).json({ error: "Answer is required" });
    }

    try {
        const qualityPrompt = `You are an expert evaluator of student reasoning and understanding. Analyze this answer for depth, clarity, and quality of thinking.

Topic: ${topic || "General knowledge"}
User Confidence Level: ${confidence || 50}%
Answer: "${answer}"

Evaluate and respond with ONLY valid JSON (no other text):
{
  "quality": true,
  "qualityTier": "excellent" | "solid" | "good" | "basic",
  "confidence": number between 0-100,
  "wordCount": number,
  "answerLength": number,
  "hasLogicalReasoning": boolean,
  "isWellStructured": boolean,
  "reasoning": "brief explanation of your assessment"
}

IMPORTANT:
- hasLogicalReasoning: true only if there are clear logical connections, causality, or reasoning patterns (not just keyword matching)
- isWellStructured: true if ideas are organized, multi-part, or show clear progression
- qualityTier should reflect actual understanding, not just confidence
- Excellent: Shows deep reasoning, multiple perspectives, or clear insights
- Solid: Good reasoning with clear explanations
- Good: Basic understanding with some explanation
- Basic: Minimal reasoning or simple statements`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are an expert evaluator of student reasoning. Respond ONLY with valid JSON, no markdown, no code blocks." },
                { role: "user", content: qualityPrompt }
            ],
            temperature: 0.3,  // Slightly flexible to allow nuanced assessment
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.choices[0].message.content);
        console.log(`[Quality Analysis] Tier: ${result.qualityTier}, LogicalReasoning: ${result.hasLogicalReasoning}, Structured: ${result.isWellStructured}`);
        res.json(result);
    } catch (error) {
        console.error("Quality analysis error:", error);
        res.status(500).json({ error: "Failed to analyze answer quality", details: error.message });
    }
});

// ============================================
// ADAPTIVE CALIBRATION
// ============================================

app.post("/api/calibration/generate-questions", async (req, res) => {
    const { topic, initialResponses = [] } = req.body;

    if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
    }

    try {
        const responseContext = initialResponses.length > 0
            ? `Based on their responses so far:\n${initialResponses.map((r, i) => `Q${i + 1}: "${r}"`).join('\n')}\n\n`
            : "";

        const prompt = `You are a Socratic tutor creating personalized calibration questions to assess a learner's knowledge level on: "${topic}"

${responseContext}Generate exactly 2 follow-up questions that are:
1. Specific to their previous answers (if any)
2. Progressively more challenging
3. Designed to uncover gaps and misconceptions
4. Clear and concise

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "questions": [
    {
      "question": "string - the question to ask",
      "options": [
        { "label": "string - option A", "value": 1 },
        { "label": "string - option B", "value": 2 },
        { "label": "string - option C", "value": 3 },
        { "label": "string - option D", "value": 4 }
      ]
    },
    {
      "question": "string - second question",
      "options": [
        { "label": "string - option A", "value": 1 },
        { "label": "string - option B", "value": 2 },
        { "label": "string - option C", "value": 3 },
        { "label": "string - option D", "value": 4 }
      ]
    }
  ]
}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a Socratic tutor. Respond ONLY with valid JSON." },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.choices[0].message.content);
        res.json(result);
    } catch (error) {
        console.error("Calibration generation error:", error);
        res.status(500).json({ error: "Failed to generate calibration questions", details: error.message });
    }
});

app.post("/api/calibration/analyze", async (req, res) => {
    const { topic, responses = [] } = req.body;

    if (!topic || responses.length === 0) {
        return res.status(400).json({ error: "Topic and responses are required" });
    }

    try {
        const prompt = `You are analyzing a learner's knowledge level on "${topic}".

Their responses:
${responses.map((r, i) => `Q${i + 1} (score: ${r.score}): "${r.answer}"`).join('\n')}

Determine their knowledge level and provide analysis. Respond with ONLY valid JSON (no markdown):
{
  "level": "beginner" | "intermediate" | "advanced",
  "reasoning": "brief explanation of why this level",
  "strengths": ["area1", "area2"],
  "gaps": ["gap1", "gap2"],
  "recommendedApproach": "brief guidance on how to scaffold learning"
}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are an expert tutor. Respond ONLY with valid JSON." },
                { role: "user", content: prompt }
            ],
            temperature: 0.3,
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.choices[0].message.content);
        res.json(result);
    } catch (error) {
        console.error("Calibration analysis error:", error);
        res.status(500).json({ error: "Failed to analyze calibration", details: error.message });
    }
});

// ============================================
// SESSION MANAGEMENT
// ============================================

app.post("/api/session/reset", (req, res) => {
    initializeSession(null);
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
