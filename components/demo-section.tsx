export function DemoSection() {
  return (
    <section id="demo" className="relative py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground">See It In Action</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            How Provenance resolves ambiguous team decisions with a live query
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="bg-card/50 backdrop-blur border border-border rounded-lg p-6">
              <p className="text-sm text-muted-foreground mb-4">THE PROBLEM</p>
              <p className="text-lg text-foreground font-medium italic">
                "Did we decide to use Postgres or another database for storage? Was there a change later?"
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">WHAT PROVENANCE SHOWS:</p>
              <div className="bg-card/50 backdrop-blur border border-border rounded-lg p-6 space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 pt-1">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  </div>
                  <div>
                    <p className="text-foreground font-medium">Original Decision</p>
                    <p className="text-muted-foreground text-sm">@alice proposed Postgres on Day 1</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 pt-1">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  </div>
                  <div>
                    <p className="text-foreground font-medium">Superseded</p>
                    <p className="text-muted-foreground text-sm">@bob reversed to SQLite on Day 3</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 pt-1">
                    <div className="w-2 h-2 bg-accent rounded-full" />
                  </div>
                  <div>
                    <p className="text-foreground font-medium">Current State</p>
                    <p className="text-muted-foreground text-sm">SQLite (with migration notes)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card/50 backdrop-blur border border-border rounded-lg p-8">
            <div className="space-y-6">
              <div>
                <p className="text-sm text-primary font-medium mb-2">GRAPH VISUALIZATION</p>
                <div className="bg-background/50 rounded-lg p-6 aspect-square flex items-center justify-center border border-border">
                  <div className="space-y-4 w-full">
                    <div className="text-center">
                      <div className="inline-block px-3 py-2 bg-primary/20 rounded text-foreground text-sm font-medium">
                        Postgres (Day 1)
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <div className="text-muted-foreground">↓ superseded_by</div>
                    </div>
                    <div className="text-center">
                      <div className="inline-block px-3 py-2 bg-accent/20 rounded text-foreground text-sm font-medium">
                        SQLite (Day 3)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Every node carries timestamps, proposer attribution, and impact analysis.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
