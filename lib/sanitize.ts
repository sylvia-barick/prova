/**
 * Central sanitization helpers.
 *
 * The old seed route wrote Decision nodes whose author.id is 'usr-alex' or
 * 'usr-sylvia' and whose emails end in @example.com.  Because HydraDB does
 * not expose a delete API, these nodes persist in the graph forever.  Every
 * place in the app that reads a Person or a Decision author must run through
 * these helpers so placeholder identities never reach the UI.
 */

// IDs that belong to seeded placeholder users
export const PLACEHOLDER_IDS = new Set(['usr-alex', 'usr-sylvia'])

// Decision entity IDs (HydraDB graph node IDs) that contain placeholder authors.
// Determined by live inspection on 2026-06-28.
export const PLACEHOLDER_DECISION_ENTITY_IDS = new Set([
  '2beecec07757cc62fdf7d8ca112d9d13', // use firebase auth  — author: Alex Chen
  '7f00ff6cd5813008028598a7c498befd', // use postgresql upd — author: Alex Chen
  '80a555a6af849e7ec1fb6980273b8653', // use mongodb        — author: Sylvia Barick
  '9249cc9c4a911155540884e00984f724', // migrate supabase   — author: Sylvia Barick
])

export function isPlaceholderAuthorId(id: string): boolean {
  return PLACEHOLDER_IDS.has(id)
}

export function isPlaceholderEmail(email: string): boolean {
  return /example\.com/i.test(email)
}

/**
 * Sanitize a raw author object decoded from a Decision identifier.
 * If the author is a known placeholder, replace their name/id with
 * an anonymous attribution so placeholder names never surface in the UI.
 */
export function sanitizeAuthor(raw: { id?: string; name?: string; email?: string }) {
  const id   = raw.id   || ''
  const name = raw.name || ''
  if (
    isPlaceholderAuthorId(id) ||
    isPlaceholderEmail(raw.email || '') ||
    name.toLowerCase() === 'alex chen' ||
    name.toLowerCase() === 'sylvia barick'
  ) {
    return { id: '', name: 'Imported from seed', email: '', avatar: '', role: '' }
  }
  return {
    id,
    name,
    email: raw.email || '',
    avatar: '',
    role:   '',
  }
}

/**
 * Returns true if a Person entity should be hidden (is a placeholder).
 */
export function isPlaceholderPerson(person: { id?: string; email?: string; name?: string }): boolean {
  return (
    PLACEHOLDER_IDS.has(person.id || '') ||
    isPlaceholderEmail(person.email || '') ||
    person.name?.toLowerCase() === 'alex chen' ||
    person.name?.toLowerCase() === 'sylvia barick'
  )
}
