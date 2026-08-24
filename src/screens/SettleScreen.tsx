import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AmountText } from '../components/AmountText.tsx'
import { GhostButton, PrimaryButton, SecondaryButton } from '../components/Button.tsx'
import { ScreenShell, ScreenTitle } from '../components/ScreenShell.tsx'
import { accumulateTotals, hasCarriedBalances } from '../engine/round.ts'
import { minimizeTransfers } from '../engine/settlement.ts'
import { formatWonPlain } from '../lib/format.ts'
import { useGameStore } from '../store/gameStore.ts'

export function SettleScreen() {
  const navigate = useNavigate()
  const game = useGameStore((state) => state.currentGame)
  const goHome = useGameStore((state) => state.goHome)
  const finishGame = useGameStore((state) => state.finishGame)
  const startNewGameWithMembers = useGameStore((state) => state.startNewGameWithMembers)
  const continueFromSettlement = useGameStore((state) => state.continueFromSettlement)

  useEffect(() => {
    if (
      game?.status === 'playing' &&
      (game.rounds.length > 0 || game.gwangSales.length > 0)
    ) {
      finishGame()
    }
  }, [game?.status, game?.rounds.length, game?.gwangSales.length, finishGame])

  if (!game) return <Navigate to="/" replace />
  if (game.status === 'setup') return <Navigate to="/setup" replace />
  if (game.status === 'playing' && game.rounds.length === 0 && game.gwangSales.length === 0) {
    return <Navigate to="/play" replace />
  }
  if (game.rounds.length === 0 && game.gwangSales.length === 0 && !hasCarriedBalances(game)) {
    return <Navigate to="/play" replace />
  }

  const totals = accumulateTotals(game)
  const transfers = minimizeTransfers(totals)
  const ranked = [...game.players].sort(
    (a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0),
  )
  const playerName = (id: string) =>
    game.players.find((player) => player.id === id)?.name ?? id
  const carried = hasCarriedBalances(game)

  return (
    <ScreenShell
      footer={
        <div className="flex flex-col gap-2">
          <PrimaryButton
            onClick={() => {
              continueFromSettlement()
              navigate('/play')
            }}
          >
            이 금액으로 이어하기
          </PrimaryButton>
          <SecondaryButton
            onClick={() => {
              startNewGameWithMembers()
              navigate('/setup')
            }}
          >
            이 멤버로 새 게임
          </SecondaryButton>
          <GhostButton
            onClick={() => {
              goHome()
              navigate('/')
            }}
          >
            홈으로
          </GhostButton>
        </div>
      }
    >
      <ScreenTitle
        kicker={`페이딜러 · ${game.rounds.length}판`}
        description="보낼 사람만 남기고, 횟수는 줄여서 보여드려요."
      >
        최종 정산
      </ScreenTitle>

      {carried ? (
        <p className="mb-4 text-sm text-[#8B95A1]">이전 게임 잔액을 이어왔어요.</p>
      ) : null}

      <section className="mb-8 overflow-hidden rounded-3xl bg-white">
        {ranked.map((player, index) => (
          <div
            key={player.id}
            className={`flex items-center justify-between px-5 py-4 ${
              index < ranked.length - 1 ? 'border-b border-[#F2F4F6]' : ''
            }`}
          >
            <span className="font-semibold">{player.name}</span>
            <AmountText amount={totals[player.id] ?? 0} size="lg" animate />
          </div>
        ))}
      </section>

      <h2 className="mb-3 text-[17px] font-bold">이렇게만 보내면 돼요</h2>
      {transfers.length === 0 ? (
        <p className="rounded-3xl bg-white px-5 py-6 text-[15px] text-[#8B95A1]">
          주고받을 금액이 없어요.
        </p>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-white">
          {transfers.map((transfer, index) => (
            <div
              key={`${transfer.fromId}-${transfer.toId}-${index}`}
              className={`px-5 py-4 ${
                index < transfers.length - 1 ? 'border-b border-[#F2F4F6]' : ''
              }`}
            >
              <p className="font-semibold">
                {playerName(transfer.fromId)} → {playerName(transfer.toId)}
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-[#3182F6]">
                {formatWonPlain(transfer.amount)}
              </p>
            </div>
          ))}
        </div>
      )}
    </ScreenShell>
  )
}
