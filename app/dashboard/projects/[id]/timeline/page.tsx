'use client'

import { use } from 'react'
import { useDecisions } from '@/hooks/useDecisions'

export default function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { decisions } = useDecisions(id)

  const sortedDecisions = [...decisions].sort((a, b) => new Date(b.timeline.created).getTime() - new Date(a.timeline.created).getTime())

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Timeline</h1>
          <p className="text-muted-foreground">See the evolution of decisions over time</p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Central line */}
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary to-transparent ml-6" />

          {/* Timeline items */}
          <div className="space-y-8">
            {sortedDecisions.map((decision, index) => (
              <div key={decision.id} className="relative pl-20">
                {/* Node */}
                <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 ${
                  decision.status === 'active' 
                    ? 'bg-primary border-primary' 
                    : decision.status === 'superseded'
                    ? 'bg-muted border-muted-foreground'
                    : 'bg-destructive border-destructive'
                } shadow-lg`} />

                {/* Content */}
                <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold">{decision.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      decision.status === 'active'
                        ? 'bg-primary/20 text-primary'
                        : decision.status === 'superseded'
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-destructive/20 text-destructive'
                    }`}>
                      {decision.status}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">{decision.description}</p>

                  <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                    <span>👤 {decision.author.name}</span>
                    <span>📅 {new Date(decision.timeline.created).toLocaleString()}</span>
                    <span>🏷️ {decision.category}</span>
                    <span className={`px-2 py-1 rounded ${
                      decision.impact === 'high'
                        ? 'bg-accent/20 text-accent'
                        : decision.impact === 'medium'
                        ? 'bg-yellow-500/20 text-yellow-500'
                        : 'bg-blue-500/20 text-blue-500'
                    }`}>
                      {decision.impact} impact
                    </span>
                  </div>

                  {decision.supersedes && decision.supersedes.length > 0 && (
                    <div className="mt-3 text-xs bg-primary/10 text-primary px-2 py-1 rounded inline-block">
                      Supersedes {decision.supersedes.length} decision{decision.supersedes.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {decisions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No decisions yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
