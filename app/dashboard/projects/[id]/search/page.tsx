'use client'

import { useState, use } from 'react'
import { useDecisions } from '@/hooks/useDecisions'
import { DecisionCard } from '@/components/decisions/decision-card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function SearchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState(false)
  const { searchDecisions } = useDecisions(id)

  const results = searched ? searchDecisions(query) : []

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearched(true)
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Search Decisions</h1>
          <p className="text-muted-foreground">Find decisions by title, description, or tags</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8 flex gap-2">
          <Input
            placeholder="What database decision did we make? What about architecture?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12"
          />
          <Button type="submit" size="lg">
            Search
          </Button>
        </form>

        {/* Results */}
        {searched && (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              Found <span className="font-bold">{results.length}</span> decision{results.length !== 1 ? 's' : ''} matching your query
            </p>

            {results.length === 0 && query && (
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground mb-2">No decisions found for "{query}"</p>
                <p className="text-sm text-muted-foreground">Try different keywords or check all decisions</p>
              </div>
            )}

            {results.length > 0 && (
              <div className="space-y-4">
                {results.map((decision) => (
                  <DecisionCard key={decision.id} decision={decision} projectId={id} />
                ))}
              </div>
            )}
          </>
        )}

        {!searched && (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">Use the search bar above to find decisions</p>
          </div>
        )}
      </div>
    </div>
  )
}
