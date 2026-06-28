'use client'

import { ProjectProvider } from '@/context/ProjectContext'
import { DashboardSidebar } from '@/components/layouts/sidebar'
import { DashboardTopbar } from '@/components/layouts/topbar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProjectProvider>
      <div className="flex h-screen bg-background">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <DashboardTopbar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </ProjectProvider>
  )
}
