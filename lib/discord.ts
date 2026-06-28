import fs from 'fs'
import path from 'path'
import { HydraDBClient, HydraDB } from '@hydradb/sdk'
import { DiscordMessage, ConnectedSource, Person } from './types'
import { createProposedRelation, createSurfacedInRelation } from './hydradb'

const client = new HydraDBClient({
  token: process.env.HYDRADB_API_KEY || 'dummy-key',
})
const TENANT_ID = 'provenance-tenant'

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_FILE = path.join(DATA_DIR, 'discord-messages.json')

// Helper to ensure data directory exists and read local messages
export function getLocalMessages(): DiscordMessage[] {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([]))
    return []
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8')
    return JSON.parse(raw) as DiscordMessage[]
  } catch (error) {
    console.error('Failed to read local discord messages:', error)
    return []
  }
}

// Helper to save messages locally
export function saveLocalMessages(messages: DiscordMessage[]) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(messages, null, 2))
}

export async function resolveDiscordChannel(guildId: string, channelNameOrId: string): Promise<string> {
  const botToken = process.env.DISCORD_BOT_TOKEN
  if (!botToken || botToken === 'dummy-token') {
    throw new Error('Missing DISCORD_BOT_TOKEN in configuration.')
  }

  // If the channelNameOrId is already a snowflake ID (e.g. numeric), return it directly
  if (/^\d+$/.test(channelNameOrId)) {
    return channelNameOrId
  }

  try {
    console.log(`Resolving channel named "${channelNameOrId}" in guild ${guildId}...`)
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Discord API returned status ${res.status} when listing channels: ${errText}`)
    }

    const channels = await res.json() as any[]
    const matched = channels.find(
      (c) => c.name.toLowerCase() === channelNameOrId.toLowerCase() && c.type === 0 // 0 is GuildText type
    )

    if (!matched) {
      throw new Error(`Could not find a text channel named "${channelNameOrId}" in guild ${guildId}.`)
    }

    console.log(`Successfully resolved channel "${channelNameOrId}" to ID: ${matched.id}`)
    return matched.id
  } catch (error: any) {
    console.error('Failed to resolve Discord channel:', error)
    throw error
  }
}

export async function fetchDiscordMessages(channelNameOrId: string): Promise<DiscordMessage[]> {
  const botToken = process.env.DISCORD_BOT_TOKEN
  const guildId = process.env.DISCORD_GUILD_ID
  
  if (!botToken || botToken === 'dummy-token' || !channelNameOrId) {
    throw new Error('Missing DISCORD_BOT_TOKEN or channelNameOrId in configuration.')
  }

  // Resolve channel name/ID to channel ID
  let resolvedChannelId = channelNameOrId
  if (!/^\d+$/.test(channelNameOrId)) {
    if (!guildId) {
      throw new Error('A text channel name was provided but DISCORD_GUILD_ID is not configured in .env.local.')
    }
    resolvedChannelId = await resolveDiscordChannel(guildId, channelNameOrId)
  }

  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${resolvedChannelId}/messages?limit=50`, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    })
    
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Discord API returned status ${res.status}: ${errText}`)
    }

    const data = await res.json() as any[]
    return data.map((msg: any) => ({
      id: msg.id,
      author: {
        id: msg.author.id,
        username: msg.author.username,
        avatar: msg.author.avatar ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png` : undefined,
      },
      content: msg.content,
      timestamp: msg.timestamp,
      channelId: resolvedChannelId,
    }))
  } catch (error: any) {
    console.error('Failed to fetch from Discord API:', error)
    throw error
  }
}

export async function syncDiscordMessages(channelId: string): Promise<DiscordMessage[]> {
  // 1. Fetch messages
  const messages = await fetchDiscordMessages(channelId)
  
  if (messages.length === 0) {
    return []
  }

  // 2. Save locally in backend JSON database
  const localMessages = getLocalMessages()
  const mergedMap = new Map<string, DiscordMessage>()
  for (const m of localMessages) {
    mergedMap.set(m.id, m)
  }
  for (const m of messages) {
    mergedMap.set(m.id, m)
  }
  const mergedMessages = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
  saveLocalMessages(mergedMessages)

  // 3. Ingest into HydraDB as graph triplets
  try {
    const triplets: HydraDB.GraphTripletWithEvidence[] = []

    for (const msg of messages) {
      const channelSource: ConnectedSource = {
        id: msg.channelId,
        type: 'discord',
        name: 'Discord Channel',
        connected: true,
        config: {},
      }

      const authorPerson: Person = {
        id: msg.author.id,
        name: msg.author.username,
        email: '',
        avatar: msg.author.avatar || '',
        role: 'Contributor',
      }

      // Link Message to Channel via surfaced_in
      triplets.push(createSurfacedInRelation(msg, channelSource))

      // Link Person to Message via proposed
      triplets.push(createProposedRelation(authorPerson, msg))
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

    const sourceId = `discord-channel-${channelId}`
    const appKnowledgePayload = [
      {
        id: sourceId,
        title: `Discord Channel ${channelId} messages`,
        content: { text: `Discord messages imported for channel ${channelId}` },
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
    console.log(`Ingested ${messages.length} Discord messages and relations into HydraDB successfully.`)
  } catch (error) {
    console.error('Failed to ingest Discord messages into HydraDB:', error)
  }

  return messages
}
