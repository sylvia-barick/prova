'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

// ─── types ───────────────────────────────────────────────────────────────────

type StepStatus = 'pending' | 'running' | 'done' | 'error'

interface DemoStep {
  id: number
  label: string
  icon: string
  detail: string
}

const STEPS: DemoStep[] = [
  { id: 1, icon: '💬', label: 'Import Discord Messages',      detail: 'Fetching real messages from your connected Discord channel…' },
  { id: 2, icon: '🤖', label: 'Run Gemini Extraction',        detail: 'Classifying messages and extracting decisions with Gemini AI…' },
  { id: 3, icon: '📋', label: 'Show Extracted Decisions',     detail: 'Decisions persisted into HydraDB and ready to view…' },
  { id: 4, icon: '📈', label: 'Open React Flow Graph',        detail: 'Building live knowledge graph from HydraDB relations…' },
  { id: 5, icon: '⚠️', label: 'Highlight Superseded Decision', detail: 'Identifying and spotlighting superseded decision nodes…' },
  { id: 6, icon: '🔍', label: 'Ask: "What did we decide about the database?"', detail: 'Sending semantic query to Gemini with live graph context…' },
  { id: 7, icon: '✅', label: 'Graph Search Returns Answer',  detail: 'Displaying latest decision + full supersession chain…' },
  { id: 8, icon: '⏱️', label: 'Open Timeline',                detail: 'Rendering chronological audit log from HydraDB events…' },
  { id: 9, icon: '💡', label: 'Open Insights',                detail: 'Computing live analytics and generating AI summaries…' },
]

// per-step target duration in ms (total budget ~85 s)
const STEP_DURATIONS = [12000, 20000, 4000, 4000, 3000, 8000, 4000, 3000, 3000]

interface DemoRunnerProps {
  onClose: () => void
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function statusColor(s: StepStatus) {
  if (s === 'done')    return 'text-emerald-400'
  if (s === 'running') return 'text-primary animate-pulse'
  if (s === 'error')   return 'text-rose-400'
  return 'text-muted-foreground'
}

function statusIcon(s: StepStatus, icon: string) {
  if (s === 'done')    return '✓'
  if (s === 'running') return icon
  if (s === 'error')   return '✗'
  return '○'
}

// ─── main component ───────────────────────────────────────────────────────────

export default function DemoRunner({ onClose }: DemoRunnerProps) {
  const router = useRouter()

  const [statuses, setStatuses]       = useState<StepStatus[]>(STEPS.map(() => 'pending'))
  const [currentStep, setCurrentStep] = useState<number>(-1)   // 0-indexed
  const [log, setLog]                 = useState<string[]>([])
  const [elapsed, setElapsed]         = useState(0)
  const [started, setStarted]         = useState(false)
  const [finished, setFinished]       = useState(false)
  const [fatalError, setFatalError]   = useState<string | null>(null)

  // live data harvested during the run
  const projectIdRef   = useRef<string | null>(null)
  const messagesRef    = useRef<any[]>([])
  const extractionsRef = useRef<any[]>([])
  const supersededRef  = useRef<string[]>([])    // graph node IDs to highlight

  const logRef = useRef<HTMLDivElement>(null)

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [...prev.slice(-60), msg])
  }, [])

  // auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [log])

  // elapsed timer
  useEffect(() => {
    if (!started || finished) return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [started, finished])

  const setStatus = (idx: number, s: StepStatus) =>
    setStatuses((prev) => { const n = [...prev]; n[idx] = s; return n })

  // ── step runners ────────────────────────────────────────────────────────────

  const runStep1 = async () => {
    addLog('→ Calling /api/discord/sync …')
    // First, find a project from the graph
    const projRes = await fetch('/api/projects')
    if (!projRes.ok) throw new Error('Could not load projects from HydraDB')
    const projects = await projRes.json()
    if (!projects.length) throw new Error('No projects found in HydraDB. Please seed or create a project first.')
    const project = projects[0]
    projectIdRef.current = project.id
    addLog(`✓ Project: "${project.name}" (${project.id})`)

    const syncRes = await fetch('/api/discord/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: project.id }),
    })
    if (!syncRes.ok) {
      const err = await syncRes.json().catch(() => ({}))
      throw new Error(err.error || `Discord sync failed (${syncRes.status})`)
    }
    const syncData = await syncRes.json()
    const msgs: any[] = syncData.messages || []
    if (!msgs.length) throw new Error('Discord sync returned 0 messages. Check DISCORD_BOT_TOKEN and channel config.')
    messagesRef.current = msgs
    addLog(`✓ Imported ${msgs.length} Discord messages`)
    msgs.slice(0, 3).forEach((m: any) => addLog(`  @${m.author.username}: "${m.content.substring(0, 60)}…"`))
    if (msgs.length > 3) addLog(`  … and ${msgs.length - 3} more`)
  }

  const runStep2 = async () => {
    const msgs = messagesRef.current
    const projectId = projectIdRef.current!
    addLog(`→ Sending ${msgs.length} messages to Gemini extraction…`)
    addLog('  (Rate-limited at 2.5 s/message — this step takes ~' + Math.ceil(msgs.length * 2.5) + ' s)')

    const res = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: msgs, projectId }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Extraction failed (${res.status})`)
    }
    const data = await res.json()
    extractionsRef.current = data.extractions || []
    const decisions = extractionsRef.current.filter((e: any) => e.isDecision)
    addLog(`✓ Extraction complete — ${decisions.length} decision(s) found out of ${extractionsRef.current.length} messages`)
    decisions.slice(0, 4).forEach((e: any) => {
      addLog(`  [${e.classification}] ${e.extractedDecision?.topic}: ${e.extractedDecision?.decision?.substring(0, 55)}…`)
    })
  }

  const runStep3 = async () => {
    const projectId = projectIdRef.current!
    addLog('→ Verifying decisions are persisted in HydraDB…')
    const res = await fetch(`/api/decisions?projectId=${projectId}`)
    if (!res.ok) throw new Error('Failed to load decisions')
    const decisions: any[] = await res.json()
    addLog(`✓ ${decisions.length} total decision(s) in HydraDB for this project`)
    decisions.slice(0, 5).forEach((d: any) => addLog(`  • [${d.status}] ${d.title}`))
    addLog('→ Navigating to Decisions view…')
    router.push(`/dashboard/projects/${projectId}/decisions`)
  }

  const runStep4 = async () => {
    const projectId = projectIdRef.current!
    addLog('→ Fetching graph relations from HydraDB…')
    const res = await fetch('/api/graph')
    if (!res.ok) throw new Error('Graph API failed')
    const data = await res.json()
    const relations = data.relations || []
    // count unique entities
    const entityIds = new Set<string>()
    for (const t of relations) {
      if (t.source?.entityId) entityIds.add(t.source.entityId)
      if (t.target?.entityId) entityIds.add(t.target.entityId)
    }
    addLog(`✓ Graph loaded — ${entityIds.size} nodes, ${relations.length} triplets`)
    addLog('→ Navigating to Graph view…')
    router.push(`/dashboard/projects/${projectId}/graph`)
  }

  const runStep5 = async () => {
    const projectId = projectIdRef.current!
    addLog('→ Scanning for superseded decisions in graph…')
    const res = await fetch('/api/graph')
    if (!res.ok) throw new Error('Graph API failed')
    const data = await res.json()
    const relations = data.relations || []

    // find entities that are the source of a superseded_by relation
    const supersededEntityIds: string[] = []
    for (const t of relations) {
      for (const r of t.relations || []) {
        if (r.rawPredicate === 'superseded_by' && r.sourceEntityId) {
          supersededEntityIds.push(r.sourceEntityId)
        }
      }
    }

    if (!supersededEntityIds.length) {
      addLog('⚠ No superseded decisions found — graph highlight skipped')
      addLog('  (Import more messages and run extraction to create supersession chains)')
      return
    }

    supersededRef.current = [...new Set(supersededEntityIds)]
    addLog(`✓ Found ${supersededRef.current.length} superseded node(s): ${supersededRef.current.slice(0, 3).join(', ')}`)
    addLog('→ Opening graph with superseded node highlighted…')
    router.push(`/dashboard/projects/${projectId}/graph?highlight=${supersededRef.current.join(',')}`)
  }

  const runStep6 = async () => {
    const projectId = projectIdRef.current!
    addLog('→ Sending semantic query: "What did we decide about the database?"')
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'What did we decide about the database?', projectId }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Search failed (${res.status})`)
    }
    const data = await res.json()
    const result = data.result
    if (result?.hasResult) {
      addLog(`✓ Gemini answered: "${result.answer?.substring(0, 120)}…"`)
      if (result.relevantNodeIds?.length) {
        addLog(`  Relevant nodes: ${result.relevantNodeIds.slice(0, 4).join(', ')}`)
        supersededRef.current = result.relevantNodeIds  // reuse for graph highlight in step 7
      }
    } else {
      addLog('  Gemini: No matching database decision found in the graph yet')
    }
  }

  const runStep7 = async () => {
    const projectId = projectIdRef.current!
    const highlightIds = supersededRef.current
    addLog('→ Opening graph with search result highlighted…')
    if (highlightIds.length) {
      router.push(`/dashboard/projects/${projectId}/graph?highlight=${highlightIds.join(',')}`)
      addLog(`✓ Highlighted ${highlightIds.length} node(s) in graph viewport`)
    } else {
      addLog('  No node IDs to highlight — navigating to graph without filter')
      router.push(`/dashboard/projects/${projectId}/graph`)
    }
  }

  const runStep8 = async () => {
    const projectId = projectIdRef.current!
    addLog('→ Loading Timeline from HydraDB…')
    const res = await fetch(`/api/timeline?projectId=${projectId}`)
    if (!res.ok) throw new Error('Timeline API failed')
    const data = await res.json()
    const events = data.events || []
    addLog(`✓ Timeline has ${events.length} event(s)`)
    events.slice(0, 4).forEach((e: any) =>
      addLog(`  [${e.eventType}] ${e.title} — ${new Date(e.timestamp).toLocaleDateString()}`)
    )
    addLog('→ Navigating to Timeline view…')
    router.push(`/dashboard/projects/${projectId}/timeline`)
  }

  const runStep9 = async () => {
    const projectId = projectIdRef.current!
    addLog('→ Computing live Insights from HydraDB…')
    const res = await fetch(`/api/insights?projectId=${projectId}`)
    if (!res.ok) throw new Error('Insights API failed')
    const data = await res.json()
    if (data.metrics) {
      const m = data.metrics
      addLog(`✓ Metrics: ${m.totalDecisions} decisions | ${m.contributors} contributors | ${m.importedMessages} messages`)
      if (m.mostDiscussedTopic) addLog(`  Most discussed: ${m.mostDiscussedTopic.topic}`)
      if (m.mostActiveContributor) addLog(`  Top contributor: ${m.mostActiveContributor.name}`)
    }
    if (data.summaries) {
      addLog(`✓ AI summary: "${data.summaries.overallHealth?.substring(0, 100)}…"`)
    }
    addLog('→ Navigating to Insights view…')
    router.push(`/dashboard/projects/${projectId}/insights`)
  }

  const STEP_FNS = [runStep1, runStep2, runStep3, runStep4, runStep5, runStep6, runStep7, runStep8, runStep9]

  // ── main sequence ────────────────────────────────────────────────────────────

  const runDemo = async () => {
    setStarted(true)
    setFatalError(null)
    addLog('▶ Demo started — using live HydraDB data')

    for (let i = 0; i < STEPS.length; i++) {
      setCurrentStep(i)
      setStatus(i, 'running')
      addLog(`\n── Step ${i + 1}: ${STEPS[i].label} ──`)
      try {
        await STEP_FNS[i]()
        setStatus(i, 'done')
        // short pause between steps for animation readability
        if (i < STEPS.length - 1) await sleep(600)
      } catch (err: any) {
        setStatus(i, 'error')
        addLog(`✗ Error: ${err.message}`)
        setFatalError(`Step ${i + 1} failed: ${err.message}`)
        break
      }
    }

    setFinished(true)
    addLog('\n🎉 Demo complete')
  }

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

  const progressPct = currentStep < 0 ? 0 : ((currentStep + (statuses[currentStep] === 'done' ? 1 : 0.5)) / STEPS.length) * 100

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div
        className="relative bg-[#0e0e0e] border-2 border-foreground rounded-2xl shadow-[8px_8px_0px_0px_var(--primary)] w-full max-w-3xl flex flex-col overflow-hidden"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        {/* ── header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-3">
            <img src="/logo_cherry.png" alt="Provenance" className="w-7 h-7 rounded-full object-cover" />
            <span className="font-magilio text-primary font-bold tracking-wider text-lg">Provenance</span>
            <span className="text-xs text-muted-foreground font-mono border border-border/50 px-2 py-0.5 rounded">
              Live Demo
            </span>
          </div>
          <div className="flex items-center gap-4">
            {started && (
              <span className="text-xs font-mono text-muted-foreground">
                {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
              </span>
            )}
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none"
              aria-label="Close demo"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── progress bar ── */}
        {started && (
          <div className="h-0.5 bg-border/40 shrink-0">
            <div
              className="h-full bg-primary transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* ── left: step list ── */}
          <div className="w-56 shrink-0 border-r border-border/40 overflow-y-auto py-4 px-3 space-y-1">
            {STEPS.map((step, i) => {
              const s = statuses[i]
              const isActive = i === currentStep
              return (
                <div
                  key={step.id}
                  className={`flex items-start gap-2 px-2 py-2 rounded-lg text-xs transition-all duration-300 ${
                    isActive ? 'bg-primary/10 border border-primary/30' : 'border border-transparent'
                  }`}
                >
                  <span className={`mt-0.5 text-sm shrink-0 font-mono font-bold ${statusColor(s)}`}>
                    {statusIcon(s, step.icon)}
                  </span>
                  <div className="min-w-0">
                    <p className={`font-semibold leading-snug ${statusColor(s)} ${isActive ? 'text-foreground' : ''}`}>
                      {step.label}
                    </p>
                    {isActive && s === 'running' && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{step.detail}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── right: live log ── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!started ? (
              /* ── pre-launch screen ── */
              <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 text-center">
                <div className="text-5xl">🚀</div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">End-to-End Live Demo</h3>
                  <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                    This demo imports your real Discord messages, runs Gemini AI extraction, builds
                    the live HydraDB graph, and walks through every view — all in under 90 seconds.
                  </p>
                </div>
                <div className="text-left w-full max-w-sm space-y-2">
                  {STEPS.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="text-base">{s.icon}</span>
                      <span>{s.label}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-xs text-amber-400 text-left w-full max-w-sm">
                  <p className="font-bold mb-1">⚠ Prerequisites</p>
                  <p>Requires <code className="font-mono">DISCORD_BOT_TOKEN</code>, <code className="font-mono">DISCORD_CHANNEL_ID</code>, and <code className="font-mono">GEMINI_API_KEY</code> in your <code>.env.local</code>, plus at least one project seeded in HydraDB.</p>
                </div>
                <Button size="lg" onClick={runDemo} className="px-12 h-12 text-base font-bold">
                  ▶ Run Demo
                </Button>
              </div>
            ) : (
              /* ── live log ── */
              <div
                ref={logRef}
                className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed space-y-0.5 text-foreground/80"
              >
                {log.map((line, i) => {
                  const isStep    = line.startsWith('── Step')
                  const isSuccess = line.startsWith('✓') || line.startsWith('🎉')
                  const isError   = line.startsWith('✗') || line.startsWith('⚠')
                  const isNav     = line.startsWith('→')
                  return (
                    <p
                      key={i}
                      className={`${
                        isStep    ? 'text-primary font-bold mt-2 border-t border-border/30 pt-2' :
                        isSuccess ? 'text-emerald-400' :
                        isError   ? 'text-rose-400' :
                        isNav     ? 'text-sky-400' :
                                    'text-foreground/60'
                      }`}
                    >
                      {line}
                    </p>
                  )
                })}
                {currentStep >= 0 && !finished && statuses[currentStep] === 'running' && (
                  <p className="text-primary animate-pulse">▌</p>
                )}
              </div>
            )}

            {/* ── footer ── */}
            {started && (
              <div className="shrink-0 border-t border-border/40 px-4 py-3 flex items-center justify-between">
                {fatalError ? (
                  <p className="text-xs text-rose-400 font-mono">{fatalError}</p>
                ) : finished ? (
                  <p className="text-xs text-emerald-400 font-mono">Demo complete in {elapsed}s</p>
                ) : (
                  <p className="text-xs text-muted-foreground font-mono">
                    Step {currentStep + 1} / {STEPS.length} — {STEPS[currentStep]?.label}
                  </p>
                )}
                <div className="flex gap-2">
                  {(finished || fatalError) && (
                    <Button size="sm" variant="outline" onClick={onClose}>
                      Close
                    </Button>
                  )}
                  {fatalError && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setStatuses(STEPS.map(() => 'pending'))
                        setCurrentStep(-1)
                        setLog([])
                        setElapsed(0)
                        setStarted(false)
                        setFinished(false)
                        setFatalError(null)
                        messagesRef.current = []
                        extractionsRef.current = []
                        supersededRef.current = []
                        projectIdRef.current = null
                      }}
                    >
                      Retry
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
