import type React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Send, Sparkles, HelpCircle, AlertTriangle, BookOpen, Puzzle, Trophy, Star, X } from "lucide-react"
import type { ThoughtNode } from "../socratic-app"
import { FeedbackHelpers } from "../feedback-helpers"

interface FocusCardViewProps {
  node: ThoughtNode
  onAnswer: (answer: string, confidence: number, quality?: { confidence: number; wordCount: number; hasLogicalReasoning: boolean; isWellStructured: boolean; answerLength: number }) => void
  onRequestScaffold: () => void
  calibrationLevel: "beginner" | "intermediate" | "advanced"
  topic?: string
  consistencyScore?: number
}

const typeLabels = {
  feynman: {
    label: "Multimodal Scaffolding",
    color: "text-blue-400 bg-blue-500/20",
    desc: "Co-construct a simple explanation together",
    fullDesc: "Progressive disclosure: Let's build up understanding step-by-step",
  },
  "edge-case": {
    label: "Misconception Taxonomy",
    color: "text-orange-400 bg-orange-500/20",
    desc: "Categorizing your reasoning gaps",
    fullDesc: "Is this a reasoning error or a knowledge gap?",
  },
  assumption: {
    label: "Hidden Curriculum Map",
    color: "text-purple-400 bg-purple-500/20",
    desc: "Unlocking prerequisite knowledge",
    fullDesc: "Strategic unlocking: This assumption gates future concepts",
  },
  "double-down": {
    label: "Consistency Scoring",
    color: "text-emerald-400 bg-emerald-500/20",
    desc: "You summarize, you connect",
    fullDesc: "How would you link your insights for someone else?",
  },
  "counter-exemplar": {
    label: "Counter-Exemplar",
    color: "text-rose-400 bg-rose-500/20",
    desc: "Reasoning-based probe",
    fullDesc: "Your logic led here—let's examine the contradiction",
  },
  "reflective-toss": {
    label: "Reflective Toss",
    color: "text-teal-400 bg-teal-500/20",
    desc: "Turn it around",
    fullDesc: "Reflect on what you've learned",
  },
  root: { 
    label: "Starting Point", 
    color: "text-muted-foreground bg-muted", 
    desc: "Begin your journey",
    fullDesc: "Let's start exploring",
  },
}

const scaffoldHints = {
  0: null,
  1: { type: "nudge", text: "Let's break this down. What's the simplest piece you're certain about?" },
  2: { type: "metaphor", text: "Think of an everyday analogy. What does this remind you of in daily life?" },
  3: { type: "co-construct", text: "Here's a starting phrase: 'It's basically like when...' — can you complete it?" },
}

export function FocusCardView({ node, onAnswer, onRequestScaffold: requestScaffold, calibrationLevel, topic, consistencyScore = 0 }: FocusCardViewProps) {
  const [answer, setAnswer] = useState("")
  const [confidence, setConfidence] = useState(50)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const typeInfo = typeLabels[node.type as keyof typeof typeLabels] || typeLabels.root
  const scaffoldLevel = node.scaffoldLevel || 0

  // Show celebration when reaching 100%
  useEffect(() => {
    if (consistencyScore >= 100) {
      setShowCelebration(true)
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => setShowCelebration(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [consistencyScore])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!answer.trim() || isSubmitting) return

    setIsSubmitting(true)

    try {
      let isOnTopic = true
      
      // Validate topic with server if topic is provided
      if (topic) {
        try {
          console.log("🔍 Validating answer against topic:", { topic, answerLength: answer.length })
          
          const response = await fetch(
            `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"}/question/validate-topic`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ answer, topic }),
            }
          )
          const validation = await response.json()
          console.log("📊 Validation result:", validation)
          
          isOnTopic = validation.isOnTopic ?? true

          if (!isOnTopic) {
            console.warn("⚠️ Answer is off-topic!")
            FeedbackHelpers.offTopicWarning(
              validation.reason || `Let's focus on "${topic}" instead.`
            )
            setIsSubmitting(false)
            return // Block submission
          }
          
          console.log("✅ Answer is on-topic, proceeding...")
        } catch (error) {
          console.error("Topic validation error:", error)
          // Continue if validation fails
        }
      } else {
        console.warn("⚠️ No topic provided for validation")
      }

      // Check for AI-generated content
      /* try {
        console.log("🤖 Checking for AI-generated content...")
        const aiResponse = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"}/answer/detect-ai`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answer }),
          }
        )
        const aiResult = await aiResponse.json()
        console.log("🔍 AI detection result:", aiResult)

        if (aiResult.isLikelyAI) {
          console.warn("⚠️ Answer detected as AI-generated!")
          FeedbackHelpers.aiDetected(
            aiResult.reasoning || "AI-generated content detected"
          )
          setIsSubmitting(false)
          return // Block submission
        }

        console.log("✅ Answer passed AI check")
      } catch (error) {
        console.error("AI detection error:", error)
        // Continue if check fails - don't block on error
      } */

      // Detect basic gibberish (very simple check)
      const words = answer.trim().split(/\s+/)
      const hasCommonWords = words.slice(0, 5).some(w => {
        const lower = w.toLowerCase()
        return lower.length > 2 && (
          /[aeiou]/i.test(lower) ||  // Has vowels
          lower.match(/[a-z]{2,}/i)  // Has letter sequences
        )
      })
      
      if (words.length < 5 || !hasCommonWords) {
        // Likely gibberish/random input
        FeedbackHelpers.offTopicWarning("Please provide a meaningful answer with actual words and ideas.")
        setIsSubmitting(false)
        return
      }

      // Detect question repetition (copy-pasted question as answer)
      const answerLower = answer.toLowerCase().trim()
      const questionLower = node.question.toLowerCase().trim()
      
      // Calculate similarity using a simple word overlap method
      const answerWords = new Set(answerLower.split(/\W+/).filter(w => w.length > 2))
      const questionWords = new Set(questionLower.split(/\W+/).filter(w => w.length > 2))
      
      if (answerWords.size > 0 && questionWords.size > 0) {
        const overlap = Array.from(answerWords).filter(w => questionWords.has(w)).length
        const overlapRatio = overlap / Math.min(answerWords.size, questionWords.size)
        
        if (overlapRatio > 0.75) {
          // Too much overlap with the question itself
          console.warn("⚠️ Answer appears to be a repetition of the question!")
          FeedbackHelpers.offTopicWarning("Please don't just repeat the question - share your own thinking instead.")
          setIsSubmitting(false)
          return
        }
      }

      // Send to backend for AI quality analysis
      console.log("📤 Sending answer to server for quality analysis...")
      let answerQuality: { confidence: number; wordCount: number; hasLogicalReasoning: boolean; isWellStructured: boolean; answerLength: number } | undefined = undefined
      try {
        const qualityResponse = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"}/answer/analyze-quality`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              answer, 
              topic,
              confidence
            }),
          }
        )
        const qualityData = await qualityResponse.json()
        console.log("📊 Quality analysis result:", qualityData)
        
        if (qualityData.quality) {
          answerQuality = {
            confidence: Number(qualityData.confidence) || confidence,
            wordCount: Number(qualityData.wordCount),
            hasLogicalReasoning: Boolean(qualityData.hasLogicalReasoning),
            isWellStructured: Boolean(qualityData.isWellStructured),
            answerLength: answer.trim().length,
          }
          console.log("✅ Quality data prepared:", answerQuality)
        }
      } catch (error) {
        console.error("Quality analysis error:", error)
        // Fall back to basic analysis if server fails
        const wordCount = answer.trim().split(/\s+/).length
        answerQuality = {
          confidence,
          wordCount,
          hasLogicalReasoning: false,
          isWellStructured: wordCount > 20,
          answerLength: answer.trim().length,
        }
      }

      // Clear and submit - parent component handles all feedback
      onAnswer(answer, confidence, answerQuality)
      setAnswer("")
      setConfidence(50)
    } finally {
      setIsSubmitting(false)
    }
  }

  const showMisconceptionWarning = confidence > 85
  const isEdgeCaseProbe =
    node.type === "edge-case" || node.type === "counter-exemplar"

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        {/* 100% Consistency Celebration Overlay */}
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            {/* Animated background blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            {/* Celebration container */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
              className="relative z-10 flex flex-col items-center gap-4"
            >
              {/* Close button */}
              <motion.button
                onClick={() => setShowCelebration(false)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute -top-6 -right-6 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm border border-white/20 pointer-events-auto"
                title="Close celebration"
              >
                <X className="w-5 h-5 text-white" />
              </motion.button>

              {/* Animated trophy */}
              <motion.div
                animate={{
                  y: [0, -20, 0],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  repeatDelay: 1,
                }}
              >
                <Trophy className="w-24 h-24 text-yellow-400 drop-shadow-lg" />
              </motion.div>

              {/* Main text */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-purple-400 to-pink-400 drop-shadow-lg mb-2">
                  Perfect Consistency!
                </h1>
                <p className="text-lg text-white font-semibold drop-shadow-md">
                  You've achieved complete mastery
                </p>
              </motion.div>

              {/* Animated stars */}
              <div className="flex gap-3 justify-center">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scale: [1, 1.4, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  >
                    <Star className="w-8 h-8 text-yellow-300 fill-yellow-300 drop-shadow-lg" />
                  </motion.div>
                ))}
              </div>

              {/* Confetti particles */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{
                      x: 0,
                      y: 0,
                      opacity: 1,
                    }}
                    animate={{
                      x: (Math.random() - 0.5) * 200,
                      y: (Math.random() - 0.5) * 200 - 100,
                      opacity: 0,
                    }}
                    transition={{
                      duration: 2,
                      delay: Math.random() * 0.3,
                      ease: "easeOut",
                    }}
                    className="absolute left-1/2 top-1/2"
                  >
                    <div className="w-2 h-2 rounded-full" style={{
                      background: ["#fbbf24", "#a78bfa", "#f472b6", "#60a5fa"][Math.floor(Math.random() * 4)]
                    }} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        <div className="text-center mb-6">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}
          >
            <Sparkles className="w-3 h-3" />
            {typeInfo.label}
          </span>
          <p className="text-xs text-muted-foreground mt-2">{typeInfo.desc}</p>
          {typeInfo.fullDesc && <p className="text-xs text-muted-foreground/70 mt-1 italic">{typeInfo.fullDesc}</p>}
        </div>

        <div className="relative">
          <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full" />
          <div className="relative bg-card border border-border rounded-2xl p-10 text-center">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground leading-relaxed text-balance">
              {node.question}
            </h2>

            {isEdgeCaseProbe && (
              <div className="mt-4 flex items-center justify-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-rose-400">
                  <Puzzle className="w-3.5 h-3.5" />
                  <span>Reasoning-based</span>
                </div>
                <div className="flex items-center gap-1.5 text-cyan-400">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Knowledge-based</span>
                </div>
              </div>
            )}

            {scaffoldLevel > 0 && scaffoldHints[scaffoldLevel as keyof typeof scaffoldHints] && (
              <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <div className="text-left">
                    <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">
                      {scaffoldHints[scaffoldLevel as keyof typeof scaffoldHints]?.type}
                    </span>
                    <p className="text-sm text-amber-300 mt-1">
                      {scaffoldHints[scaffoldLevel as keyof typeof scaffoldHints]?.text}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="p-4 rounded-xl bg-secondary/50 border border-border">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm text-muted-foreground">How confident are you?</label>
              <span
                className={`text-sm font-medium ${
                  confidence < 40 ? "text-rose-400" : confidence > 80 ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {confidence}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={confidence}
              onChange={(e) => setConfidence(Number.parseInt(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, 
                  rgb(244, 63, 94) 0%, 
                  rgb(251, 191, 36) 50%, 
                  rgb(52, 211, 153) 100%)`,
              }}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Uncertain</span>
              <span>Very Sure</span>
            </div>

            {showMisconceptionWarning && (
              <div className="mt-3 flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs">High confidence triggers deeper self-correction probes.</span>
              </div>
            )}
          </div>

          <div className="relative">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Think carefully before you answer..."
              className="w-full h-28 px-5 py-4 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <motion.button
              type="submit"
              disabled={!answer.trim() || isSubmitting}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="absolute bottom-3 right-3 p-2.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              {isSubmitting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"
                />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </motion.button>
          </div>

          <button
            type="button"
            onClick={requestScaffold}
            disabled={!answer.trim()}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              {scaffoldLevel === 0 && "Let's build this together"}
              {scaffoldLevel === 1 && "I need a metaphor"}
              {scaffoldLevel === 2 && "Help me start the sentence"}
              {scaffoldLevel >= 3 && "Let's work with what we have"}
            </span>
          </button>
          <p className="text-xs text-muted-foreground">Level: {calibrationLevel}</p>
        </form>
      </div>
    </div>
  )
}
