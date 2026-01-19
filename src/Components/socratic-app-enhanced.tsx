"use client"

import { useState } from "react"
import { Sidebar } from "./siderbar"
import { ViewSwitcher } from "./view-switcher"
import { MindMapView } from "./views/mind-map-view"
import { InfiniteCanvasView } from "./views/infinite-canvas-view"
import { FlipModeView } from "./views/flip-mode-view"
import { CalibrationModal } from "./calibration"
import { FocusCardView } from "./views/focus-card-view"
import { SocraticAPI, SocraticAPIError, CalibrationData, SynthesisData } from "../services/socratic-api"

export type ViewMode = "focus" | "mindmap" | "canvas" | "flip"

export interface ThoughtNode {
  id: string
  question: string
  answer?: string
  children: string[]
  parent?: string
  type: "feynman" | "edge-case" | "assumption" | "double-down" | "root" | "counter-exemplar" | "reflective-toss"
  status: "locked" | "unlocked" | "completed" | "ghost"
  confidence?: number
  misconceptionType?: "calculation" | "logic" | "fundamental" | null
  scaffoldLevel?: number
}

export interface Assertion {
  id: string
  text: string
  nodeId: string
  timestamp: Date
  confidence: number
}

interface SocraticSession {
  topic: string | null
  userAnswers: string[]
  thoughtProcess: {
    nodes: Array<{ id: string; text: string; depth: number; timestamp: number }>
    connections: Array<{ from: string; to: string }>
  }
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>
  questionDepth: number
  currentQuestion: string | null
  sessionPhase: 'calibration' | 'progressive' | 'synthesis' | 'conclusion'
  consistencyScore: number
}

export function SocraticApp() {
  const [viewMode, setViewMode] = useState<ViewMode>("focus")
  const [nodes, setNodes] = useState<ThoughtNode[]>([])
  const [currentNodeId, setCurrentNodeId] = useState<string>("")
  const [consistencyScore, setConsistencyScore] = useState(0)
  const [assertions, setAssertions] = useState<Assertion[]>([])
  const [showCalibration, setShowCalibration] = useState(false)
  const [zpdLevel, setZpdLevel] = useState<"easy" | "optimal" | "hard">("optimal")
  const [calibrationLevel, setCalibrationLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate")
  
  // Backend integration
  const [session, setSession] = useState<SocraticSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [topic, setTopic] = useState<string>("")
  const [isInitialized, setIsInitialized] = useState(false)
  const [showTopicInput, setShowTopicInput] = useState(true)
  
  // Socratic principles state
  const [sessionPhase, setSessionPhase] = useState<'calibration' | 'progressive' | 'synthesis' | 'conclusion'>('calibration')
  const [calibrationQuestions, setCalibrationQuestions] = useState<string[]>([])
  const [calibrationResponses, setCalibrationResponses] = useState<string[]>([])
  const [showSynthesis, setShowSynthesis] = useState(false)
  const [knowledgeGapMap, setKnowledgeGapMap] = useState<Array<{ step: string; status: string; confidence: number }>>([])
  const [misconceptions, setMisconceptions] = useState<any[]>([])

  const currentNode = nodes.find((n) => n.id === currentNodeId)

  // ============================================
  // CALIBRATION PHASE
  // ============================================

  const handleInitializeSession = async (selectedTopic: string) => {
    setLoading(true)
    setError(null)
    
    try {
      // Initialize backend session and get calibration questions
      const initData = await SocraticAPI.initializeSession(selectedTopic)
      setSession({
        ...initData.state,
        sessionPhase: 'calibration'
      })
      setTopic(selectedTopic)
      setSessionPhase('calibration')
      setCalibrationQuestions(initData.calibrationQuestions)
      setCalibrationResponses(new Array(initData.calibrationQuestions.length).fill(""))
      
      // Create root node
      const rootNode: ThoughtNode = {
        id: "root",
        question: `Exploring: ${selectedTopic}`,
        answer: selectedTopic,
        children: [],
        type: "root",
        status: "completed",
        confidence: 100,
      }
      
      setNodes([rootNode])
      setCurrentNodeId("root")
      setIsInitialized(true)
      setShowTopicInput(false)
      
    } catch (err: unknown) {
      const errorMsg = err instanceof SocraticAPIError ? (err as SocraticAPIError).message : "Failed to initialize session"
      setError(errorMsg)
      console.error("Initialization error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleCalibrationSubmit = async () => {
    if (calibrationResponses.some(r => !r.trim())) {
      setError("Please answer all calibration questions")
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const calibrationData: CalibrationData = await SocraticAPI.calibrateSession(calibrationResponses)
      setCalibrationLevel(calibrationData.baselineLevel as any)
      setSessionPhase('progressive')
      
      // Create first question node after calibration
      const firstQuestionNode: ThoughtNode = {
        id: "q1",
        question: calibrationData.firstQuestion,
        children: [],
        parent: "root",
        type: "feynman",
        status: "unlocked",
      }
      
      setNodes((prev) => [...prev, firstQuestionNode])
      setCurrentNodeId("q1")
      
    } catch (err: unknown) {
      const errorMsg = err instanceof SocraticAPIError ? (err as SocraticAPIError).message : "Calibration failed"
      setError(errorMsg)
      console.error("Calibration error:", err)
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // PROGRESSIVE QUESTIONING PHASE
  // ============================================

  const handleAnswer = async (answer: string, confidence: number) => {
    setLoading(true)
    setError(null)
    
    try {
      // Process answer through backend
      const response = await SocraticAPI.respondToQuestion(answer, confidence)
      
      // Update current node with answer
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id === currentNodeId) {
            return {
              ...n,
              answer,
              confidence,
              status: "completed" as const,
            }
          }
          return n
        }),
      )

      // Add assertion if confidence is high
      if (confidence > 60) {
        const newAssertion: Assertion = {
          id: `a${Date.now()}`,
          text: answer.slice(0, 100) + (answer.length > 100 ? "..." : ""),
          nodeId: currentNodeId,
          timestamp: new Date(),
          confidence
        }
        setAssertions((prev) => [...prev, newAssertion])
      }

      // Update consistency score
      setConsistencyScore(response.consistencyScore || 0)

      // Check if ready for synthesis
      if (response.readyForSynthesis) {
        setShowSynthesis(true)
      } else {
        // Create next question node
        const nextNodeId = `q${Date.now()}`
        const questionTypeMap: Record<string, ThoughtNode['type']> = {
          feynman: "feynman",
          edgeCase: "edge-case",
          assumption: "assumption",
          doubleDown: "double-down",
          counterExemplar: "counter-exemplar",
          reflectiveToss: "reflective-toss",
        }
        const nextNode: ThoughtNode = {
          id: nextNodeId,
          question: response.question,
          children: [],
          parent: currentNodeId,
          type: questionTypeMap[response.questionType] || "assumption",
          status: "unlocked",
        }

        setNodes((prev) => [
          ...prev.map((n) =>
            n.id === currentNodeId ? { ...n, children: [...n.children, nextNodeId] } : n
          ),
          nextNode,
        ])

        setCurrentNodeId(nextNodeId)
      }

      // Adjust ZPD based on confidence
      if (confidence < 40) setZpdLevel("hard")
      else if (confidence > 85) setZpdLevel("easy")
      else setZpdLevel("optimal")

      // Show loop warning if detected
      if (response.loopWarning) {
        setError(`Notice: ${response.loopWarning}`)
      }

      // Show contradiction warning if detected
      if (response.contradictionDetected) {
        setError("Notice: Your current answer seems to contradict an earlier statement. Let's explore this.")
      }
      
    } catch (err: unknown) {
      const errorMsg = err instanceof SocraticAPIError ? (err as SocraticAPIError).message : "Failed to process answer"
      setError(errorMsg)
      console.error("Answer processing error:", err)
    } finally {
      setLoading(false)
    }
  }

  const requestScaffold = async () => {
    if (!currentNode) return
    
    setLoading(true)
    setError(null)
    
    try {
      const scaffoldData = await SocraticAPI.requestScaffold(currentNode.question)
      
      // Display scaffold in a temporary notification
      setError(`💡 ${scaffoldData.scaffold}`)
      
      // Increment scaffold level on current node
      setNodes((prev) =>
        prev.map((n) =>
          n.id === currentNodeId
            ? { ...n, scaffoldLevel: Math.min(3, (n.scaffoldLevel || 0) + 1) }
            : n
        ),
      )
      
      // Auto-clear notification after 8 seconds
      setTimeout(() => setError(null), 8000)
      
    } catch (err: unknown) {
      const errorMsg = err instanceof SocraticAPIError ? (err as SocraticAPIError).message : "Failed to provide scaffold"
      setError(errorMsg)
      console.error("Scaffold request error:", err)
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // SYNTHESIS PHASE
  // ============================================

  const handleSynthesisSubmit = async (synthesisMemo: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const synthesisData: SynthesisData = await SocraticAPI.evaluateSynthesis(synthesisMemo)
      setKnowledgeGapMap(synthesisData.knowledgeGapMap)
      setSessionPhase('conclusion')
      setShowSynthesis(false)
      
      // Show final validation question
      setError(`Final Question: ${synthesisData.finalQuestion}`)
      
    } catch (err: unknown) {
      const errorMsg = err instanceof SocraticAPIError ? (err as SocraticAPIError).message : "Failed to evaluate synthesis"
      setError(errorMsg)
      console.error("Synthesis error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleConcludeSession = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const conclusion = await SocraticAPI.concludeSession()
      
      // Display knowledge gap map
      setKnowledgeGapMap(conclusion.summary.knowledge_gap_map)
      
      // Show final message
      setError(`🎓 Session Complete! ${conclusion.nextSteps}`)
      
    } catch (err: unknown) {
      const errorMsg = err instanceof SocraticAPIError ? (err as SocraticAPIError).message : "Failed to conclude session"
      setError(errorMsg)
      console.error("Conclusion error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    try {
      await SocraticAPI.resetSession()
      setNodes([])
      setCurrentNodeId("")
      setConsistencyScore(0)
      setAssertions([])
      setSession(null)
      setIsInitialized(false)
      setShowTopicInput(true)
      setTopic("")
      setSessionPhase('calibration')
      setCalibrationResponses([])
    } catch (err) {
      console.error("Reset error:", err)
    }
  }

  const completedCount = nodes.filter((n) => n.status === "completed").length
  const canFlip = completedCount >= Math.max(3, nodes.length - 2)

  // ============================================
  // CALIBRATION PHASE UI
  // ============================================

  if (!isInitialized || showTopicInput) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-8 p-6">
          <div className="space-y-2 text-center">
            <h1 className="text-4xl font-bold text-foreground">SOCRATIX 2.0</h1>
            <p className="text-lg text-muted-foreground">Socratic Reasoning with Knowledge Roadmaps</p>
          </div>

          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              What topic would you like to explore today? Enter any concept, theory, or subject you want to understand deeply through guided Socratic questioning.
            </p>

            <input
              type="text"
              placeholder="e.g., Quantum Entanglement, Machine Learning, Philosophy of Mind..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleInitializeSession(topic)}
              disabled={loading}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <button
              onClick={() => handleInitializeSession(topic)}
              disabled={!topic.trim() || loading}
              className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Initializing..." : "Start Exploring"}
            </button>

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <div className="space-y-2 text-center text-xs text-muted-foreground">
            <p>📚 Knowledge Roadmap guides your learning journey</p>
            <p>🎯 Scaffolding adapts to your comprehension level</p>
            <p>✓ Assertions track your proven understanding</p>
          </div>
        </div>
      </div>
    )
  }

  // ============================================
  // CALIBRATION QUESTIONS UI
  // ============================================

  if (sessionPhase === 'calibration' && calibrationQuestions.length > 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-full max-w-2xl space-y-8 p-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold text-foreground">Let's Start with You</h1>
            <p className="text-muted-foreground">Answering these questions helps us personalize your learning</p>
          </div>

          <div className="space-y-6">
            {calibrationQuestions.map((question, idx) => (
              <div key={idx} className="space-y-3 rounded-lg border border-border p-4">
                <label className="block text-sm font-medium text-foreground">
                  Question {idx + 1} of {calibrationQuestions.length}
                </label>
                <p className="text-base text-foreground">{question}</p>
                <textarea
                  value={calibrationResponses[idx]}
                  onChange={(e) => {
                    const newResponses = [...calibrationResponses]
                    newResponses[idx] = e.target.value
                    setCalibrationResponses(newResponses)
                  }}
                  placeholder="Share your thoughts..."
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-24"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleCalibrationSubmit}
            disabled={loading || calibrationResponses.some(r => !r.trim())}
            className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Begin Learning Journey"}
          </button>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ============================================
  // SYNTHESIS PHASE UI
  // ============================================

  if (showSynthesis) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-full max-w-2xl space-y-6 p-6">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold text-foreground">Bring It Together</h2>
            <p className="text-muted-foreground">Summarize what you've learned without looking back</p>
          </div>

          <div className="rounded-lg border border-border bg-muted p-4">
            <p className="text-sm text-muted-foreground">
              You've proven {assertions.length} key assertions and maintained a {consistencyScore}% consistency score.
            </p>
          </div>

          <textarea
            placeholder="Write your synthesis of the topic in 2-3 sentences..."
            onBlur={(e) => handleSynthesisSubmit(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-32"
          />

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ============================================
  // MAIN PROGRESSIVE LEARNING UI
  // ============================================

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        consistencyScore={consistencyScore}
        questionCount={completedCount}
        totalQuestions={nodes.filter((n) => n.status !== "ghost").length}
        assertions={assertions}
        zpdLevel={zpdLevel}
        onStartCalibration={() => setShowCalibration(true)}
      />

      <main className="flex-1 flex flex-col">
        <header className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">SOCRATIX</h1>
            <p className="text-sm text-muted-foreground">
              {calibrationLevel} | Consistency: {consistencyScore}% | Phase: {sessionPhase}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ViewSwitcher currentView={viewMode} onViewChange={setViewMode} canFlip={canFlip} />
            {sessionPhase === 'progressive' && (
              <button
                onClick={() => setShowSynthesis(true)}
                className="text-sm px-3 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Synthesize
              </button>
            )}
            <button
              onClick={handleReset}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Reset
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative">
          {error && (
            <div className="absolute top-4 right-4 z-50 rounded-lg bg-destructive/10 p-4 text-sm text-destructive max-w-xs">
              {error}
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-40">
              <div className="text-center space-y-4">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <p className="text-muted-foreground">Thinking deeply...</p>
              </div>
            </div>
          )}

          {viewMode === "focus" && currentNode && (
            <FocusCardView
              node={currentNode}
              onAnswer={handleAnswer}
              onRequestScaffold={requestScaffold}
              calibrationLevel={calibrationLevel}
            />
          )}
          {viewMode === "mindmap" && (
            <MindMapView nodes={nodes} currentNodeId={currentNodeId} onNodeSelect={setCurrentNodeId} />
          )}
          {viewMode === "canvas" && (
            <InfiniteCanvasView nodes={nodes} currentNodeId={currentNodeId} onNodeSelect={setCurrentNodeId} />
          )}
          {viewMode === "flip" && (
            <FlipModeView topic={topic} assertions={assertions} />
          )}
        </div>
      </main>

      {showCalibration && (
        <CalibrationModal onComplete={() => setShowCalibration(false)} onClose={() => setShowCalibration(false)} />
      )}

      {knowledgeGapMap.length > 0 && (
        <div className="fixed bottom-4 right-4 max-w-sm bg-card border border-border rounded-lg p-4 shadow-lg">
          <h3 className="font-semibold mb-3">Knowledge Gap Map</h3>
          <div className="space-y-2">
            {knowledgeGapMap.map((area, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span>{area.step}</span>
                <div className="flex-1 mx-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all"
                    style={{ width: `${area.confidence}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{area.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
