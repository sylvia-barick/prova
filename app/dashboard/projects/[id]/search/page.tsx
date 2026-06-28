'use client'

import { useState, use } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function SearchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<any | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsSearching(true)
    setSearchError(null)
    setSearchResult(null)
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, projectId: id })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Search request failed')
      }
      const data = await res.json()
      setSearchResult(data.result)
    } catch (err: any) {
      console.error(err)
      setSearchError(err.message || 'Failed to execute semantic search')
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Search Decisions</h1>
          <p className="text-muted-foreground">Ask natural language questions about your project decisions, database updates, or contributors</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8 flex gap-2">
          <Input
            placeholder="What database decision did we make? Did we change database choice?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12"
            disabled={isSearching}
          />
          <Button type="submit" size="lg" disabled={isSearching}>
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </form>

        {/* Search Error */}
        {searchError && (
          <div className="bg-destructive/10 border-2 border-destructive text-destructive rounded-lg p-4 mb-8">
            <p className="font-semibold">Search Failed</p>
            <p className="text-sm">{searchError}</p>
          </div>
        )}

        {/* Semantic Results */}
        {searchResult && (
          <div className="space-y-6">
            <div className="bg-card border-2 border-foreground rounded-lg p-6 shadow-[4px_4px_0px_0px_var(--primary)]">
              <h2 className="text-lg font-bold border-b border-border/50 pb-2 mb-4">Semantic Answer</h2>
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">{searchResult.answer}</p>
            </div>

            {searchResult.hasResult && searchResult.details ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Details Column 1: Core Decisions */}
                <div className="md:col-span-2 space-y-6">
                  {/* Current Decision details */}
                  <div className="bg-card border-2 border-foreground rounded-lg p-6 shadow-[3px_3px_0px_0px_rgba(16,185,129,0.5)]">
                    <h3 className="font-bold text-sm text-green-500 mb-2">✓ Current Decision</h3>
                    <p className="font-semibold text-foreground text-sm leading-relaxed mb-3">
                      {searchResult.details.currentDecision}
                    </p>
                    <h4 className="font-bold text-xs text-muted-foreground mb-1">Reasoning</h4>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {searchResult.details.reasoning}
                    </p>
                  </div>

                  {/* Decision History (Supersession Chain) */}
                  {searchResult.details.decisionHistory && searchResult.details.decisionHistory.length > 0 && (
                    <div className="bg-card border-2 border-foreground rounded-lg p-6 shadow-[3px_3px_0px_0px_rgba(239,68,68,0.5)]">
                      <h3 className="font-bold text-sm text-destructive mb-3">📜 Decision History (Supersession Chain)</h3>
                      <div className="space-y-2">
                        {searchResult.details.decisionHistory.map((hist: string, i: number) => (
                          <div key={i} className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded font-medium flex items-center gap-2">
                            <span>← Replaced:</span>
                            <span>{hist}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Graph Highlight Link */}
                  {searchResult.relevantNodeIds && searchResult.relevantNodeIds.length > 0 && (
                    <Link href={`/dashboard/projects/${id}/graph?highlight=${searchResult.relevantNodeIds.join(',')}`}>
                      <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 shadow-lg flex items-center justify-center gap-2">
                        <span>📈</span> View & Highlight on Relationship Graph
                      </Button>
                    </Link>
                  )}
                </div>

                {/* Details Column 2: Context / Metadata */}
                <div className="md:col-span-1 space-y-6">
                  {/* People involved */}
                  <div className="bg-card border-2 border-foreground rounded-lg p-6 shadow-[3px_3px_0px_0px_rgba(59,130,246,0.5)]">
                    <h3 className="font-bold text-sm text-blue-500 mb-2">👤 People Involved</h3>
                    <p className="text-sm font-semibold">{searchResult.details.peopleInvolved.join(', ')}</p>
                  </div>

                  {/* Metadata (Confidence/Dates) */}
                  <div className="bg-card border-2 border-foreground rounded-lg p-6 shadow-[3px_3px_0px_0px_var(--primary)] space-y-4">
                    <div>
                      <h3 className="font-bold text-xs text-muted-foreground mb-1">AI Extraction Confidence</h3>
                      <span className="text-xs bg-yellow-500/20 text-yellow-500 font-bold px-2 py-0.5 rounded">
                        {Math.round(searchResult.details.confidence * 100)}%
                      </span>
                    </div>
                    {searchResult.details.timestamps && (
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Created: {new Date(searchResult.details.timestamps.created).toLocaleDateString()}</p>
                        <p>Updated: {new Date(searchResult.details.timestamps.updated).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Original Discord messages */}
                  {searchResult.details.originalMessages && searchResult.details.originalMessages.length > 0 && (
                    <div className="bg-card border-2 border-foreground rounded-lg p-6 shadow-[3px_3px_0px_0px_rgba(236,72,153,0.5)] space-y-3">
                      <h3 className="font-bold text-sm text-pink-500 mb-1">💬 Original Messages</h3>
                      {searchResult.details.originalMessages.map((msg: string, i: number) => (
                        <div key={i} className="bg-black/35 p-3 rounded border border-border/20 font-mono text-[10px] leading-relaxed text-foreground whitespace-pre-wrap break-words">
                          "{msg}"
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {!searchResult && !isSearching && (
          <div className="text-center py-16 text-muted-foreground">
            <span className="text-5xl mb-4 block">🔮</span>
            <p className="text-lg font-medium">Semantic Search Engine Active</p>
            <p className="text-sm max-w-md mx-auto mt-2">
              Type natural language questions above. Gemini will perform semantic path queries against the live HydraDB database relationships.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
