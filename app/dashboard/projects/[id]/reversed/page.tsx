'use client'

import { use } from 'react'
import { useDecisions } from '@/hooks/useDecisions'
import { DecisionCard } from '@/components/decisions/decision-card'

export default function ReversedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { decisions } = useDecisions(id)
  
  const revertedDecisions = decisions.filter((d) => d.status === 'reverted')
  const superseededDecisions = decisions.filter((d) => d.status === 'superseded')

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Decision Changes</h1>
          <p className="text-muted-foreground">Decisions that were superseded or reverted</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-1">Superseded</p>
            <p className="text-3xl font-bold">{superseededDecisions.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-1">Reverted</p>
            <p className="text-3xl font-bold">{revertedDecisions.length}</p>
          </div>
        </div>

        {/* Reverted Decisions */}
        {revertedDecisions.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Reverted Decisions</h2>
            <div className="space-y-4">
              {revertedDecisions.map((decision) => (
                <DecisionCard key={decision.id} decision={decision} projectId={id} />
              ))}
            </div>
          </div>
        )}

        {/* Superseded Decisions */}
        {superseededDecisions.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Superseded Decisions</h2>
            <div className="space-y-4">
              {superseededDecisions.map((decision) => (
                <div key={decision.id}>
                  <DecisionCard decision={decision} projectId={id} />
                  {decision.supersededBy && decision.supersededBy.length > 0 && (
                    <div className="ml-4 mt-2 text-sm text-primary">
                      → Replaced by: {decision.supersededBy.length} newer decision{decision.supersededBy.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {revertedDecisions.length === 0 && superseededDecisions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No reverted or superseded decisions yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
