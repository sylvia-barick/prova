'use client'

import { ProjectProvider } from '@/context/ProjectContext'
import { DashboardSidebar } from '@/components/layouts/sidebar'
import { DashboardTopbar } from '@/components/layouts/topbar'
import AuthGuard from '@/components/auth/AuthGuard'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <ProjectProvider>
        <div className="flex h-screen bg-background/30 backdrop-blur-[6px]">
          <DashboardSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <DashboardTopbar />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </div>
      </ProjectProvider>
    </AuthGuard>
  )
}
