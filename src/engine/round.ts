import { calculateGwangSale, sittingOutIdForRound } from './gwang.ts'
import type { AppliedRule, Game, Player, PlayerBreakdown, Round, RoundResult, Rule } from '../types/game.ts'

function resolveGo(
  game: Pick<Game, 'rules'>,
  round: Round,
): AppliedRule | null {
  if (!round.goType) return null
  const rule = game.rules.find((item) => item.id === round.goType)
  if (!rule || !rule.enabled) return null
  return {
    id: rule.id,
    name: rule.name,
    type: rule.type,
    value: rule.value,
  }
}

function seatedPlayers(game: Pick<Game, 'players'>, participantIds: string[]): Player[] {
  if (participantIds.length === 0) return game.players
  const seated = new Set(participantIds)
  return game.players.filter((player) => seated.has(player.id))
}

function goParts(go: AppliedRule | null): {
  additive: number
  multiplier: number
  additives: AppliedRule[]
  multipliers: AppliedRule[]
} {
  if (!go) {
    return { additive: 0, multiplier: 1, additives: [], multipliers: [] }
  }
  if (go.type === 'ADDITIVE') {
    return { additive: go.value, multiplier: 1, additives: [go], multipliers: [] }
  }
  return { additive: 0, multiplier: go.value, additives: [], multipliers: [go] }
}

function toApplied(rule: Rule): AppliedRule {
  return {
    id: rule.id,
    name: rule.name,
    type: rule.type,
    value: rule.value,
  }
}

export function calculateRound(
  game: Pick<Game, 'players' | 'pointUnit' | 'rules' | 'rounds' | 'gwangSales'>,
  round: Round,
): RoundResult {
  const ruleById = new Map(game.rules.map((rule) => [rule.id, rule]))
  const amounts: Record<string, number> = {}
  const loserBreakdowns: PlayerBreakdown[] = []
  const go = goParts(resolveGo(game, round))
  const baseScore = round.score + go.additive
  const sitOut = sittingOutIdForRound(game, round)
  const seated = seatedPlayers(game, round.participantIds).filter(
    (player) => player.id !== sitOut,
  )

  for (const player of game.players) {
    amounts[player.id] = 0
  }

  let winnerTotal = 0

  for (const player of seated) {
    if (player.id === round.winnerId) continue

    const applied = round.penalties
      .map((penalty) =>
        penalty.playerId === player.id ? ruleById.get(penalty.type) : undefined,
      )
      .filter((rule): rule is Rule => rule !== undefined && rule.enabled)

    const additives = applied.filter((rule) => rule.type === 'ADDITIVE')
    const multipliers = applied.filter((rule) => rule.type === 'MULTIPLIER')
    const additiveSum = additives.reduce((sum, rule) => sum + rule.value, 0)
    const multiplierProduct =
      go.multiplier * multipliers.reduce((product, rule) => product * rule.value, 1)
    const effectiveScore = baseScore + additiveSum
    const payment = effectiveScore * multiplierProduct * game.pointUnit

    amounts[player.id] = -payment
    winnerTotal += payment

    loserBreakdowns.push({
      playerId: player.id,
      role: 'loser',
      score: round.score,
      additives: [...go.additives, ...additives.map(toApplied)],
      multipliers: [...go.multipliers, ...multipliers.map(toApplied)],
      effectiveScore,
      multiplierProduct,
      amount: -payment,
    })
  }

  amounts[round.winnerId] = winnerTotal

  const winnerBreakdown: PlayerBreakdown = {
    playerId: round.winnerId,
    role: 'winner',
    score: round.score,
    additives: go.additives,
    multipliers: go.multipliers,
    effectiveScore: baseScore,
    multiplierProduct: go.multiplier,
    amount: winnerTotal,
  }

  return {
    amounts,
    breakdowns: [winnerBreakdown, ...loserBreakdowns],
  }
}

export function accumulateTotals(game: Game): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const player of game.players) {
    totals[player.id] = 0
  }

  for (const round of game.rounds) {
    const result = calculateRound(game, round)
    for (const [playerId, amount] of Object.entries(result.amounts)) {
      totals[playerId] = (totals[playerId] ?? 0) + amount
    }
  }

  for (const sale of game.gwangSales) {
    const amounts = calculateGwangSale(game, sale)
    for (const [playerId, amount] of Object.entries(amounts)) {
      totals[playerId] = (totals[playerId] ?? 0) + amount
    }
  }

  return totals
}
