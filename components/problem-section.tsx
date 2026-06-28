export function ProblemSection() {
  const problems = [
    {
      title: 'Silent Reversals',
      description: 'Decisions get made ("we\'re using Postgres"), then quietly reversed three days later in a different channel. Newcomers re-litigate settled questions.',
      icon: '↺',
    },
    {
      title: 'Attribution Loss',
      description: 'When something breaks, it\'s hard to trace which person, message, or commit introduced the choice that caused it.',
      icon: '🔍',
    },
    {
      title: 'Flat Retrieval Fails',
      description: 'Vector search returns the most similar message, not the most recent, not the one that superseded an earlier one.',
      icon: '📊',
    },
  ]

  return (
    <section id="problem" className="relative py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground">The Problem</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Teams moving fast generate decisions constantly, across multiple channels. Most of that reasoning is lost the moment the conversation scrolls past.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {problems.map((problem, index) => (
            <div
              key={index}
              className="bg-card/50 backdrop-blur border border-border rounded-lg p-8 hover:bg-card/70 transition"
            >
              <div className="text-4xl mb-4">{problem.icon}</div>
              <h3 className="text-xl font-semibold text-foreground mb-3">{problem.title}</h3>
              <p className="text-muted-foreground">{problem.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
