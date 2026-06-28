import { NextResponse } from 'next/server'
import { hydraDB } from '@/lib/hydradb'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (projectId) {
    const decisions = await hydraDB.getProjectDecisions(projectId)
    return NextResponse.json(decisions)
  }

  const decisions = await hydraDB.getDecisions()
  return NextResponse.json(decisions)
}

export async function POST(request: Request) {
  try {
    const decision = await request.json()
    const savedDecision = await hydraDB.createDecision(decision)
    return NextResponse.json(savedDecision, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
