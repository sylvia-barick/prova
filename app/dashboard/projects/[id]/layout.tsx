'use client'

import { useProject } from '@/context/ProjectContext'
import { useEffect, use } from 'react'

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { projects, setCurrentProject } = useProject()
  const { id } = use(params)

  useEffect(() => {
    const project = projects.find((p) => p.id === id)
    if (project) {
      setCurrentProject(project)
    }
  }, [id, projects, setCurrentProject])

  return children
}
