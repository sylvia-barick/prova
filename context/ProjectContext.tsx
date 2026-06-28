'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Project, Decision } from '@/lib/types'
import { useAuth } from '@/context/AuthContext'

interface ProjectContextType {
  projects: Project[]
  decisions: Decision[]
  isLoading: boolean
  currentProject: Project | null
  setCurrentProject: (project: Project | null) => void
  getProjectDecisions: (projectId: string) => Decision[]
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentProject, setCurrentProject] = useState<Project | null>(null)

  useEffect(() => {
    // Only load data when the user is authenticated
    if (!user) {
      setProjects([])
      setDecisions([])
      setIsLoading(false)
      return
    }

    async function loadData() {
      setIsLoading(true)
      try {
        const [projectsRes, decisionsRes] = await Promise.all([
          fetch('/api/projects'),
          fetch('/api/decisions'),
        ])

        if (!projectsRes.ok || !decisionsRes.ok) {
          throw new Error('Server returned an error status')
        }

        const projectsData = await projectsRes.json()
        const decisionsData = await decisionsRes.json()

        const parsedProjects: Project[] = projectsData.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          connectedSources: (p.connectedSources || []).map((s: any) => ({
            ...s,
            lastSync: s.lastSync ? new Date(s.lastSync) : undefined,
          })),
        }))

        const parsedDecisions: Decision[] = decisionsData.map((d: any) => ({
          ...d,
          timeline: {
            ...d.timeline,
            created: new Date(d.timeline.created),
            updated: new Date(d.timeline.updated),
            implemented: d.timeline.implemented ? new Date(d.timeline.implemented) : undefined,
          },
        }))

        setProjects(parsedProjects)
        setDecisions(parsedDecisions)
      } catch (error) {
        console.error('Failed to fetch data from APIs:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [user])

  const getProjectDecisions = (projectId: string) => {
    return decisions.filter((d) => d.projectId === projectId)
  }

  return (
    <ProjectContext.Provider
      value={{
        projects,
        decisions,
        isLoading,
        currentProject,
        setCurrentProject,
        getProjectDecisions,
      }}
    >
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
