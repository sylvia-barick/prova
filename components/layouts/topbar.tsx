'use client'

import { useProject } from '@/context/ProjectContext'

export function DashboardTopbar() {
  const { currentProject } = useProject()

  return (
    <div className="border-b border-border bg-background/50 backdrop-blur-sm px-8 py-4 shrink-0">
      <div className="flex justify-between items-center">
        <div>
          {currentProject && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Project</p>
              <h2 className="text-lg font-semibold">{currentProject.name}</h2>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
