'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useProject } from '@/context/ProjectContext'
import { cn } from '@/lib/utils'

export function DashboardSidebar() {
  const pathname = usePathname()
  const { currentProject } = useProject()

  const isActive = (href: string) => pathname === href

  const projectId = currentProject?.id

  const projectLinks = projectId
    ? [
        { href: `/dashboard/projects/${projectId}`, label: 'Overview', icon: '📊' },
        { href: `/dashboard/projects/${projectId}/decisions`, label: 'Decisions', icon: '📋' },
        { href: `/dashboard/projects/${projectId}/connect`, label: 'Sources', icon: '🔗' },
        { href: `/dashboard/projects/${projectId}/search`, label: 'Search', icon: '🔍' },
        { href: `/dashboard/projects/${projectId}/graph`, label: 'Graph', icon: '📈' },
        { href: `/dashboard/projects/${projectId}/timeline`, label: 'Timeline', icon: '⏱️' },
        { href: `/dashboard/projects/${projectId}/team`, label: 'Team', icon: '👥' },
        { href: `/dashboard/projects/${projectId}/reversed`, label: 'Reversed', icon: '↩️' },
        { href: `/dashboard/projects/${projectId}/insights`, label: 'Insights', icon: '💡' },
      ]
    : []

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground">
            P
          </div>
          <span>Provenance</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-auto p-4 space-y-1">
        {/* Main Navigation */}
        <div className="space-y-2">
          <Link
            href="/dashboard"
            className={cn(
              'flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive('/dashboard') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
            )}
          >
            <span>🏠</span>
            All Projects
          </Link>
        </div>

        {/* Project Navigation */}
        {projectLinks.length > 0 && (
          <div className="pt-4">
            <p className="px-4 py-2 text-xs font-semibold text-sidebar-foreground/60 uppercase">
              {currentProject?.name || 'Project'}
            </p>
            <div className="space-y-1">
              {projectLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive(link.href) ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
                  )}
                >
                  <span>{link.icon}</span>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-sm">
            AC
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Alex Chen</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">alex@example.com</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
