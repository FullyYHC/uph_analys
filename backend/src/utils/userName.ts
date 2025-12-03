export function extractChineseName(userName: string) {
  if (!userName) return ''
  const idx = userName.indexOf('_')
  if (idx === -1) return ''
  return userName.slice(idx + 1)
}
