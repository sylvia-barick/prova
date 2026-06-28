import { useProject } from '@/context/ProjectContext'
import { Decision } from '@/lib/types'

export function useDecisions(projectId?: string) {
  const { decisions, getProjectDecisions } = useProject()

  const getDecisions = (id: string) => getProjectDecisions(id)
  const getDecision = (id: string) => decisions.find((d) => d.id === id)
  const getActiveDecisions = (id: string) => getProjectDecisions(id).filter((d) => d.status === 'active')
  const getSuperseededDecisions = (id: string) => getProjectDecisions(id).filter((d) => d.status === 'superseded')
  const getRevertedDecisions = (id: string) => getProjectDecisions(id).filter((d) => d.status === 'reverted')

  const searchDecisions = (query: string, id: string) => {
    const projectDecisions = getProjectDecisions(id)
    const lowerQuery = query.toLowerCase()
    return projectDecisions.filter(
      (d) =>
        d.title.toLowerCase().includes(lowerQuery) ||
        d.description.toLowerCase().includes(lowerQuery) ||
        d.tags.some((t) => t.toLowerCase().includes(lowerQuery)),
    )
  }

  if (projectId) {
    return {
      decisions: getProjectDecisions(projectId),
      getDecision,
      getActiveDecisions: () => getActiveDecisions(projectId),
      getSuperseededDecisions: () => getSuperseededDecisions(projectId),
      getRevertedDecisions: () => getRevertedDecisions(projectId),
      searchDecisions: (query: string) => searchDecisions(query, projectId),
    }
  }

  return {
    decisions,
    getDecision,
    getActiveDecisions: (id: string) => getActiveDecisions(id),
    getSuperseededDecisions: (id: string) => getSuperseededDecisions(id),
    getRevertedDecisions: (id: string) => getRevertedDecisions(id),
    searchDecisions: (query: string, id: string) => searchDecisions(query, id),
  }
}
