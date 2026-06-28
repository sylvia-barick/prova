import { HydraDBClient, HydraDB } from '@hydradb/sdk'
import { Project, Decision, Person, ConnectedSource, DiscordMessage } from './types'
import { isPlaceholderPerson, sanitizeAuthor } from './sanitize'

export const client = new HydraDBClient({
  token: process.env.HYDRADB_API_KEY || 'dummy-key',
})

export const TENANT_ID = 'provenance-tenant'

// 1. Ensure the tenant is initialized on HydraDB
async function ensureTenant() {
  try {
    await client.tenants.create({ tenantId: TENANT_ID })
    console.log(`Initialized tenant: ${TENANT_ID}`)
  } catch (error) {
    // If the tenant already exists, ignore the error
  }
}

// 2. Create graph node creation functions
export function createProjectNode(project: Project): HydraDB.GraphEntity {
  const minimalProject = {
    i: project.id,
    n: project.name.substring(0, 30),
    d: project.description ? project.description.substring(0, 20) : '',
    s: project.slug,
    c: project.createdAt.toISOString().split('T')[0]
  }
  return {
    entityId: `project-${project.id}`,
    name: project.name,
    type: 'Project',
    identifier: JSON.stringify(minimalProject),
    namespace: 'provenance',
  }
}

export function createPersonNode(person: Person): HydraDB.GraphEntity {
  const minimalPerson = {
    id: person.id,
    name: person.name.substring(0, 20),
    email: person.email ? person.email.substring(0, 30) : '',
    avatar: person.avatar ? person.avatar.substring(0, 50) : '',
    role: person.role ? person.role.substring(0, 20) : ''
  }
  return {
    entityId: `person-${person.id}`,
    name: person.name,
    type: 'Person',
    identifier: JSON.stringify(minimalPerson),
    namespace: 'provenance',
  }
}

export function createDecisionNode(decision: Decision): HydraDB.GraphEntity {
  const version = new Date(decision.timeline.updated).getTime()
  const minimalDecision = {
    i: decision.id,
    p: decision.projectId,
    t: decision.title.substring(0, 30),
    d: decision.description ? decision.description.substring(0, 20) : '',
    a: [decision.author.id, decision.author.name.substring(0, 15)],
    s: decision.status === 'active' ? 'a' : (decision.status === 'superseded' ? 's' : 'd'),
    c: decision.category,
    tc: new Date(decision.timeline.created).toISOString().split('T')[0],
    tu: new Date(decision.timeline.updated).toISOString().split('T')[0],
    im: decision.impact === 'low' ? 'l' : (decision.impact === 'high' ? 'h' : 'm')
  }
  return {
    entityId: `decision-${decision.id}-${version}`,
    name: decision.title,
    type: 'Decision',
    identifier: JSON.stringify(minimalDecision),
    namespace: 'provenance',
  }
}

export function createChannelNode(source: ConnectedSource): HydraDB.GraphEntity {
  const minimalSource = {
    id: source.id,
    type: source.type,
    name: source.name.substring(0, 30),
    connected: source.connected,
    lastSync: source.lastSync ? new Date(source.lastSync).toISOString() : null,
    config: source.config || {}
  }
  return {
    entityId: `channel-${source.id}`,
    name: source.name,
    type: 'Channel',
    identifier: JSON.stringify(minimalSource),
    namespace: 'provenance',
  }
}

export function createMessageNode(message: DiscordMessage): HydraDB.GraphEntity {
  const minimalMessage = {
    id: message.id,
    author: {
      id: message.author.id,
      username: message.author.username.substring(0, 15)
    },
    content: message.content.substring(0, 30),
    timestamp: message.timestamp.substring(0, 10),
    channelId: message.channelId
  }
  return {
    entityId: `message-${message.id}`,
    name: `Discord Msg ${message.id}`,
    type: 'Message',
    identifier: JSON.stringify(minimalMessage),
    namespace: 'provenance',
  }
}

// 3. Create relationship functions
export function createProposedRelation(person: Person, targetItem: Decision | DiscordMessage): HydraDB.GraphTripletWithEvidence {
  const source = createPersonNode(person)
  const target = 'title' in targetItem ? createDecisionNode(targetItem) : createMessageNode(targetItem)
  return {
    source,
    target,
    relations: [{
      rawPredicate: 'proposed',
      canonicalPredicate: 'proposed',
      sourceEntityId: source.entityId,
      targetEntityId: target.entityId,
      timestamp: new Date().toISOString()
    }]
  }
}

export function createSupersededByRelation(oldDecision: Decision, newDecision: Decision): HydraDB.GraphTripletWithEvidence {
  const source = createDecisionNode(oldDecision)
  const target = createDecisionNode(newDecision)
  return {
    source,
    target,
    relations: [{
      rawPredicate: 'superseded_by',
      canonicalPredicate: 'superseded_by',
      sourceEntityId: source.entityId,
      targetEntityId: target.entityId,
      timestamp: new Date().toISOString()
    }]
  }
}

export function createAffectsRelation(decision: Decision, project: Project): HydraDB.GraphTripletWithEvidence {
  const source = createDecisionNode(decision)
  const target = createProjectNode(project)
  return {
    source,
    target,
    relations: [{
      rawPredicate: 'affects',
      canonicalPredicate: 'affects',
      sourceEntityId: source.entityId,
      targetEntityId: target.entityId,
      timestamp: new Date().toISOString()
    }]
  }
}

export function createSurfacedInRelation(sourceItem: Decision | DiscordMessage, channel: ConnectedSource): HydraDB.GraphTripletWithEvidence {
  const source = 'title' in sourceItem ? createDecisionNode(sourceItem) : createMessageNode(sourceItem)
  const target = createChannelNode(channel)
  return {
    source,
    target,
    relations: [{
      rawPredicate: 'surfaced_in',
      canonicalPredicate: 'surfaced_in',
      sourceEntityId: source.entityId,
      targetEntityId: target.entityId,
      timestamp: new Date().toISOString()
    }]
  }
}

export function createDecisionSurfacedInMessageRelation(decision: Decision, message: DiscordMessage): HydraDB.GraphTripletWithEvidence {
  const source = createDecisionNode(decision)
  const target = createMessageNode(message)
  return {
    source,
    target,
    relations: [{
      rawPredicate: 'surfaced_in',
      canonicalPredicate: 'surfaced_in',
      sourceEntityId: source.entityId,
      targetEntityId: target.entityId,
      timestamp: new Date().toISOString()
    }]
  }
}

class HydraDBService {
  private async fetchFromGraph(): Promise<{ projects: Project[], decisions: Decision[] }> {
    try {
      await ensureTenant()
      const res = await client.context.relations({ tenantId: TENANT_ID })
      const relations = res.data?.relations || []

      const projectsMap = new Map<string, Project>()
      const decisionsMap = new Map<string, Decision>()
      const personsMap = new Map<string, Person>()
      const channelsMap = new Map<string, ConnectedSource>()
      const messagesMap = new Map<string, DiscordMessage>()

      // 1. First pass: parse all unique entities
      for (const triplet of relations) {
        const processEntity = (entity?: HydraDB.GraphEntity) => {
          if (!entity || !entity.entityId || !entity.identifier) return
          
          if (entity.type === 'Project') {
            try {
              const encoded = JSON.parse(entity.identifier)
              const p: Project = {
                id: encoded.id || encoded.i,
                name: encoded.name || encoded.n,
                description: encoded.description || encoded.d || '',
                slug: encoded.slug || encoded.s || '',
                createdAt: new Date(encoded.createdAt || encoded.c),
                members: [],
                connectedSources: [],
                decisionCount: 0
              }
              projectsMap.set(entity.entityId, p)
            } catch (err) {
              console.error('Failed to parse project identifier:', err, entity.identifier)
            }
          } else if (entity.type === 'Decision') {
            try {
              const encoded = JSON.parse(entity.identifier)
              const timelineCreated = encoded.timeline?.created || encoded.tc
              const timelineUpdated = encoded.timeline?.updated || encoded.tu
              const rawAuthor = {
                id:    encoded.author?.id   || (encoded.a ? encoded.a[0] : ''),
                name:  encoded.author?.name || (encoded.a ? encoded.a[1] : ''),
                email: encoded.author?.email || '',
              }
              const d: Decision = {
                id: encoded.id || encoded.i,
                projectId: encoded.projectId || encoded.p,
                title: encoded.title || encoded.t,
                description: encoded.description || encoded.d || '',
                author: sanitizeAuthor(rawAuthor),
                status: encoded.status || (encoded.s === 'a' ? 'active' : (encoded.s === 's' ? 'superseded' : 'draft')),
                category: encoded.category || encoded.c,
                affects: encoded.affects || [],
                relatedCommits: encoded.relatedCommits || [],
                relatedMessages: encoded.relatedMessages || [],
                timeline: {
                  created: new Date(timelineCreated),
                  updated: new Date(timelineUpdated)
                },
                impact: encoded.impact || (encoded.im === 'l' ? 'low' : (encoded.im === 'm' ? 'medium' : 'high')),
                tags: encoded.tags || []
              }
              // Keep the latest version of the decision by id
              const existing = entity.entityId ? decisionsMap.get(entity.entityId) : undefined
              if (entity.entityId && (!existing || new Date(d.timeline.updated).getTime() > new Date(existing.timeline.updated).getTime())) {
                decisionsMap.set(entity.entityId, d)
              }
            } catch (err) {
              console.error('Failed to parse decision identifier:', err, entity.identifier)
            }
          } else if (entity.type === 'Person') {
            try {
              const p = JSON.parse(entity.identifier) as Person
              // Reject placeholder / seed users
              if (!isPlaceholderPerson(p)) {
                personsMap.set(entity.entityId, p)
              }
            } catch {}
          } else if (entity.type === 'Channel') {
            try {
              const c = JSON.parse(entity.identifier) as any
              const source: ConnectedSource = {
                id: c.id,
                type: c.type,
                name: c.name,
                connected: c.connected ?? false,
                lastSync: c.lastSync ? new Date(c.lastSync) : undefined,
                config: c.config || {},
              }
              channelsMap.set(entity.entityId, source)
            } catch {}
          } else if (entity.type === 'Message') {
            try {
              const m = JSON.parse(entity.identifier) as DiscordMessage
              messagesMap.set(entity.entityId, m)
            } catch {}
          }
        }

        processEntity(triplet.source)
        processEntity(triplet.target)
      }

      // 2. Second pass: process relationships to link entities
      for (const triplet of relations) {
        if (!triplet.source?.entityId || !triplet.target?.entityId || !triplet.relations) continue

        for (const rel of triplet.relations) {
          const predicate = rel.rawPredicate || rel.canonicalPredicate
          if (!predicate) continue

          if (predicate === 'member_of') {
            const person = personsMap.get(triplet.source.entityId)
            const project = projectsMap.get(triplet.target.entityId)
            if (person && project) {
              if (!project.members.some(m => m.id === person.id)) {
                project.members.push(person)
              }
            }
          } else if (predicate === 'has_source') {
            const project = projectsMap.get(triplet.source.entityId)
            const channel = channelsMap.get(triplet.target.entityId)
            if (project && channel) {
              if (!project.connectedSources.some(s => s.id === channel.id)) {
                project.connectedSources.push(channel)
              }
            }
          } else if (predicate === 'affects') {
            const decision = decisionsMap.get(triplet.source.entityId)
            const project = projectsMap.get(triplet.target.entityId)
            if (decision && project) {
              project.decisionCount = (project.decisionCount || 0) + 1
            }
          }
        }
      }

      // Convert maps back to unique projects and decisions list by id
      const uniqueProjectsMap = new Map<string, Project>()
      for (const p of projectsMap.values()) {
        uniqueProjectsMap.set(p.id, p)
      }
      const uniqueDecisionsMap = new Map<string, Decision>()
      for (const d of decisionsMap.values()) {
        const existing = uniqueDecisionsMap.get(d.id)
        if (!existing || new Date(d.timeline.updated).getTime() > new Date(existing.timeline.updated).getTime()) {
          uniqueDecisionsMap.set(d.id, d)
        }
      }

      return {
        projects: Array.from(uniqueProjectsMap.values()),
        decisions: Array.from(uniqueDecisionsMap.values())
      }
    } catch (error) {
      console.error('Error fetching data from HydraDB:', error)
      return { projects: [], decisions: [] }
    }
  }

  async getProjects(): Promise<Project[]> {
    const { projects } = await this.fetchFromGraph()
    return projects
  }

  async getProject(id: string): Promise<Project | null> {
    const projects = await this.getProjects()
    return projects.find((p) => p.id === id) || null
  }

  async getDecisions(): Promise<Decision[]> {
    const { decisions } = await this.fetchFromGraph()
    return decisions
  }

  async getProjectDecisions(projectId: string): Promise<Decision[]> {
    const decisions = await this.getDecisions()
    return decisions.filter((d) => d.projectId === projectId)
  }

  async createProject(project: Project): Promise<Project> {
    try {
      await ensureTenant()
      const projectNode = createProjectNode(project)
      const triplets: HydraDB.GraphTripletWithEvidence[] = []

      // Link sources
      for (const source of project.connectedSources) {
        const sourceNode = createChannelNode(source)
        triplets.push({
          source: projectNode,
          target: sourceNode,
          relations: [{
            rawPredicate: 'has_source',
            canonicalPredicate: 'has_source',
            sourceEntityId: projectNode.entityId,
            targetEntityId: sourceNode.entityId,
            timestamp: new Date().toISOString()
          }]
        })
      }

      // Link members
      for (const member of project.members) {
        const memberNode = createPersonNode(member)
        triplets.push({
          source: memberNode,
          target: projectNode,
          relations: [{
            rawPredicate: 'member_of',
            canonicalPredicate: 'member_of',
            sourceEntityId: memberNode.entityId,
            targetEntityId: projectNode.entityId,
            timestamp: new Date().toISOString()
          }]
        })
      }

      if (triplets.length === 0) {
        triplets.push({
          source: projectNode,
          target: projectNode,
          relations: [{
            rawPredicate: 'self',
            canonicalPredicate: 'self',
            sourceEntityId: projectNode.entityId,
            targetEntityId: projectNode.entityId,
            timestamp: new Date().toISOString()
          }]
        })
      }

      const entitiesMap: Record<string, any> = {}
      if (projectNode.entityId) entitiesMap[projectNode.entityId] = projectNode
      for (const t of triplets) {
        if (t.source?.entityId) entitiesMap[t.source.entityId] = t.source
        if (t.target?.entityId) entitiesMap[t.target.entityId] = t.target
      }

      const relationsForIngest = triplets
        .filter((t) => t.source?.entityId && t.target?.entityId)
        .map((t) => {
          const relInfo = t.relations?.[0]
          const predicate = relInfo?.rawPredicate || relInfo?.canonicalPredicate || 'connected'
          const timestamp = relInfo?.timestamp || new Date().toISOString()
          return {
            source: t.source!.entityId as string,
            target: t.target!.entityId as string,
            predicate: predicate,
            timestamp: timestamp
          }
        })

      const sourceId = `project-${project.id}`
      const appKnowledgePayload = [
        {
          id: sourceId,
          title: `Project ${project.name}`,
          content: { text: project.description || `Project details for ${project.name}` },
          type: "document"
        }
      ]

      await client.context.ingest({
        tenantId: TENANT_ID,
        type: 'knowledge',
        upsert: 'true',
        appKnowledge: JSON.stringify(appKnowledgePayload),
        graphPayload: JSON.stringify({
          [sourceId]: {
            entities: entitiesMap,
            relations: relationsForIngest
          }
        })
      })
    } catch (error) {
      console.error('Failed to save project to HydraDB:', error)
    }
    return project
  }

  async createDecision(decision: Decision): Promise<Decision> {
    try {
      await ensureTenant()
      const triplets: HydraDB.GraphTripletWithEvidence[] = []

      // 1. Fetch current decisions to see if a previous version exists
      const currentDecisions = await this.getDecisions()
      const existing = currentDecisions.find(d => d.id === decision.id)

      // Ensure updated timestamp is newer if updating
      if (existing) {
        decision.timeline.updated = new Date()
      } else {
        // Initialize timeline dates
        decision.timeline.created = decision.timeline.created ? new Date(decision.timeline.created) : new Date()
        decision.timeline.updated = decision.timeline.updated ? new Date(decision.timeline.updated) : new Date()
      }

      // 2. Propose relationship
      triplets.push(createProposedRelation(decision.author, decision))

      // 3. Affects relationship
      const project = await this.getProject(decision.projectId)
      if (project) {
        triplets.push(createAffectsRelation(decision, project))
      }

      // 4. Superseded_by relation if there was an existing version of this same decision
      if (existing) {
        triplets.push(createSupersededByRelation(existing, decision))
      }

      // 5. Check if this decision supersedes any other decisions (by ID)
      if (decision.supersedes && decision.supersedes.length > 0) {
        for (const targetId of decision.supersedes) {
          const targetDecision = currentDecisions.find(d => d.id === targetId)
          if (targetDecision) {
            triplets.push(createSupersededByRelation(targetDecision, decision))
          }
        }
      }

      const entitiesMap: Record<string, any> = {}
      for (const t of triplets) {
        if (t.source?.entityId) entitiesMap[t.source.entityId] = t.source
        if (t.target?.entityId) entitiesMap[t.target.entityId] = t.target
      }

      const relationsForIngest = triplets
        .filter((t) => t.source?.entityId && t.target?.entityId)
        .map((t) => {
          const relInfo = t.relations?.[0]
          const predicate = relInfo?.rawPredicate || relInfo?.canonicalPredicate || 'connected'
          const timestamp = relInfo?.timestamp || new Date().toISOString()
          return {
            source: t.source!.entityId as string,
            target: t.target!.entityId as string,
            predicate: predicate,
            timestamp: timestamp
          }
        })

      const sourceId = `decision-${decision.id}-${new Date(decision.timeline.updated).getTime()}`
      const appKnowledgePayload = [
        {
          id: sourceId,
          title: `Decision ${decision.title}`,
          content: { text: decision.description || `Decision details for ${decision.title}` },
          type: "document"
        }
      ]

      await client.context.ingest({
        tenantId: TENANT_ID,
        type: 'knowledge',
        appKnowledge: JSON.stringify(appKnowledgePayload),
        graphPayload: JSON.stringify({
          [sourceId]: {
            entities: entitiesMap,
            relations: relationsForIngest
          }
        })
      })
    } catch (error) {
      console.error('Failed to save decision to HydraDB:', error)
    }
    return decision
  }
}

export const hydraDB = new HydraDBService()
