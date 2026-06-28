'use client'

import { use } from 'react'
import { useDecisions } from '@/hooks/useDecisions'
import { DecisionCard } from '@/components/decisions/decision-card'

export default function DecisionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { decisions } = useDecisions(id)

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Decisions</h1>
          <p className="text-muted-foreground">All decisions for this project</p>
        </div>

        <div className="space-y-4">
          {decisions.map((decision) => (
            <DecisionCard key={decision.id} decision={decision} />
          ))}
        </div>

        {decisions.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No decisions yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
