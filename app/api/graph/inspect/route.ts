import { NextResponse } from 'next/server'
import { client, TENANT_ID } from '@/lib/hydradb'

// GET /api/graph/inspect
// Dumps every Person node and its relations from HydraDB so we can
// identify and audit placeholder users.
export async function GET() {
  try {
    const res = await client.context.relations({ tenantId: TENANT_ID })
    const triplets = res.data?.relations || []

    const personNodes: Record<string, any> = {}
    const allRelations: any[] = []

    for (const triplet of triplets) {
      for (const entity of [triplet.source, triplet.target]) {
        if (!entity?.entityId) continue
        if (entity.type === 'Person') {
          try {
            personNodes[entity.entityId] = {
              entityId: entity.entityId,
              name: entity.name,
              identifier: entity.identifier ? JSON.parse(entity.identifier) : null,
            }
          } catch {
            personNodes[entity.entityId] = {
              entityId: entity.entityId,
              name: entity.name,
              identifier: entity.identifier ?? null,
            }
          }
        }
      }
      for (const r of triplet.relations || []) {
        allRelations.push({
          source: r.sourceEntityId,
          target: r.targetEntityId,
          predicate: r.rawPredicate || r.canonicalPredicate,
          timestamp: r.timestamp,
        })
      }
    }

    // Attach relations referencing each person
    const personsWithRelations = Object.values(personNodes).map((p) => ({
      ...p,
      relations: allRelations.filter(
        (r) => r.source === p.entityId || r.target === p.entityId
      ),
    }))

    // Flag placeholder persons: email contains example.com or id is a known fake
    const PLACEHOLDER_IDS = new Set(['usr-alex', 'usr-sylvia'])
    const PLACEHOLDER_EMAIL_PATTERN = /example\.com/i

    const flagged = personsWithRelations.filter((p) => {
      const email: string = p.identifier?.email || ''
      return (
        PLACEHOLDER_IDS.has(p.identifier?.id || '') ||
        PLACEHOLDER_EMAIL_PATTERN.test(email) ||
        PLACEHOLDER_IDS.has(p.entityId)
      )
    })

    return NextResponse.json({
      totalPersonNodes: personsWithRelations.length,
      flaggedPlaceholders: flagged.length,
      persons: personsWithRelations,
      flagged,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
