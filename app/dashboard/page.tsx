'use client'

import Link from 'next/link'
import { useProject } from '@/context/ProjectContext'
import { Button } from '@/components/ui/button'
import { ProjectCard } from '@/components/dashboard/project-card'

export default function DashboardPage() {
  const { projects, isLoading } = useProject()

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold mb-2">Projects</h1>
            <p className="text-muted-foreground">Track decisions across all your projects</p>
          </div>
          <Button>Create Project</Button>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground font-medium">
            Loading projects...
          </div>
        ) : (
          <>
            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                // Single Link — no wrapping div with onClick.
                // setCurrentProject is handled by the project [id]/layout.tsx
                // which runs useEffect when the route mounts.
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                >
                  <ProjectCard project={project} />
                </Link>
              ))}
            </div>

            {projects.length === 0 && (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-lg mb-4">No projects yet</p>
                <Button>Create Your First Project</Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
