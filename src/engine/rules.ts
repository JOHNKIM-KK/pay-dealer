import type { Rule } from '../types/game.ts'

export const DEFAULT_RULES: Rule[] = [
  { id: 'PIBAK', name: '피박', type: 'MULTIPLIER', value: 2, enabled: true },
  { id: 'GWANGBAK', name: '광박', type: 'MULTIPLIER', value: 2, enabled: true },
  { id: 'MEONGBAK', name: '멍박', type: 'MULTIPLIER', value: 2, enabled: true },
  { id: 'CHEOTPPEOK', name: '첫뻑', type: 'ADDITIVE', value: 3, enabled: true },
  { id: 'WONGO', name: '원고', type: 'ADDITIVE', value: 1, enabled: true },
  { id: 'TUGO', name: '투고', type: 'ADDITIVE', value: 2, enabled: true },
  { id: 'SSEURIGO', name: '쓰리고', type: 'ADDITIVE', value: 3, enabled: true },
]

export const GO_RULE_IDS = ['WONGO', 'TUGO', 'SSEURIGO'] as const
export const LOSER_RULE_IDS = ['PIBAK', 'GWANGBAK', 'MEONGBAK', 'CHEOTPPEOK'] as const

export const MIN_PLAYERS = 3
export const MIN_PARTICIPANTS = 3
export const MAX_PARTICIPANTS = 4
export const DEFAULT_POINT_UNIT = 100
export const DEFAULT_GWANG_UNIT = 1000
export const MATGO_SCORE = 7
export const GOSTOP_SCORE = 3

export function defaultScoreForPlayerCount(count: number): number {
  return count <= 3 ? MATGO_SCORE : GOSTOP_SCORE
}

export function gameModeLabel(count: number): string {
  return count <= 3 ? '맞고' : '고스톱'
}

export function isGoRule(ruleId: string): boolean {
  return (GO_RULE_IDS as readonly string[]).includes(ruleId)
}

export function isLoserRule(ruleId: string): boolean {
  return (LOSER_RULE_IDS as readonly string[]).includes(ruleId)
}
