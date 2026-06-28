'use client'

import { useProject } from '@/context/ProjectContext'

export function DashboardTopbar() {
  const { currentProject } = useProject()

  return (
    <div className="border-b border-border bg-background/50 backdrop-blur-sm px-8 py-4">
      <div className="flex justify-between items-center">
        <div>
          {currentProject && (
            <div>
              <p className="text-xs text-muted-foreground uppercase">PROJECT</p>
              <h2 className="text-lg font-semibold">{currentProject.name}</h2>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold">5</span> Decisions • <span className="font-semibold">5</span> Active
          </div>
        </div>
      </div>
    </div>
  )
}
