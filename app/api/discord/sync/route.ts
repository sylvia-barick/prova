import { NextResponse } from 'next/server'
import { syncDiscordMessages, getLocalMessages } from '@/lib/discord'
import { hydraDB } from '@/lib/hydradb'

export async function GET() {
  try {
    const messages = getLocalMessages()
    return NextResponse.json({ messages })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { projectId } = body

    let channelId = process.env.DISCORD_CHANNEL_ID || ''

    // If projectId is provided, look up the channel ID from the project configuration
    if (projectId) {
      const project = await hydraDB.getProject(projectId)
      if (project) {
        const discordSource = project.connectedSources.find((s) => s.type === 'discord')
        if (discordSource && discordSource.config) {
          channelId = discordSource.config.channelId || discordSource.config.serverId || channelId
        }
      }
    }

    if (!channelId) {
      throw new Error('No Discord Channel ID could be resolved. Please configure DISCORD_CHANNEL_ID in .env.local or verify project source config.')
    }

    const messages = await syncDiscordMessages(channelId)

    // Optionally update project's lastSync time in HydraDB
    if (projectId) {
      const project = await hydraDB.getProject(projectId)
      if (project) {
        project.connectedSources = project.connectedSources.map((s) => {
          if (s.type === 'discord') {
            return {
              ...s,
              connected: true,
              lastSync: new Date(),
            }
          }
          return s
        })
        await hydraDB.createProject(project)
      }
    }

    return NextResponse.json({
      success: true,
      channelId,
      messages,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
