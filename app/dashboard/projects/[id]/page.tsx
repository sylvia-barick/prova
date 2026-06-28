'use client'

import Link from 'next/link'
import { use, useState, useEffect } from 'react'
import { useProject } from '@/context/ProjectContext'
import { useDecisions } from '@/hooks/useDecisions'
import { Button } from '@/components/ui/button'

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { projects, isLoading: isProjectLoading } = useProject()
  const { decisions: allDecisions } = useDecisions(id)

  const [stats, setStats] = useState({
    totalDecisions: 0,
    activeDecisions: 0,
    reversedDecisions: 0,
    contributors: 0,
    importedMessages: 0
  })
  const [isStatsLoading, setIsStatsLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      setIsStatsLoading(true)
      try {
        const res = await fetch('/api/graph')
        const data = await res.json()
        if (data.success) {
          const relations = data.relations || []
          const uniqueEntities = new Map<string, any>()
          
          for (const triplet of relations) {
            if (triplet.source) uniqueEntities.set(triplet.source.entityId, triplet.source)
            if (triplet.target) uniqueEntities.set(triplet.target.entityId, triplet.target)
          }
          
          const entities = Array.from(uniqueEntities.values())
          
          const decisions = entities.filter(e => e.type === 'Decision').map(e => {
            try { return JSON.parse(e.identifier) } catch { return null }
          }).filter(Boolean)
          
          const messagesCount = entities.filter(e => e.type === 'Message').length
          const peopleCount = entities.filter(e => e.type === 'Person').length
          
          const total = decisions.length
          const active = decisions.filter(d => d.status === 'active').length
          const reversed = decisions.filter(d => d.status === 'reverted' || d.status === 'superseded').length

          setStats({
            totalDecisions: total,
            activeDecisions: active,
            reversedDecisions: reversed,
            contributors: peopleCount,
            importedMessages: messagesCount
          })
        }
      } catch (err) {
        console.error('Failed to load dashboard metrics from HydraDB:', err)
      } finally {
        setIsStatsLoading(false)
      }
    }
    loadStats()
  }, [id])

  if (isProjectLoading) {
    return <div className="p-8 text-center text-muted-foreground font-medium">Loading project...</div>
  }

  const project = projects.find((p) => p.id === id)
  if (!project) return <div>Project not found</div>

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Real Dynamic Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-card border-2 border-foreground rounded-lg p-6 shadow-[3px_3px_0px_0px_var(--primary)]">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Total Decisions</p>
            <p className="text-3xl font-bold">{isStatsLoading ? '...' : stats.totalDecisions}</p>
          </div>
          <div className="bg-card border-2 border-foreground rounded-lg p-6 shadow-[3px_3px_0px_0px_rgba(16,185,129,0.5)]">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Active Decisions</p>
            <p className="text-3xl font-bold text-green-500">{isStatsLoading ? '...' : stats.activeDecisions}</p>
          </div>
          <div className="bg-card border-2 border-foreground rounded-lg p-6 shadow-[3px_3px_0px_0px_rgba(239,68,68,0.5)]">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Reverted Decisions</p>
            <p className="text-3xl font-bold text-destructive">{isStatsLoading ? '...' : stats.reversedDecisions}</p>
          </div>
          <div className="bg-card border-2 border-foreground rounded-lg p-6 shadow-[3px_3px_0px_0px_rgba(59,130,246,0.5)]">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Contributors</p>
            <p className="text-3xl font-bold text-blue-500">{isStatsLoading ? '...' : stats.contributors}</p>
          </div>
          <div className="bg-card border-2 border-foreground rounded-lg p-6 shadow-[3px_3px_0px_0px_rgba(236,72,153,0.5)]">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Imported Messages</p>
            <p className="text-3xl font-bold text-pink-500">{isStatsLoading ? '...' : stats.importedMessages}</p>
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

          <div className="space-y-4">
            {allDecisions.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No decisions yet. Connect Discord to extract decisions.</p>
            ) : (
              allDecisions.slice(0, 5).map((decision) => (
                <div key={decision.id} className="bg-card border-2 border-foreground rounded-lg p-4 shadow-[3px_3px_0px_0px_var(--primary)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_0px_var(--primary)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer">
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
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
