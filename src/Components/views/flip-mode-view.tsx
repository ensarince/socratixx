"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { GraduationCap, Send, CheckCircle2, XCircle } from "lucide-react"
import type { Assertion } from "../socratic-app"
import { SocraticAPI } from "../../services/socratic-api"

interface FlipModeViewProps {
  topic: string
  assertions: Assertion[]
}

export function FlipModeView({ topic, assertions }: FlipModeViewProps) {
  const [confusedQuestions, setConfusedQuestions] = useState<string[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answer, setAnswer] = useState("")
  const [responses, setResponses] = useState<{ question: string; answer: string; quality: "excellent" | "good" | "needs-work" }[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load confused student questions from backend on mount
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await SocraticAPI.generateConfusedQuestions()
        setConfusedQuestions(data.questions || [])
      } catch (err) {
        console.error("Error loading confused questions:", err)
        setError("Could not load personalized questions. Using fallback.")
        // Set fallback questions with topic
        setConfusedQuestions([
          `What is the core definition of ${topic}?`,
          `Why is ${topic} important in practice?`,
          `Can you explain how ${topic} works step by step?`,
          `What are the key principles you need to understand about ${topic}?`,
        ])
      } finally {
        setLoading(false)
      }
    }

    if (topic) {
      loadQuestions()
    }
  }, [topic])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!answer.trim()) return

    // Quality assessment - stricter criteria for teaching
    let quality: "excellent" | "good" | "needs-work" = "needs-work"
    const answerLength = answer.length
    const hasExamples = answer.toLowerCase().includes("example") || 
                       answer.toLowerCase().includes("like") || 
                       answer.toLowerCase().includes("imagine") ||
                       answer.toLowerCase().includes("for instance")
    const hasExplanation = answerLength > 100
    const hasClarity = answer.split(".").filter(s => s.trim().length > 0).length > 2 // Multiple complete sentences
    const hasReasoning = answer.toLowerCase().includes("because") || 
                        answer.toLowerCase().includes("reason") ||
                        answer.toLowerCase().includes("why")
    
    if (hasExplanation && hasExamples && hasClarity && hasReasoning) {
      quality = "excellent"
    } else if (hasExplanation && (hasExamples || hasClarity || hasReasoning)) {
      quality = "good"
    }

    setResponses((prev) => [...prev, { question: confusedQuestions[currentQuestion], answer, quality }])
    setAnswer("")

    if (currentQuestion < confusedQuestions.length - 1) {
      setCurrentQuestion((prev) => prev + 1)
    } else {
      setIsComplete(true)
    }
  }

  const excellentAnswers = responses.filter((r) => r.quality === "excellent").length
  const goodAnswers = responses.filter((r) => r.quality === "good").length
  const totalQuality = excellentAnswers + goodAnswers
  const masteryAchieved = excellentAnswers >= 2 || totalQuality >= 3

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 text-sm font-medium mb-4">
            <GraduationCap className="w-4 h-4" />
            The Flip: Teach Mode
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Now YOU are the teacher</h2>
          <p className="text-muted-foreground">
            A confused student wants to understand {topic}. If you can answer their real questions clearly, you've mastered it.
          </p>
        </div>

        {loading ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4"></div>
            <p className="text-muted-foreground">Generating personalized questions from your session...</p>
          </div>
        ) : error ? (
          <div className="bg-card border border-destructive/50 rounded-2xl p-8 text-center">
            <p className="text-destructive">{error}</p>
          </div>
        ) : confusedQuestions.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <p className="text-muted-foreground">No questions available. Complete more of the learning session first.</p>
          </div>
        ) : !isComplete ? (
          <>
            {/* The "Confused Student" Question */}
            <div className="bg-card border border-border rounded-2xl p-8 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                  <span className="text-lg">🤔</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Confused Student asks:</p>
                  <p className="text-lg text-foreground leading-relaxed">{confusedQuestions[currentQuestion]}</p>
                </div>
              </div>
            </div>

            {/* Your explanation */}
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Explain it clearly, with examples and reasoning..."
                  className="w-full h-32 px-5 py-4 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  type="submit"
                  disabled={!answer.trim()}
                  className="absolute bottom-3 right-3 p-2.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Quality indicator */}
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground">
              💡 Tip: Include examples, explain your reasoning, and use multiple sentences for best results.
            </div>

            {/* Previous responses */}
            {responses.length > 0 && (
              <div className="mt-6 space-y-3">
                <p className="text-sm text-muted-foreground">Your explanations:</p>
                {responses.map((r, i) => (
                  <div key={i} className="p-3 rounded-lg bg-secondary/50 border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      {r.quality === "excellent" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : r.quality === "good" ? (
                        <CheckCircle2 className="w-4 h-4 text-cyan-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-amber-500" />
                      )}
                      <span className="text-xs text-muted-foreground font-medium">{r.quality === "excellent" ? "Excellent!" : r.quality === "good" ? "Good" : "Needs work"}</span>
                      <span className="text-xs text-muted-foreground">— {r.question.slice(0, 40)}...</span>
                    </div>
                    <p className="text-sm text-foreground line-clamp-2">{r.answer}</p>
                  </div>
                ))}
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground mt-6">
              Question {currentQuestion + 1} of {confusedQuestions.length}
            </p>
          </>
        ) : (
          /* Completion Screen */
          <div className="bg-card border border-border rounded-2xl p-10 text-center">
            {masteryAchieved ? (
              <>
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">Mastery Achieved! 🎓</h3>
                <p className="text-muted-foreground mb-6">
                  You successfully explained {topic} to a confused student. The best way to learn is to teach.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-400 mb-8">
                  <GraduationCap className="w-4 h-4" />
                  {excellentAnswers} excellent + {goodAnswers} good explanations
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <span className="text-4xl">🌱</span>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">Keep Growing</h3>
                <p className="text-muted-foreground mb-6">
                  Some of your explanations could be stronger. Try exploring more deeply and come back to teach again.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 text-amber-400">
                  {excellentAnswers} excellent + {goodAnswers} good / {confusedQuestions.length} needed
                </div>
              </>
            )}

            {/* Reference: Your proven assertions */}
            <div className="mt-8 p-4 rounded-xl bg-secondary/50 text-left">
              <p className="text-xs text-muted-foreground mb-3 font-semibold">Your proven knowledge:</p>
              <div className="space-y-2">
                {assertions.slice(0, 4).map((a) => (
                  <p key={a.id} className="text-xs text-cyan-400">
                    ✓ {a.text}
                  </p>
                ))}
                {assertions.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No assertions recorded yet</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
