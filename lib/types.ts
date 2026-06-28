export interface Person {
  id: string
  name: string
  email: string
  avatar: string
  role: string
}

export interface Timeline {
  created: Date
  updated: Date
  implemented?: Date
}

export interface Decision {
  id: string
  projectId: string
  title: string
  description: string
  author: Person
  status: 'active' | 'superseded' | 'reverted'
  category: string
  supersedes?: string[] // Decision IDs
  supersededBy?: string[] // Decision IDs
  affects: string[] // Files, modules
  relatedCommits: string[]
  relatedMessages: string[]
  timeline: Timeline
  votes?: number
  impact: 'high' | 'medium' | 'low'
  tags: string[]
}

export interface Project {
  id: string
  name: string
  description: string
  slug: string
  createdAt: Date
  members: Person[]
  connectedSources: ConnectedSource[]
  decisionCount: number
}

export interface ConnectedSource {
  id: string
  type: 'discord' | 'github' | 'slack'
  name: string
  connected: boolean
  lastSync?: Date
  config: Record<string, string>
}

export interface SearchResult {
  decision: Decision
  relevance: number
  excerpt: string
  highlights: string[]
}

export interface GraphNode {
  id: string
  label: string
  type: 'decision' | 'person' | 'file'
  x?: number
  y?: number
}

export interface GraphEdge {
  source: string
  target: string
  label: string
  type: 'proposes' | 'supersedes' | 'affects' | 'mentions'
}

export interface Insight {
  id: string
  type: 'team-velocity' | 'decision-reversal' | 'key-decisions' | 'most-active'
  title: string
  description: string
  value: string | number
  trend?: 'up' | 'down' | 'neutral'
}

export interface DiscordMessage {
  id: string
  author: {
    id: string
    username: string
    avatar?: string
  }
  content: string
  timestamp: string
  channelId: string
}
