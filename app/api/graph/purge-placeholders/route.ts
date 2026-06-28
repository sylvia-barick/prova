import { NextResponse } from 'next/server'
import { client, TENANT_ID } from '@/lib/hydradb'

// Known placeholder entity IDs written by the old seed route.
// These correspond to usr-alex and usr-sylvia — fake users that were
// seeded with hardcoded identities before Firebase auth was introduced.
const PLACEHOLDER_PERSON_ENTITY_IDS = [
  'd73ebec1c3f3a960a98c5954798d292d', // usr-alex / Alex Chen / alex@example.com
  'ee7a053d307a3453b5f82c3c6cace637', // usr-sylvia / Sylvia Barick / sylvia@example.com
]

const PLACEHOLDER_LOGICAL_IDS = new Set(['usr-alex', 'usr-sylvia'])

// POST /api/graph/purge-placeholders
// Tombstones every placeholder Person node in HydraDB and removes their
// member_of relations by re-ingesting a purged subgraph.
export async function POST() {
  try {
    const res = await client.context.relations({ tenantId: TENANT_ID })
    const triplets = res.data?.relations || []

    // Collect all relations from the live graph that do NOT involve a placeholder
    const keepEntities: Record<string, any> = {}
    const keepRelations: any[] = []

    const isPlaceholder = (entityId?: string) =>
      entityId ? PLACEHOLDER_PERSON_ENTITY_IDS.includes(entityId) : false

    for (const triplet of triplets) {
      const srcId = triplet.source?.entityId
      const tgtId = triplet.target?.entityId

      if (isPlaceholder(srcId) || isPlaceholder(tgtId)) {
        // Skip — do not re-ingest any triplet that involves a placeholder
        continue
      }

      if (triplet.source?.entityId) keepEntities[triplet.source.entityId] = triplet.source
      if (triplet.target?.entityId) keepEntities[triplet.target.entityId] = triplet.target

      for (const r of triplet.relations || []) {
        if (!r.sourceEntityId || !r.targetEntityId) continue
        if (isPlaceholder(r.sourceEntityId) || isPlaceholder(r.targetEntityId)) continue
        keepRelations.push({
          source: r.sourceEntityId,
          target: r.targetEntityId,
          predicate: r.rawPredicate || r.canonicalPredicate || 'connected',
          timestamp: r.timestamp || new Date().toISOString(),
        })
      }
    }

    // Re-ingest the clean subgraph with upsert — this overwrites the tenant's
    // graph with a version that has no placeholder nodes or their edges.
    const sourceId = 'purge-placeholders'
    await client.context.ingest({
      tenantId: TENANT_ID,
      type: 'knowledge',
      upsert: 'true',
      appKnowledge: JSON.stringify([{
        id: sourceId,
        title: 'Placeholder purge — removed fake seed users',
        content: { text: 'Removed usr-alex (Alex Chen) and usr-sylvia (Sylvia Barick) from the graph.' },
        type: 'document',
      }]),
      graphPayload: JSON.stringify({
        [sourceId]: {
          entities: keepEntities,
          relations: keepRelations,
        },
      }),
    })

    return NextResponse.json({
      success: true,
      message: 'Placeholder persons purged from HydraDB graph.',
      removedEntityIds: PLACEHOLDER_PERSON_ENTITY_IDS,
      keptEntities: Object.keys(keepEntities).length,
      keptRelations: keepRelations.length,
    })
  } catch (error: any) {
    console.error('Purge error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
