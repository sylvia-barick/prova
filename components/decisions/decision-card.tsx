'use client'

import Link from 'next/link'
import { Decision } from '@/lib/types'

interface DecisionCardProps {
  decision: Decision
  projectId?: string
}

export function DecisionCard({ decision, projectId }: DecisionCardProps) {
  const statusColor = {
    active: 'bg-primary/20 text-primary',
    superseded: 'bg-muted text-muted-foreground',
    reverted: 'bg-destructive/20 text-destructive',
  }

  const impactColor = {
    high: 'bg-accent/20 text-accent',
    medium: 'bg-yellow-500/20 text-yellow-500',
    low: 'bg-blue-500/20 text-blue-500',
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold hover:text-primary transition-colors">{decision.title}</h3>
          <p className="text-sm text-muted-foreground mt-2">{decision.description}</p>
        </div>
        <div className="flex gap-2 ml-4 flex-shrink-0">
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusColor[decision.status]}`}>
            {decision.status}
          </span>
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${impactColor[decision.impact]}`}>
            {decision.impact} impact
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 py-4 border-t border-b border-border/50">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Author</p>
          <p className="font-medium text-sm">{decision.author.name}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Created</p>
          <p className="font-medium text-sm">{new Date(decision.timeline.created).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Category</p>
          <p className="font-medium text-sm">{decision.category}</p>
        </div>
      </div>

      {decision.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {decision.tags.map((tag) => (
            <span key={tag} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      {(decision.affects.length > 0 || decision.votes) && (
        <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
          {decision.affects.length > 0 && <span>📁 Affects {decision.affects.length} items</span>}
          {decision.votes && <span>👍 {decision.votes} votes</span>}
        </div>
      )}
    </div>
  )
}
