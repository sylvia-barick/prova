'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Fixed Video Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/cherry-blossoms.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-background/98 via-background/90 to-background/85" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
            P
          </div>
          <span className="text-lg font-bold">Provenance</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#features" className="text-sm hover:text-primary transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-sm hover:text-primary transition-colors">
            How It Works
          </a>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              Sign In
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-5xl md:text-7xl font-bold text-balance">
            Track Every Decision Your Team Makes
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground text-balance">
            Visualize, understand, and learn from team decisions using graph-first temporal memory.
            Never lose context again.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link href="/dashboard">
              <Button size="lg" className="rounded-lg h-12 px-8">
                Try Demo
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="rounded-lg h-12 px-8">
              Learn More
            </Button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-muted rounded-full flex items-center justify-center">
            <div className="w-1 h-2 bg-muted rounded-full" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-24 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Why Provenance?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Connected Context',
                description: 'Automatically extract decisions from Discord, GitHub, Slack, and more. All context in one place.',
              },
              {
                title: 'Temporal Graph',
                description: 'See how decisions evolve, which ones were reversed, and what they superseded. Track causality.',
              },
              {
                title: 'AI-Powered Search',
                description: 'Ask questions about decisions in natural language. Get context-aware answers with citations.',
              },
              {
                title: 'Team Insights',
                description: 'Analyze decision velocity, reversals, and impact. Understand your team&apos;s decision-making patterns.',
              },
              {
                title: 'Visual Graph',
                description: 'See relationships between decisions, people, and systems. Understand dependencies instantly.',
              },
              {
                title: 'Time Travel',
                description: 'Review what decisions existed at any point in time. Trace the evolution of your architecture.',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-6 hover:bg-card/70 transition-colors"
              >
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 py-24 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>
          <div className="space-y-8">
            {[
              {
                step: 1,
                title: 'Connect Sources',
                description: 'Link your Discord servers, GitHub repos, Slack channels, and other communication platforms.',
              },
              {
                step: 2,
                title: 'AI Analysis',
                description: 'Our system analyzes conversations to identify, extract, and structure all decisions automatically.',
              },
              {
                step: 3,
                title: 'Build Graph',
                description: 'Create a temporal knowledge graph showing relationships, supersessions, and impacts.',
              },
              {
                step: 4,
                title: 'Explore & Learn',
                description: 'Search, visualize, and analyze your decisions. Understand patterns and make better choices.',
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary text-primary-foreground font-bold">
                    {item.step}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 px-4 md:px-8 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-4xl font-bold">Start Tracking Decisions Today</h2>
          <p className="text-lg text-muted-foreground">
            Join teams using Provenance to make better decisions through shared understanding.
          </p>
          <Link href="/dashboard">
            <Button size="lg" className="rounded-lg h-12 px-8">
              Try Demo Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-8 px-4 md:px-8 mt-16">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            © 2024 Provenance. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm">
            <a href="#" className="hover:text-primary transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
