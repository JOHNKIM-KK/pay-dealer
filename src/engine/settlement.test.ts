import { describe, expect, it } from 'vitest'
import { minimizeTransfers } from './settlement.ts'

describe('minimizeTransfers', () => {
  it('한 명만 이기면 나머지는 그 사람에게만 보낸다', () => {
    const transfers = minimizeTransfers({
      a: 5000,
      b: -3000,
      c: -2000,
    })

    expect(transfers).toEqual([
      { fromId: 'b', toId: 'a', amount: 3000 },
      { fromId: 'c', toId: 'a', amount: 2000 },
    ])
  })

  it('여러 채권자와 채무자를 그리디로 맞춘다', () => {
    const transfers = minimizeTransfers({
      a: 3000,
      b: 2000,
      c: -4000,
      d: -1000,
    })

    const totalOut = transfers.reduce((sum, item) => sum + item.amount, 0)
    expect(totalOut).toBe(5000)
    expect(transfers.every((item) => item.amount > 0)).toBe(true)

    const received: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 }
    for (const item of transfers) {
      received[item.fromId] -= item.amount
      received[item.toId] += item.amount
    }
    expect(received).toEqual({ a: 3000, b: 2000, c: -4000, d: -1000 })
  })

  it('순액이 모두 0이면 송금이 없다', () => {
    expect(minimizeTransfers({ a: 0, b: 0 })).toEqual([])
  })
})
