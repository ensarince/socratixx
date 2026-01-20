import type React from "react"

import { Focus, Network, StickyNote, GraduationCap } from "lucide-react"
import type { ViewMode } from "./socratic-app"

interface ViewSwitcherProps {
  currentView: ViewMode
  onViewChange: (view: ViewMode) => void
  canFlip?: boolean // Added canFlip prop to enable The Flip mode
}

const views: { id: ViewMode; label: string; icon: React.ElementType; description: string }[] = [
  { id: "focus", label: "Focus Card", icon: Focus, description: "One question at a time" },
  { id: "mindmap", label: "Mind Map", icon: Network, description: "See your thought branches" },
  { id: "canvas", label: "Canvas", icon: StickyNote, description: "Infinite brainstorm space" },
]

export function ViewSwitcher({ currentView, onViewChange, canFlip }: ViewSwitcherProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary">
      {views.map((view) => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            currentView === view.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <view.icon className="w-4 h-4" />
          <span className="hidden md:inline">{view.label}</span>
        </button>
      ))}

      <button
        onClick={() => onViewChange("flip")}
        disabled={!canFlip}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          currentView === "flip"
            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
            : canFlip
              ? "text-amber-400 hover:bg-amber-500/20"
              : "text-muted-foreground/50 cursor-not-allowed"
        }`}
        title={canFlip ? "Test your mastery by teaching" : "Complete more questions to unlock"}
      >
        <GraduationCap className="w-4 h-4" />
        <span className="hidden md:inline">The Flip</span>
        {!canFlip && <span className="hidden lg:inline text-xs ml-1 opacity-60">(locked)</span>}
      </button>
    </div>
  )
}
