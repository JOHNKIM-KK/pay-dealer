export function formatWon(amount: number): string {
  const formatted = Math.abs(amount).toLocaleString('ko-KR')
  if (amount > 0) return `+${formatted}원`
  if (amount < 0) return `-${formatted}원`
  return '0원'
}

export function formatWonPlain(amount: number): string {
  return `${Math.abs(amount).toLocaleString('ko-KR')}원`
}

export function subjectGa(name: string): string {
  const code = name.charCodeAt(name.length - 1)
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) {
    return `${name}이`
  }
  const hasFinalConsonant = (code - 0xac00) % 28 !== 0
  return hasFinalConsonant ? `${name}이` : `${name}가`
}

export function formatRuleValue(type: 'MULTIPLIER' | 'ADDITIVE', value: number): string {
  return type === 'MULTIPLIER' ? `×${value}` : `+${value}점`
}
