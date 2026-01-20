import type { ThoughtNode } from "../socratic-app"
import { CheckCircle2, HelpCircle, Lock, Ghost } from "lucide-react"

interface MindMapViewProps {
  nodes: ThoughtNode[]
  currentNodeId: string
  onNodeSelect: (id: string) => void
}

const typeColors = {
  feynman: "border-blue-500",
  "edge-case": "border-orange-500",
  assumption: "border-purple-500",
  "double-down": "border-emerald-500",
  "counter-exemplar": "border-rose-500",
  "reflective-toss": "border-teal-500",
  root: "border-muted",
}

const statusStyles = {
  completed: "bg-card opacity-100",
  unlocked: "bg-card opacity-100",
  locked: "bg-muted/30 opacity-60",
  ghost: "bg-transparent opacity-30 border-dashed",
}

export function MindMapView({ nodes, currentNodeId, onNodeSelect }: MindMapViewProps) {
  const rootNode = nodes.find((n) => n.type === "root")
  const level1Nodes = nodes.filter((n) => n.parent === "root")
  const level2Nodes = nodes.filter((n) => level1Nodes.some((l1) => l1.id === n.parent))

  const getStatusIcon = (node: ThoughtNode) => {
    switch (node.status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      case "unlocked":
        return <HelpCircle className="w-4 h-4 text-amber-500" />
      case "locked":
        return <Lock className="w-4 h-4 text-muted-foreground" />
      case "ghost":
        return <Ghost className="w-4 h-4 text-muted-foreground/50" />
    }
  }

  const canSelect = (node: ThoughtNode) => node.status === "unlocked" || node.status === "completed"

  return (
    <div className="h-full overflow-auto p-8">
      <div className="min-w-[900px] flex flex-col items-center gap-8">
        <div className="flex items-center gap-6 text-xs text-muted-foreground mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-3 h-3 text-amber-500" />
            <span>Ready to explore</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-3 h-3 text-muted-foreground" />
            <span>Locked</span>
          </div>
          <div className="flex items-center gap-2">
            <Ghost className="w-3 h-3 text-muted-foreground/50" />
            <span>Future path</span>
          </div>
        </div>

        {/* Root Node */}
        {rootNode && (
          <div
            onClick={() => canSelect(rootNode) && onNodeSelect(rootNode.id)}
            className={`p-6 rounded-2xl border-2 transition-all max-w-md text-center
              ${typeColors[rootNode.type]} ${statusStyles[rootNode.status]}
              ${canSelect(rootNode) ? "cursor-pointer hover:ring-2 hover:ring-primary/50" : "cursor-not-allowed"}
              ${currentNodeId === rootNode.id ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              {getStatusIcon(rootNode)}
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Topic</span>
            </div>
            <p className="text-lg font-medium text-foreground">{rootNode.answer}</p>
          </div>
        )}

        <div className="w-px h-8 bg-border" />

        {/* Level 1 */}
        <div className="flex items-start gap-8">
          {level1Nodes.map((node) => (
            <div key={node.id} className="flex flex-col items-center gap-4">
              <div
                onClick={() => canSelect(node) && onNodeSelect(node.id)}
                className={`p-5 rounded-xl border-2 transition-all max-w-xs
                  ${typeColors[node.type]} ${statusStyles[node.status]}
                  ${canSelect(node) ? "cursor-pointer hover:ring-2 hover:ring-primary/50" : "cursor-not-allowed"}
                  ${currentNodeId === node.id ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(node)}
                  <span className="text-xs text-muted-foreground capitalize">{node.type.replace("-", " ")}</span>
                  {node.confidence !== undefined && (
                    <span
                      className={`ml-auto text-xs px-1.5 py-0.5 rounded ${
                        node.confidence > 80
                          ? "bg-emerald-500/20 text-emerald-400"
                          : node.confidence > 50
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-rose-500/20 text-rose-400"
                      }`}
                    >
                      {node.confidence}%
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground">{node.question}</p>
                {node.answer && (
                  <p className="mt-2 text-xs text-muted-foreground italic line-clamp-2">"{node.answer}"</p>
                )}
                {node.misconceptionType && (
                  <div className="mt-2 px-2 py-1 rounded bg-rose-500/20 text-rose-400 text-xs">
                    Detected: {node.misconceptionType} gap
                  </div>
                )}
              </div>

              {/* Level 2 children - including ghost nodes */}
              {node.children.length > 0 && (
                <>
                  <div className="w-px h-6 bg-border" />
                  <div className="flex gap-4">
                    {level2Nodes
                      .filter((n) => n.parent === node.id)
                      .map((child) => (
                        <div
                          key={child.id}
                          onClick={() => canSelect(child) && onNodeSelect(child.id)}
                          className={`p-4 rounded-lg border-2 transition-all max-w-[200px]
                            ${typeColors[child.type]} ${statusStyles[child.status]}
                            ${canSelect(child) ? "cursor-pointer hover:ring-2 hover:ring-primary/50" : "cursor-not-allowed"}
                            ${currentNodeId === child.id ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(child)}
                            <span className="text-[10px] text-muted-foreground capitalize">
                              {child.type.replace("-", " ")}
                            </span>
                          </div>
                          <p className="text-xs text-foreground">{child.status === "ghost" ? "???" : child.question}</p>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Complete questions to unlock new branches</p>
          <p className="mt-1">Ghost nodes reveal themselves as you progress</p>
        </div>
      </div>
    </div>
  )
}
