'use client'

import Link from 'next/link'
import { use } from 'react'
import { useProject } from '@/context/ProjectContext'
import { useDecisions } from '@/hooks/useDecisions'
import { Button } from '@/components/ui/button'

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { projects } = useProject()
  const { decisions: allDecisions } = useDecisions(id)

  const project = projects.find((p) => p.id === id)
  if (!project) return <div>Project not found</div>

  const activeDecisions = allDecisions.filter((d) => d.status === 'active')
  const supersededDecisions = allDecisions.filter((d) => d.status === 'superseded')
  const revertedDecisions = allDecisions.filter((d) => d.status === 'reverted')

  const highImpactCount = allDecisions.filter((d) => d.impact === 'high').length

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-1">Total Decisions</p>
            <p className="text-3xl font-bold">{allDecisions.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-1">Active</p>
            <p className="text-3xl font-bold text-primary">{activeDecisions.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-1">High Impact</p>
            <p className="text-3xl font-bold text-accent">{highImpactCount}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-1">Team Size</p>
            <p className="text-3xl font-bold">{project.members.length}</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Link href={`/dashboard/projects/${id}/decisions`}>
              <Button variant="outline" className="w-full">
                📋 Decisions
              </Button>
            </Link>
            <Link href={`/dashboard/projects/${id}/connect`}>
              <Button variant="outline" className="w-full">
                🔗 Connect
              </Button>
            </Link>
            <Link href={`/dashboard/projects/${id}/search`}>
              <Button variant="outline" className="w-full">
                🔍 Search
              </Button>
            </Link>
            <Link href={`/dashboard/projects/${id}/graph`}>
              <Button variant="outline" className="w-full">
                📈 Graph
              </Button>
            </Link>
            <Link href={`/dashboard/projects/${id}/insights`}>
              <Button variant="outline" className="w-full">
                💡 Insights
              </Button>
            </Link>
          </div>
        </div>

        {/* Recent Decisions */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Recent Decisions</h2>
            <Link href={`/dashboard/projects/${id}/decisions`}>
              <Button variant="ghost" size="sm">
                View All →
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {allDecisions.slice(0, 5).map((decision) => (
              <div key={decision.id} className="bg-card border border-border rounded-lg p-4 hover:bg-card/70 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold">{decision.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{decision.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        decision.status === 'active'
                          ? 'bg-primary/20 text-primary'
                          : decision.status === 'superseded'
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-destructive/20 text-destructive'
                      }`}
                    >
                      {decision.status}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        decision.impact === 'high'
                          ? 'bg-accent/20 text-accent'
                          : decision.impact === 'medium'
                            ? 'bg-yellow-500/20 text-yellow-500'
                            : 'bg-blue-500/20 text-blue-500'
                      }`}
                    >
                      {decision.impact}
                    </span>
                  </div>
                </div>
                <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                  <span>👤 {decision.author.name}</span>
                  <span>📅 {new Date(decision.timeline.created).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
