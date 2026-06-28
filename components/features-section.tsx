export function FeaturesSection() {
  const features = [
    {
      title: 'Discord Ingestion',
      description: 'Automatically pull message history from your team\'s Discord channels during sprints and builds.',
    },
    {
      title: 'LLM Decision Extraction',
      description: 'Smart detection of decision-like statements and references to earlier decisions using LLM-based analysis.',
    },
    {
      title: 'HydraDB Integration',
      description: 'Graph nodes and versioned edges with valid-time metadata for full temporal history preservation.',
    },
    {
      title: 'Query Interface',
      description: 'Ask natural questions like "what\'s our current decision on X" and get the full history.',
    },
    {
      title: 'Interactive Timeline',
      description: 'Visualize decision graphs as interactive timelines with supersession chains and reversals.',
    },
    {
      title: 'Attribution & Audit',
      description: 'Track who proposed what, when it changed, and what impact it had on your project.',
    },
  ]

  return (
    <section id="features" className="relative py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground">Powerful Features</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to track and understand team decisions
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-card/50 backdrop-blur border border-border rounded-lg p-8 hover:border-primary/50 transition group"
            >
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/30 transition">
                <span className="text-primary text-lg">→</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
