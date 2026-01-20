import { useState } from "react"
import { X, Sparkles, Loader2 } from "lucide-react"

interface CalibrationModalProps {
  onComplete: (level: "beginner" | "intermediate" | "advanced") => void
  onClose: () => void
  topic?: string
}

interface Question {
  question: string
  options: Array<{ label: string; value: number }>
}

const initialQuestions: Question[] = [
  {
    question: "How familiar are you with the core concepts of this topic?",
    options: [
      { label: "Completely new to this", value: 1 },
      { label: "I've heard of it, but don't know much", value: 2 },
      { label: "I understand the basics", value: 3 },
      { label: "I'm quite familiar with it", value: 4 },
    ],
  },
  {
    question: "When learning something new, you typically...",
    options: [
      { label: "Need detailed explanations and examples", value: 1 },
      { label: "Prefer guided practice with some hints", value: 2 },
      { label: "Like to explore and figure things out", value: 3 },
      { label: "Enjoy challenging problems and deep dives", value: 4 },
    ],
  },
]

export function CalibrationModal({ onComplete, onClose, topic }: CalibrationModalProps) {
  const [currentQ, setCurrentQ] = useState(0)
  const [scores, setScores] = useState<number[]>([])
  const [responses, setResponses] = useState<Array<{ answer: string; score: number }>>([])
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)
  const [isLoading, setIsLoading] = useState(false)
  const [showAdapted, setShowAdapted] = useState(false)

  const loadAdaptedQuestions = async (initialScores: number[], selectedAnswers: Array<{ answer: string; score: number }>) => {
    if (!topic) {
      completeCalibration(initialScores)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"}/calibration/generate-questions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic,
            initialResponses: selectedAnswers.map((r) => r.answer),
          }),
        }
      )
      const data = await response.json()
      if (data.questions) {
        setQuestions(data.questions)
        setCurrentQ(0)
        setShowAdapted(true)
      } else {
        completeCalibration(initialScores)
      }
    } catch (error) {
      console.error("Failed to load adapted questions:", error)
      completeCalibration(initialScores)
    } finally {
      setIsLoading(false)
    }
  }

  const completeCalibration = async (allScores: number[]) => {
    if (!topic) {
      const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length
      const level = avg <= 1.5 ? "beginner" : avg <= 3 ? "intermediate" : "advanced"
      onComplete(level)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"}/calibration/analyze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic,
            responses: responses.map((r, i) => ({
              answer: r.answer,
              score: allScores[i] || r.score,
            })),
          }),
        }
      )
      const data = await response.json()
      onComplete(data.level || "intermediate")
    } catch (error) {
      console.error("Failed to analyze calibration:", error)
      const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length
      const level = avg <= 1.5 ? "beginner" : avg <= 3 ? "intermediate" : "advanced"
      onComplete(level)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = (value: number, questionText: string) => {
    const newScores = [...scores, value]
    const newResponses = [...responses, { answer: questionText, score: value }]
    setScores(newScores)
    setResponses(newResponses)

    if (!showAdapted && currentQ < initialQuestions.length - 1) {
      setCurrentQ((prev) => prev + 1)
    } else if (showAdapted && currentQ < questions.length - 1) {
      setCurrentQ((prev) => prev + 1)
    } else if (!showAdapted) {
      // After initial questions, load adapted ones if topic provided
      loadAdaptedQuestions(newScores, newResponses)
    } else {
      // After adapted questions, complete calibration
      completeCalibration(newScores)
    }
  }

  const currentQuestions = showAdapted ? questions : initialQuestions
  const q = currentQuestions[currentQ]

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-lg w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {showAdapted ? "Personalized Assessment" : "Quick Calibration"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {showAdapted
              ? "Let's personalize your learning experience based on your responses."
              : "Help us find your 'Zone of Proximal Development' — where learning is challenging but not frustrating."}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Analyzing your responses...</p>
            </div>
          </div>
        ) : q ? (
          <>
            <div className="mb-6">
              <p className="text-lg text-foreground text-center mb-6">{q.question}</p>
              <div className="space-y-3">
                {q.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleSelect(opt.value, opt.label)}
                    className="w-full p-4 rounded-xl bg-secondary border border-border hover:border-primary/50 hover:bg-secondary/80 transition-all text-left text-foreground"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center gap-2">
              {currentQuestions.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentQ ? "bg-primary" : i < currentQ ? "bg-primary/50" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
