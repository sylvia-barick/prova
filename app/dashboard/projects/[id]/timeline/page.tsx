'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface ProjectInfo {
  id: string
  name: string
}

interface Person {
  id: string
  name: string
  avatar?: string
  role?: string
}

interface DecisionInfo {
  id: string
  title: string
  status: string
  description: string
}

interface MessageInfo {
  id: string
  content: string
  author: string
  timestamp: string
}

interface TimelineEvent {
  id: string
  timestamp: string
  eventType: 'decision-created' | 'decision-updated' | 'decision-superseded' | 'message-imported' | 'ai-extraction-completed'
  title: string
  description: string
  relatedProject: ProjectInfo
  person: Person
  decision?: DecisionInfo
  supersededBy?: DecisionInfo
  originalDiscordMessage?: MessageInfo
  relevantNodeIds: string[]
}

export default function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [expandedMsgId, setExpandedMsgId] = useState<string | null>(null)

  useEffect(() => {
    async function loadTimeline() {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/timeline?projectId=${id}`)
        if (!res.ok) {
          throw new Error('Failed to fetch timeline events')
        }
        const data = await res.json()
        if (data.success) {
          setEvents(data.events || [])
        } else {
          throw new Error(data.error || 'Server error loading timeline')
        }
      } catch (err: any) {
        console.error(err)
        setError(err.message || 'Error fetching timeline')
      } finally {
        setIsLoading(false)
      }
    }
    loadTimeline()
  }, [id])

  const sortedEvents = [...events].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime()
    const timeB = new Date(b.timestamp).getTime()
    return sortOrder === 'asc' ? timeA - timeB : timeB - timeA
  })

  const getEventStyles = (type: string) => {
    switch (type) {
      case 'decision-created':
        return {
          icon: '✨',
          color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
          lineColor: 'from-emerald-500',
          badge: 'Proposed Decision'
        }
      case 'decision-updated':
        return {
          icon: '🔄',
          color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          lineColor: 'from-amber-500',
          badge: 'Decision Updated'
        }
      case 'decision-superseded':
        return {
          icon: '⚠️',
          color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
          lineColor: 'from-rose-500',
          badge: 'Decision Superseded'
        }
      case 'message-imported':
        return {
          icon: '💬',
          color: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
          lineColor: 'from-sky-500',
          badge: 'Discord Import'
        }
      case 'ai-extraction-completed':
        return {
          icon: '🔮',
          color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
          lineColor: 'from-indigo-500',
          badge: 'AI Decision Extraction'
        }
      default:
        return {
          icon: '📅',
          color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
          lineColor: 'from-zinc-500',
          badge: 'Event'
        }
    }
  }

  const toggleExpandMsg = (msgId: string) => {
    setExpandedMsgId(expandedMsgId === msgId ? null : msgId)
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12">
          <div>
            <h1 className="text-4xl font-bold mb-2">Live Timeline</h1>
            <p className="text-muted-foreground">Chronological audit log of project events stored in HydraDB</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="text-xs font-semibold px-3 py-1 bg-card hover:bg-muted"
            >
              🕒 Sort: {sortOrder === 'asc' ? 'Oldest → Newest' : 'Newest → Oldest'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border-2 border-destructive text-destructive rounded-lg p-4 mb-8">
            <p className="font-semibold">Error Loading Timeline</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-8 relative pl-20">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border ml-0.5" />
            {[1, 2, 3].map((n) => (
              <div key={n} className="relative animate-pulse">
                <div className="absolute left-[-62px] top-1 w-6 h-6 rounded-full bg-muted border border-border" />
                <div className="bg-card border-2 border-dashed border-border rounded-lg p-6 space-y-3 min-h-[140px]">
                  <div className="h-4 bg-muted rounded w-1/4" />
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="relative">
            {/* Timeline Vertical Axis Line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-muted to-transparent ml-0.5" />

            <div className="space-y-8">
              {sortedEvents.map((event) => {
                const styles = getEventStyles(event.eventType)
                const isExpanded = event.originalDiscordMessage && expandedMsgId === event.originalDiscordMessage.id

                return (
                  <div key={event.id} className="relative pl-16 group">
                    {/* Visual Node Pin */}
                    <div
                      className={`absolute left-4 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs shadow-lg transition-transform duration-200 group-hover:scale-110 z-10 bg-black ${styles.color}`}
                    >
                      {styles.icon}
                    </div>

                    {/* Glassmorphism Event Card */}
                    <div className="bg-card border-2 border-foreground rounded-lg p-6 hover:shadow-[4px_4px_0px_0px_var(--primary)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200">
                      {/* Top Header Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${styles.color}`}>
                            {styles.badge}
                          </span>
                          {event.decision?.status && (
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                event.decision.status === 'active'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : event.decision.status === 'superseded'
                                    ? 'bg-zinc-500/20 text-zinc-400'
                                    : 'bg-rose-500/20 text-rose-400'
                              }`}
                            >
                              {event.decision.status}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                          📅 {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>

                      {/* Main Title & Description */}
                      <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                        {event.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                        {event.description}
                      </p>

                      {/* If decision detail is present */}
                      {event.decision && event.eventType !== 'decision-superseded' && (
                        <div className="bg-black/20 rounded border border-border/40 p-3 mb-4 text-xs space-y-1">
                          <p className="font-semibold text-foreground/80">📄 Decision Description</p>
                          <p className="text-muted-foreground">{event.decision.description}</p>
                        </div>
                      )}

                      {/* If supersededBy details are present */}
                      {event.supersededBy && (
                        <div className="bg-rose-500/5 rounded border border-rose-500/20 p-4 mb-4 text-xs space-y-2">
                          <p className="font-bold text-rose-400">🔄 Replacement Link</p>
                          <div className="flex items-center gap-2">
                            <span className="bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded text-[10px] font-bold">WAS</span>
                            <span className="font-semibold">{event.decision?.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded text-[10px] font-bold">NOW</span>
                            <span className="font-semibold text-emerald-400">{event.supersededBy.title}</span>
                          </div>
                        </div>
                      )}

                      {/* Expandable Discord Message Panel */}
                      {event.originalDiscordMessage && (
                        <div className="mb-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpandMsg(event.originalDiscordMessage!.id)}
                            className="text-xs text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 p-0 h-6"
                          >
                            {isExpanded ? '▼ Hide Original Message' : '► View Original Message'}
                          </Button>
                          {isExpanded && (
                            <div className="mt-2 bg-black/40 border border-sky-500/20 rounded-lg p-4 font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                              <p className="text-[10px] text-sky-400 mb-2 border-b border-sky-500/10 pb-1">
                                Message ID: {event.originalDiscordMessage.id} | Sent: {new Date(event.originalDiscordMessage.timestamp).toLocaleString()}
                              </p>
                              "{event.originalDiscordMessage.content}"
                            </div>
                          )}
                        </div>
                      )}

                      {/* Footer Actions & Metadata */}
                      <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-border/50 flex-wrap">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <span>👤 {event.person.name}</span>
                          <span>📁 {event.relatedProject.name}</span>
                        </div>

                        {event.relevantNodeIds && event.relevantNodeIds.length > 0 && (
                          <Link href={`/dashboard/projects/${id}/graph?highlight=${event.relevantNodeIds.join(',')}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs font-bold bg-primary text-primary-foreground border-primary hover:bg-primary/90 flex items-center gap-1.5 shadow"
                            >
                              <span>📈</span> Highlight in Graph
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!isLoading && events.length === 0 && (
          <div className="text-center py-16 text-muted-foreground bg-card border-2 border-dashed border-border rounded-lg">
            <span className="text-5xl mb-4 block">⏱️</span>
            <p className="text-lg font-bold">No Events Found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-2">
              There are no live graph entities or transactions for this project inside HydraDB. Try importing Discord channel messages.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
