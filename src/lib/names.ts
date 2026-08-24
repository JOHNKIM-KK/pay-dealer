export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

export function isDuplicateName(
  names: string[],
  name: string,
  ignoreIndex?: number,
): boolean {
  const normalized = normalizeName(name)
  if (!normalized) return false
  return names.some((item, index) => {
    if (index === ignoreIndex) return false
    return normalizeName(item) === normalized
  })
}

export function nextPlayerLabel(existing: string[]): string {
  let index = existing.length + 1
  while (existing.some((name) => name === `플레이어 ${index}`)) {
    index += 1
  }
  return `플레이어 ${index}`
}
