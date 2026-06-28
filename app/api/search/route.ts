import { NextResponse } from 'next/server'
import { client, TENANT_ID } from '@/lib/hydradb'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { query, projectId } = body as { query: string; projectId: string }

    if (!query) {
      throw new Error('Search query is required.')
    }

    const geminiApiKey = process.env.GEMINI_API_KEY
    if (!geminiApiKey || geminiApiKey === 'dummy-key') {
      throw new Error('GEMINI_API_KEY is not configured in .env.local')
    }

    // 1. Fetch live relations from HydraDB
    const res = await client.context.relations({ tenantId: TENANT_ID })
    const relations = res.data?.relations || []

    const entitiesMap = new Map<string, any>()
    const relationsList: any[] = []

    for (const triplet of relations) {
      if (triplet.source?.entityId) {
        entitiesMap.set(triplet.source.entityId, triplet.source)
      }
      if (triplet.target?.entityId) {
        entitiesMap.set(triplet.target.entityId, triplet.target)
      }
      for (const r of triplet.relations || []) {
        relationsList.push({
          sourceId: r.sourceEntityId,
          targetId: r.targetEntityId,
          predicate: r.rawPredicate,
          timestamp: r.timestamp
        })
      }
    }

    // Subgraph extraction for the requested project
    const associatedIds = new Set<string>()
    if (projectId) {
      associatedIds.add(`project-${projectId}`)

      // Pass 1: Projects and Decisions that declare this projectId
      for (const [entityId, entity] of entitiesMap.entries()) {
        if (entity.type === 'Project') {
          try {
            const p = JSON.parse(entity.identifier)
            if (p.id === projectId) associatedIds.add(entityId)
          } catch {}
        } else if (entity.type === 'Decision') {
          try {
            const d = JSON.parse(entity.identifier)
            if (d.projectId === projectId) associatedIds.add(entityId)
          } catch {}
        }
      }

      // Pass 2: Channels connected to Project via 'has_source'
      for (const rel of relationsList) {
        if (rel.predicate === 'has_source' && associatedIds.has(rel.sourceId)) {
          associatedIds.add(rel.targetId)
        }
      }

      // Pass 3: Messages connected to Channels via 'surfaced_in'
      for (const rel of relationsList) {
        if (rel.predicate === 'surfaced_in' && associatedIds.has(rel.targetId)) {
          associatedIds.add(rel.sourceId)
        }
      }

      // Pass 4: Persons connected to Decisions/Messages via 'proposed'
      for (const rel of relationsList) {
        if (rel.predicate === 'proposed' && associatedIds.has(rel.targetId)) {
          associatedIds.add(rel.sourceId)
        }
      }

      // Pass 5: Messages connected to Decisions or vice-versa via 'surfaced_in'
      for (const rel of relationsList) {
        if (rel.predicate === 'surfaced_in') {
          if (associatedIds.has(rel.sourceId)) {
            associatedIds.add(rel.targetId)
          } else if (associatedIds.has(rel.targetId)) {
            associatedIds.add(rel.sourceId)
          }
        }
      }
    }

    // 2. Filter and serialize relations to keep it token-efficient
    const filteredRelations = relations.filter((triplet) => {
      if (!projectId) return true
      const sId = triplet.source?.entityId
      const tId = triplet.target?.entityId
      return (sId && associatedIds.has(sId)) || (tId && associatedIds.has(tId))
    })

    const serializedGraph = filteredRelations.map((triplet) => {
      let sourceProps = null
      let targetProps = null

      try {
        if (triplet.source?.identifier) {
          sourceProps = JSON.parse(triplet.source.identifier)
        }
      } catch {}

      try {
        if (triplet.target?.identifier) {
          targetProps = JSON.parse(triplet.target.identifier)
        }
      } catch {}

      return {
        source: {
          id: triplet.source?.entityId,
          type: triplet.source?.type,
          name: triplet.source?.name,
          properties: sourceProps
        },
        target: {
          id: triplet.target?.entityId,
          type: triplet.target?.type,
          name: triplet.target?.name,
          properties: targetProps
        },
        relations: (triplet.relations || []).map((r) => ({
          predicate: r.rawPredicate,
          timestamp: r.timestamp
        }))
      }
    })

    // 3. Construct prompt for Gemini
    const prompt = `
You are a graph-native semantic search engine.
Analyze this knowledge graph of project decisions (nodes and relationships):
${JSON.stringify(serializedGraph, null, 2)}

User Search Query: "${query}"

Answer the user's query semantically using ONLY the facts present in the knowledge graph. Do not fabricate or assume details.
If no matching decisions or entities exist in the graph, set hasResult to false and return "No matching decision found" for the answer.

Requirements:
1. "Current Decision": State the current active choice/decision.
2. "Decision History": Trace the supersession chain. If multiple versions of the decision exist (linked via 'superseded_by' relation or version updates), detail how it evolved.
3. "People involved": Extract who proposed/authored the decision(s).
4. "Original Discord messages": List original message contents that surfaced this decision.
5. "Reasoning": Highlight the justification/reasoning behind the decision.
6. "Confidence": Provide the confidence score.
7. "Timestamps": Return when it was created/updated.
8. "Relevant Node IDs": Identify the list of node IDs (e.g. decision-xyz, person-abc, message-123) from the graph that are directly associated with this search.

Return JSON in this exact structure:
{
  "hasResult": boolean,
  "answer": "A summary answer of the result",
  "relevantNodeIds": ["decision-...", "person-..."],
  "details": {
    "currentDecision": "Decision description",
    "decisionHistory": ["Previous decision version 1", "Previous decision version 2"],
    "peopleInvolved": ["Name"],
    "originalMessages": ["Message text"],
    "reasoning": "Reasoning string",
    "confidence": number,
    "timestamps": {
      "created": "Date string",
      "updated": "Date string"
    }
  }
}
`

    // 4. Query Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Gemini API returned status ${response.status}: ${errText}`)
    }

    const resJson = await response.json()
    const textOutput = resJson.candidates?.[0]?.content?.parts?.[0]?.text

    if (!textOutput) {
      throw new Error('Gemini API returned empty text output.')
    }

    const searchResult = JSON.parse(textOutput)

    return NextResponse.json({
      success: true,
      result: searchResult
    })

  } catch (error: any) {
    console.error('Semantic Search API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
