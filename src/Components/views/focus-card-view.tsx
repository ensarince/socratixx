import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import { Send, Sparkles, HelpCircle, AlertTriangle, BookOpen, Puzzle } from "lucide-react"
import type { ThoughtNode } from "../socratic-app"
import { FeedbackHelpers } from "../feedback-helpers"

interface FocusCardViewProps {
  node: ThoughtNode
  onAnswer: (answer: string, confidence: number, quality?: { confidence: number; wordCount: number; hasLogicalReasoning: boolean; isWellStructured: boolean; answerLength: number }) => void
  onRequestScaffold: () => void
  calibrationLevel: "beginner" | "intermediate" | "advanced"
  topic?: string
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

export function FocusCardView({ node, onAnswer, onRequestScaffold: requestScaffold, calibrationLevel, topic }: FocusCardViewProps) {
  const [answer, setAnswer] = useState("")
  const [confidence, setConfidence] = useState(50)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const typeInfo = typeLabels[node.type as keyof typeof typeLabels] || typeLabels.root
  const scaffoldLevel = node.scaffoldLevel || 0

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
      try {
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
      }

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
