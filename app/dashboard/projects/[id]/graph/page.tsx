'use client'

import { use } from 'react'
import { useDecisions } from '@/hooks/useDecisions'
import { useProject } from '@/context/ProjectContext'

export default function GraphPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { decisions } = useDecisions(id)
  const { projects } = useProject()
  const project = projects.find((p) => p.id === id)

  if (!project) return <div>Project not found</div>

  // Create nodes from decisions and people
  const nodeIds = new Set<string>()
  const edges: { source: string; target: string; label: string }[] = []

  // Add decision nodes
  decisions.forEach((decision) => {
    nodeIds.add(`d-${decision.id}`)
    nodeIds.add(`p-${decision.author.id}`)

    // Author created decision
    edges.push({
      source: `p-${decision.author.id}`,
      target: `d-${decision.id}`,
      label: 'proposed',
    })

    // Handle supersessions
    decision.supersedes?.forEach((superId) => {
      edges.push({
        source: `d-${decision.id}`,
        target: `d-${superId}`,
        label: 'supersedes',
      })
    })
  })

  const nodes = Array.from(nodeIds)

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Decision Graph</h1>
          <p className="text-muted-foreground">Visual representation of decision relationships</p>
        </div>

        {/* Graph Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Nodes</p>
            <p className="text-3xl font-bold">{nodes.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Edges</p>
            <p className="text-3xl font-bold">{edges.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Decisions</p>
            <p className="text-3xl font-bold">{decisions.length}</p>
          </div>
        </div>

        {/* Graph Visualization */}
        <div className="bg-card border border-border rounded-lg p-8 min-h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-bold mb-2">Interactive Graph View</h3>
            <p className="text-muted-foreground max-w-md">
              This would render an interactive graph visualization showing all decision nodes and their relationships. 
              Each node represents a decision or person, and edges show relationships like "proposes", "supersedes", etc.
            </p>
          </div>
        </div>

        {/* Relationships Table */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Decision Relationships</h2>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-border/50 bg-muted/50">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold">From</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold">Relationship</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold">To</th>
                </tr>
              </thead>
              <tbody>
                {edges.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-muted-foreground">
                      No relationships yet
                    </td>
                  </tr>
                ) : (
                  edges.map((edge, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 text-sm">
                        {edge.source.startsWith('p-') ? 'Person' : 'Decision'}: {edge.source.slice(2)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-primary">{edge.label}</td>
                      <td className="px-6 py-4 text-sm">
                        {edge.target.startsWith('p-') ? 'Person' : 'Decision'}: {edge.target.slice(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
