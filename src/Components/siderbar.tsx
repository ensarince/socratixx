"use client"

import { Brain, Target, TrendingUp, ScrollText, Gauge, Settings2, Map, Link2 } from "lucide-react"
import type { Assertion } from "./socratic-app"

interface SidebarProps {
  consistencyScore: number
  questionCount: number
  totalQuestions: number
  assertions: Assertion[]
  zpdLevel: "easy" | "optimal" | "hard"
  onStartCalibration: () => void
}

const zpdConfig = {
  easy: { label: "Too Easy", color: "text-amber-400", bg: "bg-amber-500/20", desc: "Challenge yourself more" },
  optimal: { label: "Goldilocks Zone", color: "text-emerald-400", bg: "bg-emerald-500/20", desc: "Perfect difficulty" },
  hard: { label: "Stretching", color: "text-rose-400", bg: "bg-rose-500/20", desc: "Consider a scaffold" },
}

export function Sidebar({
  consistencyScore,
  questionCount,
  totalQuestions,
  assertions,
  zpdLevel,
  onStartCalibration,
}: SidebarProps) {
  const zpd = zpdConfig[zpdLevel]

  return (
    <aside className="w-72 border-r border-border bg-card p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Brain className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-foreground">Deep Work Session</h2>
          <p className="text-xs text-muted-foreground truncate">Exploring your mind</p>
        </div>
        <button
          onClick={onStartCalibration}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
          title="Recalibrate level"
        >
          <Settings2 className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="space-y-4 flex-1 overflow-auto">
        {/* Consistency Score */}
        <div className="p-4 rounded-xl bg-secondary/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Consistency Score</span>
            <Target className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-foreground">{consistencyScore}%</span>
          </div>
          <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${consistencyScore}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 italic">You summarize. You connect the dots.</p>
        </div>

        <div className="p-4 rounded-xl bg-secondary/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Difficulty Zone</span>
            <Gauge className="w-4 h-4 text-muted-foreground" />
          </div>
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${zpd.bg} ${zpd.color}`}
          >
            {zpd.label}
          </div>
          <p className="text-xs text-muted-foreground mt-2">{zpd.desc}</p>
        </div>

        <div className="p-4 rounded-xl bg-secondary/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Hidden Curriculum Map</span>
            <Map className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-foreground">{questionCount}</span>
            <span className="text-sm text-muted-foreground mb-1">/ {totalQuestions} unlocked</span>
          </div>
          <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${(questionCount / totalQuestions) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 italic">Assumptions that gate future concepts</p>
        </div>

        <div className="p-4 rounded-xl bg-secondary/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Assertion Log</span>
            <ScrollText className="w-4 h-4 text-cyan-500" />
          </div>
          <p className="text-xs text-muted-foreground mb-2">Your proven truths:</p>
          {assertions.length >= 2 && (
            <div className="mb-3 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                <Link2 className="w-3 h-3" />
                <span>How would you link these for a new user?</span>
              </div>
            </div>
          )}
          <div className="space-y-2 max-h-32 overflow-auto">
            {assertions.map((assertion) => (
              <div key={assertion.id} className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <p className="text-xs text-cyan-300 leading-relaxed">"{assertion.text}"</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-secondary/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Socratic Techniques</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="space-y-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-1 text-xs rounded-md bg-blue-500/20 text-blue-400">Multimodal Scaffold</span>
              <span className="text-xs text-muted-foreground">Co-construct</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="px-2 py-1 text-xs rounded-md bg-orange-500/20 text-orange-400">Misconception Tax.</span>
              <span className="text-xs text-muted-foreground">Categorize gaps</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="px-2 py-1 text-xs rounded-md bg-purple-500/20 text-purple-400">Curriculum Map</span>
              <span className="text-xs text-muted-foreground">Strategic unlock</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="px-2 py-1 text-xs rounded-md bg-emerald-500/20 text-emerald-400">Consistency Score</span>
              <span className="text-xs text-muted-foreground">You summarize</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          "The only true wisdom is knowing you know nothing." — Socrates
        </p>
      </div>
    </aside>
  )
}
