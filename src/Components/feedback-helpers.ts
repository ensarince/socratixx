import type { FeedbackConfig } from "./feedback-system"

export function emitFeedback(config: FeedbackConfig) {
  console.log("🎯 Feedback emitted:", config.type, config.title)
  const event = new CustomEvent("socratic:feedback", { detail: config })
  window.dispatchEvent(event)
}

export const FeedbackHelpers = {
  ahaMoment: (insight: string) => {
    console.log("✨ AHA MOMENT:", insight)
    emitFeedback({
      type: "aha-moment",
      title: "💡 Aha Moment!",
      message: `You've discovered: "${insight.substring(0, 50)}${insight.length > 50 ? "..." : ""}"`,
      intensity: "celebration",
      duration: 6000,
    })
  },

  answerValidated: (quality: "good" | "solid" | "excellent") => {
    const messages = {
      good: "Your answer shows understanding. Let's dig deeper.",
      solid: "Strong reasoning. Now let's explore the edges.",
      excellent: "Excellent! You're connecting the pieces brilliantly.",
    }
    console.log("✅ Answer validated:", quality)
    emitFeedback({
      type: "answer-validated",
      title: "✓ Answer Recorded",
      message: messages[quality],
      intensity: "subtle",
      duration: 3500,
    })
  },

  offTopicWarning: (reason: string) => {
    console.log("⚠️ Off-topic warning:", reason)
    emitFeedback({
      type: "off-topic-warning",
      title: "🧭 Off Track",
      message: reason || "Let's stay focused on the topic.",
      intensity: "prominent",
      duration: 4500,
    })
  },

  aiDetected: (reason: string = "AI-generated content detected") => {
    console.log("🤖 AI DETECTED:", reason)
    emitFeedback({
      type: "ai-detected",
      title: "🤖 AI Answer Detected",
      message: "Keep it human! 🤝 This is about understanding through your own thinking. Share your genuine thoughts and reasoning—that's where real learning happens.",
      intensity: "prominent",
      duration: 6000,
    })
  },

  consistencyGain: (previousScore: number, newScore: number) => {
    console.log("📈 Consistency gain:", previousScore, "→", newScore)
    emitFeedback({
      type: "consistency-gain",
      title: "📈 Consistency Improved",
      message: `Your reasoning consistency increased from ${previousScore}% to ${newScore}%!`,
      intensity: "subtle",
      duration: 4000,
    })
  },

  breakthrough: (milestone: string) => {
    console.log("🏆 BREAKTHROUGH:", milestone)
    emitFeedback({
      type: "breakthrough",
      title: "🎯 Major Breakthrough!",
      message: `You've mastered: ${milestone}. Ready for the next challenge?`,
      intensity: "celebration",
      duration: 6000,
    })
  },
}
