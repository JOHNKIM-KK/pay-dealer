import type { Game, GwangSale } from '../types/game.ts'

export function gwangBuyers(
  participantIds: string[],
  dealerId: string,
  sellerId: string,
): string[] {
  return participantIds.filter((id) => id !== dealerId && id !== sellerId)
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
