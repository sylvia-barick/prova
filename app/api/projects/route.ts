import { NextResponse } from 'next/server'
import { hydraDB } from '@/lib/hydradb'

export async function GET() {
  const projects = await hydraDB.getProjects()
  return NextResponse.json(projects)
}

export async function POST(request: Request) {
  try {
    const project = await request.json()
    const savedProject = await hydraDB.createProject(project)
    return NextResponse.json(savedProject, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
