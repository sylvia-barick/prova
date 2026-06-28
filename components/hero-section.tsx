export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-balance leading-tight">
            Decision Provenance for Fast-Moving Teams
          </h1>
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto text-balance">
            Built on HydraDB&apos;s graph-first, time-aware memory layer. Track, visualize, and understand team decisions across Discord, Slack, and Git.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <button className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition font-medium">
            Get Started
          </button>
          <button className="px-8 py-3 border border-primary text-primary rounded-lg hover:bg-primary/10 transition font-medium">
            Learn More
          </button>
        </div>

        <div className="pt-12 text-muted-foreground text-sm">
          <p>Built for hackathon teams, engineering teams, and anyone who moves fast</p>
        </div>
      </div>
    </section>
  )
}
