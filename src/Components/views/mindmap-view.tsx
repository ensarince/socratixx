import type { ThoughtNode } from "../socratic-app"
import {
  CheckCircle2,
  HelpCircle,
  Search,
  BarChart3,
  Zap,
  ZoomIn,
  ZoomOut,
  GripHorizontal,
  Trees,
  Maximize2,
} from "lucide-react"
import { useState, useRef, useEffect, useMemo } from "react"

interface BrainstormViewProps {
  nodes: ThoughtNode[]
  currentNodeId: string
  onNodeSelect: (id: string) => void
}

type ViewMode = "tree" | "graph"

const typeColors = {
  feynman: "border-blue-500 bg-blue-500/5",
  "edge-case": "border-orange-500 bg-orange-500/5",
  assumption: "border-purple-500 bg-purple-500/5",
  "double-down": "border-emerald-500 bg-emerald-500/5",
  "counter-exemplar": "border-rose-500 bg-rose-500/5",
  "reflective-toss": "border-teal-500 bg-teal-500/5",
  root: "border-muted bg-muted/5",
}

const typeLabels: Record<string, string> = {
  feynman: "Explanation",
  "edge-case": "Edge Case",
  assumption: "Assumption",
  "double-down": "Deep Dive",
  "counter-exemplar": "Counter-Example",
  "reflective-toss": "Reflection",
  root: "Topic",
}

// Generate grid positions for graph mode
function generateNodePositions(nodeArray: ThoughtNode[]): Record<string, { x: number; y: number }> {
  const cols = 4
  const spacing = 320
  const positions: Record<string, { x: number; y: number }> = {}

  nodeArray.forEach((node, index) => {
    positions[node.id] = {
      x: (index % cols) * spacing + 40,
      y: Math.floor(index / cols) * spacing + 40,
    }
  })

  return positions
}

export function MindMapView({ nodes, currentNodeId, onNodeSelect }: BrainstormViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("graph")
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [showMetrics, setShowMetrics] = useState(true)
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [customPositions, setCustomPositions] = useState<Record<string, { x: number; y: number }>>({})
  const canvasRef = useRef<HTMLDivElement>(null)
  const startPosRef = useRef({ x: 0, y: 0, nodeX: 0, nodeY: 0 })

  const rootNode = nodes.find((n) => n.type === "root")
  const getNodeChildren = (parentId: string) => nodes.filter((n) => n.parent === parentId)

  // Graph mode positions
  const graphPositions = useMemo(() => {
    const generated = generateNodePositions(nodes)
    return { ...generated, ...customPositions }
  }, [nodes, customPositions])

  // Filter nodes based on search
  const matchingNodes = useMemo(() => {
    if (!searchTerm.trim()) return new Set(nodes.map((n) => n.id))
    const term = searchTerm.toLowerCase()
    const matching = new Set<string>()
    nodes.forEach((node) => {
      if (
        node.question.toLowerCase().includes(term) ||
        (node.answer && node.answer.toLowerCase().includes(term)) ||
        node.type.toLowerCase().includes(term)
      ) {
        matching.add(node.id)
        // Also add all ancestors to show path
        let current = node
        while (current.parent) {
          matching.add(current.parent)
          current = nodes.find((n) => n.id === current.parent) || current
        }
      }
    })
    return matching
  }, [searchTerm, nodes])

  // Calculate statistics
  const metrics = useMemo(() => {
    const completed = nodes.filter((n) => n.status === "completed").length
    const totalNodes = nodes.length
    const avgConfidence =
      nodes.filter((n) => n.confidence !== undefined).length > 0
        ? Math.round(
            nodes
              .filter((n) => n.confidence !== undefined)
              .reduce((sum, n) => sum + (n.confidence || 0), 0) / nodes.filter((n) => n.confidence !== undefined).length
          )
        : 0

    const typeCount: Record<string, number> = {}
    nodes.forEach((n) => {
      typeCount[n.type] = (typeCount[n.type] || 0) + 1
    })

    const misconceptionCount = nodes.filter((n) => n.misconceptionType).length

    const maxDepth = (nodeId: string, currentDepth: number = 0): number => {
      const children = nodes.filter((n) => n.parent === nodeId)
      if (children.length === 0) return currentDepth
      return Math.max(...children.map((c) => maxDepth(c.id, currentDepth + 1)))
    }

    return {
      completed,
      totalNodes,
      avgConfidence,
      typeCount,
      misconceptionCount,
      maxDepth: rootNode ? maxDepth(rootNode.id) : 0,
    }
  }, [nodes, rootNode])

  // Handle mouse wheel zoom
  useEffect(() => {
    const currentCanvas = canvasRef.current
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? 0.9 : 1.1
        setZoom((prev) => Math.max(0.5, Math.min(3, prev * delta)))
      }
    }

    if (currentCanvas) {
      currentCanvas.addEventListener("wheel", handleWheel, { passive: false })
      return () => currentCanvas.removeEventListener("wheel", handleWheel)
    }
  }, [])

  // Handle panning with right-click drag
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault()
      const startX = e.clientX
      const startY = e.clientY

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - startX
        const dy = moveEvent.clientY - startY
        setPanX((prev) => prev + dx)
        setPanY((prev) => prev + dy)
      }

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }
  }

  // Handle node dragging
  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()

    setDraggedNode(nodeId)
    const currentPos = graphPositions[nodeId] || { x: 0, y: 0 }
    startPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      nodeX: currentPos.x,
      nodeY: currentPos.y,
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startPosRef.current.x) / zoom
      const dy = (moveEvent.clientY - startPosRef.current.y) / zoom

      setCustomPositions((prev) => ({
        ...prev,
        [nodeId]: {
          x: startPosRef.current.nodeX + dx,
          y: startPosRef.current.nodeY + dy,
        },
      }))
    }

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      setDraggedNode(null)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  const getStatusIcon = (node: ThoughtNode) => {
    switch (node.status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      case "unlocked":
        return <HelpCircle className="w-4 h-4 text-amber-500" />
      default:
        return null
    }
  }

  const canSelect = (node: ThoughtNode) => node.status === "unlocked" || node.status === "completed"

  // Render node card
  const renderNodeCard = (node: ThoughtNode, size: string = "300px") => {
    const isMatching = matchingNodes.has(node.id)

    return (
      <div
        key={node.id}
        onClick={() => canSelect(node) && onNodeSelect(node.id)}
        onMouseDown={(e) => viewMode === "graph" && handleNodeMouseDown(node.id, e)}
        style={{
          width: size,
          opacity: isMatching ? 1 : 0.25,
        }}
        className={`p-4 rounded-xl border-2 transition-all ${typeColors[node.type]}
          ${!isMatching ? "grayscale" : ""}
          ${currentNodeId === node.id ? "ring-2 ring-primary" : "hover:scale-105"}
          ${viewMode === "graph" ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}
          ${draggedNode === node.id ? "ring-2 ring-primary shadow-lg" : ""}`}
      >
        <div className="flex items-start justify-between mb-2 gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getStatusIcon(node)}
            <span className="text-xs text-muted-foreground capitalize font-medium truncate">
              {typeLabels[node.type]}
            </span>
          </div>
          {viewMode === "graph" && <GripHorizontal className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
        </div>

        <p className="text-sm text-foreground font-medium leading-relaxed mb-2 line-clamp-3">{node.question}</p>

        <div className="flex items-center justify-between gap-2 text-xs mb-2 flex-wrap">
          {node.confidence !== undefined && (
            <span
              className={`px-2 py-1 rounded ${
                node.confidence > 80
                  ? "bg-emerald-500/30 text-emerald-400"
                  : node.confidence > 50
                    ? "bg-amber-500/30 text-amber-400"
                    : "bg-rose-500/30 text-rose-400"
              }`}
            >
              {node.confidence}%
            </span>
          )}
          {node.children.length > 0 && (
            <span className="text-muted-foreground bg-muted/30 px-2 py-1 rounded">
              {node.children.length} idea{node.children.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {node.answer && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground italic line-clamp-2">"{node.answer}"</p>
          </div>
        )}
      </div>
    )
  }

  // Render tree mode
  const renderTreeNode = (parentId: string, depth: number = 0) => {
    const children = getNodeChildren(parentId).filter((n) => matchingNodes.has(n.id))

    if (children.length === 0) return null

    return (
      <div key={`level-${parentId}`} className={`flex flex-col gap-4 ${depth > 0 ? "ml-8" : ""}`}>
        {children.map((child) => (
          <div key={child.id} className="flex flex-col">
            <div className="flex items-start gap-3">
              {getNodeChildren(child.id).length > 0 && <div className="w-4" />}
              {getNodeChildren(child.id).length === 0 && <div className="w-4" />}

              {renderNodeCard(child, "max-w-md")}
            </div>

            {getNodeChildren(child.id).length > 0 && (
              <div className="flex">
                <div className="w-6 border-l border-border/50 mt-4" />
                <div className="flex-1">{renderTreeNode(child.id, depth + 1)}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      ref={canvasRef}
      className="h-full relative overflow-hidden bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-card to-background"
      onMouseDown={handleCanvasMouseDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      {viewMode === "graph" && (
        <>
          {/* Grid pattern for graph mode */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle, var(--color-muted) 1px, transparent 1px)`,
              backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
              transform: `translate(${panX}px, ${panY}px)`,
            }}
          />

          {/* SVG Connections for graph mode */}
          <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%" style={{ overflow: "visible" }}>
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <polygon points="0 0, 10 3, 0 6" fill="rgba(128, 128, 128, 0.2)" />
              </marker>
            </defs>
            {nodes.map((node) => {
              if (!node.parent) return null
              const childPos = graphPositions[node.id]
              const parentPos = graphPositions[node.parent]
              if (!childPos || !parentPos) return null

              const x1 = parentPos.x * zoom + panX + 150
              const y1 = parentPos.y * zoom + panY + 80
              const x2 = childPos.x * zoom + panX + 150
              const y2 = childPos.y * zoom + panY + 80

              return (
                <line
                  key={`line-${node.id}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(128, 128, 128, 0.2)"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
              )
            })}
          </svg>

          {/* Graph mode nodes */}
          <div
            style={{
              transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
              transformOrigin: "0 0",
              width: "100%",
              height: "100%",
            }}
          >
            {nodes.map((node) => {
              const pos = graphPositions[node.id]
              if (!pos) return null

              return (
                <div
                  key={node.id}
                  style={{
                    position: "absolute",
                    left: pos.x,
                    top: pos.y,
                  }}
                >
                  {renderNodeCard(node)}
                </div>
              )
            })}
          </div>
        </>
      )}

      {viewMode === "tree" && (
        <div className="h-full overflow-auto p-8">
          <div className="flex flex-col gap-8">
            {/* Breadcrumb */}
            <div className="text-sm text-muted-foreground">
              <Zap className="w-4 h-4 inline mr-2" />
              <span>{rootNode ? `Exploring: ${rootNode.answer}` : "Start by selecting a topic"}</span>
            </div>

            {/* Tree content */}
            {rootNode && (
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-center">
                  {renderNodeCard(rootNode)}
                </div>

                {getNodeChildren("root").length > 0 && (
                  <>
                    <div className="w-px h-8 bg-border mx-auto" />
                    <div className="w-full">{renderTreeNode("root")}</div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metrics Sidebar */}
      {showMetrics && (
        <div className="absolute right-0 top-0 w-64 h-full border-l border-border bg-muted/20 p-4 overflow-auto flex flex-col gap-4 z-40">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Metrics
            </h3>
            <button onClick={() => setShowMetrics(false)} className="text-xs text-muted-foreground hover:text-foreground">
              ✕
            </button>
          </div>

          <div className="space-y-3">
            <div className="bg-card rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Progress</p>
              <p className="text-lg font-bold">
                {metrics.completed}/{metrics.totalNodes}
              </p>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${(metrics.completed / metrics.totalNodes) * 100}%` }}
                />
              </div>
            </div>

            <div className="bg-card rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Avg Confidence</p>
              <p className="text-lg font-bold">{metrics.avgConfidence}%</p>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    metrics.avgConfidence > 80
                      ? "bg-emerald-500"
                      : metrics.avgConfidence > 50
                        ? "bg-amber-500"
                        : "bg-rose-500"
                  }`}
                  style={{ width: `${metrics.avgConfidence}%` }}
                />
              </div>
            </div>

            <div className="bg-card rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Exploration Depth</p>
              <p className="text-lg font-bold">{metrics.maxDepth}</p>
              <p className="text-xs text-muted-foreground mt-1">levels</p>
            </div>

            {metrics.misconceptionCount > 0 && (
              <div className="bg-rose-500/10 rounded-lg p-3 border border-rose-500/30">
                <p className="text-xs text-muted-foreground mb-1">Knowledge Gaps</p>
                <p className="text-lg font-bold text-rose-400">{metrics.misconceptionCount}</p>
              </div>
            )}
          </div>

          <div className="bg-card rounded-lg p-3 border border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Ideas by Type</p>
            <div className="space-y-1">
              {Object.entries(metrics.typeCount).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground capitalize">{typeLabels[type as keyof typeof typeLabels] || type}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border/50 pt-3 text-xs text-muted-foreground">
            <p>
              <span className="text-xs">✓ Completed</span>
            </p>
            <p>
              <span className="text-xs">? Ready</span>
            </p>
          </div>
        </div>
      )}

      {/* Top Controls */}
      <div className={`absolute top-4 flex flex-col gap-2 z-40 transition-all ${showMetrics ? "right-72" : "right-4"}`}>
        {!showMetrics && (
          <button onClick={() => setShowMetrics(true)} className="p-2 hover:bg-muted rounded-lg transition-colors" title="Show metrics">
            <BarChart3 className="w-4 h-4" />
          </button>
        )}

        <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-3 flex flex-col gap-2">
          <div className="text-xs font-semibold text-muted-foreground mb-1">Search</div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Find ideas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48 pl-8 pr-3 py-2 rounded text-sm bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {viewMode === "graph" && (
            <div className="border-t border-border/50 pt-2 mt-2">
              <div className="text-xs font-semibold text-muted-foreground mb-2">Zoom</div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.2))}
                  className="p-2 hover:bg-muted rounded transition-colors"
                  title="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="px-3 py-2 text-sm text-muted-foreground text-center w-12 bg-muted/30 rounded">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom((prev) => Math.min(3, prev + 0.2))}
                  className="p-2 hover:bg-muted rounded transition-colors"
                  title="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="border-t border-border/50 pt-2 mt-2">
            <div className="text-xs font-semibold text-muted-foreground mb-2">View Mode</div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("tree")}
                className={`p-2 rounded transition-colors ${viewMode === "tree" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                title="Tree view"
              >
                <Trees className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("graph")}
                className={`p-2 rounded transition-colors ${viewMode === "graph" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                title="Graph view"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
