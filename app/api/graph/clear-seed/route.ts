import { NextResponse } from 'next/server'
import { client, TENANT_ID } from '@/lib/hydradb'

// Exact entity IDs of the stale seed nodes confirmed by live HydraDB inspection on 2026-06-28.
// These were written by the old /api/seed route before it was replaced with the auth-aware version.
const STALE_ENTITY_IDS = new Set([
  // Placeholder Person nodes
  'd73ebec1c3f3a960a98c5954798d292d', // usr-alex / Alex Chen
  'ee7a053d307a3453b5f82c3c6cace637', // usr-sylvia / Sylvia Barick
  // Seeded Decision nodes with placeholder authors
  '2beecec07757cc62fdf7d8ca112d9d13', // dec-auth: Use Firebase Auth (author: Alex Chen)
  '9249cc9c4a911155540884e00984f724', // dec-auth-next: Migrate to Supabase Auth (author: Sylvia Barick)
  '80a555a6af849e7ec1fb6980273b8653', // dec-db v1: Use MongoDB (author: Sylvia Barick)
  '7f00ff6cd5813008028598a7c498befd', // dec-db v2: Use PostgreSQL (author: Alex Chen)
  // Seeded Message nodes with fake content
  '5d1894ed53762742c3c20e65a9443af7', // msg-101: fake Firebase Auth message
  'b01766a933d5afb1fc271de498cd9ae4', // msg-102: fake MongoDB message
])

// POST /api/graph/clear-seed
// Re-ingests the graph keeping only real entities and relations.
// Because HydraDB has no delete API, we re-write all non-stale triplets
// under a fresh appKnowledge chunk, which causes the graph processor to
// treat the clean set as the canonical state going forward.
export async function POST() {
  try {
    const res = await client.context.relations({ tenantId: TENANT_ID })
    const triplets = res.data?.relations || []

    const keepEntities: Record<string, any> = {}
    const keepRelations: any[] = []
    const droppedEntityIds = new Set<string>()
    const droppedRelationCount = { n: 0 }

    for (const triplet of triplets) {
      const srcId = triplet.source?.entityId
      const tgtId = triplet.target?.entityId

      if (STALE_ENTITY_IDS.has(srcId ?? '') || STALE_ENTITY_IDS.has(tgtId ?? '')) {
        if (srcId) droppedEntityIds.add(srcId)
        if (tgtId) droppedEntityIds.add(tgtId)
        droppedRelationCount.n += (triplet.relations?.length ?? 0)
        continue
      }

      if (srcId) keepEntities[srcId] = triplet.source
      if (tgtId) keepEntities[tgtId] = triplet.target

      for (const r of triplet.relations ?? []) {
        if (!r.sourceEntityId || !r.targetEntityId) continue
        if (STALE_ENTITY_IDS.has(r.sourceEntityId) || STALE_ENTITY_IDS.has(r.targetEntityId)) {
          droppedRelationCount.n++
          continue
        }
        keepRelations.push({
          source: r.sourceEntityId,
          target: r.targetEntityId,
          predicate: r.rawPredicate || r.canonicalPredicate || 'connected',
          timestamp: r.timestamp || new Date().toISOString(),
        })
      }
    }

    // Deduplicate relations
    const relMap = new Map<string, any>()
    for (const r of keepRelations) relMap.set(`${r.predicate}|${r.source}|${r.target}`, r)
    const dedupedRelations = [...relMap.values()]

    const sourceId = `clear-seed-${Date.now()}`
    await client.context.ingest({
      tenantId: TENANT_ID,
      type: 'knowledge',
      upsert: 'true',
      appKnowledge: JSON.stringify([{
        id: sourceId,
        title: 'Clear stale seed data',
        content: { text: `Removed ${droppedEntityIds.size} stale entities and ${droppedRelationCount.n} relations from the seed route.` },
        type: 'document',
      }]),
      graphPayload: JSON.stringify({
        [sourceId]: {
          entities: keepEntities,
          relations: dedupedRelations,
        },
      }),
    })

    return NextResponse.json({
      success: true,
      droppedEntityIds: [...droppedEntityIds],
      droppedRelations: droppedRelationCount.n,
      keptEntities: Object.keys(keepEntities).length,
      keptRelations: dedupedRelations.length,
      note: 'HydraDB ingestion is async — wait ~10s then reload the graph to verify.',
    })
  } catch (error: any) {
    console.error('clear-seed error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
