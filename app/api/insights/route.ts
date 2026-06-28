import { NextResponse } from 'next/server'
import { client, TENANT_ID } from '@/lib/hydradb'
import { sanitizeAuthor, isPlaceholderPerson } from '@/lib/sanitize'

// ─── helpers ────────────────────────────────────────────────────────────────

function normalizeDecision(raw: any) {
  const s = raw.s || raw.status || ''
  const status =
    s === 'a' || s === 'active'
      ? 'active'
      : s === 's' || s === 'superseded'
        ? 'superseded'
        : s === 'r' || s === 'reverted'
          ? 'reverted'
          : 'draft'
  const rawAuthor = {
    id:    raw.author?.id   || (Array.isArray(raw.a) ? raw.a[0] : ''),
    name:  raw.author?.name || (Array.isArray(raw.a) ? raw.a[1] : ''),
    email: raw.author?.email || '',
  }
  const author = sanitizeAuthor(rawAuthor)
  return {
    id: raw.id || raw.i || '',
    projectId: raw.projectId || raw.p || '',
    title: raw.title || raw.t || '',
    description: raw.description || raw.d || '',
    category: raw.category || raw.c || 'Uncategorized',
    status,
    authorId:   author.id,
    authorName: author.name,
    created: raw.timeline?.created || raw.tc || null,
    updated: raw.timeline?.updated || raw.tu || null,
    impact: raw.impact || (raw.im === 'h' ? 'high' : raw.im === 'm' ? 'medium' : 'low'),
    confidenceScore: raw.confidenceScore ?? null,
  }
}

function normalizeMessage(raw: any) {
  return {
    id: raw.id || '',
    authorId: raw.author?.id || '',
    authorName: raw.author?.username || raw.author?.name || 'Unknown',
    content: raw.content || '',
    timestamp: raw.timestamp || null,
    channelId: raw.channelId || '',
  }
}

// ─── GET /api/insights?projectId=... ────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    // 1. Pull raw graph from HydraDB
    const res = await client.context.relations({ tenantId: TENANT_ID })
    const triplets = res.data?.relations || []

    const entitiesMap = new Map<string, any>()
    const relationsList: { sourceId: string; targetId: string; predicate: string; timestamp: string }[] = []

    for (const triplet of triplets) {
      if (triplet.source?.entityId) entitiesMap.set(triplet.source.entityId, triplet.source)
      if (triplet.target?.entityId) entitiesMap.set(triplet.target.entityId, triplet.target)
      for (const r of triplet.relations || []) {
        if (r.sourceEntityId && r.targetEntityId) {
          relationsList.push({
            sourceId: r.sourceEntityId,
            targetId: r.targetEntityId,
            predicate: r.rawPredicate || r.canonicalPredicate || '',
            timestamp: r.timestamp || new Date().toISOString(),
          })
        }
      }
    }

    // 2. Identify this project's associated entity IDs (same 5-pass logic used in timeline)
    const associated = new Set<string>()
    associated.add(`project-${projectId}`)

    for (const [eid, entity] of entitiesMap) {
      if (entity.type === 'Project') {
        try {
          const p = JSON.parse(entity.identifier)
          if ((p.id || p.i) === projectId) associated.add(eid)
        } catch {}
      } else if (entity.type === 'Decision') {
        try {
          const d = JSON.parse(entity.identifier)
          if ((d.projectId || d.p) === projectId) associated.add(eid)
        } catch {}
      }
    }
    // channels
    for (const r of relationsList) {
      if (r.predicate === 'has_source' && associated.has(r.sourceId)) associated.add(r.targetId)
    }
    // messages surfaced in channels
    for (const r of relationsList) {
      if (r.predicate === 'surfaced_in' && associated.has(r.targetId)) associated.add(r.sourceId)
    }
    // persons who proposed decisions/messages
    for (const r of relationsList) {
      if (r.predicate === 'proposed' && associated.has(r.targetId)) associated.add(r.sourceId)
    }
    // decisions surfaced in messages
    for (const r of relationsList) {
      if (r.predicate === 'surfaced_in') {
        if (associated.has(r.sourceId)) associated.add(r.targetId)
        else if (associated.has(r.targetId)) associated.add(r.sourceId)
      }
    }

    // 3. Collect ALL decision nodes (all versions) for this project
    //    Group by logical decision id (d.id) to build revision chains
    const decisionVersionsMap = new Map<string, { entityId: string; parsed: ReturnType<typeof normalizeDecision> }[]>()

    for (const [eid, entity] of entitiesMap) {
      if (entity.type !== 'Decision' || !associated.has(eid)) continue
      try {
        const raw = JSON.parse(entity.identifier)
        const parsed = normalizeDecision(raw)
        if (!parsed.id) continue
        const list = decisionVersionsMap.get(parsed.id) || []
        list.push({ entityId: eid, parsed })
        decisionVersionsMap.set(parsed.id, list)
      } catch {}
    }

    // Sort each decision's versions chronologically
    for (const [, list] of decisionVersionsMap) {
      list.sort((a, b) => {
        const ta = a.parsed.updated ? new Date(a.parsed.updated).getTime() : 0
        const tb = b.parsed.updated ? new Date(b.parsed.updated).getTime() : 0
        return ta - tb
      })
    }

    // 4. Collect messages
    const messages: ReturnType<typeof normalizeMessage>[] = []
    for (const [eid, entity] of entitiesMap) {
      if (entity.type !== 'Message' || !associated.has(eid)) continue
      try {
        const raw = JSON.parse(entity.identifier)
        messages.push(normalizeMessage(raw))
      } catch {}
    }

    // 5. Collect persons
    const personsMap = new Map<string, { id: string; name: string }>()
    for (const [eid, entity] of entitiesMap) {
      if (entity.type !== 'Person' || !associated.has(eid)) continue
      try {
        const raw = JSON.parse(entity.identifier)
        personsMap.set(eid, { id: raw.id || eid, name: raw.name || raw.username || 'Unknown' })
      } catch {}
    }

    // ── Compute metrics ─────────────────────────────────────────────────────

    // Latest version per logical decision id
    const latestDecisions = Array.from(decisionVersionsMap.values()).map((list) => list[list.length - 1].parsed)

    const totalDecisions = latestDecisions.length
    const activeDecisions = latestDecisions.filter((d) => d.status === 'active').length
    const supersededDecisions = latestDecisions.filter((d) => d.status === 'superseded').length
    const revertedDecisions = latestDecisions.filter((d) => d.status === 'reverted').length

    // Contributors: unique authorIds across all decision versions
    const allVersions = Array.from(decisionVersionsMap.values()).flatMap((list) => list.map((v) => v.parsed))
    const contributorSet = new Set(allVersions.map((v) => v.authorId).filter(Boolean))
    // also count message authors
    for (const msg of messages) {
      if (msg.authorId) contributorSet.add(msg.authorId)
    }
    const contributors = contributorSet.size

    const importedMessages = messages.length

    // Average confidence score (from decision nodes that store it)
    const scores = allVersions.map((v) => v.confidenceScore).filter((s): s is number => typeof s === 'number')
    const avgConfidence = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null

    // Revisions per decision (version count)
    const revisionCounts = Array.from(decisionVersionsMap.values()).map((list) => list.length)
    const avgRevisions =
      revisionCounts.length > 0 ? revisionCounts.reduce((a, b) => a + b, 0) / revisionCounts.length : 0

    // Most frequently revised decision
    let mostRevisedDecision: { title: string; revisions: number } | null = null
    let maxRevisions = 0
    for (const [decId, list] of decisionVersionsMap) {
      if (list.length > maxRevisions) {
        maxRevisions = list.length
        mostRevisedDecision = { title: list[list.length - 1].parsed.title, revisions: list.length }
      }
    }

    // Average time between revisions (in hours)
    const revisionGaps: number[] = []
    for (const [, list] of decisionVersionsMap) {
      if (list.length < 2) continue
      for (let i = 1; i < list.length; i++) {
        const prev = list[i - 1].parsed.updated
        const curr = list[i].parsed.updated
        if (prev && curr) {
          const diffHours = (new Date(curr).getTime() - new Date(prev).getTime()) / (1000 * 60 * 60)
          if (diffHours > 0) revisionGaps.push(diffHours)
        }
      }
    }
    const avgRevisionGapHours =
      revisionGaps.length > 0 ? revisionGaps.reduce((a, b) => a + b, 0) / revisionGaps.length : null

    // Most active contributor (by total decision versions authored)
    const authorVersionCount = new Map<string, { name: string; count: number }>()
    for (const v of allVersions) {
      if (!v.authorId) continue
      const existing = authorVersionCount.get(v.authorId)
      if (existing) {
        existing.count++
      } else {
        authorVersionCount.set(v.authorId, { name: v.authorName, count: 1 })
      }
    }
    let mostActiveContributor: { name: string; count: number } | null = null
    for (const entry of authorVersionCount.values()) {
      if (!mostActiveContributor || entry.count > mostActiveContributor.count) {
        mostActiveContributor = entry
      }
    }

    // Most discussed topic (category with highest decision + revision count)
    const categoryStats = new Map<string, { decisions: number; revisions: number }>()
    for (const [, list] of decisionVersionsMap) {
      const category = list[list.length - 1].parsed.category || 'Uncategorized'
      const existing = categoryStats.get(category) || { decisions: 0, revisions: 0 }
      existing.decisions++
      existing.revisions += list.length
      categoryStats.set(category, existing)
    }
    let mostDiscussedTopic: { topic: string; decisions: number; revisions: number } | null = null
    for (const [topic, stats] of categoryStats) {
      const score = stats.decisions + stats.revisions
      if (!mostDiscussedTopic || score > mostDiscussedTopic.decisions + mostDiscussedTopic.revisions) {
        mostDiscussedTopic = { topic, ...stats }
      }
    }

    // Longest active decision (active decision with earliest created date)
    const activeLatest = latestDecisions.filter((d) => d.status === 'active' && d.created)
    activeLatest.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime())
    const longestActiveDecision =
      activeLatest.length > 0
        ? {
            title: activeLatest[0].title,
            createdAt: activeLatest[0].created,
            ageInDays: Math.floor(
              (Date.now() - new Date(activeLatest[0].created).getTime()) / (1000 * 60 * 60 * 24)
            ),
          }
        : null

    // Category breakdown for evidence
    const categoryBreakdown = Array.from(categoryStats.entries())
      .map(([topic, stats]) => ({ topic, ...stats }))
      .sort((a, b) => b.revisions + b.decisions - (a.revisions + a.decisions))

    // Contributor breakdown for evidence
    const contributorBreakdown = Array.from(authorVersionCount.values())
      .sort((a, b) => b.count - a.count)

    const metrics = {
      totalDecisions,
      activeDecisions,
      supersededDecisions,
      revertedDecisions,
      contributors,
      importedMessages,
      avgConfidence,
      avgRevisions: parseFloat(avgRevisions.toFixed(2)),
      avgRevisionGapHours: avgRevisionGapHours !== null ? parseFloat(avgRevisionGapHours.toFixed(1)) : null,
      mostActiveContributor,
      mostDiscussedTopic,
      mostRevisedDecision,
      longestActiveDecision,
      categoryBreakdown,
      contributorBreakdown,
    }

    // 6. Generate Gemini summaries from real metrics
    const geminiApiKey = process.env.GEMINI_API_KEY
    let summaries: {
      mostDiscussed: string
      mostRevised: string
      topContributor: string
      overallHealth: string
    } | null = null

    if (geminiApiKey && geminiApiKey !== 'dummy-key' && totalDecisions > 0) {
      try {
        const prompt = `
You are a project intelligence assistant. Based ONLY on the following real computed metrics from a software project's decision graph, generate four concise natural-language insight summaries. Do NOT fabricate data. If a metric is null or zero, acknowledge the absence of data rather than inventing detail.

## Computed Metrics
${JSON.stringify(metrics, null, 2)}

## Required Summaries (1-2 sentences each, grounded in the numbers above):
1. "mostDiscussed" — About the most discussed topic/category. Reference the actual topic name and its discussion or revision count.
2. "mostRevised" — About the most frequently revised decision. Reference the actual decision title and revision count.
3. "topContributor" — About the most active contributor. Reference their name and contribution count.
4. "overallHealth" — A brief overall project health observation based on the ratio of active vs superseded/reverted decisions and the revision activity.

Return JSON only, in exactly this structure:
{
  "mostDiscussed": "...",
  "mostRevised": "...",
  "topContributor": "...",
  "overallHealth": "..."
}
`
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          }
        )
        if (response.ok) {
          const resJson = await response.json()
          const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) summaries = JSON.parse(text)
        }
      } catch (err) {
        console.error('Gemini summaries failed:', err)
      }
    }

    return NextResponse.json({ success: true, metrics, summaries })
  } catch (error: any) {
    console.error('Insights API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
