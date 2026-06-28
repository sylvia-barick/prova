'use client'

import { Project } from '@/lib/types'

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <div className="group relative bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-all cursor-pointer hover:shadow-lg hover:shadow-primary/10">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{project.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">{project.decisionCount}</div>
          <div className="text-xs text-muted-foreground">Decisions</div>
        </div>
      </div>

      {/* Members */}
      <div className="mb-4 py-4 border-t border-border/50">
        <p className="text-xs font-semibold text-muted-foreground mb-2">TEAM ({project.members.length})</p>
        <div className="flex -space-x-2">
          {project.members.slice(0, 5).map((member) => (
            <div
              key={member.id}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold border-2 border-card"
              title={member.name}
            >
              {member.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()}
            </div>
          ))}
          {project.members.length > 5 && (
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold border-2 border-card">
              +{project.members.length - 5}
            </div>
          )}
        </div>
      </div>

      {/* Sources */}
      <div className="pt-2 border-t border-border/50">
        <p className="text-xs font-semibold text-muted-foreground mb-2">SOURCES</p>
        <div className="flex gap-2 flex-wrap">
          {project.connectedSources.map((source) => (
            <div
              key={source.id}
              className={`text-xs px-2 py-1 rounded-full ${
                source.connected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              }`}
            >
              {source.name}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
        Created {new Date(project.createdAt).toLocaleDateString()}
      </div>
    </div>
  )
}
