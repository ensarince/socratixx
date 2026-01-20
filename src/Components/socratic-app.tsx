import { useState } from "react"
import { Sidebar } from "./siderbar"
import { ViewSwitcher } from "./view-switcher"
import { MindMapView } from "./views/mind-map-view"
import { InfiniteCanvasView } from "./views/infinite-canvas-view"
import { FlipModeView } from "./views/flip-mode-view"
import { CalibrationModal } from "./calibration"
import { FocusCardView } from "./views/focus-card-view"
import { FeedbackSystem } from "./feedback-system"
import { TopicGuard } from "./topic-guard"
import { FeedbackHelpers } from "./feedback-helpers"
import { SocraticAPI, SocraticAPIError } from "../services/socratic-api"

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [topic, setTopic] = useState<string>("")
  const [isInitialized, setIsInitialized] = useState(false)
  const [showTopicInput, setShowTopicInput] = useState(true)

  const currentNode = nodes.find((n) => n.id === currentNodeId)

  // Initialize session from topic input
  const handleInitializeSession = async (selectedTopic: string) => {
    setLoading(true)
    setError(null)
    
    try {
      // Initialize backend session
      await SocraticAPI.initializeSession(selectedTopic)
      setTopic(selectedTopic)
      
      // Create root node
      const rootNode: ThoughtNode = {
        id: "root",
        question: `Let's explore: ${selectedTopic}`,
        answer: selectedTopic,
        children: [],
        type: "root",
        status: "completed",
        confidence: 100,
      }
      
      setNodes([rootNode])
      setCurrentNodeId("root")
      
      // Generate first question
      const questionData = await SocraticAPI.generateInitialQuestion(selectedTopic)
      
      const firstQuestionNode: ThoughtNode = {
        id: "q1",
        question: questionData.question,
        children: [],
        parent: "root",
        type: "feynman",
        status: "unlocked",
      }
      
      setNodes([rootNode, firstQuestionNode])
      setCurrentNodeId("q1")
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

  const handleAnswer = async (answer: string, confidence: number, quality?: { confidence: number; wordCount: number; hasLogicalReasoning: boolean; isWellStructured: boolean; answerLength: number }) => {
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

      // Add assertion
      if (confidence > 60) {
        const newAssertion: Assertion = {
          id: `a${Date.now()}`,
          text: answer.slice(0, 100) + (answer.length > 100 ? "..." : ""),
          nodeId: currentNodeId,
          timestamp: new Date(),
        }
        setAssertions((prev) => [...prev, newAssertion])
      }

      // Create next question node from backend response with proper type mapping
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

      // Add new node and update parent's children
      setNodes((prev) => [
        ...prev.map((n) =>
          n.id === currentNodeId ? { ...n, children: [...n.children, nextNodeId] } : n
        ),
        nextNode,
      ])

      setCurrentNodeId(nextNodeId)

      // === UNIFIED FEEDBACK SYSTEM ===
      // All feedback is coordinated here to prevent overlapping
      
      // First: Emit answer validation feedback based on AI-determined quality
      if (quality) {
        const qualityTier = quality.qualityTier || "good"
        if (qualityTier === "excellent") {
          FeedbackHelpers.answerValidated("excellent")
          console.log("✅ Excellent answer validated")
        } else if (qualityTier === "solid") {
          FeedbackHelpers.answerValidated("solid")
          console.log("✅ Solid answer validated")
        } else {
          FeedbackHelpers.answerValidated("good")
          console.log("✅ Good answer validated")
        }
      } else {
        FeedbackHelpers.answerValidated("good")
        console.log("✅ Answer recorded")
      }

      // Second: Check for aha moments (triggered ~500ms after answer validation)
      if (quality) {
        setTimeout(() => {
          const { hasLogicalReasoning, isWellStructured, qualityTier } = quality
          
          // Aha moments only for answers with actual logical reasoning
          if ((qualityTier === "excellent" || qualityTier === "solid") && hasLogicalReasoning) {
            console.log("💡 Aha moment triggered - strong reasoning detected!")
            FeedbackHelpers.ahaMoment(answer.substring(0, 60))
          }
        }, 500)
      }

      // Third: Update consistency and emit milestone feedback (~1.5s after answer)
      setTimeout(() => {
        const oldScore = consistencyScore
        const newScore = Math.min(100, consistencyScore + 8)
        setConsistencyScore(newScore)
        
        console.log("📈 Consistency Score:", { oldScore, newScore, milestone: newScore % 10 === 0 })

        if (newScore > oldScore) {
          if (newScore >= 100) {
            console.log("🎯 BREAKTHROUGH: 100% consistency achieved!")
            FeedbackHelpers.breakthrough("complete understanding of this topic")
          } else if (newScore % 10 === 0 && oldScore % 10 !== 0) {
            // Only fire when crossing 10%, 20%, 30%, etc
            console.log(`📊 Consistency milestone: ${oldScore}% → ${newScore}%`)
            FeedbackHelpers.consistencyGain(oldScore, newScore)
          }
        }
      }, 1500)

      // Emit breakthrough celebration for synthesis-ready state
      if (response.readyForSynthesis) {
        setTimeout(() => {
          console.log("🚀 Synthesis ready!")
          FeedbackHelpers.breakthrough("this concept - you're ready for synthesis")
        }, 2000)
      }

      // Adjust ZPD based on confidence
      if (confidence < 40) setZpdLevel("hard")
      else if (confidence > 85) setZpdLevel("easy")
      else setZpdLevel("optimal")
      
    } catch (err: unknown) {
      const errorMsg = err instanceof SocraticAPIError ? (err as SocraticAPIError).message : "Failed to process answer"
      setError(errorMsg)
      console.error("Answer processing error:", err)
    } finally {
      setLoading(false)
    }
  }

  const requestScaffold = () => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === currentNodeId
          ? { ...n, scaffoldLevel: Math.min(3, (n.scaffoldLevel || 0) + 1) }
          : n
      ),
    )
  }

  const handleCalibrationComplete = (level: "beginner" | "intermediate" | "advanced") => {
    setCalibrationLevel(level)
    setShowCalibration(false)
  }

  const handleReset = async () => {
    try {
      await SocraticAPI.resetSession()
      setNodes([])
      setCurrentNodeId("")
      setConsistencyScore(0)
      setAssertions([])
      setIsInitialized(false)
      setShowTopicInput(true)
      setTopic("")
    } catch (err) {
      console.error("Reset error:", err)
    }
  }

  const completedCount = nodes.filter((n) => n.status === "completed").length
  const canFlip = completedCount >= Math.max(3, nodes.length - 2)

  if (!isInitialized || showTopicInput) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-8 p-6">
          <div className="space-y-2 text-center">
            <h1 className="text-4xl font-bold text-foreground">SOCRATIX</h1>
            <p className="text-lg text-muted-foreground">Think deeper. Question everything.</p>
          </div>

          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              What topic would you like to explore today? Enter any concept, theory, or subject you want to understand deeply.
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
            <p>This app uses Socratic questioning to enhance your critical thinking.</p>
            <p>Answer thoughtfully. There are no wrong answers, only deeper understanding.</p>
          </div>
        </div>
      </div>
    )
  }

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
              Exploring: <span className="font-medium">{topic}</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ViewSwitcher currentView={viewMode} onViewChange={setViewMode} canFlip={canFlip} />
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
                <p className="text-muted-foreground">Thinking...</p>
              </div>
            </div>
          )}

          {viewMode === "focus" && currentNode && (
            <FocusCardView
              node={currentNode}
              onAnswer={handleAnswer}
              onRequestScaffold={requestScaffold}
              calibrationLevel={calibrationLevel}
              topic={topic}
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
        <CalibrationModal 
          onComplete={handleCalibrationComplete} 
          onClose={() => setShowCalibration(false)}
          topic={topic}
        />
      )}

      <FeedbackSystem />
      {isInitialized && topic && <TopicGuard config={{ topic, maxOffTopicAttempts: 3 }} />}
    </div>
  )
}
