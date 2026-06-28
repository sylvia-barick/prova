import { NextResponse } from 'next/server'
import {
  client,
  TENANT_ID,
  createProjectNode,
  createChannelNode,
  createPersonNode,
  createMessageNode,
  createProposedRelation,
  createAffectsRelation,
  createDecisionNode,
  createDecisionSurfacedInMessageRelation,
} from '@/lib/hydradb'
import { Project, Decision, Person, DiscordMessage } from '@/lib/types'

// GET /api/seed?ownerUid=<firebase-uid>&ownerName=<display-name>&ownerEmail=<email>
// Seeds an initial project for a newly authenticated user.
// No hardcoded placeholder users — the caller must pass their real Firebase identity.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ownerUid   = searchParams.get('ownerUid')
    const ownerName  = searchParams.get('ownerName')  || 'Team Member'
    const ownerEmail = searchParams.get('ownerEmail') || ''

    if (!ownerUid) {
      return NextResponse.json(
        { error: 'ownerUid query parameter is required. Pass the authenticated Firebase UID.' },
        { status: 400 }
      )
    }

    try {
      await client.tenants.create({ tenantId: TENANT_ID })
    } catch {
      // Tenant already exists — ignore
    }

    const owner: Person = {
      id: ownerUid,
      name: ownerName,
      email: ownerEmail,
      avatar: '',
      role: 'Project Owner',
    }

    const project: Project = {
      id: `project-${ownerUid.slice(0, 8)}`,
      name: 'My Project',
      description: 'Default project created on first sign-in',
      slug: 'my-project',
      createdAt: new Date(),
      members: [owner],
      connectedSources: [
        {
          id: 'general',
          type: 'discord',
          name: 'Discord General',
          connected: true,
          config: { channelId: 'general' },
        },
      ],
      decisionCount: 0,
    }

    const msg1: DiscordMessage = {
      id: `msg-${ownerUid.slice(0, 6)}-001`,
      author: { id: ownerUid, username: ownerName },
      content: 'We should decide on the primary database for this project.',
      timestamp: new Date().toISOString(),
      channelId: 'general',
    }

    const decision1: Decision = {
      id: `dec-${ownerUid.slice(0, 6)}-001`,
      projectId: project.id,
      title: 'Initial Architecture Discussion',
      description:
        'First decision recorded — connect Discord and run AI extraction to populate real decisions.',
      author: owner,
      status: 'active',
      category: 'Architecture',
      affects: ['architecture'],
      relatedCommits: [],
      relatedMessages: [msg1.id],
      timeline: { created: new Date(), updated: new Date() },
      impact: 'high',
      tags: ['architecture', 'initial'],
    }

    const triplets: any[] = []

    const projectNode = createProjectNode(project)
    const channelNode = createChannelNode(project.connectedSources[0])
    const ownerNode   = createPersonNode(owner)
    const msg1Node    = createMessageNode(msg1)
    const dec1Node    = createDecisionNode(decision1)

    triplets.push({
      source: projectNode,
      target: channelNode,
      relations: [{
        rawPredicate: 'has_source',
        canonicalPredicate: 'has_source',
        sourceEntityId: projectNode.entityId,
        targetEntityId: channelNode.entityId,
        timestamp: new Date().toISOString(),
      }],
    })
    triplets.push({
      source: ownerNode,
      target: projectNode,
      relations: [{
        rawPredicate: 'member_of',
        canonicalPredicate: 'member_of',
        sourceEntityId: ownerNode.entityId,
        targetEntityId: projectNode.entityId,
        timestamp: new Date().toISOString(),
      }],
    })
    triplets.push({
      source: msg1Node,
      target: channelNode,
      relations: [{
        rawPredicate: 'surfaced_in',
        canonicalPredicate: 'surfaced_in',
        sourceEntityId: msg1Node.entityId,
        targetEntityId: channelNode.entityId,
        timestamp: msg1.timestamp,
      }],
    })
    triplets.push(createProposedRelation(owner, msg1))
    triplets.push(createProposedRelation(owner, decision1))
    triplets.push(createAffectsRelation(decision1, project))
    triplets.push(createDecisionSurfacedInMessageRelation(decision1, msg1))

    const entitiesMap: Record<string, any> = {}
    if (projectNode.entityId) entitiesMap[projectNode.entityId] = projectNode
    if (channelNode.entityId) entitiesMap[channelNode.entityId] = channelNode
    if (ownerNode.entityId)   entitiesMap[ownerNode.entityId]   = ownerNode
    if (msg1Node.entityId)    entitiesMap[msg1Node.entityId]    = msg1Node
    if (dec1Node.entityId)    entitiesMap[dec1Node.entityId]    = dec1Node

    const relationsForIngest = triplets
      .filter((t) => t.source?.entityId && t.target?.entityId)
      .map((t) => {
        const relInfo = t.relations?.[0]
        return {
          source: t.source!.entityId as string,
          target: t.target!.entityId as string,
          predicate: relInfo?.rawPredicate || relInfo?.canonicalPredicate || 'connected',
          timestamp: relInfo?.timestamp || new Date().toISOString(),
        }
      })

    const sourceId = `seed-${ownerUid.slice(0, 8)}`
    await client.context.ingest({
      tenantId: TENANT_ID,
      type: 'knowledge',
      upsert: 'true',
      appKnowledge: JSON.stringify([{
        id: sourceId,
        title: `Project seed for ${ownerName}`,
        content: { text: `Initial project seed for authenticated user ${ownerUid}` },
        type: 'document',
      }]),
      graphPayload: JSON.stringify({
        [sourceId]: { entities: entitiesMap, relations: relationsForIngest },
      }),
    })

    return NextResponse.json({
      success: true,
      projectId: project.id,
      message: `Project seeded for ${ownerName} (${ownerUid})`,
    })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
