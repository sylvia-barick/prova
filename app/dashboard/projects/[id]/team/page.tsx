'use client'

import { use } from 'react'
import { useProject } from '@/context/ProjectContext'
import { useDecisions } from '@/hooks/useDecisions'

export default function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { projects } = useProject()
  const { decisions } = useDecisions(id)
  const project = projects.find((p) => p.id === id)

  if (!project) return <div>Project not found</div>

  // Calculate stats for each team member
  const memberStats = project.members.map((member) => {
    const memberDecisions = decisions.filter((d) => d.author.id === member.id)
    const activeDecisions = memberDecisions.filter((d) => d.status === 'active')
    const highImpactCount = memberDecisions.filter((d) => d.impact === 'high').length

    return {
      member,
      totalDecisions: memberDecisions.length,
      activeDecisions: activeDecisions.length,
      highImpactCount,
      recentDecision: memberDecisions[0],
    }
  })

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Team Members</h1>
          <p className="text-muted-foreground">Team insights and decision statistics</p>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {memberStats.map(({ member, totalDecisions, activeDecisions, highImpactCount }) => (
            <div key={member.id} className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-all">
              {/* Avatar and Name */}
              <div className="flex items-center gap-4 mb-6">
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-16 h-16 rounded-full border-2 border-primary/50"
                />
                <div>
                  <h3 className="text-lg font-bold">{member.name}</h3>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-t border-border/50">
                  <span className="text-sm text-muted-foreground">Total Decisions</span>
                  <span className="font-bold">{totalDecisions}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Active</span>
                  <span className="font-bold text-primary">{activeDecisions}</span>
                </div>
              </div>

              {/* High Impact Count */}
              <div className="mt-4 p-3 bg-accent/10 rounded-lg">
                <p className="text-xs text-muted-foreground">High Impact Decisions</p>
                <p className="text-2xl font-bold text-accent">{highImpactCount}</p>
              </div>

              {/* Contact */}
              <div className="mt-6 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Email</p>
                <p className="text-sm break-all">{member.email}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Team Statistics */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Team Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-sm text-muted-foreground mb-2">Team Size</p>
              <p className="text-3xl font-bold">{project.members.length}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-sm text-muted-foreground mb-2">Total Decisions</p>
              <p className="text-3xl font-bold">{decisions.length}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-sm text-muted-foreground mb-2">Avg Decisions/Person</p>
              <p className="text-3xl font-bold">{(decisions.length / project.members.length).toFixed(1)}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-sm text-muted-foreground mb-2">Most Active</p>
              <p className="text-lg font-bold">
                {memberStats.reduce((prev, curr) => (prev.totalDecisions > curr.totalDecisions ? prev : curr)).member.name}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
