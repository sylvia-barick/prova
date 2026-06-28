'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { Project, Decision } from '@/lib/types'
import { mockProjects, mockDecisions } from '@/lib/mock-data'

interface ProjectContextType {
  projects: Project[]
  decisions: Decision[]
  currentProject: Project | null
  setCurrentProject: (project: Project | null) => void
  getProjectDecisions: (projectId: string) => Decision[]
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects] = useState<Project[]>(mockProjects)
  const [decisions] = useState<Decision[]>(mockDecisions)
  const [currentProject, setCurrentProject] = useState<Project | null>(null)

  const getProjectDecisions = (projectId: string) => {
    return decisions.filter((d) => d.projectId === projectId)
  }

  return (
    <ProjectContext.Provider value={{ projects, decisions, currentProject, setCurrentProject, getProjectDecisions }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (context === undefined) {
    throw new Error('useProject must be used within ProjectProvider')
  }
  return context
}
