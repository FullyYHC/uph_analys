export function extractChineseName(userName: string) {
  if (!userName) return ''
  // Handle both underscore (_) and plus (+) separators
  if (userName.includes('+')) {
    const parts = userName.split('+')
    return parts[1] || parts[0] // Return part after + or full string if + is at end
  }
  const idx = userName.indexOf('_')
  if (idx !== -1) {
    return userName.slice(idx + 1)
  }
  // Fallback: return the whole string if no separator found
  return userName
}
