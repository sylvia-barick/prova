'use client'

import { use, useState, useEffect } from 'react'
import { useProject } from '@/context/ProjectContext'
import { useDecisions } from '@/hooks/useDecisions'

// Placeholder identities that must never appear on the Team page
const PLACEHOLDER_IDS  = new Set(['usr-alex', 'usr-sylvia'])
const PLACEHOLDER_EMAIL = /example\.com/i

function isPlaceholder(person: { id: string; email?: string }) {
  return PLACEHOLDER_IDS.has(person.id) || PLACEHOLDER_EMAIL.test(person.email || '')
}

interface ContributorStat {
  id: string
  name: string
  email: string
  avatar: string
  role: string
  total: number
  active: number
  highImpact: number
}

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { projects } = useProject()
  const { decisions } = useDecisions(id)
  const project = projects.find((p) => p.id === id)

  // Additional contributors extracted directly from the graph (proposed relations)
  const [graphContributors, setGraphContributors] = useState<Map<string, any>>(new Map())
  const [isPurging, setIsPurging] = useState(false)
  const [purgeResult, setPurgeResult] = useState<string | null>(null)

  useEffect(() => {
    async function loadGraphContributors() {
      try {
        const res = await fetch('/api/graph')
        const data = await res.json()
        if (!data.success) return

        const relations = data.relations || []
        const entityMap = new Map<string, any>()
        const contributors = new Map<string, any>()

        for (const t of relations) {
          if (t.source?.entityId) entityMap.set(t.source.entityId, t.source)
          if (t.target?.entityId) entityMap.set(t.target.entityId, t.target)
        }

        // Walk proposed relations — source is a Person who authored a decision or message
        for (const t of relations) {
          for (const r of t.relations || []) {
            if (r.rawPredicate !== 'proposed') continue
            const personEntity = entityMap.get(r.sourceEntityId)
            if (!personEntity || personEntity.type !== 'Person') continue
            try {
              const p = JSON.parse(personEntity.identifier)
              if (isPlaceholder({ id: p.id || '', email: p.email || '' })) continue
              contributors.set(p.id || personEntity.entityId, {
                id: p.id || personEntity.entityId,
                name: p.name || personEntity.name || 'Unknown',
                email: p.email || '',
                avatar: p.avatar || '',
                role: p.role || 'Contributor',
              })
            } catch {}
          }
        }

        setGraphContributors(contributors)
      } catch (err) {
        console.error('Failed to load graph contributors:', err)
      }
    }
    loadGraphContributors()
  }, [id])

  if (!project) return <div>Project not found</div>

  // ── Merge member_of persons + proposed-relation persons into one deduplicated set
  const mergedContributors = new Map<string, any>()

  // Add member_of persons (already filtered of placeholders in hydradb.ts)
  for (const m of project.members) {
    if (isPlaceholder(m)) continue
    mergedContributors.set(m.id, m)
  }

  // Add graph contributors (Discord authors etc.)
  for (const [id, c] of graphContributors) {
    if (!mergedContributors.has(id)) {
      mergedContributors.set(id, c)
    }
  }

  const contributorStats: ContributorStat[] = Array.from(mergedContributors.values()).map((person) => {
    const authored = decisions.filter((d) => d.author.id === person.id)
    return {
      ...person,
      total: authored.length,
      active: authored.filter((d) => d.status === 'active').length,
      highImpact: authored.filter((d) => d.impact === 'high').length,
    }
  })

  const topContributor =
    contributorStats.length > 0
      ? contributorStats.reduce((a, b) => (a.total >= b.total ? a : b))
      : null

  const handlePurge = async () => {
    setIsPurging(true)
    setPurgeResult(null)
    try {
      const res = await fetch('/api/graph/purge-placeholders', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setPurgeResult(`✓ Purge complete. ${data.removedEntityIds.length} placeholder node(s) removed. Refresh to verify.`)
      } else {
        setPurgeResult(`✗ Purge failed: ${data.error}`)
      }
    } catch (err: any) {
      setPurgeResult(`✗ Purge failed: ${err.message}`)
    } finally {
      setIsPurging(false)
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Team Members</h1>
            <p className="text-muted-foreground">
              Real contributors from Discord imports and authenticated users
            </p>
          </div>
          {/* Admin purge control — visible only when placeholders may still exist */}
          <button
            onClick={handlePurge}
            disabled={isPurging}
            className="text-xs text-rose-400 border border-rose-400/30 bg-rose-400/5 hover:bg-rose-400/10 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
          >
            {isPurging ? 'Purging…' : '🗑 Purge Placeholder Users from HydraDB'}
          </button>
        </div>

        {purgeResult && (
          <div className={`mb-6 px-4 py-3 rounded-lg border text-sm font-mono ${purgeResult.startsWith('✓') ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
            {purgeResult}
          </div>
        )}

        {/* Team Grid */}
        {contributorStats.length === 0 ? (
          <div className="text-center py-20 bg-card border-2 border-dashed border-border rounded-lg mb-12">
            <span className="text-5xl mb-4 block">👥</span>
            <p className="text-lg font-bold mb-2">No Contributors Yet</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Import Discord messages and run AI extraction to populate real contributors.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {contributorStats.map((person) => (
              <div
                key={person.id}
                className="bg-card border-2 border-foreground rounded-lg p-6 shadow-[4px_4px_0px_0px_var(--primary)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_var(--primary)] transition-all"
              >
                {/* Avatar and Name */}
                <div className="flex items-center gap-4 mb-6">
                  {person.avatar ? (
                    <img
                      src={person.avatar}
                      alt={person.name}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-full object-cover border-2 border-primary/40"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center font-bold text-primary text-lg">
                      {initials(person.name)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold">{person.name}</h3>
                    <p className="text-sm text-muted-foreground">{person.role || 'Contributor'}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-2 border-t border-border/50 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Decisions</span>
                    <span className="font-bold">{person.total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active</span>
                    <span className="font-bold text-emerald-400">{person.active}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">High Impact</span>
                    <span className="font-bold text-yellow-400">{person.highImpact}</span>
                  </div>
                </div>

                {/* Email if real (not example.com) */}
                {person.email && !PLACEHOLDER_EMAIL.test(person.email) && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                    <p className="text-sm break-all">{person.email}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Team Stats */}
        <h2 className="text-2xl font-bold mb-4">Team Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border-2 border-foreground rounded-lg p-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Contributors</p>
            <p className="text-3xl font-bold">{contributorStats.length}</p>
          </div>
          <div className="bg-card border-2 border-foreground rounded-lg p-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Decisions</p>
            <p className="text-3xl font-bold">{decisions.length}</p>
          </div>
          <div className="bg-card border-2 border-foreground rounded-lg p-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Avg / Person</p>
            <p className="text-3xl font-bold">
              {contributorStats.length > 0
                ? (decisions.length / contributorStats.length).toFixed(1)
                : '—'}
            </p>
          </div>
          <div className="bg-card border-2 border-foreground rounded-lg p-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Most Active</p>
            <p className="text-lg font-bold truncate">{topContributor?.name ?? '—'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
