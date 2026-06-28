'use client'

import { use, useState, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  MarkerType,
  Node,
  Edge,
} from '@xyflow/react'
import { useProject } from '@/context/ProjectContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function getNodeStyle(type: string, isSuperseded: boolean) {
  const base = {
    padding: '12px',
    borderRadius: '8px',
    border: '2px solid black',
    color: 'white',
    fontSize: '12px',
    minWidth: '180px',
    transition: 'all 0.2s',
  }

  if (isSuperseded) {
    return {
      ...base,
      background: '#27272a',
      borderColor: '#ef4444',
      borderStyle: 'dashed',
      boxShadow: '4px 4px 0px 0px rgba(239, 68, 68, 0.3)',
      opacity: 0.8
    }
  }

  switch (type) {
    case 'Person':
      return {
        ...base,
        background: '#1e3a8a',
        borderColor: '#3b82f6',
        boxShadow: '4px 4px 0px 0px rgba(59, 130, 246, 0.7)'
      }
    case 'Decision':
      return {
        ...base,
        background: '#064e3b',
        borderColor: '#10b981',
        boxShadow: '4px 4px 0px 0px rgba(16, 185, 129, 0.7)'
      }
    case 'Message':
      return {
        ...base,
        background: '#4c1d95',
        borderColor: '#8b5cf6',
        boxShadow: '4px 4px 0px 0px rgba(139, 92, 246, 0.7)'
      }
    case 'Channel':
      return {
        ...base,
        background: '#701a75',
        borderColor: '#d946ef',
        boxShadow: '4px 4px 0px 0px rgba(217, 70, 239, 0.7)'
      }
    case 'Project':
      return {
        ...base,
        background: '#78350f',
        borderColor: '#f59e0b',
        boxShadow: '4px 4px 0px 0px rgba(245, 158, 11, 0.7)'
      }
    default:
      return {
        ...base,
        background: '#18181b',
        borderColor: '#3f3f46',
        boxShadow: '4px 4px 0px 0px rgba(63, 63, 70, 0.7)'
      }
  }
}

export default function GraphPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { projects } = useProject()
  const project = projects.find((p) => p.id === id)

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedNode, setSelectedNode] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Search states for the Graph Page
  const [graphQuery, setGraphQuery] = useState('')
  const [isGraphSearching, setIsGraphSearching] = useState(false)

  const highlightNodeIds = (ids: string[], allNodesList?: Node[]) => {
    const list = allNodesList || nodes
    setNodes((prevNodes) =>
      prevNodes.map((n) => {
        const isRelevant = ids.includes(n.id)
        if (isRelevant) {
          return {
            ...n,
            style: {
              ...getNodeStyle((n.data as any).rawEntity.type, (n.data as any).isSuperseded),
              transform: 'scale(1.08)',
              boxShadow: '0 0 20px rgba(255, 255, 255, 1)',
              borderColor: '#ffffff',
            }
          }
        } else {
          return {
            ...n,
            style: {
              ...getNodeStyle((n.data as any).rawEntity.type, (n.data as any).isSuperseded),
              opacity: 0.15
            }
          }
        }
      })
    )

    const matchedNode = list.find((n) => ids.includes(n.id))
    if (matchedNode) {
      setSelectedNode(matchedNode)
    }
  }

  const loadGraph = async (highlightIds?: string[]) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/graph')
      const data = await res.json()
      if (data.success) {
        const relations = data.relations || []

        const entitiesMap = new Map<string, any>()
        const supersededSet = new Set<string>()

        // Keep track of counts/relationships
        const proposedCount = new Map<string, number>()
        const affectsCount = new Map<string, string[]>()

        for (const triplet of relations) {
          const source = triplet.source
          const target = triplet.target

          if (source) entitiesMap.set(source.entityId, source)
          if (target) entitiesMap.set(target.entityId, target)

          for (const rel of triplet.relations || []) {
            if (rel.rawPredicate === 'superseded_by') {
              supersededSet.add(rel.sourceEntityId)
            }
            if (rel.rawPredicate === 'proposed') {
              const current = proposedCount.get(rel.sourceEntityId) || 0
              proposedCount.set(rel.sourceEntityId, current + 1)
            }
          }
        }

        // Second pass for project affects lists
        for (const triplet of relations) {
          for (const rel of triplet.relations || []) {
            if (rel.rawPredicate === 'affects') {
              const projectNode = entitiesMap.get(rel.targetEntityId)
              const decisionNode = entitiesMap.get(rel.sourceEntityId)
              if (projectNode && decisionNode) {
                try {
                  const dec = JSON.parse(decisionNode.identifier)
                  const current = affectsCount.get(rel.targetEntityId) || []
                  if (!current.includes(dec.title)) {
                    current.push(dec.title)
                    affectsCount.set(rel.targetEntityId, current)
                  }
                } catch {}
              }
            }
          }
        }

        // Build nodes with fixed X layout columns and incremental Y positions
        const parsedNodes: any[] = []
        const typeCounters = new Map<string, number>()

        const columns: Record<string, number> = {
          'Person': 80,
          'Decision': 380,
          'Message': 680,
          'Channel': 980,
          'Project': 1280
        }

        const entities = Array.from(entitiesMap.values())

        for (const entity of entities) {
          const type = entity.type
          const colX = columns[type] || 600
          const count = typeCounters.get(type) || 0
          typeCounters.set(type, count + 1)

          let parsedInfo = null
          try {
            parsedInfo = JSON.parse(entity.identifier)
          } catch {}

          const isSuperseded = supersededSet.has(entity.entityId)
          let connectionsCount = 0
          if (type === 'Person') {
            connectionsCount = proposedCount.get(entity.entityId) || 0
          }

          parsedNodes.push({
            id: entity.entityId,
            type: 'default',
            data: {
              label: (
                <div className="flex flex-col items-center select-none">
                  <span className="font-bold text-[9px] uppercase opacity-75 tracking-wider">{entity.type}</span>
                  <span className="font-semibold text-center text-xs break-words max-w-[150px] mt-0.5 line-clamp-2">
                    {parsedInfo?.title || entity.name}
                  </span>
                  {isSuperseded && (
                    <span className="bg-destructive/20 border border-destructive/30 text-destructive text-[8px] px-1.5 py-0.2 rounded mt-1 font-bold">
                      Superseded
                    </span>
                  )}
                </div>
              ),
              rawEntity: entity,
              parsedInfo,
              isSuperseded,
              connectionsCount,
              relatedDecisions: affectsCount.get(entity.entityId) || []
            },
            position: {
              x: colX,
              y: count * 150 + 100
            },
            style: getNodeStyle(type, isSuperseded),
          })
        }

        // Build edges
        const parsedEdges: any[] = []
        const edgeKeys = new Set<string>()

        const relationColors: Record<string, string> = {
          'proposed': '#3b82f6',
          'surfaced_in': '#ec4899',
          'superseded_by': '#ef4444',
          'affects': '#f59e0b',
          'has_source': '#10b981'
        }

        for (const triplet of relations) {
          for (const rel of triplet.relations || []) {
            const edgeId = `${rel.sourceEntityId}-${rel.targetEntityId}-${rel.rawPredicate}`
            if (edgeKeys.has(edgeId)) continue
            edgeKeys.add(edgeId)

            const color = relationColors[rel.rawPredicate] || '#94a3b8'

            parsedEdges.push({
              id: edgeId,
              source: rel.sourceEntityId,
              target: rel.targetEntityId,
              label: rel.rawPredicate,
              type: 'smoothstep',
              animated: rel.rawPredicate === 'superseded_by',
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color
              },
              style: {
                stroke: color,
                strokeWidth: 2
              },
              labelStyle: {
                fill: '#94a3b8',
                fontSize: 8,
                fontWeight: 'semibold'
              }
            })
          }
        }

        setNodes(parsedNodes)
        setEdges(parsedEdges)

        // Run initial highlighting if IDs exist
        if (highlightIds && highlightIds.length > 0) {
          setTimeout(() => {
            highlightNodeIds(highlightIds, parsedNodes)
          }, 100)
        }
      }
    } catch (err) {
      console.error('Failed to load graph data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const highlight = searchParams.get('highlight')
    if (highlight) {
      loadGraph(highlight.split(','))
    } else {
      loadGraph()
    }
  }, [id])

  const onNodeClick = (_: any, node: any) => {
    setSelectedNode(node)
    
    // Highlight the selected node by dimming everything else
    setNodes((prevNodes) =>
      prevNodes.map((n) => {
        if (n.id === node.id) {
          return {
            ...n,
            style: {
              ...getNodeStyle((n.data as any).rawEntity.type, (n.data as any).isSuperseded),
              transform: 'scale(1.05)',
              boxShadow: '0 0 15px rgba(255, 255, 255, 0.8)',
              borderColor: '#ffffff',
            }
          }
        } else {
          return {
            ...n,
            style: {
              ...getNodeStyle((n.data as any).rawEntity.type, (n.data as any).isSuperseded),
              opacity: 0.3
            }
          }
        }
      })
    )
  }

  const onPaneClick = () => {
    setSelectedNode(null)
    // Reset original styles
    setNodes((prevNodes) =>
      prevNodes.map((n) => ({
        ...n,
        style: getNodeStyle((n.data as any).rawEntity.type, (n.data as any).isSuperseded)
      }))
    )
  }

  const handleGraphSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!graphQuery.trim()) return

    setIsGraphSearching(true)
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: graphQuery, projectId: id })
      })
      if (res.ok) {
        const data = await res.json()
        const result = data.result
        
        if (result && result.hasResult && result.relevantNodeIds) {
          highlightNodeIds(result.relevantNodeIds)
          
          setSelectedNode({
            id: 'search-result',
            data: {
              rawEntity: { type: 'Search Result' },
              parsedInfo: {
                title: 'Search Result',
                description: result.answer,
                reasoning: result.details?.reasoning,
                confidenceScore: result.details?.confidence,
                timeline: result.details?.timestamps,
                impact: 'high'
              },
              relatedDecisions: result.details?.decisionHistory || []
            }
          })
        } else {
          onPaneClick()
          setSelectedNode({
            id: 'search-result',
            data: {
              rawEntity: { type: 'Search Result' },
              parsedInfo: {
                title: 'No Matching Decision Found',
                description: 'Gemini searched the live graph relations but found no matching decisions or information.',
                reasoning: '',
                impact: 'low'
              },
              relatedDecisions: []
            }
          })
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsGraphSearching(false)
    }
  }

  if (!project) return <div>Project not found</div>

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Decision Graph</h1>
            <p className="text-muted-foreground">Interactive visualization of decisions, source messages, and people</p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Inline Semantic Graph Search Bar */}
            <form onSubmit={handleGraphSearch} className="flex gap-2 w-full md:w-80">
              <Input
                placeholder="Ask about authentication/database..."
                value={graphQuery}
                onChange={(e) => setGraphQuery(e.target.value)}
                className="h-10"
                disabled={isGraphSearching}
              />
              <Button type="submit" disabled={isGraphSearching} className="h-10">
                {isGraphSearching ? 'Searching...' : '🔍'}
              </Button>
            </form>

            <Button onClick={() => loadGraph()} variant="outline" className="flex items-center gap-2 h-10">
              <span>🔄</span> Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* React Flow Graph Area */}
          <div className="lg:col-span-3">
            <div style={{ height: 600 }} className="border-2 border-foreground rounded-lg overflow-hidden relative bg-black/45 shadow-[4px_4px_0px_0px_var(--primary)]">
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-muted-foreground z-10 font-bold">
                  Loading Graph Nodes...
                </div>
              ) : null}
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                fitView
              >
                <Background />
                <Controls />
                <MiniMap nodeColor={() => '#18181b'} />

                {/* Graph Legend Panel */}
                <Panel position="top-left" className="bg-card border-2 border-foreground p-3 rounded-lg shadow-lg flex flex-col gap-2 m-2 select-none">
                  <h4 className="font-bold text-[10px] uppercase opacity-75 tracking-wider border-b border-border/50 pb-1">Legend</h4>
                  <div className="flex items-center gap-2 text-[10px] font-semibold">
                    <span className="w-3 h-3 rounded bg-[#1e3a8a] border border-[#3b82f6]"></span>
                    <span>Person</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-semibold">
                    <span className="w-3 h-3 rounded bg-[#064e3b] border border-[#10b981]"></span>
                    <span>Decision</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-semibold">
                    <span className="w-3 h-3 rounded bg-[#4c1d95] border border-[#8b5cf6]"></span>
                    <span>Discord Msg</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-semibold">
                    <span className="w-3 h-3 rounded bg-[#701a75] border border-[#d946ef]"></span>
                    <span>Channel</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-semibold">
                    <span className="w-3 h-3 rounded bg-[#78350f] border border-[#f59e0b]"></span>
                    <span>Project</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-semibold border-t border-border pt-1">
                    <span className="w-3 h-3 rounded bg-[#27272a] border border-[#ef4444] border-dashed"></span>
                    <span className="text-destructive">Superseded</span>
                  </div>
                </Panel>
              </ReactFlow>
            </div>
          </div>

          {/* Node Details Inspection Drawer */}
          <div className="lg:col-span-1">
            <div className="bg-card border-2 border-foreground rounded-lg p-6 min-h-[600px] flex flex-col justify-between shadow-[4px_4px_0px_0px_var(--primary)]">
              {selectedNode ? (
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary uppercase tracking-widest">
                      {selectedNode.data.rawEntity.type}
                    </span>
                    <h3 className="text-xl font-bold mt-2 border-b border-border/50 pb-2">
                      {selectedNode.data.parsedInfo?.title || selectedNode.data.parsedInfo?.name || selectedNode.data.rawEntity.name}
                    </h3>
                  </div>

                  {selectedNode.data.rawEntity.type === 'Decision' && (
                    <div className="space-y-4 text-sm">
                      <div>
                        <h4 className="text-xs text-muted-foreground font-semibold mb-1">Decision Detail</h4>
                        <p className="text-foreground leading-relaxed bg-black/20 p-3 rounded border border-border/40">
                          {selectedNode.data.parsedInfo?.description}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-xs text-muted-foreground font-semibold mb-1">Reasoning</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          {selectedNode.data.parsedInfo?.reasoning || 'No reasoning supplied.'}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-xs text-muted-foreground font-semibold mb-1">Confidence</h4>
                          <span className="text-xs bg-yellow-500/20 text-yellow-500 font-bold px-2.5 py-0.5 rounded">
                            {selectedNode.data.parsedInfo?.confidenceScore
                              ? `${(selectedNode.data.parsedInfo.confidenceScore * 100).toFixed(0)}%`
                              : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-xs text-muted-foreground font-semibold mb-1">Impact</h4>
                          <span className="text-xs bg-primary/20 text-primary font-bold px-2.5 py-0.5 rounded">
                            {selectedNode.data.parsedInfo?.impact || 'medium'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs text-muted-foreground font-semibold mb-1">Created At</h4>
                        <p className="text-xs text-muted-foreground">
                          {new Date(selectedNode.data.parsedInfo?.timeline?.created).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedNode.data.rawEntity.type === 'Person' && (
                    <div className="space-y-4 text-sm">
                      <div>
                        <h4 className="text-xs text-muted-foreground font-semibold mb-1">Author Name</h4>
                        <p className="text-base font-bold text-foreground">
                          @{selectedNode.data.rawEntity.name}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-xs text-muted-foreground font-semibold mb-1">Decisions Proposed</h4>
                        <span className="text-lg bg-blue-500/20 text-blue-500 font-bold px-3 py-1 rounded">
                          {selectedNode.data.connectionsCount}
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedNode.data.rawEntity.type === 'Message' && (
                    <div className="space-y-4 text-sm">
                      <div>
                        <h4 className="text-xs text-muted-foreground font-semibold mb-1">Sender</h4>
                        <p className="text-sm font-bold text-foreground">
                          @{selectedNode.data.parsedInfo?.author?.username || 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-xs text-muted-foreground font-semibold mb-1">Raw Discord Message</h4>
                        <p className="text-xs text-foreground bg-black/40 p-4 rounded-lg border border-border/20 leading-relaxed font-mono whitespace-pre-wrap">
                          {selectedNode.data.parsedInfo?.content}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-xs text-muted-foreground font-semibold mb-1">Sent Time</h4>
                        <p className="text-xs text-muted-foreground">
                          {new Date(selectedNode.data.parsedInfo?.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedNode.data.rawEntity.type === 'Project' && (
                    <div className="space-y-4 text-sm">
                      <div>
                        <h4 className="text-xs text-muted-foreground font-semibold mb-1 flex items-center gap-1">
                          <span>📁</span> Related Decisions ({selectedNode.data.relatedDecisions.length})
                        </h4>
                        {selectedNode.data.relatedDecisions.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic mt-2">No related decisions connected.</p>
                        ) : (
                          <div className="space-y-2 mt-2 max-h-80 overflow-y-auto pr-1">
                            {selectedNode.data.relatedDecisions.map((decName: string, i: number) => (
                              <div key={i} className="bg-muted border border-border/50 rounded p-2 text-xs leading-relaxed font-semibold">
                                ✓ {decName}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedNode.data.rawEntity.type === 'Search Result' && (
                    <div className="space-y-4 text-sm">
                      <div>
                        <h4 className="text-xs text-muted-foreground font-semibold mb-1">Semantic Answer</h4>
                        <p className="text-foreground leading-relaxed bg-black/20 p-3 rounded border border-border/40 whitespace-pre-wrap">
                          {selectedNode.data.parsedInfo?.description}
                        </p>
                      </div>
                      {selectedNode.data.parsedInfo?.reasoning && (
                        <div>
                          <h4 className="text-xs text-muted-foreground font-semibold mb-1">Reasoning</h4>
                          <p className="text-muted-foreground leading-relaxed">
                            {selectedNode.data.parsedInfo?.reasoning}
                          </p>
                        </div>
                      )}
                      {selectedNode.data.parsedInfo?.confidenceScore && (
                        <div>
                          <h4 className="text-xs text-muted-foreground font-semibold mb-1">Confidence Score</h4>
                          <span className="text-xs bg-yellow-500/20 text-yellow-500 font-bold px-2 py-0.5 rounded">
                            {Math.round(selectedNode.data.parsedInfo.confidenceScore * 100)}%
                          </span>
                        </div>
                      )}
                      {selectedNode.data.relatedDecisions.length > 0 && (
                        <div>
                          <h4 className="text-xs text-muted-foreground font-semibold mb-1">📜 Decision History Chain</h4>
                          <div className="space-y-1 mt-1">
                            {selectedNode.data.relatedDecisions.map((hist: string, i: number) => (
                              <div key={i} className="bg-destructive/10 border border-destructive/20 text-destructive text-[10px] p-2 rounded">
                                ← {hist}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground py-16">
                  <span className="text-5xl mb-4">🔍</span>
                  <p className="font-bold text-sm">Inspect Node Details</p>
                  <p className="text-xs text-muted-foreground max-w-xs mt-2">
                    Click any node in the graph viewport to view its full configuration properties and relationship indicators.
                  </p>
                </div>
              )}

              {selectedNode ? (
                <Button onClick={onPaneClick} variant="outline" className="w-full mt-6">
                  Clear Selection
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
