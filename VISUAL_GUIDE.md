# Visual Guide: What Users See

## 1. Answer Feedback Examples

### Example 1: Good Quality Answer
```
┌─────────────────────────────────────────┐
│ User Input                              │
├─────────────────────────────────────────┤
│ Question: "Explain photosynthesis"      │
│                                         │
│ [Long detailed answer...]               │
│ Confidence: ████████░░ 80%              │
│ [Submit]                                │
└─────────────────────────────────────────┘

         ↓ (Answer submitted)

┌──────────────────────────────────────────┐
│ Instant Feedback (bottom-right corner)   │
├──────────────────────────────────────────┤
│                                          │
│  ┌──────────────────────────────────┐   │
│  │ ✓ Answer Recorded               │   │
│  │ Excellent! You're connecting     │   │
│  │ the pieces well.                 │   │
│  └──────────────────────────────────┘   │
│  (auto-hides after 2.5 seconds)         │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │ 💡 Aha Moment!                  │   │
│  │ You've discovered: "plants      │   │
│  │ convert light energy through..." │   │
│  └──────────────────────────────────┘   │
│  (celebration animation)                 │
│  (auto-hides after 4 seconds)           │
│                                          │
└──────────────────────────────────────────┘
```

### Example 2: Off-Topic Answer
```
┌─────────────────────────────────────────┐
│ User Input                              │
├─────────────────────────────────────────┤
│ Question: "Explain photosynthesis"      │
│                                         │
│ [Answer about cellular respiration...] │
│ Confidence: ██████░░░░ 60%              │
│ [Submit]                                │
└─────────────────────────────────────────┘

         ↓ (Answer submitted)

┌──────────────────────────────────────────┐
│ Topic Validation: OFF-TOPIC              │
├──────────────────────────────────────────┤
│ Input keywords: cellular, respiration   │
│ Topic keywords: photosynthesis, light   │
│ Relevance Score: 15% (BELOW 30% THRESHOLD)
│ Result: BLOCK + WARNING                  │
└──────────────────────────────────────────┘

         ↓

┌──────────────────────────────────────────┐
│ Warning Feedback (bottom-right)          │
├──────────────────────────────────────────┤
│                                          │
│  ┌──────────────────────────────────┐   │
│  │ 🧭 Off Track                    │   │
│  │ You're exploring "cellular      │   │
│  │ respiration". Let's return to    │   │
│  │ "photosynthesis".                │   │
│  └──────────────────────────────────┘   │
│  (warning animation)                     │
│  (auto-hides after 3.5 seconds)         │
│                                          │
│ Attempt count: 1/3                      │
│ (User can try again)                    │
│                                          │
└──────────────────────────────────────────┘
```

### Example 3: Third Off-Topic Attempt
```
After 3 off-topic attempts:

┌───────────────────────────────────────────┐
│ MODAL: Topic Boundary Exceeded            │
├───────────────────────────────────────────┤
│                                           │
│  ⚠️ Topic Boundary Exceeded               │
│                                           │
│  We've explored 3 off-topic directions.   │
│  Let's refocus on: "Photosynthesis"       │
│                                           │
│  [🔄 Refocus]                             │
│                                           │
│  (Modal blocks interaction)               │
│                                           │
└───────────────────────────────────────────┘

(Clicking Refocus resets counter)
```

## 2. Progress Notifications

### Example 4: Consistency Improvement
```
After 10 quality answers, consistency score improves:

70% → 75% → 80%

Each milestone triggers:

┌──────────────────────────────────────────┐
│ Progress Feedback (stacked)               │
├──────────────────────────────────────────┤
│                                          │
│  ┌──────────────────────────────────┐   │
│  │ 📈 Consistency Improved          │   │
│  │ Your consistency score increased  │   │
│  │ from 70% to 80%!                  │   │
│  └──────────────────────────────────┘   │
│  (trending up animation)                 │
│  (subtle notification)                   │
│  (auto-hides after 2.5 seconds)         │
│                                          │
└──────────────────────────────────────────┘
```

### Example 5: Breakthrough Moment
```
After comprehensive understanding + synthesis-ready:

┌──────────────────────────────────────────┐
│ Breakthrough Feedback (PROMINENT)        │
├──────────────────────────────────────────┤
│                                          │
│  ┌──────────────────────────────────┐   │
│  │ 🎯 Major Breakthrough!           │   │
│  │ You've mastered: photosynthesis   │   │
│  │ Ready for the next layer?         │   │
│  └──────────────────────────────────┘   │
│  (celebration animation - purple/glow)   │
│  (bouncing effect)                       │
│  (auto-hides after 4 seconds)           │
│                                          │
└──────────────────────────────────────────┘
```

## 3. Notification Stack Behavior

```
Bottom-Right Corner Notifications:

Time 0s:
  ┌──────────────────────────┐
  │ ✓ Answer Recorded        │
  └──────────────────────────┘

Time 1s:
  ┌──────────────────────────┐
  │ 💡 Aha Moment!           │
  ├──────────────────────────┤
  │ (previous notification)  │
  └──────────────────────────┘

Time 2.5s:
  ┌──────────────────────────┐
  │ 💡 Aha Moment!           │
  ├──────────────────────────┤
  │ (green one faded out)    │
  └──────────────────────────┘

Time 4s:
  (all notifications gone)

Multiple Simultaneous:
  ┌──────────────────────────┐
  │ 📈 Consistency Improved  │
  ├──────────────────────────┤
  │ ✓ Answer Recorded        │
  ├──────────────────────────┤
  │ 💡 Aha Moment!           │
  └──────────────────────────┘
  (Each auto-hides at its own duration)
```

## 4. Notification Color Codes

```
FEEDBACK TYPE          COLOR   ICON    USE CASE
─────────────────────────────────────────────────────────
Aha Moment            🟨 Yellow  💡   Breakthrough insight
Answer Validated      🟩 Green   ✓    Answer confirmed
Breakthrough          🟪 Purple  🎯   Major milestone
Consistency Gain      🟦 Blue    📈   Progress improving
Misconception         🟧 Orange  ⚠️   Logic gap detected
Off-Topic Warning     🟥 Rose    🧭   Drifting from topic
Topic Redirect        🟦 Cyan    🔄   Ready to refocus

Legend:
🟨 Yellow = Celebration/Insight
🟩 Green = Success/Validation
🟪 Purple = Achievement/Goal
🟦 Blue = Information/Progress
🟧 Orange = Warning/Alert
🟥 Rose = Caution/Boundary
🟦 Cyan = Information/Redirect
```

## 5. Animation Reference

```
ANIMATION TYPE    DESCRIPTION              WHEN USED
──────────────────────────────────────────────────────────
Pulse             Gentle pulsing glow      Aha moments
Bounce            Bouncing motion          Breakthroughs
Slide-in          Slides from right        All notifications
Fade-in           Fades in smoothly        Appears
Fade-out          Fades out smoothly       Auto-hides
Glow              Radiant glow effect      Emphasis
Subtle            No animation             Background info
```

## 6. User Journey Visualization

```
OPTIMAL PATH:

Start
  ↓
Submit Answer (confident)
  ↓
✓ Answer Validated → 💡 Aha Moment! → Next Question
  ↓
Submit Answer (confident)
  ↓
✓ Answer Validated → Next Question
  ↓
Submit Answer (confident)
  ↓
✓ Answer Validated → Next Question
  ↓
After ~10 answers:
  ↓
📈 Consistency Improved (70% → 80%)
  ↓
Submit Answer (excellent)
  ↓
✓ Answer Validated → 💡 Aha Moment! → 🎯 Breakthrough!
  ↓
End (Synthesis Ready)


OFF-TOPIC SCENARIO:

Submit Answer (off-topic)
  ↓
🧭 Warning #1
  ↓
Return to topic ✓
  ↓
Submit Answer (off-topic)
  ↓
🧭 Warning #2
  ↓
Return to topic ✓
  ↓
Submit Answer (off-topic)
  ↓
🧭 Warning #3
  ↓
Next attempt:
  ↓
⚠️ BLOCKED → Modal: "Topic Boundary Exceeded"
  ↓
[Refocus Button] → Reset
  ↓
Back to optimal path
```

## 7. Confidence Rating Visualization

```
CONFIDENCE SLIDER:

Low ◄──────────────────────────────────► High
    0%    20%    40%    60%    80%    100%
    │      │      │      │      │      │
    🔴    🟠     🟡     🟢     💚     💚💚

USER SEES:
    Uncertain                    Very Sure

FEEDBACK IMPACT:
    < 40%: Low confidence         → "Good effort"
   40-60%: Medium confidence      → "Solid reasoning"
   60-80%: High confidence        → "Strong answer"
   80-100%: Very high confidence  → "Excellent!"
```

## 8. Mobile View Adaptation

```
DESKTOP (1024px+):
┌──────────────────────────────────────────────────┐
│ Question Area                                     │
│                                                   │
│ Answer Card                    Feedback Stack ◄─┐│
│                                ┌──────────────┐ ││
│                                │ Notification │ ││
│                                └──────────────┘ ││
│                                                 ││
│ Input Area                                      ││
└──────────────────────────────────────────────────┘

TABLET (768px):
┌──────────────────────────────┐
│ Question Area                │
│                              │
│ Answer Card                  │
│                              │
│ Input Area                   │
│                              │
│ Feedback Stack ◄─┐           │
│ ┌──────────────┐ │           │
│ │ Notification │ │           │
│ └──────────────┘ │           │
└──────────────────────────────┘

MOBILE (< 768px):
┌─────────────────┐
│ Question Area   │
│                 │
│ Answer Card     │
│                 │
│ Input Area      │
│                 │
│ Notification ◄┐ │
│ ┌───────────┐ │ │
│ │ Feedback  │ │ │
│ └───────────┘ │ │
└─────────────────┘
(Stacks vertically)
```

## 9. State Indicators

```
VISUAL STATES:

Loading State:
  ⏳ "Thinking..." (spinner)
  (During topic validation)

Valid State:
  ✓ "Ready" (green checkmark)
  (Ready to submit)

Invalid State:
  ⚠️ "Off-Topic" (warning badge)
  (Answer blocked)

Success State:
  ✅ "Recorded" (checkmark pulse)
  (Answer accepted)

Progress State:
  📈 "Improving" (trending arrow)
  (Consistency increasing)

Breakthrough State:
  🎯 "Mastered" (trophy/star)
  (Synthesis ready)
```

## 10. Customization Examples

### Disable Specific Notification
```
Example: Disable Aha Moment celebrations

Visual Before:
  ✓ Answer Recorded
  💡 Aha Moment!

Edit: Comment out in socratic-app.tsx
  // FeedbackHelpers.ahaMoment(...)

Visual After:
  ✓ Answer Recorded
  (only validation remains)
```

### Change Notification Colors
```
Example: Make consistency gain more prominent

Edit: feedback-system.tsx
  "consistency-gain": {
    bgColor: "bg-red-500/10",        // Changed from blue
    iconColor: "text-red-400",       // Changed
    textColor: "text-red-200",       // Changed
  }

Visual Result:
  Before: 📈 Consistency Improved (subtle blue)
  After:  📈 Consistency Improved (prominent red)
```

---

This visual guide helps users understand what they're seeing and why! All notifications are non-intrusive but visible enough to celebrate achievements.
