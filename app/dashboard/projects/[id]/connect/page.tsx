'use client'

import { useState, use, useEffect } from 'react'
import { useProject } from '@/context/ProjectContext'
import { Button } from '@/components/ui/button'

export default function ConnectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { projects, isLoading } = useProject()
  const project = projects.find((p) => p.id === id)
  const [connectedSources, setConnectedSources] = useState<any[]>([])
  const [syncedMessages, setSyncedMessages] = useState<any[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractions, setExtractions] = useState<any[]>([])
  const [extractionError, setExtractionError] = useState<string | null>(null)

  useEffect(() => {
    if (project) {
      setConnectedSources(project.connectedSources || [])
    }
  }, [project])

  useEffect(() => {
    async function loadSyncedMessages() {
      try {
        const res = await fetch('/api/discord/sync')
        if (res.ok) {
          const data = await res.json()
          setSyncedMessages(data.messages || [])
        }
      } catch (err) {
        console.error(err)
      }
    }
    loadSyncedMessages()
  }, [])

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground font-medium">Loading connection settings...</div>
  }

  if (!project) return <div>Project not found</div>

  const discordSource = connectedSources.find((s) => s.type === 'discord')
  const channelMessages = syncedMessages.filter(
    (msg) =>
      !discordSource ||
      msg.channelId === (discordSource.config.channelId || discordSource.config.serverId || '')
  )

  const saveProjectState = async (updatedSources: any[]) => {
    const updatedProject = {
      ...project,
      connectedSources: updatedSources,
    }
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedProject),
      })
    } catch (err) {
      console.error('Failed to update project connection state:', err)
    }
  }

  const handleConnect = async (sourceId: string) => {
    const updated = connectedSources.map((s) =>
      s.id === sourceId ? { ...s, connected: true, lastSync: new Date() } : s
    )
    setConnectedSources(updated)
    await saveProjectState(updated)
  }

  const handleDisconnect = async (sourceId: string) => {
    const updated = connectedSources.map((s) =>
      s.id === sourceId ? { ...s, connected: false } : s
    )
    setConnectedSources(updated)
    await saveProjectState(updated)
  }

  // Connect a source by type — adds it to the project if it doesn't exist yet
  const handleConnectByType = async (type: 'github' | 'slack') => {
    const existing = connectedSources.find((s) => s.type === type)
    let updated: any[]
    if (existing) {
      updated = connectedSources.map((s) =>
        s.type === type ? { ...s, connected: true, lastSync: new Date() } : s
      )
    } else {
      const newSource = {
        id: `${type}-${id}`,
        type,
        name: type === 'github' ? 'GitHub' : 'Slack',
        connected: true,
        lastSync: new Date(),
        config: {},
      }
      updated = [...connectedSources, newSource]
    }
    setConnectedSources(updated)
    await saveProjectState(updated)
  }

  const handleDisconnectByType = async (type: 'github' | 'slack') => {
    const updated = connectedSources.map((s) =>
      s.type === type ? { ...s, connected: false } : s
    )
    setConnectedSources(updated)
    await saveProjectState(updated)
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const res = await fetch('/api/discord/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId: id }),
      })
      if (res.ok) {
        const data = await res.json()
        setSyncedMessages(data.messages || [])
        const updated = connectedSources.map((s) =>
          s.type === 'discord' ? { ...s, connected: true, lastSync: new Date() } : s
        )
        setConnectedSources(updated)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleExtract = async () => {
    setIsExtracting(true)
    setExtractionError(null)
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: channelMessages,
          projectId: id,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Extraction failed')
      }
      const data = await res.json()
      setExtractions(data.extractions || [])
    } catch (err: any) {
      console.error(err)
      setExtractionError(err.message || 'Failed to extract decisions')
    } finally {
      setIsExtracting(false)
    }
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
                {discordSource?.connected && (
                  <div className="flex flex-col gap-1">
                    <div className="text-xs text-primary font-medium">✓ Connected</div>
                    {discordSource.lastSync && (
                      <div className="text-xs text-muted-foreground">
                        Last Synced: {new Date(discordSource.lastSync).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 min-w-36">
                {discordSource?.connected ? (
                  <>
                    <Button
                      onClick={handleSync}
                      disabled={isSyncing}
                      className="w-full font-semibold"
                    >
                      {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleDisconnect(discordSource.id)}
                      disabled={isSyncing}
                      className="w-full"
                    >
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => handleConnect(discordSource?.id || '')}>
                    Connect Discord
                  </Button>
                )}
              </div>
            </div>

            {/* Recent synced messages */}
            {discordSource?.connected && (
              <div className="mt-6 border-t border-border/50 pt-6 animate-fade-in">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <span>📥</span> Recent Synced Messages ({channelMessages.length})
                </h4>
                {channelMessages.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    No messages synced yet. Click &quot;Sync Now&quot; to fetch messages.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {channelMessages.map((msg) => (
                      <div key={msg.id} className="bg-black/20 border border-border/30 rounded p-3 text-xs">
                        <div className="flex justify-between text-muted-foreground mb-1">
                          <span className="font-semibold text-primary">@{msg.author.username}</span>
                          <span>{new Date(msg.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-foreground leading-relaxed break-words">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
              <div className="min-w-36">
                {connectedSources.find((s) => s.type === 'github')?.connected ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleDisconnectByType('github')}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button className="w-full" onClick={() => handleConnectByType('github')}>
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
              <div className="min-w-36">
                {connectedSources.find((s) => s.type === 'slack')?.connected ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleDisconnectByType('slack')}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button className="w-full" onClick={() => handleConnectByType('slack')}>
                    Connect Slack
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AI Decision Extraction Verification Display */}
        {discordSource?.connected && channelMessages.length > 0 && (
          <div className="mt-12 border-t border-border pt-12">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">AI Decision Extraction</h2>
                <p className="text-sm text-muted-foreground">
                  Extract structured decisions from Discord chat history using Gemini
                </p>
              </div>
              <Button
                onClick={handleExtract}
                disabled={isExtracting}
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg"
              >
                {isExtracting ? 'Extracting Decisions...' : '✨ Run AI Extraction'}
              </Button>
            </div>

            {extractionError && (
              <div className="bg-destructive/10 border-2 border-destructive text-destructive rounded-lg p-4 mb-6">
                <p className="font-semibold">Extraction Error</p>
                <p className="text-sm">{extractionError}</p>
              </div>
            )}

            {extractions.length > 0 ? (
              <div className="space-y-6">
                {extractions.map((ext, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-card border-2 border-foreground rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_var(--primary)]"
                  >
                    {/* Left Column: Original Discord Message */}
                    <div className="p-6 bg-muted/30 border-r border-border/50 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                          <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">Source Chat</span>
                          <span>ID: {ext.message.id}</span>
                        </div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                              {ext.message.author.username[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-foreground">@{ext.message.author.username}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(ext.message.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        <p className="text-foreground leading-relaxed text-sm bg-black/30 p-4 rounded-lg border border-border/20 whitespace-pre-wrap">
                          {ext.message.content}
                        </p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-border/30 text-xs text-muted-foreground">
                        Raw Discord Message Object
                      </div>
                    </div>

                    {/* Right Column: Extracted Decision & Gemini Analysis */}
                    <div className="p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent/20 text-accent uppercase tracking-wider">
                            Gemini Extraction
                          </span>
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                              ext.isDecision
                                ? ext.classification === 'Reversal'
                                  ? 'bg-destructive/20 text-destructive'
                                  : 'bg-green-500/20 text-green-500'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {ext.classification}
                          </span>
                        </div>

                        {ext.isDecision && ext.extractedDecision ? (
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-xs text-muted-foreground font-semibold mb-1">Decision Topic</h4>
                              <p className="text-sm font-bold text-primary">{ext.extractedDecision.topic}</p>
                            </div>
                            <div>
                              <h4 className="text-xs text-muted-foreground font-semibold mb-1">Extracted Choice</h4>
                              <p className="text-sm font-semibold text-foreground leading-relaxed">
                                {ext.extractedDecision.decision}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-xs text-muted-foreground font-semibold mb-1">Extracted Reasoning</h4>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {ext.extractedDecision.reasoning}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                              <div>
                                <h4 className="text-xs text-muted-foreground font-semibold mb-1">Confidence Score</h4>
                                <span className="text-xs bg-yellow-500/20 text-yellow-500 font-bold px-2 py-0.5 rounded">
                                  {(ext.extractedDecision.confidenceScore * 100).toFixed(0)}%
                                </span>
                              </div>
                              <div>
                                <h4 className="text-xs text-muted-foreground font-semibold mb-1">Persisted Node</h4>
                                <span className="text-xs bg-green-500/20 text-green-500 font-bold px-2 py-0.5 rounded">
                                  ✓ Ingested
                                </span>
                              </div>
                            </div>

                            {ext.extractedDecision.replacesPrevious && ext.extractedDecision.previousDecisionTopic && (
                              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-xs text-destructive">
                                <span className="font-bold">⚠️ Replaces Previous Decision:</span>{' '}
                                Superseeded previous decision about &quot;{ext.extractedDecision.previousDecisionTopic}&quot;
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <span className="text-4xl mb-2">💬</span>
                            <p className="font-semibold text-muted-foreground">No Decision Extracted</p>
                            <p className="text-xs text-muted-foreground max-w-xs mt-1">
                              Gemini analyzed this message but did not confidently find a finalized project decision.
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 pt-4 border-t border-border/30 text-xs text-muted-foreground flex justify-between">
                        <span>Model: gemini-1.5-flash</span>
                        {ext.isDecision && <span>ID: decision-{ext.message.id}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-12 text-center text-muted-foreground">
                <p className="text-lg font-medium mb-1">No Extractions Completed Yet</p>
                <p className="text-sm">
                  Click the &quot;Run AI Extraction&quot; button above to analyze your Discord history with Gemini.
                </p>
              </div>
            )}
          </div>
        )}

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
                        <p className="text-xs text-muted-foreground">
                          Last synced: {source.lastSync ? new Date(source.lastSync).toLocaleString() : 'Never'}
                        </p>
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
