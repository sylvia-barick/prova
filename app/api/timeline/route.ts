import { NextResponse } from 'next/server'
import { client, TENANT_ID } from '@/lib/hydradb'
import { sanitizeAuthor, isPlaceholderPerson } from '@/lib/sanitize'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    let projectId = url.searchParams.get('projectId')

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

    const normalizeProject = (p: any) => {
      return {
        id: p.id || p.i,
        name: p.name || p.n,
        description: p.description || p.d || '',
        slug: p.slug || p.s || '',
        createdAt: p.createdAt || p.c
      }
    }

    const normalizeDecision = (d: any) => {
      const rawAuthor = {
        id:    d.author?.id   || (d.a ? d.a[0] : ''),
        name:  d.author?.name || (d.a ? d.a[1] : ''),
        email: d.author?.email || '',
      }
      const author = sanitizeAuthor(rawAuthor)
      const status = d.status || (d.s === 'a' ? 'active' : (d.s === 's' ? 'superseded' : 'draft'))
      const timelineCreated = d.timeline?.created || d.tc
      const timelineUpdated = d.timeline?.updated || d.tu
      const impact = d.impact || (d.im === 'l' ? 'low' : (d.im === 'm' ? 'medium' : 'high'))
      
      return {
        id: d.id || d.i,
        projectId: d.projectId || d.p,
        title: d.title || d.t,
        description: d.description || d.d || '',
        author,
        status: status,
        category: d.category || d.c,
        timeline: {
          created: timelineCreated,
          updated: timelineUpdated
        },
        impact: impact,
        tags: d.tags || []
      }
    }

    // Fallback if projectId not specified: try to find first project in the graph
    if (!projectId) {
      const firstProj = Array.from(entitiesMap.values()).find(e => e.type === 'Project')
      if (firstProj) {
        try {
          const p = normalizeProject(JSON.parse(firstProj.identifier))
          projectId = p.id
        } catch {}
      }
    }

    if (!projectId) {
      return NextResponse.json({ success: true, events: [] })
    }

    // Subgraph extraction: find all entity IDs associated with this project
    const associatedIds = new Set<string>()
    associatedIds.add(`project-${projectId}`)

    // Pass 1: find Projects and Decisions that declare this projectId in their JSON properties
    for (const [entityId, entity] of entitiesMap.entries()) {
      if (entity.type === 'Project') {
        try {
          const p = normalizeProject(JSON.parse(entity.identifier))
          if (p.id === projectId) {
            associatedIds.add(entityId)
          }
        } catch {}
      } else if (entity.type === 'Decision') {
        try {
          const d = normalizeDecision(JSON.parse(entity.identifier))
          if (d.projectId === projectId) {
            associatedIds.add(entityId)
          }
        } catch {}
      }
    }

    // Pass 2: find Channels connected to Project via 'has_source'
    for (const rel of relationsList) {
      if (rel.predicate === 'has_source' && associatedIds.has(rel.sourceId)) {
        associatedIds.add(rel.targetId)
      }
    }

    // Pass 3: find Messages connected to Channels via 'surfaced_in'
    for (const rel of relationsList) {
      if (rel.predicate === 'surfaced_in' && associatedIds.has(rel.targetId)) {
        associatedIds.add(rel.sourceId)
      }
    }

    // Pass 4: find Persons who proposed Decisions/Messages in our set
    for (const rel of relationsList) {
      if (rel.predicate === 'proposed' && associatedIds.has(rel.targetId)) {
        associatedIds.add(rel.sourceId)
      }
    }

    // Pass 5: find Messages connected to Decisions or vice-versa via 'surfaced_in'
    for (const rel of relationsList) {
      if (rel.predicate === 'surfaced_in') {
        if (associatedIds.has(rel.sourceId)) {
          associatedIds.add(rel.targetId)
        } else if (associatedIds.has(rel.targetId)) {
          associatedIds.add(rel.sourceId)
        }
      }
    }

    // Retrieve Project Name
    let projectName = 'Project'
    const projectNode = Array.from(entitiesMap.values()).find(
      e => {
        if (e.type !== 'Project') return false
        try {
          const p = normalizeProject(JSON.parse(e.identifier))
          return p.id === projectId
        } catch {
          return false
        }
      }
    )
    if (projectNode) {
      try {
        const p = normalizeProject(JSON.parse(projectNode.identifier))
        projectName = p.name || projectName
      } catch {}
    }

    const events: any[] = []

    // 1. Process Messages (Discord message imported)
    const messageEntities = Array.from(entitiesMap.values()).filter(
      e => e.type === 'Message' && associatedIds.has(e.entityId)
    )
    for (const msgEnt of messageEntities) {
      try {
        const msg = JSON.parse(msgEnt.identifier)
        
        // Find which channel this message was surfaced in
        const surfacedInRel = relationsList.find(r => r.predicate === 'surfaced_in' && r.sourceId === msgEnt.entityId)
        let channelName = 'general'
        if (surfacedInRel) {
          const chanNode = entitiesMap.get(surfacedInRel.targetId)
          if (chanNode) {
            try {
              const chan = JSON.parse(chanNode.identifier)
              channelName = chan.name || channelName
            } catch {}
          }
        }

        events.push({
          id: `event-msg-${msg.id}`,
          timestamp: msg.timestamp,
          eventType: 'message-imported',
          title: 'Discord Message Imported',
          description: `Imported message from @${msg.author.username} in #${channelName}`,
          relatedProject: { id: projectId, name: projectName },
          person: {
            id: msg.author.id,
            name: msg.author.username,
            avatar: msg.author.avatar || ''
          },
          originalDiscordMessage: {
            id: msg.id,
            content: msg.content,
            author: msg.author.username,
            timestamp: msg.timestamp
          },
          relevantNodeIds: [msgEnt.entityId, `person-${msg.author.id}`]
        })
      } catch {}
    }

    // 2. Process Decisions (Created, Updated, Superseded, AI Extracted)
    const decisionEntities = Array.from(entitiesMap.values()).filter(
      e => e.type === 'Decision' && associatedIds.has(e.entityId)
    )
    
    // Group decision nodes by their logical decision ID (d.id)
    const decisionsGrouped = new Map<string, any[]>()
    for (const decEnt of decisionEntities) {
      try {
        const d = normalizeDecision(JSON.parse(decEnt.identifier))
        const list = decisionsGrouped.get(d.id) || []
        list.push({ node: decEnt, parsed: d })
        decisionsGrouped.set(d.id, list)
      } catch {}
    }

    for (const [decId, list] of decisionsGrouped.entries()) {
      // Sort versions chronologically by updated timestamp
      list.sort((a, b) => new Date(a.parsed.timeline.updated).getTime() - new Date(b.parsed.timeline.updated).getTime())
      
      const oldest = list[0]
      const newest = list[list.length - 1]

      // Find if this decision surfaced in a message
      let sourceMsg: any = null
      let surfaceRel = null
      
      // Look for surfaced_in relation from any version of this decision to a Message node
      for (const ver of list) {
        surfaceRel = relationsList.find(r => r.predicate === 'surfaced_in' && r.sourceId === ver.node.entityId && r.targetId.startsWith('message-'))
        if (surfaceRel) break
      }
      
      if (surfaceRel) {
        const msgEnt = entitiesMap.get(surfaceRel.targetId)
        if (msgEnt && msgEnt.type === 'Message') {
          try { sourceMsg = JSON.parse(msgEnt.identifier) } catch {}
        }
      }

      // Event: Decision created
      events.push({
        id: `event-dec-create-${decId}`,
        timestamp: oldest.parsed.timeline.created || oldest.parsed.timeline.updated,
        eventType: 'decision-created',
        title: 'Decision Proposed',
        description: `Proposed decision: "${oldest.parsed.title}"`,
        relatedProject: { id: projectId, name: projectName },
        person: {
          id: oldest.parsed.author.id,
          name: oldest.parsed.author.name,
          email: oldest.parsed.author.email || '',
          avatar: oldest.parsed.author.avatar || '',
          role: oldest.parsed.author.role || ''
        },
        decision: {
          id: oldest.parsed.id,
          title: oldest.parsed.title,
          status: oldest.parsed.status,
          description: oldest.parsed.description
        },
        originalDiscordMessage: sourceMsg ? {
          id: sourceMsg.id,
          content: sourceMsg.content,
          author: sourceMsg.author.username,
          timestamp: sourceMsg.timestamp
        } : undefined,
        relevantNodeIds: [oldest.node.entityId, `person-${oldest.parsed.author.id}`]
      })

      // Event: AI extraction completed (if surfaced in a message)
      if (sourceMsg) {
        events.push({
          id: `event-dec-extract-${decId}`,
          timestamp: oldest.parsed.timeline.created || oldest.parsed.timeline.updated,
          eventType: 'ai-extraction-completed',
          title: 'AI Decision Extraction',
          description: `Gemini classified and extracted decision from Discord message by @${sourceMsg.author.username}.`,
          relatedProject: { id: projectId, name: projectName },
          person: {
            id: oldest.parsed.author.id,
            name: oldest.parsed.author.name
          },
          decision: {
            id: oldest.parsed.id,
            title: oldest.parsed.title,
            status: oldest.parsed.status,
            description: oldest.parsed.description
          },
          originalDiscordMessage: {
            id: sourceMsg.id,
            content: sourceMsg.content,
            author: sourceMsg.author.username,
            timestamp: sourceMsg.timestamp
          },
          relevantNodeIds: [oldest.node.entityId, `message-${sourceMsg.id}`]
        })
      }

      // Event: Decision updated (if multiple versions exist)
      if (list.length > 1) {
        for (let i = 1; i < list.length; i++) {
          const ver = list[i]
          const prevVer = list[i - 1]
          
          let changeDesc = `Updated decision: "${ver.parsed.title}"`
          if (ver.parsed.status !== prevVer.parsed.status) {
            changeDesc = `Updated decision status from '${prevVer.parsed.status}' to '${ver.parsed.status}': "${ver.parsed.title}"`
          } else if (ver.parsed.description !== prevVer.parsed.description) {
            changeDesc = `Updated decision details: "${ver.parsed.title}"`
          }

          events.push({
            id: `event-dec-update-${decId}-${i}`,
            timestamp: ver.parsed.timeline.updated,
            eventType: 'decision-updated',
            title: 'Decision Updated',
            description: changeDesc,
            relatedProject: { id: projectId, name: projectName },
            person: {
              id: ver.parsed.author.id,
              name: ver.parsed.author.name,
              email: ver.parsed.author.email || '',
              avatar: ver.parsed.author.avatar || '',
              role: ver.parsed.author.role || ''
            },
            decision: {
              id: ver.parsed.id,
              title: ver.parsed.title,
              status: ver.parsed.status,
              description: ver.parsed.description
            },
            relevantNodeIds: [ver.node.entityId, `person-${ver.parsed.author.id}`]
          })
        }
      }

      // Event: Decision superseded (if we have a superseded_by relationship to a different decision ID)
      for (const ver of list) {
        const supersededRels = relationsList.filter(
          r => r.predicate === 'superseded_by' && r.sourceId === ver.node.entityId
        )
        
        for (const rel of supersededRels) {
          const targetNode = entitiesMap.get(rel.targetId)
          if (targetNode && targetNode.type === 'Decision') {
            try {
              const targetParsed = normalizeDecision(JSON.parse(targetNode.identifier))
              if (targetParsed.id !== decId) {
                events.push({
                  id: `event-dec-superseded-${decId}-${targetNode.entityId}`,
                  timestamp: rel.timestamp || targetParsed.timeline.updated,
                  eventType: 'decision-superseded',
                  title: 'Decision Superseded',
                  description: `Decision "${ver.parsed.title}" was superseded by "${targetParsed.title}"`,
                  relatedProject: { id: projectId, name: projectName },
                  person: {
                    id: targetParsed.author.id,
                    name: targetParsed.author.name,
                    email: targetParsed.author.email || '',
                    avatar: targetParsed.author.avatar || '',
                    role: targetParsed.author.role || ''
                  },
                  decision: {
                    id: ver.parsed.id,
                    title: ver.parsed.title,
                    status: ver.parsed.status,
                    description: ver.parsed.description
                  },
                  supersededBy: {
                    id: targetParsed.id,
                    title: targetParsed.title,
                    status: targetParsed.status,
                    description: targetParsed.description
                  },
                  relevantNodeIds: [ver.node.entityId, targetNode.entityId]
                })
              }
            } catch {}
          }
        }
      }
    }

    // Sort chronologically (oldest first)
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    return NextResponse.json({ success: true, events })

  } catch (error: any) {
    console.error('Failed to query timeline events:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
