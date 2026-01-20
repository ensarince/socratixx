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
          const isWarning = feedback.type === "off-topic-warning"
          const isBreakthrough = feedback.type === "breakthrough"

          return (
            <motion.div
              key={feedback.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ 
                opacity: 1, 
                x: 0, 
                scale: 1,
                ...(isWarning ? { x: [100, -5, 0] } : {}),
              }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ 
                type: "spring", 
                stiffness: isWarning ? 300 : 400, 
                damping: isWarning ? 15 : 25,
              }}
              className={`
                flex items-start gap-3 p-4 rounded-lg border backdrop-blur-sm
                ${style.bgColor}
                transition-all duration-300
                ${isWarning ? "ring-2 ring-rose-400/50 shadow-lg shadow-rose-500/20" : ""}
                ${isAhaMoment ? "ring-2 ring-yellow-400/50 shadow-lg shadow-yellow-500/20" : ""}
                ${isBreakthrough ? "ring-2 ring-purple-400/50 shadow-lg shadow-purple-500/20" : ""}
              `}
            >
              {isAhaMoment ? (
                <motion.div
                  animate={{ 
                    scale: [1, 1.3, 1],
                    rotate: [0, 15, -15, 0],
                  }}
                  transition={{ 
                    duration: 0.5,
                    repeat: Infinity,
                    repeatDelay: 1.2,
                  }}
                  className={`w-5 h-5 ${style.iconColor} shrink-0 mt-0.5`}
                >
                  <Icon className="w-full h-full" />
                </motion.div>
              ) : isWarning ? (
                <motion.div
                  animate={{ 
                    scale: [1, 1.15, 1],
                    rotate: [0, -5, 5, 0],
                  }}
                  transition={{ 
                    duration: 0.4,
                    repeat: Infinity,
                    repeatDelay: 1.5,
                  }}
                  className={`w-5 h-5 ${style.iconColor} shrink-0 mt-0.5`}
                >
                  <Icon className="w-full h-full" />
                </motion.div>
              ) : isBreakthrough ? (
                <motion.div
                  animate={{ 
                    scale: [1, 1.25, 1],
                    rotate: [0, 360],
                  }}
                  transition={{ 
                    duration: 0.8,
                    repeat: Infinity,
                    repeatDelay: 1,
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
                      y: [0, -25, 0],
                      opacity: [1, 0.7, 1],
                      scale: [0.8, 1.2, 0.8],
                    }}
                    transition={{ 
                      duration: 0.7,
                      repeat: Infinity,
                      repeatDelay: 1,
                    }}
                    className="absolute top-1 left-2 text-xl"
                  >
                    ✨
                  </motion.div>
                  <motion.div
                    animate={{ 
                      y: [0, -28, 0],
                      opacity: [1, 0.7, 1],
                      scale: [0.8, 1.2, 0.8],
                    }}
                    transition={{ 
                      duration: 0.8,
                      repeat: Infinity,
                      repeatDelay: 0.9,
                      delay: 0.15,
                    }}
                    className="absolute top-5 right-4 text-xl"
                  >
                    ✨
                  </motion.div>
                  <motion.div
                    animate={{ 
                      y: [0, -30, 0],
                      opacity: [1, 0.6, 1],
                      scale: [0.8, 1.3, 0.8],
                    }}
                    transition={{ 
                      duration: 0.75,
                      repeat: Infinity,
                      repeatDelay: 0.95,
                      delay: 0.3,
                    }}
                    className="absolute bottom-2 right-8 text-lg"
                  >
                    ✨
                  </motion.div>
                </>
              )}
              
              {intensity === "prominent" && isWarning && (
                <motion.div
                  animate={{ 
                    x: [-3, 3, -3, 0],
                  }}
                  transition={{ 
                    duration: 0.4,
                    repeat: Infinity,
                    repeatDelay: 2,
                  }}
                  className="absolute inset-0 rounded-lg pointer-events-none"
                />
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
