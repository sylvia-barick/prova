'use client'

import { use, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

// ─── types ──────────────────────────────────────────────────────────────────

interface CategoryStat {
  topic: string
  decisions: number
  revisions: number
}

interface ContributorStat {
  name: string
  count: number
}

interface Metrics {
  totalDecisions: number
  activeDecisions: number
  supersededDecisions: number
  revertedDecisions: number
  contributors: number
  importedMessages: number
  avgConfidence: number | null
  avgRevisions: number
  avgRevisionGapHours: number | null
  mostActiveContributor: { name: string; count: number } | null
  mostDiscussedTopic: { topic: string; decisions: number; revisions: number } | null
  mostRevisedDecision: { title: string; revisions: number } | null
  longestActiveDecision: { title: string; createdAt: string; ageInDays: number } | null
  categoryBreakdown: CategoryStat[]
  contributorBreakdown: ContributorStat[]
}

interface Summaries {
  mostDiscussed: string
  mostRevised: string
  topContributor: string
  overallHealth: string
}

// ─── sub-components ─────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: string
}) {
  return (
    <div className="bg-card border-2 border-foreground rounded-lg p-6 hover:shadow-[4px_4px_0px_0px_var(--primary)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200">
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">{label}</p>
      <p className={`text-4xl font-bold ${accent || 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

function BarRow({
  label,
  value,
  max,
  color,
  sub,
}: {
  label: string
  value: number
  max: number
  color: string
  sub?: string
}) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium truncate max-w-[60%]">{label}</span>
        <span className="font-bold text-sm">
          {value}
          {sub && <span className="text-muted-foreground font-normal ml-1 text-xs">{sub}</span>}
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div className={`h-2 rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function SummaryCard({
  icon,
  title,
  summary,
  evidence,
  accentClass,
}: {
  icon: string
  title: string
  summary: string
  evidence: string
  accentClass: string
}) {
  return (
    <div
      className={`rounded-lg border-2 p-6 flex flex-col gap-3 hover:shadow-[4px_4px_0px_0px_var(--primary)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200 ${accentClass}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <h4 className="font-bold text-sm uppercase tracking-wider opacity-70">{title}</h4>
      </div>
      <p className="text-base font-semibold leading-snug">{summary}</p>
      <p className="text-xs text-muted-foreground bg-black/20 rounded px-2 py-1 font-mono">{evidence}</p>
    </div>
  )
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function InsightsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [summaries, setSummaries] = useState<Summaries | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/insights?projectId=${id}`)
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Unknown error')
      setMetrics(data.metrics)
      setSummaries(data.summaries ?? null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  // ── loading skeleton ──
  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <div className="h-10 w-64 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-80 bg-muted rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="bg-card border-2 border-border rounded-lg p-6 animate-pulse h-28" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-card border-2 border-border rounded-lg p-6 animate-pulse h-32" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── error state ──
  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-destructive/10 border-2 border-destructive rounded-lg p-6">
            <p className="font-bold text-destructive mb-1">Error Loading Insights</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={load} variant="outline" className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── empty state ──
  if (!metrics || metrics.totalDecisions === 0) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-2">Insights & Analytics</h1>
            <p className="text-muted-foreground">Live metrics computed from HydraDB</p>
          </div>
          <div className="text-center py-20 bg-card border-2 border-dashed border-border rounded-lg">
            <span className="text-5xl mb-4 block">💡</span>
            <p className="text-lg font-bold mb-2">No Data Yet</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {metrics?.importedMessages && metrics.importedMessages > 0
                ? `${metrics.importedMessages} Discord messages imported but no decisions extracted yet. Run the AI extraction from the Sources page.`
                : 'No decisions or messages found for this project in HydraDB. Try seeding or importing Discord messages first.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const {
    totalDecisions,
    activeDecisions,
    supersededDecisions,
    revertedDecisions,
    contributors,
    importedMessages,
    avgConfidence,
    avgRevisions,
    avgRevisionGapHours,
    mostActiveContributor,
    mostDiscussedTopic,
    mostRevisedDecision,
    longestActiveDecision,
    categoryBreakdown,
    contributorBreakdown,
  } = metrics

  const maxCategoryRevisions = Math.max(...categoryBreakdown.map((c) => c.revisions + c.decisions), 1)
  const maxContributorCount = Math.max(...contributorBreakdown.map((c) => c.count), 1)

  // Build Gemini summary cards (fall back to computed text if Gemini unavailable)
  const summaryCards = [
    {
      icon: '🔥',
      title: 'Most Discussed Topic',
      summary: summaries?.mostDiscussed
        ?? (mostDiscussedTopic
          ? `"${mostDiscussedTopic.topic}" is the most discussed topic with ${mostDiscussedTopic.decisions} decision(s) and ${mostDiscussedTopic.revisions} revision(s).`
          : 'Insufficient data to determine the most discussed topic.'),
      evidence: mostDiscussedTopic
        ? `Topic: ${mostDiscussedTopic.topic} · Decisions: ${mostDiscussedTopic.decisions} · Revisions: ${mostDiscussedTopic.revisions}`
        : 'No topic data available.',
      accentClass: 'bg-orange-500/5 border-orange-500/30',
    },
    {
      icon: '🔄',
      title: 'Most Revised Decision',
      summary: summaries?.mostRevised
        ?? (mostRevisedDecision
          ? `"${mostRevisedDecision.title}" was revised ${mostRevisedDecision.revisions} time(s) before stabilization.`
          : 'No decisions with multiple revisions found yet.'),
      evidence: mostRevisedDecision
        ? `Decision: "${mostRevisedDecision.title}" · Revisions: ${mostRevisedDecision.revisions}`
        : 'No revision data available.',
      accentClass: 'bg-amber-500/5 border-amber-500/30',
    },
    {
      icon: '🏆',
      title: 'Top Contributor',
      summary: summaries?.topContributor
        ?? (mostActiveContributor
          ? `${mostActiveContributor.name} contributed the most with ${mostActiveContributor.count} decision version(s) authored.`
          : 'Insufficient contributor data.'),
      evidence: mostActiveContributor
        ? `Contributor: ${mostActiveContributor.name} · Versions Authored: ${mostActiveContributor.count}`
        : 'No contributor data available.',
      accentClass: 'bg-emerald-500/5 border-emerald-500/30',
    },
    {
      icon: '📊',
      title: 'Project Health',
      summary: summaries?.overallHealth
        ?? `${activeDecisions} active decision(s) out of ${totalDecisions} total. ${supersededDecisions + revertedDecisions} changed or reverted.`,
      evidence: `Active: ${activeDecisions} · Superseded: ${supersededDecisions} · Reverted: ${revertedDecisions} · Avg Revisions: ${avgRevisions}`,
      accentClass: 'bg-sky-500/5 border-sky-500/30',
    },
  ]

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12">
          <div>
            <h1 className="text-4xl font-bold mb-2">Insights & Analytics</h1>
            <p className="text-muted-foreground">
              Live metrics computed from HydraDB
              {!summaries && (
                <span className="ml-2 text-xs text-yellow-500 font-mono">
                  (AI summaries unavailable — GEMINI_API_KEY not set)
                </span>
              )}
            </p>
          </div>
          <Button onClick={load} variant="outline" size="sm" className="flex items-center gap-2">
            <span>🔄</span> Refresh
          </Button>
        </div>

        {/* ── Row 1: Key numeric stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Decisions" value={totalDecisions} />
          <StatCard
            label="Active"
            value={activeDecisions}
            sub={`${totalDecisions > 0 ? ((activeDecisions / totalDecisions) * 100).toFixed(0) : 0}% of total`}
            accent="text-emerald-400"
          />
          <StatCard
            label="Superseded"
            value={supersededDecisions}
            sub={`${totalDecisions > 0 ? ((supersededDecisions / totalDecisions) * 100).toFixed(0) : 0}% of total`}
            accent="text-zinc-400"
          />
          <StatCard
            label="Reverted"
            value={revertedDecisions}
            sub={`${totalDecisions > 0 ? ((revertedDecisions / totalDecisions) * 100).toFixed(0) : 0}% of total`}
            accent="text-rose-400"
          />
          <StatCard label="Contributors" value={contributors} sub="unique people" />
          <StatCard label="Discord Messages" value={importedMessages} sub="imported" accent="text-sky-400" />
          <StatCard
            label="Avg Confidence"
            value={avgConfidence !== null ? `${(avgConfidence * 100).toFixed(0)}%` : '—'}
            sub={avgConfidence !== null ? 'across extracted decisions' : 'no confidence data'}
            accent="text-yellow-400"
          />
          <StatCard
            label="Avg Revisions"
            value={avgRevisions}
            sub={
              avgRevisionGapHours !== null
                ? `~${avgRevisionGapHours < 24 ? `${avgRevisionGapHours}h` : `${(avgRevisionGapHours / 24).toFixed(1)}d`} between revisions`
                : 'per decision'
            }
          />
        </div>

        {/* ── Row 2: Gemini / computed summaries ── */}
        <h2 className="text-xl font-bold mb-4 mt-2">
          {summaries ? '🤖 AI-Generated Insights' : '📋 Computed Insights'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {summaryCards.map((card) => (
            <SummaryCard key={card.title} {...card} />
          ))}
        </div>

        {/* ── Row 3: Spotlight cards ── */}
        <h2 className="text-xl font-bold mb-4">🔦 Spotlight</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {/* Most revised */}
          <div className="bg-card border-2 border-foreground rounded-lg p-6 hover:shadow-[4px_4px_0px_0px_var(--primary)] transition-all duration-200">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Most Revised</p>
            {mostRevisedDecision ? (
              <>
                <p className="text-base font-bold line-clamp-2">{mostRevisedDecision.title}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded">
                    {mostRevisedDecision.revisions} revision{mostRevisedDecision.revisions !== 1 ? 's' : ''}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">No revision data</p>
            )}
          </div>

          {/* Longest active */}
          <div className="bg-card border-2 border-foreground rounded-lg p-6 hover:shadow-[4px_4px_0px_0px_var(--primary)] transition-all duration-200">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Longest Active</p>
            {longestActiveDecision ? (
              <>
                <p className="text-base font-bold line-clamp-2">{longestActiveDecision.title}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded">
                    {longestActiveDecision.ageInDays}d old
                  </span>
                  <span className="text-xs text-muted-foreground">
                    since {new Date(longestActiveDecision.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">No active decisions</p>
            )}
          </div>

          {/* Top contributor */}
          <div className="bg-card border-2 border-foreground rounded-lg p-6 hover:shadow-[4px_4px_0px_0px_var(--primary)] transition-all duration-200">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Top Contributor</p>
            {mostActiveContributor ? (
              <>
                <p className="text-base font-bold">{mostActiveContributor.name}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="bg-sky-500/20 text-sky-400 text-xs font-bold px-2 py-0.5 rounded">
                    {mostActiveContributor.count} version{mostActiveContributor.count !== 1 ? 's' : ''} authored
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">No contributor data</p>
            )}
          </div>
        </div>

        {/* ── Row 4: Category breakdown + Contributor breakdown ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* Category breakdown */}
          <div className="bg-card border-2 border-foreground rounded-lg p-6">
            <h3 className="text-base font-bold mb-1">Topic Breakdown</h3>
            <p className="text-xs text-muted-foreground mb-5">Decisions + revisions per category</p>
            {categoryBreakdown.length > 0 ? (
              <div className="space-y-4">
                {categoryBreakdown.slice(0, 8).map((cat) => (
                  <BarRow
                    key={cat.topic}
                    label={cat.topic}
                    value={cat.revisions + cat.decisions}
                    max={maxCategoryRevisions}
                    color="bg-primary"
                    sub={`(${cat.decisions}d · ${cat.revisions}r)`}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No category data</p>
            )}
          </div>

          {/* Contributor breakdown */}
          <div className="bg-card border-2 border-foreground rounded-lg p-6">
            <h3 className="text-base font-bold mb-1">Contributor Breakdown</h3>
            <p className="text-xs text-muted-foreground mb-5">Decision versions authored per person</p>
            {contributorBreakdown.length > 0 ? (
              <div className="space-y-4">
                {contributorBreakdown.slice(0, 8).map((person) => (
                  <BarRow
                    key={person.name}
                    label={person.name}
                    value={person.count}
                    max={maxContributorCount}
                    color="bg-sky-500"
                    sub="versions"
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No contributor data</p>
            )}
          </div>
        </div>

        {/* ── Row 5: Status + revision tempo ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status distribution */}
          <div className="bg-card border-2 border-foreground rounded-lg p-6">
            <h3 className="text-base font-bold mb-1">Status Distribution</h3>
            <p className="text-xs text-muted-foreground mb-5">Current state of all decisions</p>
            <div className="space-y-4">
              <BarRow label="Active" value={activeDecisions} max={totalDecisions} color="bg-emerald-500" />
              <BarRow label="Superseded" value={supersededDecisions} max={totalDecisions} color="bg-zinc-500" />
              <BarRow label="Reverted" value={revertedDecisions} max={totalDecisions} color="bg-rose-500" />
            </div>
          </div>

          {/* Revision tempo */}
          <div className="bg-card border-2 border-foreground rounded-lg p-6">
            <h3 className="text-base font-bold mb-1">Revision Tempo</h3>
            <p className="text-xs text-muted-foreground mb-5">How frequently decisions are updated</p>
            <div className="space-y-6">
              <div>
                <p className="text-xs text-muted-foreground font-semibold mb-1">Avg revisions / decision</p>
                <p className="text-3xl font-bold">{avgRevisions}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold mb-1">Avg time between revisions</p>
                <p className="text-3xl font-bold">
                  {avgRevisionGapHours !== null
                    ? avgRevisionGapHours < 24
                      ? `${avgRevisionGapHours}h`
                      : `${(avgRevisionGapHours / 24).toFixed(1)}d`
                    : '—'}
                </p>
                {avgRevisionGapHours === null && (
                  <p className="text-xs text-muted-foreground italic mt-1">
                    Not enough revision history to compute
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold mb-1">Avg AI confidence</p>
                <p className="text-3xl font-bold text-yellow-400">
                  {avgConfidence !== null ? `${(avgConfidence * 100).toFixed(0)}%` : '—'}
                </p>
                {avgConfidence === null && (
                  <p className="text-xs text-muted-foreground italic mt-1">
                    No confidence scores stored in graph
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
