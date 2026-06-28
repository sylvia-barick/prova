'use client'

import { use } from 'react'
import { useDecisions } from '@/hooks/useDecisions'
import { useProject } from '@/context/ProjectContext'

export default function InsightsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { decisions } = useDecisions(id)
  const { projects } = useProject()
  const project = projects.find((p) => p.id === id)

  if (!project) return <div>Project not found</div>

  // Calculate insights
  const activeDecisions = decisions.filter((d) => d.status === 'active')
  const superseededDecisions = decisions.filter((d) => d.status === 'superseded')
  const revertedDecisions = decisions.filter((d) => d.status === 'reverted')
  const highImpactDecisions = decisions.filter((d) => d.impact === 'high')
  const mediumImpactDecisions = decisions.filter((d) => d.impact === 'medium')
  const lowImpactDecisions = decisions.filter((d) => d.impact === 'low')

  // Team contributions
  const memberDecisionCounts = project.members.map((member) => ({
    name: member.name,
    count: decisions.filter((d) => d.author.id === member.id).length,
  }))

  const topContributor = memberDecisionCounts.reduce((prev, curr) =>
    prev.count > curr.count ? prev : curr,
  )

  // Most common categories
  const categoryCount: Record<string, number> = {}
  decisions.forEach((d) => {
    categoryCount[d.category] = (categoryCount[d.category] || 0) + 1
  })
  const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]

  // Average impact
  const avgImpact = (
    (decisions.filter((d) => d.impact === 'high').length * 3 +
      decisions.filter((d) => d.impact === 'medium').length * 2 +
      decisions.filter((d) => d.impact === 'low').length * 1) /
    decisions.length || 0
  ).toFixed(1)

  const reversalRate = decisions.length > 0 ? ((revertedDecisions.length / decisions.length) * 100).toFixed(1) : 0
  const supersessionRate = decisions.length > 0 ? ((superseededDecisions.length / decisions.length) * 100).toFixed(1) : 0

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Insights & Analytics</h1>
          <p className="text-muted-foreground">Decision patterns and team analytics</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-1">Total Decisions</p>
            <p className="text-4xl font-bold">{decisions.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-1">Active Now</p>
            <p className="text-4xl font-bold text-primary">{activeDecisions.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{((activeDecisions.length / decisions.length) * 100).toFixed(0)}% active</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-1">Changed</p>
            <p className="text-4xl font-bold text-accent">{superseededDecisions.length + revertedDecisions.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{reversalRate}% reverted</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-1">High Impact</p>
            <p className="text-4xl font-bold text-yellow-500">{highImpactDecisions.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{((highImpactDecisions.length / decisions.length) * 100).toFixed(0)}% of total</p>
          </div>
        </div>

        {/* Decision Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Impact Distribution */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Impact Distribution</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">High Impact</span>
                  <span className="font-bold">{highImpactDecisions.length}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-accent h-2 rounded-full"
                    style={{
                      width: `${decisions.length > 0 ? (highImpactDecisions.length / decisions.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Medium Impact</span>
                  <span className="font-bold">{mediumImpactDecisions.length}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{
                      width: `${decisions.length > 0 ? (mediumImpactDecisions.length / decisions.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Low Impact</span>
                  <span className="font-bold">{lowImpactDecisions.length}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{
                      width: `${decisions.length > 0 ? (lowImpactDecisions.length / decisions.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Status Distribution */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Status Distribution</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Active</span>
                  <span className="font-bold">{activeDecisions.length}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{
                      width: `${decisions.length > 0 ? (activeDecisions.length / decisions.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Superseded</span>
                  <span className="font-bold">{superseededDecisions.length}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-muted-foreground h-2 rounded-full"
                    style={{
                      width: `${decisions.length > 0 ? (superseededDecisions.length / decisions.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Reverted</span>
                  <span className="font-bold">{revertedDecisions.length}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-destructive h-2 rounded-full"
                    style={{
                      width: `${decisions.length > 0 ? (revertedDecisions.length / decisions.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Contributions */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <h3 className="text-lg font-bold mb-4">Team Contributions</h3>
          <div className="space-y-3">
            {memberDecisionCounts
              .sort((a, b) => b.count - a.count)
              .map((member) => (
                <div key={member.name} className="flex justify-between items-center">
                  <span>{member.name}</span>
                  <div className="flex items-center gap-3 flex-1 ml-4">
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${memberDecisionCounts.length > 0 ? (member.count / Math.max(...memberDecisionCounts.map((m) => m.count))) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="font-bold text-sm">{member.count}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Key Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-2">Top Contributor</p>
            <p className="text-2xl font-bold">{topContributor.name}</p>
            <p className="text-sm text-muted-foreground mt-2">{topContributor.count} decisions made</p>
          </div>
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-2">Most Common Category</p>
            <p className="text-2xl font-bold">{topCategory ? topCategory[0] : 'N/A'}</p>
            <p className="text-sm text-muted-foreground mt-2">{topCategory ? topCategory[1] : 0} decisions</p>
          </div>
        </div>
      </div>
    </div>
  )
}
