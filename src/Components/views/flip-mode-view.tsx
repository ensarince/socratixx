"use client"

import type React from "react"

import { useState } from "react"
import { GraduationCap, Send, CheckCircle2, XCircle } from "lucide-react"
import type { Assertion } from "../socratic-app"

interface FlipModeViewProps {
  topic: string
  assertions: Assertion[]
}

// Generate dynamic confused student questions based on topic
function generateConfusedQuestions(topic: string): string[] {
  // Use actual conversation content as basis for questions
  const baseQuestions = [
    `So you're saying that about ${topic}? But what if...`,
    `I don't understand. Can you explain ${topic} differently?`,
    `How does that connect to what you said earlier about ${topic}?`,
    `But what's the practical use of understanding ${topic}?`,
    `If that's true about ${topic}, what about edge cases?`,
  ]
  return baseQuestions
}

export function FlipModeView({ topic, assertions }: FlipModeViewProps) {
  const confusedQuestions = generateConfusedQuestions(topic)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answer, setAnswer] = useState("")
  const [responses, setResponses] = useState<{ question: string; answer: string; quality: "good" | "needs-work" }[]>([])
  const [isComplete, setIsComplete] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!answer.trim()) return

    // Quality assessment based on answer comprehensiveness
    const quality = answer.length > 50 && answer.includes(topic) ? "good" : "needs-work"

    setResponses((prev) => [...prev, { question: confusedQuestions[currentQuestion], answer, quality }])
    setAnswer("")

    if (currentQuestion < confusedQuestions.length - 1) {
      setCurrentQuestion((prev) => prev + 1)
    } else {
      setIsComplete(true)
    }
  }

  const goodAnswers = responses.filter((r) => r.quality === "good").length
  const masteryAchieved = goodAnswers >= Math.ceil(confusedQuestions.length / 2)

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
            Explain {topic} to a confused student. If you can answer their questions clearly, you've mastered the topic.
          </p>
        </div>

        {!isComplete ? (
          <>
            {/* The "Confused Student" Question */}
            <div className="bg-card border border-border rounded-2xl p-8 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                  <span className="text-lg">🤔</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Confused Student asks:</p>
                  <p className="text-xl text-foreground">{confusedQuestions[currentQuestion]}</p>
                </div>
              </div>
            </div>

            {/* Your explanation */}
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Explain it in a way they'll understand..."
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

            {/* Previous responses */}
            {responses.length > 0 && (
              <div className="mt-6 space-y-3">
                <p className="text-sm text-muted-foreground">Your explanations:</p>
                {responses.map((r, i) => (
                  <div key={i} className="p-3 rounded-lg bg-secondary/50 border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      {r.quality === "good" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-amber-500" />
                      )}
                      <span className="text-xs text-muted-foreground">Q: {r.question}</span>
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
                <h3 className="text-2xl font-bold text-foreground mb-2">Mastery Achieved!</h3>
                <p className="text-muted-foreground mb-6">
                  You successfully explained {topic} to a confused student. The best way to learn is to teach.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-400">
                  <GraduationCap className="w-4 h-4" />
                  {goodAnswers}/{confusedQuestions.length} clear explanations
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <span className="text-4xl">🌱</span>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">Keep Growing</h3>
                <p className="text-muted-foreground mb-6">
                  Some of your explanations could be clearer. Try exploring the topic more and come back to teach again.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 text-amber-400">
                  {goodAnswers}/{confusedQuestions.length} clear explanations
                </div>
              </>
            )}

            {/* Reference: Your proven assertions */}
            <div className="mt-8 p-4 rounded-xl bg-secondary/50 text-left">
              <p className="text-xs text-muted-foreground mb-3">Your proven knowledge (from Assertion Log):</p>
              <div className="space-y-2">
                {assertions.slice(0, 3).map((a) => (
                  <p key={a.id} className="text-xs text-cyan-400">
                    • {a.text}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
