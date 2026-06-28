import { NextResponse } from 'next/server'
import { hydraDB, client, TENANT_ID, createDecisionSurfacedInMessageRelation } from '@/lib/hydradb'
import { DiscordMessage, Decision } from '@/lib/types'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { messages, projectId } = body as { messages: DiscordMessage[]; projectId: string }

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Input messages must be a valid array.')
    }

    if (!projectId) {
      throw new Error('projectId is required.')
    }

    const geminiApiKey = process.env.GEMINI_API_KEY
    if (!geminiApiKey || geminiApiKey === 'dummy-key') {
      throw new Error('GEMINI_API_KEY is not configured in .env.local')
    }

    const extractions: any[] = []
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    for (const msg of messages) {
      await delay(2500) // 2.5-second rate limit safety delay
      const prompt = `
You are an AI assistant designed to extract project decisions from Discord message text.
Analyze the following Discord message:
Author: ${msg.author.username}
Timestamp: ${msg.timestamp}
Content: "${msg.content}"

Classify the message into one of these types:
- 'Decision' (a clear, finalized choice, commitment, or architectural standard adopted by the team)
- 'Proposal' (a suggestion or proposed change that is not yet finalized)
- 'Discussion' (conversation, debate, or brainstorm with no decision)
- 'Reversal' (a reversal or reverting of a previous decision)
- 'Question' (a request for information or help)
- 'Other' (general chatter, greetings, or unrelated text)

Return a JSON object matching this structure:
{
  "classification": "Decision" | "Proposal" | "Discussion" | "Reversal" | "Question" | "Other",
  "isDecision": boolean, // true if classification is 'Decision' or 'Reversal'
  "extractedDecision": {
    "decision": "Description of the decision made",
    "topic": "The general topic or system affected (e.g. Database, Styling, React)",
    "reasoning": "Reasoning behind the decision or context provided",
    "confidenceScore": number, // from 0.0 to 1.0
    "replacesPrevious": boolean, // true if this decision replaces or reverses a previous choice
    "previousDecisionTopic": "If it replaces a previous decision, what topic or system did it affect?"
  } // null if isDecision is false
}

Do not fabricate information. If you cannot confidently identify a decision, set isDecision to false, classification to 'Discussion' or 'Other', and extractedDecision to null.
`

      try {
        console.log(`Analyzing message ${msg.id} with Gemini...`)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              responseMimeType: 'application/json'
            }
          })
        })

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`Gemini API returned status ${response.status}: ${errText}`)
        }

        const resJson = await response.json()
        const textOutput = resJson.candidates?.[0]?.content?.parts?.[0]?.text
        
        if (!textOutput) {
          throw new Error('Gemini API returned empty text output.')
        }

        const extraction = JSON.parse(textOutput)
        console.log(`Gemini classification for msg ${msg.id}:`, extraction.classification)

        let savedDecision: Decision | null = null

        if (extraction.isDecision && extraction.extractedDecision) {
          const ext = extraction.extractedDecision
          
          // 1. Check existing decisions for matching category/topic to resolve supersedes
          const currentDecisions = await hydraDB.getProjectDecisions(projectId)
          const supersedesList: string[] = []

          if (ext.replacesPrevious && ext.previousDecisionTopic) {
            const matched = currentDecisions.find(
              (d) =>
                d.category.toLowerCase().includes(ext.previousDecisionTopic.toLowerCase()) ||
                d.title.toLowerCase().includes(ext.previousDecisionTopic.toLowerCase())
            )
            if (matched) {
              console.log(`Message supersedes existing decision: ${matched.id}`)
              supersedesList.push(matched.id)
            }
          }

          // 2. Build decision entity
          const decisionData: Decision = {
            id: `decision-${msg.id}`,
            projectId,
            title: `${ext.topic}: ${ext.decision.split('.')[0]}`,
            description: ext.decision,
            author: {
              id: msg.author.id,
              name: msg.author.username,
              email: '',
              avatar: msg.author.avatar || '',
              role: 'Contributor'
            },
            status: extraction.classification === 'Reversal' ? 'reverted' : 'active',
            category: ext.topic,
            supersedes: supersedesList,
            supersededBy: [],
            affects: [ext.topic.toLowerCase().replace(/\s+/g, '-')],
            relatedCommits: [],
            relatedMessages: [msg.id],
            timeline: {
              created: new Date(msg.timestamp),
              updated: new Date(msg.timestamp)
            },
            impact: ext.confidenceScore > 0.8 ? 'high' : 'medium',
            tags: [ext.topic.toLowerCase()],
            votes: 1
          }

          // 3. Persist standard nodes/relations
          savedDecision = await hydraDB.createDecision(decisionData)

          // 4. Ingest decision surfaced_in Discord message relation
          try {
            const surfacedRelation = createDecisionSurfacedInMessageRelation(decisionData, msg)
            const entitiesMap: Record<string, any> = {}
            if (surfacedRelation.source?.entityId) entitiesMap[surfacedRelation.source.entityId] = surfacedRelation.source
            if (surfacedRelation.target?.entityId) entitiesMap[surfacedRelation.target.entityId] = surfacedRelation.target

            const relInfo = surfacedRelation.relations?.[0]
            const predicate = relInfo?.rawPredicate || relInfo?.canonicalPredicate || 'connected'
            const timestamp = relInfo?.timestamp || new Date().toISOString()

            if (!surfacedRelation.source?.entityId || !surfacedRelation.target?.entityId) {
              throw new Error('surfacedRelation source or target entityId is missing')
            }

            const relationsForIngest = [{
              source: surfacedRelation.source.entityId,
              target: surfacedRelation.target.entityId,
              predicate: predicate,
              timestamp: timestamp
            }]

            const sourceId = `extract-${msg.id}`
            const appKnowledgePayload = [
              {
                id: sourceId,
                title: `AI Extraction for Msg ${msg.id}`,
                content: { text: `Decision surfaced in Discord message ${msg.id}` },
                type: "document"
              }
            ]

            await client.context.ingest({
              tenantId: TENANT_ID,
              type: 'knowledge',
              appKnowledge: JSON.stringify(appKnowledgePayload),
              graphPayload: JSON.stringify({
                [sourceId]: {
                  entities: entitiesMap,
                  relations: relationsForIngest
                }
              })
            })
            console.log(`Ingested surfaced_in relation between decision-${msg.id} and message-${msg.id}`)
          } catch (relError) {
            console.error('Failed to ingest surfaced_in relation:', relError)
          }
        }

        extractions.push({
          message: msg,
          classification: extraction.classification,
          isDecision: extraction.isDecision,
          extractedDecision: extraction.extractedDecision,
          persistedDecision: savedDecision
        })
      } catch (msgError: any) {
        console.error(`Error extracting decision for message ${msg.id}:`, msgError)
        extractions.push({
          message: msg,
          classification: 'Error',
          isDecision: false,
          error: msgError.message
        })
      }
    }

    return NextResponse.json({
      success: true,
      extractions
    })
  } catch (error: any) {
    console.error('Extraction API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
