import type { ThoughtNode } from "../socratic-app"
import { GripHorizontal, Sparkles, CheckCircle2, HelpCircle } from "lucide-react"

interface InfiniteCanvasViewProps {
  nodes: ThoughtNode[]
  currentNodeId: string
  onNodeSelect: (id: string) => void
}

const stickyColors = {
  feynman: "bg-blue-500/20 border-blue-500/50",
  "edge-case": "bg-orange-500/20 border-orange-500/50",
  assumption: "bg-purple-500/20 border-purple-500/50",
  "double-down": "bg-emerald-500/20 border-emerald-500/50",
  "counter-exemplar": "bg-rose-500/20 border-rose-500/50",
  "reflective-toss": "bg-teal-500/20 border-teal-500/50",
  root: "bg-muted border-border",
}

// Generate dynamic positions for nodes in a grid-like pattern
function generateNodePositions(nodeArray: ThoughtNode[]): Record<string, { x: number; y: number }> {
  const cols = 3
  const spacing = 280
  const positions: Record<string, { x: number; y: number }> = {}
  
  nodeArray.forEach((node, index) => {
    positions[node.id] = {
      x: (index % cols) * spacing + 50,
      y: Math.floor(index / cols) * spacing + 50,
    }
  })
  
  return positions
}

export function InfiniteCanvasView({ nodes, currentNodeId, onNodeSelect }: InfiniteCanvasViewProps) {
  const nodePositions = generateNodePositions(nodes)

  return (
    <div className="h-full relative overflow-auto bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-card to-background">
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle, var(--color-muted) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Sticky notes */}
      <div className="relative min-h-full min-w-full p-8">
        {nodes.map((node) => {
          const pos = nodePositions[node.id]
          return (
            <div
              key={node.id}
              onClick={() => onNodeSelect(node.id)}
              style={{
                left: pos.x,
                top: pos.y,
              }}
              className={`absolute w-64 p-4 rounded-xl border-2 cursor-pointer transition-all hover:scale-105 hover:z-10 ${
                stickyColors[node.type]
              } ${currentNodeId === node.id ? "ring-2 ring-primary scale-105 z-10" : ""}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {node.answer ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <HelpCircle className="w-4 h-4 text-amber-500" />
                  )}
                  <span className="text-xs text-muted-foreground capitalize font-medium">
                    {node.type.replace("-", " ")}
                  </span>
                </div>
                <GripHorizontal className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-sm text-foreground font-medium leading-relaxed">{node.question}</p>
              {node.answer && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-xs text-muted-foreground italic">"{node.answer}"</p>
                </div>
              )}
            </div>
          )
        })}

        {/* AI drop zone indicator */}
        <div className="absolute bottom-8 right-8 p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 text-center">
          <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">AI will drop new</p>
          <p className="text-sm text-muted-foreground">questions here</p>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex items-center gap-4 p-3 rounded-lg bg-card/80 backdrop-blur-sm border border-border">
        <span className="text-xs text-muted-foreground">Legend:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500/50" />
          <span className="text-xs text-muted-foreground">Feynman</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-orange-500/50" />
          <span className="text-xs text-muted-foreground">Edge Case</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-purple-500/50" />
          <span className="text-xs text-muted-foreground">Assumption</span>
        </div>
      </div>
    </div>
  )
}
