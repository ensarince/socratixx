"use client"

import { useState } from "react"
import { X, Sparkles } from "lucide-react"

interface CalibrationModalProps {
  onComplete: (level: "beginner" | "intermediate" | "advanced") => void
  onClose: () => void
}

const calibrationQuestions = [
  {
    question: "How would you describe your experience with Python programming?",
    options: [
      { label: "I've never written any code before", value: 1 },
      { label: "I know print() and basic variables", value: 2 },
      { label: "I can write functions and use loops", value: 3 },
      { label: "I'm comfortable with classes and modules", value: 4 },
    ],
  },
  {
    question: "When your Python code throws an error, you typically...",
    options: [
      { label: "Feel overwhelmed and need someone to explain it", value: 1 },
      { label: "Can read the error but need hints to fix it", value: 2 },
      { label: "Usually figure out the issue with some debugging", value: 3 },
      { label: "Enjoy tracing through the code to find the bug", value: 4 },
    ],
  },
]

export function CalibrationModal({ onComplete, onClose }: CalibrationModalProps) {
  const [currentQ, setCurrentQ] = useState(0)
  const [scores, setScores] = useState<number[]>([])

  const handleSelect = (value: number) => {
    const newScores = [...scores, value]
    setScores(newScores)

    if (currentQ < calibrationQuestions.length - 1) {
      setCurrentQ((prev) => prev + 1)
    } else {
      // Calculate level
      const avg = newScores.reduce((a, b) => a + b, 0) / newScores.length
      const level = avg <= 1.5 ? "beginner" : avg <= 3 ? "intermediate" : "advanced"
      onComplete(level)
    }
  }

  const q = calibrationQuestions[currentQ]

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
          <h2 className="text-xl font-semibold text-foreground mb-2">Quick Calibration</h2>
          <p className="text-sm text-muted-foreground">
            Help us find your "Zone of Proximal Development" — where learning is challenging but not frustrating.
          </p>
        </div>

        <div className="mb-6">
          <p className="text-lg text-foreground text-center mb-6">{q.question}</p>
          <div className="space-y-3">
            {q.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className="w-full p-4 rounded-xl bg-secondary border border-border hover:border-primary/50 hover:bg-secondary/80 transition-all text-left text-foreground"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-2">
          {calibrationQuestions.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentQ ? "bg-primary" : i < currentQ ? "bg-primary/50" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
