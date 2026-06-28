'use client'

import { useState, use } from 'react'
import { useProject } from '@/context/ProjectContext'
import { Button } from '@/components/ui/button'

export default function ConnectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { projects } = useProject()
  const project = projects.find((p) => p.id === id)
  const [connectedSources, setConnectedSources] = useState(project?.connectedSources || [])

  if (!project) return <div>Project not found</div>

  const handleConnect = (sourceId: string) => {
    setConnectedSources((prev) =>
      prev.map((s) => (s.id === sourceId ? { ...s, connected: true, lastSync: new Date() } : s)),
    )
  }

  const handleDisconnect = (sourceId: string) => {
    setConnectedSources((prev) => prev.map((s) => (s.id === sourceId ? { ...s, connected: false } : s)))
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Connect Sources</h1>
          <p className="text-muted-foreground">
            Connect communication platforms to automatically extract decisions from conversations
          </p>
        </div>

        <div className="space-y-6">
          {/* Discord */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span>💜</span> Discord
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Extract decisions from Discord server channels and discussions
                </p>
                {connectedSources.find((s) => s.type === 'discord')?.connected && (
                  <div className="text-xs text-primary font-medium">✓ Connected</div>
                )}
              </div>
              <div>
                {connectedSources.find((s) => s.type === 'discord')?.connected ? (
                  <Button
                    variant="outline"
                    onClick={() => handleDisconnect(connectedSources.find((s) => s.type === 'discord')?.id || '')}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button onClick={() => handleConnect(connectedSources.find((s) => s.type === 'discord')?.id || '')}>
                    Connect Discord
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* GitHub */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span>⚫</span> GitHub
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Extract decisions from GitHub issues, PRs, and discussions
                </p>
                {connectedSources.find((s) => s.type === 'github')?.connected && (
                  <div className="text-xs text-primary font-medium">✓ Connected</div>
                )}
              </div>
              <div>
                {connectedSources.find((s) => s.type === 'github')?.connected ? (
                  <Button
                    variant="outline"
                    onClick={() => handleDisconnect(connectedSources.find((s) => s.type === 'github')?.id || '')}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button onClick={() => handleConnect(connectedSources.find((s) => s.type === 'github')?.id || '')}>
                    Connect GitHub
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Slack */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span>🔴</span> Slack
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Extract decisions from Slack channel conversations
                </p>
                {connectedSources.find((s) => s.type === 'slack')?.connected && (
                  <div className="text-xs text-primary font-medium">✓ Connected</div>
                )}
              </div>
              <div>
                {connectedSources.find((s) => s.type === 'slack')?.connected ? (
                  <Button
                    variant="outline"
                    onClick={() => handleDisconnect(connectedSources.find((s) => s.type === 'slack')?.id || '')}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button onClick={() => handleConnect(connectedSources.find((s) => s.type === 'slack')?.id || '')}>
                    Connect Slack
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Connected Sources Status */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Connected Sources</h2>
          <div className="bg-card border border-border rounded-lg p-6">
            {connectedSources.filter((s) => s.connected).length === 0 ? (
              <p className="text-muted-foreground">No sources connected yet. Connect at least one source to begin.</p>
            ) : (
              <div className="space-y-4">
                {connectedSources
                  .filter((s) => s.connected)
                  .map((source) => (
                    <div key={source.id} className="flex justify-between items-center py-2 border-b border-border/50 last:border-b-0">
                      <div>
                        <p className="font-medium">{source.name}</p>
                        <p className="text-xs text-muted-foreground">Last synced: {source.lastSync?.toLocaleString()}</p>
                      </div>
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">Active</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
