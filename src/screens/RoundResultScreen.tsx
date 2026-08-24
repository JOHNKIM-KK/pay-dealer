import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AmountText } from '../components/AmountText.tsx'
import { PrimaryButton, SecondaryButton } from '../components/Button.tsx'
import { BackButton, ScreenShell, ScreenTitle } from '../components/ScreenShell.tsx'
import { calculateGwangSale } from '../engine/gwang.ts'
import { calculateRound } from '../engine/round.ts'
import { formatRuleValue, formatWon, formatWonPlain } from '../lib/format.ts'
import { useGameStore } from '../store/gameStore.ts'

export function RoundResultScreen() {
  const navigate = useNavigate()
  const game = useGameStore((state) => state.currentGame)
  const lastResult = useGameStore((state) => state.lastResult)
  const startNextRound = useGameStore((state) => state.startNextRound)
  const continueAfterGwang = useGameStore((state) => state.continueAfterGwang)
  const undoLastSettlement = useGameStore((state) => state.undoLastSettlement)
  const [openId, setOpenId] = useState<string | null>(null)

  const goBackToEdit = () => {
    if (!undoLastSettlement()) return
    navigate('/play')
  }

  if (!game) return <Navigate to="/" replace />
  if (game.status === 'setup') return <Navigate to="/setup" replace />
  if (game.rounds.length === 0 && game.gwangSales.length === 0) {
    return <Navigate to="/play" replace />
  }

  const kind =
    lastResult?.kind ??
    (game.gwangSales.length > 0 &&
    (game.rounds.length === 0 ||
      (game.gwangSales.at(-1)?.createdAt ?? 0) >= (game.rounds.at(-1)?.createdAt ?? 0))
      ? 'gwang'
      : 'round')

  const playerName = (id: string) =>
    game.players.find((player) => player.id === id)?.name ?? id

  if (kind === 'gwang') {
    const sale =
      game.gwangSales.find((item) => item.id === lastResult?.id) ?? game.gwangSales.at(-1)
    if (!sale) return <Navigate to="/play" replace />
    const amounts = calculateGwangSale(game, sale)

    return (
      <ScreenShell
        footer={
          <PrimaryButton
            onClick={() => {
              continueAfterGwang()
              navigate('/play')
            }}
          >
            승자 선택
          </PrimaryButton>
        }
      >
        {lastResult ? <BackButton label="다시 입력" onClick={goBackToEdit} /> : null}
        <ScreenTitle
          kicker="페이딜러 · 광팔기"
          description="광 산 사람만 계산에 들어가요."
        >
          {playerName(sale.sellerId)} · {sale.count}장
        </ScreenTitle>
        <p className="mb-4 text-sm text-[#8B95A1]">
          장당 {formatWonPlain(game.gwangUnit)} · 산 사람 {sale.buyerIds.map(playerName).join(', ')}
        </p>
        <div className="rise-in flex flex-col gap-2">
          {game.players
            .filter((player) => (amounts[player.id] ?? 0) !== 0)
            .map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between rounded-3xl bg-white px-5 py-4"
              >
                <span className="font-semibold">{player.name}</span>
                <AmountText amount={amounts[player.id] ?? 0} size="lg" animate />
              </div>
            ))}
        </div>
      </ScreenShell>
    )
  }

  const round =
    game.rounds.find((item) => item.id === lastResult?.id) ?? game.rounds.at(-1)
  if (!round) return <Navigate to="/play" replace />
  const result = calculateRound(game, round)

  return (
    <ScreenShell
      footer={
        <div className="flex flex-col gap-2">
          <PrimaryButton
            onClick={() => {
              startNextRound()
              navigate('/play')
            }}
          >
            다음 판 →
          </PrimaryButton>
          <SecondaryButton onClick={() => navigate('/summary')}>전체 현황</SecondaryButton>
        </div>
      }
    >
      {lastResult ? <BackButton label="다시 입력" onClick={goBackToEdit} /> : null}
      <ScreenTitle
        kicker={`페이딜러 · ${game.rounds.length}판`}
        description="눌러보면 계산이 나와요."
      >
        이번 판
      </ScreenTitle>

      <div className="rise-in flex flex-col gap-2">
        {result.breakdowns.map((item) => (
          <button
            key={item.playerId}
            type="button"
            onClick={() => setOpenId(openId === item.playerId ? null : item.playerId)}
            className="rise-in pressable rounded-3xl bg-white px-5 py-4 text-left"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 font-semibold">
                {item.role === 'winner' ? (
                  <span className="rounded-full bg-[#3182F6] px-2 py-0.5 text-[11px] font-bold text-white">
                    승자
                  </span>
                ) : null}
                {playerName(item.playerId)}
              </span>
              <AmountText amount={item.amount} size="lg" animate />
            </div>
            {openId === item.playerId ? (
              <div className="mt-3 border-t border-[#F2F4F6] pt-3 text-sm text-[#4E5968]">
                <p>
                  {item.score}점 × {game.pointUnit.toLocaleString('ko-KR')}원
                </p>
                {item.additives.map((rule) => (
                  <p key={rule.id}>
                    {rule.name} {formatRuleValue(rule.type, rule.value)}
                  </p>
                ))}
                {item.multipliers.map((rule) => (
                  <p key={rule.id}>
                    {rule.name} {formatRuleValue(rule.type, rule.value)}
                  </p>
                ))}
                {item.cheotppeokAmount !== 0 ? (
                  <p>첫뻑 {formatWon(item.cheotppeokAmount)}</p>
                ) : null}
                {item.role === 'loser' ? (
                  <p className="mt-2 font-medium text-[#191F28]">
                    ({item.effectiveScore} × {item.multiplierProduct} ×{' '}
                    {game.pointUnit.toLocaleString('ko-KR')})
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-1 text-xs text-[#B0B8C1]">자세히 보기</p>
            )}
          </button>
        ))}
      </div>
    </ScreenShell>
  )
}
