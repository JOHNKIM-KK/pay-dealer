export type RuleType = 'MULTIPLIER' | 'ADDITIVE'

export type GameStatus = 'setup' | 'playing' | 'settled'

export type PlayStep = 'seat' | 'gwang' | 'winner' | 'score' | 'penalties'

export type ResultKind = 'round' | 'gwang'

export interface Rule {
  id: string
  name: string
  type: RuleType
  value: number
  enabled: boolean
}

export interface Player {
  id: string
  name: string
}

export interface Penalty {
  playerId: string
  type: string
}

export interface Round {
  id: string
  createdAt: number
  winnerId: string
  score: number
  goType: string | null
  cheotppeokPlayerId: string | null
  penalties: Penalty[]
  participantIds: string[]
  sitOutId?: string | null
}

export interface GwangSale {
  id: string
  createdAt: number
  dealerId: string
  sellerId: string
  buyerIds: string[]
  count: number
}

export interface DraftRound {
  step: PlayStep
  winnerId: string | null
  score: number
  goType: string | null
  cheotppeokPlayerId: string | null
  selectedRules: Record<string, string[]>
  dealerId: string | null
  sellerId: string | null
  gwangCount: number
}

export interface LastResult {
  kind: ResultKind
  id: string
}

export interface Game {
  id: string
  createdAt: number
  players: Player[]
  participantIds: string[]
  pointUnit: number
  gwangUnit: number
  cheotppeokUnit: number
  rules: Rule[]
  rounds: Round[]
  gwangSales: GwangSale[]
  openingBalances?: Record<string, number>
  status: GameStatus
}

export interface AppliedRule {
  id: string
  name: string
  type: RuleType
  value: number
}

export interface PlayerBreakdown {
  playerId: string
  role: 'winner' | 'loser'
  score: number
  additives: AppliedRule[]
  multipliers: AppliedRule[]
  effectiveScore: number
  multiplierProduct: number
  cheotppeokAmount: number
  amount: number
}

export interface RoundResult {
  amounts: Record<string, number>
  breakdowns: PlayerBreakdown[]
}

export interface Transfer {
  fromId: string
  toId: string
  amount: number
}
