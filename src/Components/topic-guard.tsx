import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, RefreshCw } from "lucide-react"

export interface TopicGuardConfig {
  topic: string
  maxOffTopicAttempts?: number
}

export interface TopicValidationResult {
  isOnTopic: boolean
  reason?: string
}

export function TopicGuard({ config }: { config: TopicGuardConfig }) {
  const [offTopicCount, setOffTopicCount] = useState(0)
  const maxAttempts = config.maxOffTopicAttempts || 3
  const isBlocked = offTopicCount >= maxAttempts

  const validateInput = useCallback(
    async (userInput: string): Promise<TopicValidationResult> => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"}/topic/validate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userInput, topic: config.topic }),
          }
        )
        return await response.json()
      } catch (error) {
        console.error("Topic validation error:", error)
        return { isOnTopic: true } // Default to allowing if API fails
      }
    },
    [config.topic]
  )

  useEffect(() => {
    ;(window as unknown as Record<string, unknown>).validateTopic = validateInput
    return () => {
      delete (window as unknown as Record<string, unknown>).validateTopic
    }
  }, [validateInput])

  return (
    <div className="hidden">
      <AnimatePresence>
        {isBlocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-40"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-rose-500/50 rounded-lg p-6 max-w-sm"
            >
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
                <div>
                  <h3 className="font-semibold text-rose-400">Let's Stay Focused</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    We've explored {maxAttempts} off-topic directions. Let's refocus on: <strong>{config.topic}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOffTopicCount(0)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 border border-primary/50 rounded-lg text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refocus
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
