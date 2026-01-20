import type { FeedbackConfig } from "./feedback-system"

export function emitFeedback(config: FeedbackConfig) {
  const event = new CustomEvent("socratic:feedback", { detail: config })
  window.dispatchEvent(event)
}

export const FeedbackHelpers = {
  ahaMoment: (insight: string) =>
    emitFeedback({
      type: "aha-moment",
      title: "💡 Aha Moment!",
      message: `You've discovered: "${insight.substring(0, 50)}${insight.length > 50 ? "..." : ""}"`,
      intensity: "celebration",
      duration: 5000,
    }),

  answerValidated: (quality: "good" | "solid" | "excellent") => {
    const messages = {
      good: "Your answer shows understanding. Let's dig deeper.",
      solid: "Strong reasoning. Now let's explore the edges.",
      excellent: "Excellent! You're connecting the pieces brilliantly.",
    }
    emitFeedback({
      type: "answer-validated",
      title: "✓ Answer Recorded",
      message: messages[quality],
      intensity: "subtle",
      duration: 2500,
    })
  },

  offTopicWarning: (reason: string) =>
    emitFeedback({
      type: "off-topic-warning",
      title: "🧭 Off Track",
      message: reason || "Let's stay focused on the topic.",
      intensity: "prominent",
      duration: 3500,
    }),

  consistencyGain: (previousScore: number, newScore: number) =>
    emitFeedback({
      type: "consistency-gain",
      title: "📈 Consistency Improved",
      message: `Your reasoning consistency increased from ${previousScore}% to ${newScore}%!`,
      intensity: "subtle",
      duration: 2500,
    }),

  breakthrough: (milestone: string) =>
    emitFeedback({
      type: "breakthrough",
      title: "🎯 Major Breakthrough!",
      message: `You've mastered: ${milestone}. Ready for the next challenge?`,
      intensity: "celebration",
      duration: 4000,
    }),
}
