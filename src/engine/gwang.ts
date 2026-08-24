import type { Game, GwangSale } from '../types/game.ts'

export function gwangBuyers(
  participantIds: string[],
  dealerId: string,
  sellerId: string,
): string[] {
  return participantIds.filter((id) => id !== dealerId && id !== sellerId)
}

export function gwangSaleThisCycle(game: {
  rounds: Array<{ createdAt: number }>
  gwangSales: GwangSale[]
}): GwangSale | undefined {
  const lastRoundAt = game.rounds.at(-1)?.createdAt ?? 0
  for (let i = game.gwangSales.length - 1; i >= 0; i -= 1) {
    const sale = game.gwangSales[i]
    if (sale && sale.createdAt > lastRoundAt) return sale
  }
  return undefined
}

export function sittingOutId(
  game: {
    rounds: Array<{ createdAt: number }>
    gwangSales: GwangSale[]
  },
  sellerId?: string | null,
): string | null {
  return sellerId || gwangSaleThisCycle(game)?.sellerId || null
}

export function sittingOutIdForRound(
  game: {
    rounds: Array<{ id: string; createdAt: number }>
    gwangSales: GwangSale[]
  },
  round: { id: string; createdAt: number; sitOutId?: string | null },
): string | null {
  if (round.sitOutId) return round.sitOutId
  const prevAt = game.rounds
    .filter((item) => item.id !== round.id && item.createdAt < round.createdAt)
    .reduce((latest, item) => Math.max(latest, item.createdAt), 0)
  for (let i = game.gwangSales.length - 1; i >= 0; i -= 1) {
    const sale = game.gwangSales[i]
    if (sale && sale.createdAt > prevAt && sale.createdAt <= round.createdAt) {
      return sale.sellerId
    }
  }
  return null
}

export function playingParticipantIds(
  game: {
    participantIds: string[]
    rounds: Array<{ createdAt: number }>
    gwangSales: GwangSale[]
  },
  sellerId?: string | null,
): string[] {
  const sitOut = sittingOutId(game, sellerId)
  if (!sitOut) return game.participantIds
  return game.participantIds.filter((id) => id !== sitOut)
}

export function calculateGwangSale(
  game: Pick<Game, 'players' | 'gwangUnit'>,
  sale: GwangSale,
): Record<string, number> {
  const amounts: Record<string, number> = {}
  for (const player of game.players) {
    amounts[player.id] = 0
  }

  const pay = sale.count * game.gwangUnit
  for (const buyerId of sale.buyerIds) {
    amounts[buyerId] = -pay
  }
  amounts[sale.sellerId] = pay * sale.buyerIds.length
  return amounts
}
