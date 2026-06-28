import { NextResponse } from 'next/server'
import { fetchDiscordMessages } from '@/lib/discord'

export async function GET() {
  try {
    const channelId = process.env.DISCORD_CHANNEL_ID
    if (!channelId) {
      throw new Error('DISCORD_CHANNEL_ID is not configured in .env.local')
    }
    
    const messages = await fetchDiscordMessages(channelId)
    return NextResponse.json({ messages })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
