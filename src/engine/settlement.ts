import type { Transfer } from '../types/game.ts'

interface Balance {
  id: string
  amount: number
}

export function minimizeTransfers(nets: Record<string, number>): Transfer[] {
  const creditors: Balance[] = []
  const debtors: Balance[] = []

  for (const [id, amount] of Object.entries(nets)) {
    if (amount > 0) creditors.push({ id, amount })
    else if (amount < 0) debtors.push({ id, amount: -amount })
  }

  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)

  const transfers: Transfer[] = []
  let i = 0
  let j = 0

  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount)
    if (pay > 0) {
      transfers.push({
        fromId: debtors[i].id,
        toId: creditors[j].id,
        amount: pay,
      })
    }

    debtors[i].amount -= pay
    creditors[j].amount -= pay
    if (debtors[i].amount === 0) i += 1
    if (creditors[j].amount === 0) j += 1
  }

  return transfers
}
