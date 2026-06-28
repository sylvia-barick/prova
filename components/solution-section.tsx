export function SolutionSection() {
  return (
    <section id="solution" className="relative py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground">Why This Needs a Graph</h2>
            <p className="text-lg text-muted-foreground">
              A decision is not a static fact. It's a node with a history. HydraDB's append-only, versioned-edge model is built for exactly this.
            </p>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                    <span className="text-primary font-bold">✓</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Graph Edges Link Entities</h4>
                  <p className="text-muted-foreground">Person → Decision → Affected files/commits/messages</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                    <span className="text-primary font-bold">✓</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Temporal Versioning</h4>
                  <p className="text-muted-foreground">Every state transition is preserved and queryable</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                    <span className="text-primary font-bold">✓</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Native Audit Trail</h4>
                  <p className="text-muted-foreground">Every edge has provenance and a timestamp</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card/50 backdrop-blur border border-border rounded-lg p-8">
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-block px-4 py-2 bg-primary/20 rounded-full text-primary text-sm font-medium mb-4">
                  Graph vs Vector Search
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-foreground font-semibold">Capability</th>
                    <th className="text-left py-2 text-foreground font-semibold">HydraDB</th>
                  </tr>
                </thead>
                <tbody className="space-y-3">
                  <tr className="border-b border-border/50">
                    <td className="py-3 text-muted-foreground">"What did we decide about X?"</td>
                    <td className="py-3 text-foreground">Walks decision node, returns latest valid-time edge</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 text-muted-foreground">"Has this changed?"</td>
                    <td className="py-3 text-foreground">Append-only versioned edges—all history preserved</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-muted-foreground">"Who decided this?"</td>
                    <td className="py-3 text-foreground">Native graph structure—full provenance</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
