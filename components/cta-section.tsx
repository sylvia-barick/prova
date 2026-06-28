export function CtaSection() {
  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-card/50 backdrop-blur border border-border rounded-lg p-12 text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground">Ready to Track Decisions at Scale?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Stop losing decisions to chat scrollback. Start building with temporal context.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <button className="px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition font-medium text-lg">
              Start Building
            </button>
            <button className="px-8 py-4 border border-primary text-primary rounded-lg hover:bg-primary/10 transition font-medium text-lg">
              View Documentation
            </button>
          </div>

          <div className="pt-8 border-t border-border">
            <p className="text-muted-foreground text-sm">
              Perfect for hackathon teams, engineering teams, and anyone who moves fast
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
