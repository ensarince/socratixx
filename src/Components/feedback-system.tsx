import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Lightbulb, CheckCircle2, AlertCircle, Zap, TrendingUp } from "lucide-react"

export type FeedbackType = 
  | "aha-moment" 
  | "answer-validated" 
  | "off-topic-warning" 
  | "consistency-gain" 
  | "breakthrough"

export interface FeedbackConfig {
  type: FeedbackType
  title: string
  message: string
  intensity?: "subtle" | "prominent" | "celebration"
  autoHide?: boolean
  duration?: number
}

interface FeedbackEvent extends FeedbackConfig {
  id: string
  timestamp: number
}

const feedbackStyles = {
  "aha-moment": {
    bgColor: "bg-yellow-500/10 border-yellow-500/30",
    icon: Lightbulb,
    iconColor: "text-yellow-400",
    textColor: "text-yellow-200",
  },
  "answer-validated": {
    bgColor: "bg-emerald-500/10 border-emerald-500/30",
    icon: CheckCircle2,
    iconColor: "text-emerald-400",
    textColor: "text-emerald-200",
  },
  "off-topic-warning": {
    bgColor: "bg-rose-500/10 border-rose-500/30",
    icon: AlertCircle,
    iconColor: "text-rose-400",
    textColor: "text-rose-200",
  },
  "consistency-gain": {
    bgColor: "bg-blue-500/10 border-blue-500/30",
    icon: TrendingUp,
    iconColor: "text-blue-400",
    textColor: "text-blue-200",
  },
  "breakthrough": {
    bgColor: "bg-purple-500/10 border-purple-500/30",
    icon: Zap,
    iconColor: "text-purple-400",
    textColor: "text-purple-200",
  },
}

export function FeedbackSystem() {
  const [feedbacks, setFeedbacks] = useState<FeedbackEvent[]>([])

  useEffect(() => {
    const handleFeedback = (event: CustomEvent<FeedbackConfig>) => {
      const feedbackEvent: FeedbackEvent = {
        ...event.detail,
        id: `feedback-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        autoHide: event.detail.autoHide !== false,
        duration: event.detail.duration || 3000,
      }

      setFeedbacks((prev) => [...prev, feedbackEvent])

      if (feedbackEvent.autoHide) {
        setTimeout(() => {
          setFeedbacks((prev) => prev.filter((f) => f.id !== feedbackEvent.id))
        }, feedbackEvent.duration)
      }
    }

    window.addEventListener("socratic:feedback", handleFeedback as EventListener)
    return () => window.removeEventListener("socratic:feedback", handleFeedback as EventListener)
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm space-y-2">
      <AnimatePresence>
        {feedbacks.map((feedback) => {
          const style = feedbackStyles[feedback.type]
          const Icon = style.icon
          const intensity = feedback.intensity || "subtle"

          const isAhaMoment = feedback.type === "aha-moment"

          return (
            <motion.div
              key={feedback.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ 
                opacity: 1, 
                x: 0, 
                scale: 1,
              }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={`
                flex items-start gap-3 p-4 rounded-lg border backdrop-blur-sm
                ${style.bgColor}
                transition-all duration-300
              `}
            >
              {isAhaMoment ? (
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0],
                  }}
                  transition={{ 
                    duration: 0.6,
                    repeat: Infinity,
                    repeatDelay: 1.5,
                  }}
                  className={`w-5 h-5 ${style.iconColor} shrink-0 mt-0.5`}
                >
                  <Icon className="w-full h-full" />
                </motion.div>
              ) : (
                <Icon className={`w-5 h-5 ${style.iconColor} shrink-0 mt-0.5`} />
              )}

              <div className="flex-1">
                <motion.h4 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className={`font-semibold text-sm ${style.textColor}`}
                >
                  {feedback.title}
                </motion.h4>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className={`text-xs ${style.textColor}/70 mt-1`}
                >
                  {feedback.message}
                </motion.p>
              </div>

              {intensity === "celebration" && isAhaMoment && (
                <>
                  <motion.div
                    animate={{ 
                      y: [0, -20, 0],
                      opacity: [1, 0.5, 1],
                    }}
                    transition={{ 
                      duration: 0.8,
                      repeat: Infinity,
                      repeatDelay: 1,
                    }}
                    className="absolute top-2 left-4 text-2xl"
                  >
                    ✨
                  </motion.div>
                  <motion.div
                    animate={{ 
                      y: [0, -25, 0],
                      opacity: [1, 0.5, 1],
                    }}
                    transition={{ 
                      duration: 0.9,
                      repeat: Infinity,
                      repeatDelay: 0.8,
                      delay: 0.1,
                    }}
                    className="absolute top-6 right-6 text-2xl"
                  >
                    ✨
                  </motion.div>
                </>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
